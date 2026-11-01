import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import http from "node:http";
import test from "node:test";

const apiUrl = process.env.ACADEMIC_API_URL?.replace(/\/$/, "");
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const anonKey = process.env.SUPABASE_ANON_KEY;
const providerUrl = process.env.AI_PROVIDER_URL;
const providerKey = process.env.AI_PROVIDER_API_KEY;
const missingEnvironment =
  !apiUrl || !supabaseUrl || !anonKey || !providerUrl || !providerKey;
const policyVersion = "pilot-2026-07";
const classA = "a1000000-0000-0000-0000-000000000001";
const classB = "b1000000-0000-0000-0000-000000000001";

async function signIn(email) {
  const response = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "Password123!" }),
    },
  );
  const body = await response.json();
  assert.equal(response.status, 200, `sign-in failed: ${JSON.stringify(body)}`);
  return body.access_token;
}

async function api(token, path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body) headers.set("Content-Type", "application/json");
  const response = await fetch(`${apiUrl}${path}`, { ...init, headers });
  return { response, body: await response.json() };
}

function expectStatus(result, status) {
  assert.equal(
    result.response.status,
    status,
    `${result.response.status} ${JSON.stringify(result.body)}`,
  );
}

function tutor(token, classId, question) {
  return api(token, "/api/ai/tutor", {
    method: "POST",
    body: JSON.stringify({ requestId: randomUUID(), classId, question }),
  });
}

