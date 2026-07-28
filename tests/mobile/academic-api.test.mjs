import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";

const originalFetch = globalThis.fetch;
const requests = [];
let academicRequest;

before(async () => {
  process.env.EXPO_PUBLIC_API_URL = "https://school-api.test/";
  ({ academicRequest } = await import(
    "../../apps/mobile/lib/academicApi.ts"
  ));
  globalThis.fetch = async (url, init) => {
    requests.push({ init, url });
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  };
});

beforeEach(() => {
  requests.length = 0;
});

after(() => {
  globalThis.fetch = originalFetch;
});

test("mobile academic GET keeps Bearer auth without adding a content type", async () => {
  await academicRequest("/api/classes", "student-token");

  assert.equal(requests.length, 1);
  const headers = new Headers(requests[0].init.headers);
  assert.equal(headers.get("Accept"), "application/json");
  assert.equal(headers.get("Authorization"), "Bearer student-token");
  assert.equal(headers.has("Content-Type"), false);
});

test("mobile academic JSON request supplies a default content type", async () => {
  await academicRequest("/api/ai/consent", "student-token", {
    body: JSON.stringify({ granted: true }),
    method: "POST",
  });

  const headers = new Headers(requests[0].init.headers);
  assert.equal(headers.get("Content-Type"), "application/json");
  assert.equal(headers.get("Authorization"), "Bearer student-token");
});

test("mobile academic request preserves an explicit content type", async () => {
  await academicRequest("/api/custom", "student-token", {
    body: JSON.stringify({ value: true }),
    headers: { "Content-Type": "application/vnd.school+json" },
    method: "POST",
  });

  const headers = new Headers(requests[0].init.headers);
  assert.equal(
    headers.get("Content-Type"),
    "application/vnd.school+json",
  );
});
