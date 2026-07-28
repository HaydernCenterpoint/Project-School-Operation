import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");
const script = resolve(root, "scripts/validate-mobile-build-env.mjs");
const cleanEnvironment = {
  PATH: process.env.PATH,
  SystemRoot: process.env.SystemRoot,
};

function validate(environment) {
  return spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: "utf8",
    env: { ...cleanEnvironment, ...environment },
  });
}

function jwt(role) {
  return [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
      "base64url",
    ),
    Buffer.from(JSON.stringify({ role })).toString("base64url"),
    Buffer.from("not-a-real-signature-value").toString("base64url"),
  ].join(".");
}

test("EAS build fails closed without deployable runtime configuration", () => {
  assert.equal(validate({ EAS_BUILD: "true" }).status, 1);

  const valid = validate({
    EAS_BUILD: "true",
    EXPO_PUBLIC_API_URL: "https://academic.example.test",
    EXPO_PUBLIC_SUPABASE_ANON_KEY: `sb_publishable_${"a".repeat(24)}`,
    EXPO_PUBLIC_SUPABASE_URL: "https://school.example.test",
  });
  assert.equal(valid.status, 0, valid.stderr);

  const validJwt = validate({
    EAS_BUILD: "true",
    EXPO_PUBLIC_API_URL: "https://academic.example.test",
    EXPO_PUBLIC_SUPABASE_ANON_KEY: jwt("anon"),
    EXPO_PUBLIC_SUPABASE_URL: "https://school.example.test",
  });
  assert.equal(validJwt.status, 0, validJwt.stderr);

  const localOnly = validate({
    EAS_BUILD: "true",
    EXPO_PUBLIC_API_URL: "http://10.0.2.2:3000",
    EXPO_PUBLIC_SUPABASE_ANON_KEY: `sb_publishable_${"a".repeat(24)}`,
    EXPO_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  });
  assert.equal(localOnly.status, 1);
});

test("EAS build rejects secret, privileged, malformed, and unknown anon keys", () => {
  const base = {
    EAS_BUILD: "true",
    EXPO_PUBLIC_API_URL: "https://academic.example.test",
    EXPO_PUBLIC_SUPABASE_URL: "https://school.example.test",
  };
  const rejected = [
    `sb_${"secret"}_${"a".repeat(24)}`,
    jwt("service_role"),
    jwt("authenticated"),
    "not-a-jwt",
    `sb_publishable_${"short"}`,
  ];

  for (const key of rejected) {
    const result = validate({
      ...base,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: key,
    });
    assert.equal(result.status, 1, `unexpectedly accepted ${key}`);
    assert.match(result.stderr, /publishable key or JWT with role anon/);
  }
});
