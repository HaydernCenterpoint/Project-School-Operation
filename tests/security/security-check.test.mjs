import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");
const scanner = join(root, "scripts/security-check.mjs");

function runScanner(path) {
  return spawnSync(process.execPath, [scanner, path], {
    cwd: root,
    encoding: "utf8",
  });
}

function serviceRoleJwt() {
  return [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
      "base64url",
    ),
    Buffer.from(JSON.stringify({ role: "service_role" })).toString(
      "base64url",
    ),
    Buffer.from("not-a-real-signature-value").toString("base64url"),
  ].join(".");
}

test("security scanner rejects text and Hermes runtime canaries", () => {
  const directory = mkdtempSync(join(tmpdir(), "saodo-security-canary-"));
  try {
    const clean = join(directory, "clean.txt");
    writeFileSync(clean, "public academic content only\n");
    assert.equal(runScanner(clean).status, 0);

    const keyCanary = join(directory, "key.txt");
    writeFileSync(keyCanary, `sk-${"proj-"}${"a".repeat(28)}\n`);
    const keyResult = runScanner(keyCanary);
    assert.equal(keyResult.status, 1);
    assert.match(keyResult.stderr, /OpenAI key/);

    const publicAiKeyCanary = join(directory, "public-ai-key.txt");
    const webPublicAiKey = ["NEXT", "PUBLIC", "AI", "PROVIDER", "API", "KEY"].join(
      "_",
    );
    const mobilePublicAiToken = [
      "EXPO",
      "PUBLIC",
      "LLM",
      "ACCESS",
      "TOKEN",
    ].join("_");
    writeFileSync(
      publicAiKeyCanary,
      `${webPublicAiKey}=placeholder\n${mobilePublicAiToken}=placeholder\n`,
    );
    const publicAiKeyResult = runScanner(publicAiKeyCanary);
    assert.equal(publicAiKeyResult.status, 1);
    assert.match(publicAiKeyResult.stderr, /public AI credential/);

    const jwtCanary = join(directory, "jwt.txt");
    writeFileSync(jwtCanary, `${serviceRoleJwt()}\n`);
    const jwtResult = runScanner(jwtCanary);
    assert.equal(jwtResult.status, 1);
    assert.match(jwtResult.stderr, /service-role JWT/);

    const cleanHermes = join(directory, "clean.hbc");
    writeFileSync(cleanHermes, Buffer.from([0xc6, 0x1f, 0xbc, 0x03, 0, 1, 2]));
    const cleanHermesResult = runScanner(cleanHermes);
    assert.equal(cleanHermesResult.status, 0, cleanHermesResult.stderr);
    assert.match(cleanHermesResult.stdout, /[1-9]\d* runtime binaries scanned/);

    const secretHermes = join(directory, "secret.hbc");
    writeFileSync(
      secretHermes,
      Buffer.concat([
        Buffer.from([0xc6, 0x1f, 0xbc, 0x03, 0]),
        Buffer.from(`sb_${"secret"}_${"a".repeat(24)}\0${serviceRoleJwt()}`),
        Buffer.from([0, 255, 1]),
      ]),
    );
    const secretHermesResult = runScanner(secretHermes);
    assert.equal(secretHermesResult.status, 1);
    assert.match(secretHermesResult.stderr, /Supabase secret key/);
    assert.match(secretHermesResult.stderr, /service-role JWT/);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});
