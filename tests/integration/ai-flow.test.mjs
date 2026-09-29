// AI study assistant against a local fake provider that speaks the Anthropic
// Messages SSE format. Start the web server with:
//   AI_ENABLED=true AI_PROVIDER=anthropic AI_MODEL=claude-haiku-4-5-20251001
//   AI_API_KEY=test-provider-key AI_API_BASE_URL=http://127.0.0.1:$AI_FAKE_PROVIDER_PORT
// then run this file with ACADEMIC_API_URL, SUPABASE_URL, SUPABASE_ANON_KEY and
// AI_FAKE_PROVIDER_PORT set.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { after, before, test } from "node:test";

const apiUrl = process.env.ACADEMIC_API_URL?.replace(/\/$/, "");
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const anonKey = process.env.SUPABASE_ANON_KEY;
const providerPort = Number(process.env.AI_FAKE_PROVIDER_PORT);
const skip =
  !apiUrl || !supabaseUrl || !anonKey || !providerPort
    ? "Set ACADEMIC_API_URL, SUPABASE_URL, SUPABASE_ANON_KEY and AI_FAKE_PROVIDER_PORT."
    : false;

const received = [];
let provider;

before(async () => {
  if (skip) return;
  provider = createServer(async (request, response) => {
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const body = JSON.parse(raw);
    received.push({ key: request.headers["x-api-key"], body });
    const last = body.messages.at(-1).content;
    response.writeHead(200, { "content-type": "text/event-stream" });
    const send = (event) => response.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    send({ type: "message_start", message: { usage: { input_tokens: 42 } } });
    const parts = last.includes("CHẬM") ? Array(40).fill("…") : ["Xin chào! ", "Đây là ", "câu trả lời."];
    for (const text of parts) {
      if (response.destroyed) return;
      send({ type: "content_block_delta", delta: { type: "text_delta", text } });
      await new Promise((resolve) => setTimeout(resolve, last.includes("CHẬM") ? 150 : 10));
    }
    send({ type: "message_delta", usage: { output_tokens: 7 } });
    send({ type: "message_stop" });
    response.end();
  });
  await new Promise((resolve) => provider.listen(providerPort, "127.0.0.1", resolve));
});

after(() => provider?.close());

async function signIn(email) {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "Password123!" }),
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  return body.access_token;
}

function chat(token, body, requestId = randomUUID(), signal) {
  return fetch(`${apiUrl}/api/ai/chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Idempotency-Key": requestId,
    },
    body: JSON.stringify({ conversationId: null, mode: "explain", assignmentId: null, ...body }),
    signal,
  });
}

async function events(response) {
  return (await response.text())
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

const get = (token, path, init) =>
  fetch(`${apiUrl}${path}`, { ...init, headers: { Authorization: `Bearer ${token}` } });

test("AI chat streams, persists, deduplicates, isolates and deletes", { skip }, async () => {
  const [studentA, studentB, teacherA] = await Promise.all([
    signIn("student.a@saodo.test"),
    signIn("student.b@saodo.test"),
    signIn("teacher.a@saodo.test"),
  ]);

  const usage = await (await get(studentA, "/api/ai/usage")).json();
  assert.equal(usage.enabled, true);
  assert.equal(usage.used, 0);

  // Seeded assignment for Student A; its text must reach the provider as context.
  const assignmentId = "a2000000-0000-0000-0000-000000000001";
  const requestId = randomUUID();
  const first = await chat(studentA, { content: "Giải thích bài tập này", assignmentId }, requestId);
  assert.equal(first.status, 200);
  assert.match(first.headers.get("content-type"), /ndjson/);
  const stream = await events(first);
  assert.equal(stream[0].type, "start");
  assert.equal(stream.at(-1).type, "complete");
  const text = stream.filter((event) => event.type === "delta").map((event) => event.text).join("");
  assert.equal(text, "Xin chào! Đây là câu trả lời.");
  const conversationId = stream[0].conversationId;

  const sent = received.at(-1);
  assert.equal(sent.key, "test-provider-key");
  assert.match(sent.body.system, /<bai_tap>/);
  assert.match(sent.body.system, /Academic Alpha A/);
  assert.equal(sent.body.messages.at(-1).role, "user");

  // Replaying the same idempotency key never bills a second generation.
  const replay = await chat(studentA, { content: "Giải thích bài tập này", assignmentId }, requestId);
  assert.equal(replay.status, 409);
  assert.equal((await replay.json()).error.code, "duplicate_request");
  assert.equal(received.length, 1);

  // Follow-up reuses history.
  const followUp = await chat(studentA, { content: "Cho ví dụ", conversationId });
  assert.equal((await events(followUp)).at(-1).type, "complete");
  assert.equal(received.at(-1).body.messages.length, 3);

  const reopened = await (await get(studentA, `/api/ai/conversations/${conversationId}`)).json();
  assert.deepEqual(
    reopened.messages.map((message) => [message.role, message.status]),
    [["user", "complete"], ["assistant", "complete"], ["user", "complete"], ["assistant", "complete"]],
  );
  assert.equal(reopened.messages[1].content, text);

  // Another student cannot read, delete, extend, or attach Student A's data.
  assert.equal((await get(studentB, `/api/ai/conversations/${conversationId}`)).status, 404);
  assert.equal((await get(studentB, `/api/ai/conversations/${conversationId}`, { method: "DELETE" })).status, 404);
  assert.equal((await chat(studentB, { content: "Chen vào", conversationId })).status, 404);
  assert.equal((await chat(studentB, { content: "Đọc bài", assignmentId })).status, 404);
  const listB = await (await get(studentB, "/api/ai/conversations")).json();
  assert.equal(listB.conversations.length, 0);

  // Teachers have no AI allowance; malformed bodies are rejected.
  assert.equal((await chat(teacherA, { content: "Xin chào" })).status, 403);
  assert.equal((await chat(studentA, { content: "" })).status, 400);
  assert.equal((await chat(studentA, { content: "x".repeat(8001) })).status, 400);
  assert.equal((await chat(studentA, { content: "Hi", mode: "hack" })).status, 400);

  // Cancelling mid-stream records an interrupted, not complete, answer.
  const controller = new AbortController();
  const slow = await chat(studentA, { content: "Trả lời CHẬM", conversationId }, randomUUID(), controller.signal);
  const reader = slow.body.getReader();
  await reader.read();
  controller.abort();
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const afterCancel = await (await get(studentA, `/api/ai/conversations/${conversationId}`)).json();
  assert.equal(afterCancel.messages.at(-1).status, "interrupted");

  const usageAfter = await (await get(studentA, "/api/ai/usage")).json();
  assert.equal(usageAfter.used, 3);

  assert.equal((await get(studentA, `/api/ai/conversations/${conversationId}`, { method: "DELETE" })).status, 204);
  assert.equal((await get(studentA, `/api/ai/conversations/${conversationId}`)).status, 404);
});