async function usage(token) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/ai_usage_events?select=status,error_code&order=created_at.asc`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  return body;
}

function fakeProvider() {
  const requests = [];
  const url = new URL(providerUrl);
  const server = http.createServer(async (request, response) => {
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const body = JSON.parse(raw);
    const payload = JSON.parse(body.messages.at(-1).content);
    requests.push({
      authorization: request.headers.authorization,
      path: request.url,
      body,
      payload,
    });

    if (payload.question.includes("provider 500")) {
      response.writeHead(500, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: { message: "fake outage" } }));
      return;
    }
    if (payload.question.includes("delayed timeout")) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const citationIds = payload.question.includes("invalid citation")
      ? ["b7300000-0000-0000-0000-000000000001"]
      : payload.question.includes("too many citations")
        ? Array.from({ length: 6 }, () => payload.sources[0]?.id).filter(Boolean)
        : [payload.sources[0]?.id].filter(Boolean);
    const sourceText = payload.sources
      .map((source) => source.content)
      .join("\n");
    const answer = payload.question.includes("oversized response")
      ? "x".repeat(70_000)
      : sourceText.includes("BENTHIC_B_ONLY")
        ? "Seal the marine robot battery housing before launch."
        : "Disconnect the solar training panel before inspection.";
    const content = JSON.stringify({
      answer,
      citationIds,
    });
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        choices: [{ message: { content } }],
        usage: {
          prompt_tokens: payload.question.includes("oversized metrics")
            ? 1_000_001
            : 40,
          completion_tokens: 12,
        },
      }),
    );
  });
  return {
    requests,
    listen: () =>
      new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(Number(url.port), url.hostname, resolve);
      }),
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}

test(
  "AI Tutor consent, cited RAG isolation, and provider degradation",
  {
    skip: missingEnvironment
      ? "Set API, Supabase, and fake AI provider environment to run."
      : false,
  },
  async () => {
    const provider = fakeProvider();
    await provider.listen();
    try {
      const [studentA, studentB] = await Promise.all([
        signIn("student.a@saodo.test"),
        signIn("student.b@saodo.test"),
      ]);

      const consent = await api(studentA, "/api/ai/consent");
      expectStatus(consent, 200);
      assert.equal(consent.body.currentPolicyVersion, policyVersion);
      assert.equal(consent.body.tutorEnabled, true);

      const stalePolicy = await api(studentA, "/api/ai/consent", {
        method: "POST",
        body: JSON.stringify({
          granted: true,
          policyVersion: `stale-${policyVersion}`,
        }),
      });
      expectStatus(stalePolicy, 409);
      assert.equal(stalePolicy.body.error.code, "policy_changed");

      const rejectedTenantField = await api(studentA, "/api/ai/tutor", {
        method: "POST",
        body: JSON.stringify({
          requestId: randomUUID(),
          classId: classA,
          question: "solar panel inspection",
          tenantId: "a0000000-0000-0000-0000-000000000001",
        }),
      });
      expectStatus(rejectedTenantField, 400);

      const revoked = await api(studentA, "/api/ai/consent", {
        method: "POST",
        body: JSON.stringify({ granted: false, policyVersion }),
      });
      expectStatus(revoked, 200);
      assert.equal(revoked.body.granted, false);
      assert.equal(revoked.body.consentRequired, true);

      const consentRequired = await tutor(
        studentA,
        classA,
        "solar panel inspection",
      );
      expectStatus(consentRequired, 403);
      assert.equal(consentRequired.body.error.code, "consent_required");
      assert.equal(provider.requests.length, 0);

      const granted = await api(studentA, "/api/ai/consent", {
        method: "POST",
        body: JSON.stringify({ granted: true, policyVersion }),
      });
      expectStatus(granted, 200);
      assert.equal(granted.body.granted, true);
      assert.equal(granted.body.consentRequired, false);

      const answer = await tutor(studentA, classA, "solar panel inspection");
      expectStatus(answer, 200);
      assert.equal(answer.body.status, "answered");
      assert.match(answer.body.answer, /Disconnect the solar training panel/i);
      assert.deepEqual(
        answer.body.citations.map((citation) => citation.id),
        ["a7300000-0000-0000-0000-000000000001"],
      );
      assert.equal(answer.body.citations[0].sourceName, "campus-a-solar-guide.pdf");
      assert.equal(answer.body.citations[0].pageNumber, 11);
      assert.ok(
        provider.requests[0].payload.sources.every(
          (source) => !JSON.stringify(source).includes("BENTHIC_B_ONLY"),
        ),
      );

      const crossTenant = await tutor(studentA, classB, "marine robot battery");
      expectStatus(crossTenant, 404);
      const unknownClass = await tutor(
        studentA,
        randomUUID(),
        "marine robot battery",
      );
      expectStatus(unknownClass, 404);
      assert.deepEqual(crossTenant.body.error, unknownClass.body.error);

      const noEvidence = await tutor(
        studentA,
        classA,
        "quasar nebula archaeology",
      );
      expectStatus(noEvidence, 200);
      assert.deepEqual(noEvidence.body.citations, []);
      assert.equal(noEvidence.body.answer, null);
      assert.equal(noEvidence.body.status, "abstained");

      const invalidCitation = await tutor(
        studentA,
        classA,
        'solar OR "invalid citation"',
      );
      expectStatus(invalidCitation, 200);
      assert.equal(invalidCitation.body.status, "abstained");
      assert.equal(invalidCitation.body.answer, null);
      assert.deepEqual(invalidCitation.body.citations, []);

      const providerFailure = await tutor(
        studentA,
        classA,
        'solar OR "provider 500"',
      );
      expectStatus(providerFailure, 503);
      assert.equal(providerFailure.body.error.code, "provider_unavailable");

      const providerTimeout = await tutor(
        studentA,
        classA,
        'solar OR "delayed timeout"',
      );
      expectStatus(providerTimeout, 503);
      assert.equal(providerTimeout.body.error.code, "provider_unavailable");

      const oversizedMetrics = await tutor(
        studentA,
        classA,
        'solar OR "oversized metrics"',
      );
      expectStatus(oversizedMetrics, 503);
      assert.equal(oversizedMetrics.body.error.code, "provider_unavailable");

      const tooManyCitations = await tutor(
        studentA,
        classA,
        'solar OR "too many citations"',
      );
      expectStatus(tooManyCitations, 503);
      assert.equal(tooManyCitations.body.error.code, "provider_unavailable");

      const oversizedResponse = await tutor(
        studentA,
        classA,
        'solar OR "oversized response"',
      );
      expectStatus(oversizedResponse, 503);
      assert.equal(oversizedResponse.body.error.code, "provider_unavailable");

      assert.ok(provider.requests.length >= 7);
      assert.ok(
        provider.requests.every(
          (request) =>
            request.authorization === `Bearer ${providerKey}` &&
            request.path?.endsWith("/chat/completions"),
        ),
      );

      const grantedB = await api(studentB, "/api/ai/consent", {
        method: "POST",
        body: JSON.stringify({ granted: true, policyVersion }),
      });
      expectStatus(grantedB, 200);
      const tenantB = await tutor(studentB, classB, "marine robot battery");
      expectStatus(tenantB, 200);
      assert.equal(tenantB.body.status, "answered");
      assert.match(tenantB.body.answer, /Seal the marine robot battery/i);
      const lastRequest = provider.requests.at(-1);
      assert.ok(
        lastRequest.payload.sources.every(
          (source) => !JSON.stringify(source).includes("AURORA_A_ONLY"),
        ),
      );

      const finalRevoke = await api(studentA, "/api/ai/consent", {
        method: "POST",
        body: JSON.stringify({ granted: false, policyVersion }),
      });
      expectStatus(finalRevoke, 200);
      const blockedAgain = await tutor(studentA, classA, "solar inspection");
      expectStatus(blockedAgain, 403);

      const usageRows = await usage(studentA);
      assert.equal(
        usageRows.some((row) => row.status === "started"),
        false,
        JSON.stringify(usageRows),
      );
      assert.ok(usageRows.some((row) => row.status === "answered"));
      assert.ok(usageRows.some((row) => row.status === "abstained"));
      assert.ok(
        usageRows.some(
          (row) =>
            row.status === "failed" &&
            ["PROVIDER_UNAVAILABLE", "PROVIDER_TIMEOUT"].includes(row.error_code),
        ),
      );
      assert.ok(
        usageRows.some(
          (row) =>
            row.status === "failed" &&
            row.error_code === "INVALID_PROVIDER_RESPONSE",
        ),
      );
      assert.ok(
        usageRows.some(
          (row) =>
            row.status === "failed" &&
            row.error_code === "PROVIDER_RESPONSE_TOO_LARGE",
        ),
      );
    } finally {
      await provider.close();
    }
  },
);
