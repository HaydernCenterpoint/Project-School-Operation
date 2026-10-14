import assert from "node:assert/strict";
import { test } from "node:test";
import { clientIp, memoryLimit, rateLimit } from "../../apps/web/src/lib/rate-limit.ts";

test("allows up to the limit in a window, then refuses until it resets", () => {
  const key = `t-${Math.random()}`;
  const start = 1_000_000;
  for (let i = 0; i < 3; i++) assert.equal(memoryLimit(key, 3, 60_000, start + i), true);
  assert.equal(memoryLimit(key, 3, 60_000, start + 10), false);
  assert.equal(memoryLimit(key, 3, 60_000, start + 60_000), true, "a new window starts fresh");
});

test("keys are independent", () => {
  const a = `a-${Math.random()}`;
  const b = `b-${Math.random()}`;
  assert.equal(memoryLimit(a, 1, 60_000, 0), true);
  assert.equal(memoryLimit(a, 1, 60_000, 1), false);
  assert.equal(memoryLimit(b, 1, 60_000, 1), true);
});

test("uses Cloudflare's client IP first", () => {
  const request = new Request("https://x.test", { headers: { "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "10.0.0.1, 198.51.100.2" } });
  assert.equal(clientIp(request), "203.0.113.7");
  assert.equal(clientIp(new Request("https://x.test", { headers: { "x-forwarded-for": "198.51.100.2, 10.0.0.1" } })), "198.51.100.2");
  assert.equal(clientIp(new Request("https://x.test")), "unknown");
});

test("answers 429 with Retry-After once the user bucket is spent", async () => {
  const user = `u-${Math.random()}`;
  for (let i = 0; i < 120; i++) assert.equal(await rateLimit("user", user), null);
  const refused = await rateLimit("user", user);
  assert.equal(refused?.status, 429);
  assert.equal(refused?.headers.get("retry-after"), "60");
});
