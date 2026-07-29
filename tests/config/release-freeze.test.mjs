import assert from "node:assert/strict";
import { globSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");

function files(pattern) {
  return globSync(pattern, { cwd: root })
    .map((file) => file.replaceAll("\\", "/"))
    .sort();
}

function dependencies(file) {
  const manifest = JSON.parse(readFileSync(resolve(root, file), "utf8"));
  return [
    ...Object.entries(manifest.dependencies ?? {}).map(
      ([name, version]) => `prod:${name}@${version}`,
    ),
    ...Object.entries(manifest.devDependencies ?? {}).map(
      ([name, version]) => `dev:${name}@${version}`,
    ),
  ].sort();
}

test("Day 10 freeze locks the migration inventory", () => {
  assert.deepEqual(files("supabase/migrations/*.sql"), [
    "supabase/migrations/202607280001_academic_foundation.sql",
    "supabase/migrations/202607280002_academic_alpha.sql",
    "supabase/migrations/202607280003_academic_alpha_hardening.sql",
    "supabase/migrations/202607280004_release_hardening.sql",
    "supabase/migrations/202607280005_moderator_role.sql",
    "supabase/migrations/202607280006_community_safety.sql",
    "supabase/migrations/202607290007_ai_gateway_rag.sql",
    "supabase/migrations/202607290008_ai_citation_detail.sql",
  ]);
});

test("Day 10 freeze locks the web and Expo runtime inventories", () => {
  assert.deepEqual(files("apps/web/src/app/api/**/route.ts"), [
    "apps/web/src/app/api/ai/citations/[id]/route.ts",
    "apps/web/src/app/api/ai/consent/route.ts",
    "apps/web/src/app/api/ai/tutor/route.ts",
    "apps/web/src/app/api/assignments/route.ts",
    "apps/web/src/app/api/classes/route.ts",
    "apps/web/src/app/api/community/messages/[id]/reactions/route.ts",
    "apps/web/src/app/api/community/messages/[id]/reports/route.ts",
    "apps/web/src/app/api/community/moderation/reports/[id]/actions/route.ts",
    "apps/web/src/app/api/community/moderation/route.ts",
    "apps/web/src/app/api/community/spaces/[id]/leave/route.ts",
    "apps/web/src/app/api/community/spaces/[id]/messages/route.ts",
    "apps/web/src/app/api/community/spaces/[id]/mute/route.ts",
    "apps/web/src/app/api/community/spaces/[id]/slow-mode/route.ts",
    "apps/web/src/app/api/community/spaces/route.ts",
    "apps/web/src/app/api/community/users/[id]/block/route.ts",
    "apps/web/src/app/api/submissions/[id]/feedback/route.ts",
    "apps/web/src/app/api/submissions/route.ts",
  ]);
  assert.deepEqual(files("apps/web/src/app/**/page.{js,jsx,ts,tsx}"), [
    "apps/web/src/app/page.tsx",
    "apps/web/src/app/portal/page.tsx",
  ]);
  assert.deepEqual(files("apps/web/src/lib/*.{js,jsx,ts,tsx}"), [
    "apps/web/src/lib/academic-api.ts",
    "apps/web/src/lib/academic-client.ts",
    "apps/web/src/lib/ai-gateway.ts",
    "apps/web/src/lib/supabase-browser.ts",
  ]);
  assert.deepEqual(files("apps/web/src/components/**/*.{js,jsx,ts,tsx}"), [
    "apps/web/src/components/AiTutorPanel.tsx",
    "apps/web/src/components/ModerationQueue.tsx",
  ]);
  assert.deepEqual(files("apps/mobile/app/**/*.{js,jsx,ts,tsx}"), [
    "apps/mobile/app/(tabs)/_layout.tsx",
    "apps/mobile/app/(tabs)/account.tsx",
    "apps/mobile/app/(tabs)/classes.tsx",
    "apps/mobile/app/(tabs)/community.tsx",
    "apps/mobile/app/(tabs)/index.tsx",
    "apps/mobile/app/_layout.tsx",
    "apps/mobile/app/assignment/[id].tsx",
    "apps/mobile/app/class/[id].tsx",
    "apps/mobile/app/community/[id].tsx",
    "apps/mobile/app/index.tsx",
    "apps/mobile/app/tutor.tsx",
  ]);
});

test("Day 10 freeze locks declared dependencies", () => {
  assert.deepEqual(
    files("{package.json,apps/*/package.json,packages/*/package.json}"),
    [
      "apps/mobile/package.json",
      "apps/web/package.json",
      "package.json",
      "packages/contracts/package.json",
    ],
  );

  const frozen = {
    "package.json": ["dev:supabase@2.110.0"],
    "packages/contracts/package.json": ["dev:typescript@^5.9.3"],
    "apps/web/package.json": [
      "prod:@gsap/react@2.1.2",
      "prod:@sao-do/contracts@workspace:*",
      "prod:@supabase/supabase-js@2.110.9",
      "prod:geist@1.7.2",
      "prod:gsap@3.15.0",
      "prod:next@16.2.12",
      "prod:react@19.2.3",
      "prod:react-dom@19.2.3",
      "dev:@types/node@^24.10.0",
      "dev:@types/react@19.2.17",
      "dev:@types/react-dom@19.2.3",
      "dev:eslint@9.39.1",
      "dev:eslint-config-next@16.2.12",
      "dev:typescript@5.9.3",
    ],
    "apps/mobile/package.json": [
      "prod:@react-native-async-storage/async-storage@2.2.0",
      "prod:@sao-do/contracts@workspace:*",
      "prod:@supabase/supabase-js@2.110.9",
      "prod:expo@57.0.8",
      "prod:expo-constants@57.0.7",
      "prod:expo-linking@57.0.4",
      "prod:expo-router@57.0.8",
      "prod:expo-splash-screen@57.0.5",
      "prod:expo-status-bar@57.0.1",
      "prod:react@19.2.3",
      "prod:react-native@0.86.0",
      "prod:react-native-safe-area-context@~5.7.0",
      "prod:react-native-screens@4.26.2",
      "prod:react-native-url-polyfill@3.0.0",
      "dev:@types/react@19.2.17",
      "dev:babel-preset-expo@57.0.4",
      "dev:eslint@9.39.1",
      "dev:eslint-config-expo@57.0.0",
      "dev:typescript@~6.0.3",
    ],
  };

  for (const [file, expected] of Object.entries(frozen)) {
    assert.deepEqual(dependencies(file), expected.toSorted(), file);
  }
});
