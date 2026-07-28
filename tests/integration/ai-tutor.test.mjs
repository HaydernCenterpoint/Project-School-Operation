import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import {
  api,
  chunkA,
  classA,
  classB,
  expectStatus,
  fakeProvider,
  missingAiEnvironment,
  policyVersion,
  providerKey,
  signIn,
  tutor,
  usage,
} from "./ai-test-support.mjs";

test(
  "AI Tutor consent, cited RAG isolation, and provider degradation",
  {
    skip: missingAiEnvironment
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
        [chunkA],
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
      const revokedCitation = await api(
        studentA,
        `/api/ai/citations/${chunkA}?classId=${classA}`,
      );
      expectStatus(revokedCitation, 404);
      assert.equal(revokedCitation.body.error.code, "not_found");
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
