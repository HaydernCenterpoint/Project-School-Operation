import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import http from "node:http";

export const apiUrl = process.env.ACADEMIC_API_URL?.replace(/\/$/, "");
export const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
export const anonKey = process.env.SUPABASE_ANON_KEY;
export const providerUrl = process.env.AI_PROVIDER_URL;
export const providerKey = process.env.AI_PROVIDER_API_KEY;
export const missingAcademicEnvironment = !apiUrl || !supabaseUrl || !anonKey;
export const missingAiEnvironment =
  missingAcademicEnvironment || !providerUrl || !providerKey;

export const policyVersion = "pilot-2026-07";
export const classA = "a1000000-0000-0000-0000-000000000001";
export const classB = "b1000000-0000-0000-0000-000000000001";
export const chunkA = "a7300000-0000-0000-0000-000000000001";
export const chunkB = "b7300000-0000-0000-0000-000000000001";

export async function signIn(email) {
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

export async function api(token, path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body) headers.set("Content-Type", "application/json");
  const response = await fetch(`${apiUrl}${path}`, { ...init, headers });
  return { response, body: await response.json() };
}

export function expectStatus(result, status) {
  assert.equal(
    result.response.status,
    status,
    `${result.response.status} ${JSON.stringify(result.body)}`,
  );
}

export async function tutor(
  token,
  classId,
  question,
  requestId = randomUUID(),
) {
  const result = await api(token, "/api/ai/tutor", {
    method: "POST",
    body: JSON.stringify({ requestId, classId, question }),
  });
  return { ...result, requestId };
}

export async function usage(token, requestIds = []) {
  const query = new URLSearchParams({
    select:
      "request_id,status,error_code,retrieved_chunk_count,completed_at,user_id",
    order: "created_at.asc",
  });
  if (requestIds.length > 0) {
    query.set("request_id", `in.(${requestIds.join(",")})`);
  }
  const response = await fetch(
    `${supabaseUrl}/rest/v1/ai_usage_events?${query}`,
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

function validProviderResponse(payload) {
  const sourceText = payload.sources.map((source) => source.content).join("\n");
  const answer = payload.question.includes("oversized response")
    ? "x".repeat(70_000)
    : sourceText.includes("BENTHIC_B_ONLY")
      ? "Seal the marine robot battery housing before launch."
      : "Disconnect the solar training panel before inspection.";
  const citationIds = payload.question.includes("invalid citation")
    ? [chunkB]
    : payload.question.includes("too many citations")
      ? Array.from({ length: 6 }, () => payload.sources[0]?.id).filter(Boolean)
      : [payload.sources[0]?.id].filter(Boolean);
  return {
    json: {
      choices: [
        {
          message: {
            content: JSON.stringify({ answer, citationIds }),
          },
        },
      ],
      usage: {
        prompt_tokens: payload.question.includes("oversized metrics")
          ? 1_000_001
          : 40,
        completion_tokens: 12,
      },
    },
  };
}

async function defaultResponder({ payload }) {
  if (payload.question.includes("provider 500")) {
    return {
      status: 500,
      json: { error: { message: "fake outage" } },
    };
  }
  if (payload.question.includes("delayed timeout")) {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return validProviderResponse(payload);
}

export function fakeProvider(responder = defaultResponder) {
  const requests = [];
  const url = new URL(providerUrl);
  const server = http.createServer(async (request, response) => {
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const body = JSON.parse(raw);
    const payload = JSON.parse(body.messages.at(-1).content);
    const captured = {
      authorization: request.headers.authorization,
      path: request.url,
      body,
      payload,
    };
    requests.push(captured);

    const result = (await responder({ ...captured, request, response })) ?? {};
    if (result.open) {
      response.writeHead(result.status ?? 200, {
        "Content-Type": "application/json",
        ...result.headers,
      });
      response.write(result.raw ?? '{"choices":[');
      return;
    }
    const responseBody =
      result.raw ?? JSON.stringify(result.json ?? validProviderResponse(payload).json);
    response.writeHead(result.status ?? 200, {
      "Content-Type": "application/json",
      ...result.headers,
    });
    response.end(responseBody);
  });

  return {
    requests,
    listen: () =>
      new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(Number(url.port), url.hostname, resolve);
      }),
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      }),
  };
}
