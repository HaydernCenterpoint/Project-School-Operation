# Days 8–12 local release hardening

## Current decision

| Field | Current value |
|---|---|
| Label | **Academic Alpha + Day 6 Community Safety + bounded Day 9 AI Tutor / local candidate** |
| Data | Two synthetic tenants and eight synthetic identities: six academic accounts plus two Moderators |
| AI | **OFF by default**; the server-only Tutor gateway, lexical retrieval, openable citation detail and fixed 24-case automated evaluation are present for local validation, with no approved external provider or key |
| External release decision | **NO-GO** until staging, EAS/device, UAT and sign-off gates are complete |

This document is an operator checklist, not evidence of a staging or production release.

## Evidence ledger

The table below records the last confirmed Day 6 evidence from 29 July 2026. It predates the current Day 9 candidate and must not be used as proof that the current tree passes.

| Check | Latest result | Boundary |
|---|---|---|
| PostgreSQL authorization, academic workflow and community safety | Pass; 202/202 pgTAP checks across three files | Local Supabase only |
| Populated migration `002 → current` | Pass; legacy academic normalization plus Moderator/community objects verified | Disposable local database |
| Backup/restore smoke | Pass; fingerprint matched for academic data and all eight community tables | Disposable seeded local database |
| Lint and TypeScript | Pass | Local workspace |
| Next.js route inventory | Pass; production build contains 14 BFF route files: four academic and ten community | Local production build |
| Next.js production build and Expo Android export | Pass; fresh Day 6 build/export | Build/export only; no deployment or installed APK |
| Mobile build configuration validation | Pass; 2/2 | Fail-closed configuration tests |
| Web accessibility automation | Pass; Chrome AX-tree, Admin/Teacher/Moderator keyboard and focus flow, 320 px critical layouts and measured CSS page-scale 200% | Local automation; not a complete WCAG or TalkBack audit |
| Repository and runtime security checks | Pass; 572 text files and one Hermes runtime binary scanned | No secret or service-role credential finding |
| Database mutation quotas | Pass; membership mutation quota added alongside academic mutation limits | Database boundary only |
| Production API integration on the latest hardening tree | Pass; academic and community suites | Local production web/BFF with seeded Supabase |
| Production Chrome E2E | Pass; combined academic and Community Safety suite 15/15 | Local production build; no staging claim |
| Android device critical-flow smoke | Not run | Requires EAS Preview and a physical device |

The local migration and restore scripts deliberately refuse to run without `ALLOW_LOCAL_DB_UPGRADE_SMOKE=1` or `ALLOW_LOCAL_DB_RESTORE_SMOKE=1`. They are not production restore tools.

### Current Day 9 local evidence

| Check | Exact command | Result |
|---|---|---|
| Workspace lint/typecheck, optimized web build, Expo Android export, configuration, contrast, security canary and repository/runtime scan | `pnpm verify:static` | Pass; 17 BFF route files: four academic, ten community and three AI |
| Clean local migration and synthetic seed | `pnpm db:reset` | Pass |
| PostgreSQL authorization, consent, quota, lexical retrieval, citation detail and content-free telemetry | `pnpm db:test` | Pass; 298/298 pgTAP checks |
| Database schema lint | `pnpm db:lint` | Pass; clean |
| Fixed AI safety/resilience manifest | `pnpm test:ai-eval` | Pass; 24/24 cases, TAP 25 including parent; 16 provider calls; 10 terminal usage rows per Student; no `started` row remains; malformed, unknown, foreign-tenant and wrong-class citation requests return canonical 404 |
| Seeded local API integration with the loopback fake provider | `pnpm test:integration` | Pass; academic 1/1, community 1/1 and AI Tutor 1/1 |
| Local Chrome UI E2E | `pnpm test:e2e:web` | Pass; 16/16 including authorized `AURORA_A_ONLY` citation detail with no `BENTHIC_B_ONLY`, recovery through the real BFF after a provider 500, deterministic Cancel, honest copy and Retry with a fresh request UUID |
| Separate AI-off production server | `node --test tests/integration/academic-flow.test.mjs` then `pnpm test:ai-off` | Pass; academic 1/1 and AI-off 1/1 with no provider configuration or AI usage |
| Hosted CI for the Day 9 implementation commit | [CI run 30398353676](https://github.com/HaydernCenterpoint/sao-do-school-ai/actions/runs/30398353676) | Pass; jobs `quality` and `database` for immutable SHA `faf3c09ad0d3ef9daeb8a5719c533f1779de5c8f` |

The CI-only provider is an OpenAI-compatible fake server on loopback. The corpus contains synthetic or de-identified seeded text chunks. This evidence remains local and does not approve any external provider. The automated answerable cases prove scoped retrieval and openable citations, not human semantic grounding: **8/8 human reviews remain PENDING**. See [Day 9 AI evaluation](day-9-ai-evaluation.md).

Chrome's CDP operating-system text-scale override produced no measurable desktop metric change. The automation used CSS page-scale only where it produced a useful measurable result. The +18 px Teacher document delta is recorded explicitly; this evidence does not claim zero horizontal overflow or a complete WCAG audit.

## Release boundary

The current tree may be used for local demonstrations with synthetic data. It must not be described as staging-ready, production-ready or approved for real learners.

External promotion requires all of the following:

- A committed immutable Git SHA and a successful hosted CI run for that SHA.
- A named staging Supabase project and HTTPS web/BFF deployment.
- Fresh API integration and Chrome E2E evidence against the promoted build.
- A named, approved external AI provider and server-only key before the Tutor is enabled outside local deterministic tests.
- Privacy and safeguarding approval for the provider transfer, consent text and policy version.
- Human semantic-grounding approval for all eight answerable evaluation cases.
- An EAS Preview APK installed from scratch on a physical Android device.
- TalkBack, keyboard, focus, error-state and 200% text-scaling checks.
- UAT by named School Admin, Teacher, Student and Moderator/Safeguarding representatives.
- Privacy/safeguarding approval before any real or under-18 data is used.
- Human Lead and independent QA/Security sign-off.

## Runtime configuration

No value below is a private server credential. Values still belong in the target environment, never in Git.

### Web/BFF

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

The BFF continues to use the caller's Bearer JWT. A Supabase service-role key is neither required nor allowed on a request path.

### Day 9 AI Tutor server only

Keep `AI_TUTOR_ENABLED=false` unless the external provider, privacy and safeguarding gates have been approved for the target environment.

- `AI_TUTOR_ENABLED`
- `AI_PROVIDER_URL`
- `AI_PROVIDER_API_KEY`
- `AI_PROVIDER_ID`
- `AI_PROVIDER_MODEL`
- `AI_PROVIDER_TIMEOUT_MS` — optional; may shorten, but not exceed, the 8,000 ms gateway cap.

These values belong only in the server runtime. Never create `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*` AI credentials, and never add an AI key to an EAS build. External provider URLs must use HTTPS; HTTP is accepted only for loopback local testing.

### EAS Preview

- `EXPO_PUBLIC_SUPABASE_URL` — deployed HTTPS Supabase URL.
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — public anon key protected by RLS.
- `EXPO_PUBLIC_API_URL` — deployed HTTPS web/BFF origin.

With an authenticated, organization-approved `eas-cli`:

```text
cd apps/mobile
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value "<https-url>" --visibility plaintext
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<public-anon-key>" --visibility plaintext
eas env:create --environment preview --name EXPO_PUBLIC_API_URL --value "<https-bff-origin>" --visibility plaintext
eas build --platform android --profile preview
```

Do not use `127.0.0.1`, `localhost` or `10.0.2.2` in an EAS build. Do not add an AI key: the mobile client never receives it.

## Deployment runbook

1. **Freeze the candidate.** Record the Git SHA, migration list, target project IDs, owners and rollback version. Stop if the tree is dirty or CI has not passed for the same SHA.
2. **Reproduce local evidence.**

   ```text
   pnpm install --frozen-lockfile
   pnpm verify:static
   pnpm db:start
   pnpm db:reset
   pnpm db:test
   pnpm db:lint
   ```

   Reproduce `pnpm test:ai-eval`, the integration/E2E suites and `pnpm test:ai-off` through the production-server sequence in `.github/workflows/ci.yml`. The eval requires the AI-on server and loopback fake provider; the AI-off regression requires its separate AI-off server.

   Run the migration-upgrade and restore smokes only against the disposable local Supabase project:

   ```text
   ALLOW_LOCAL_DB_UPGRADE_SMOKE=1 pnpm db:upgrade-smoke
   ALLOW_LOCAL_DB_RESTORE_SMOKE=1 pnpm db:restore-smoke
   ```

3. **Take and verify a target backup.** Use the Supabase provider backup/PITR procedure for the exact target project. Record backup ID, timestamp, retention and restore owner. A local dump is not sufficient evidence.
4. **Review migrations.** Confirm the target is at the expected predecessor version. Dry-run the linked migration with the approved Supabase CLI, inspect the SQL, then apply append-only migrations. Never run `db reset` against a shared environment.
5. **Deploy web/BFF.** Configure the four Supabase web variables above in the deployment provider, deploy the immutable SHA, and record the provider deployment/version ID. Keep the AI Tutor off unless its separate provider, privacy and safeguarding approvals are attached.
6. **Smoke web/API.** Verify login for all four synthetic roles; cross-tenant denial; class creation, assignment publication, one idempotent submission replay and feedback; community post, report and human moderation; and rate-limit `429` with `Retry-After`.
7. **Build EAS Preview.** Configure the preview environment, build the APK, install it from scratch, and run the Student class → assignment → submission → feedback flow plus Student community post/report/realtime checks.
8. **Collect signatures.** Attach CI, migration, backup, E2E, device, accessibility and UAT evidence to the sign-off table. No signature may be inferred from a passing command.

## Rollback runbook

1. Freeze writes and traffic for the affected flow; record the incident time and target IDs.
2. Roll web/BFF back to the previous immutable deployment through the hosting provider.
3. Do not apply a handwritten down migration. PostgreSQL migrations are append-only; prefer a reviewed forward fix.
4. If data integrity is at risk, isolate the current database and restore the verified provider backup/PITR point into a new recovery instance first.
5. Compare tenant, membership, class, assignment, submission, community, report, moderation and audit counts; rerun cross-tenant checks before directing traffic to the recovered instance.
6. Reissue the candidate only after affected tests, device smoke, UAT and QA/Security review have been repeated.

## Restore runbook

### Disposable local sandbox

The command below truncates and restores seeded local tables. Confirm the Supabase project is the local sandbox first.

```powershell
$env:ALLOW_LOCAL_DB_RESTORE_SMOKE = "1"
pnpm db:restore-smoke
Remove-Item Env:ALLOW_LOCAL_DB_RESTORE_SMOKE
```

### Staging or production

Do not reuse the local script. The Release Operator must:

1. Confirm the exact provider project and restore point with a second reviewer.
2. Freeze writes and preserve the affected database for investigation.
3. Restore through provider backup/PITR into an isolated recovery project.
4. Validate schema version, row-count fingerprint, RLS, audit records and the academic/community critical flows.
5. Switch traffic only after Human Lead and QA/Security approval.

## Gitleaks provenance

CI downloads Gitleaks `v8.30.1` from the upstream GitHub release, verifies archive SHA-256
`551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb`, then runs:

```text
gitleaks git --redact --no-banner
```

The quality job checks out full history before scanning. Once this workflow exists on the repository default branch, it can be started with `workflow_dispatch`. The Day 9 implementation provenance is recorded below; a later promoted SHA must have its own fresh hosted run.

## Known issues

| Issue | Severity / consequence | Owner / exit condition |
|---|---|---|
| No staging or production deployment | Release blocker | Release Operator records deployment IDs and smoke evidence |
| No EAS Preview install or physical-device/TalkBack evidence | Release blocker | Mobile QA records build URL, device and checklist |
| No UAT or privacy/safeguarding approval | Release blocker for any pilot | Product Lead records approvals |
| No approved external AI provider/key or privacy/safeguarding approval for provider transfer | AI enablement blocker | Keep `AI_TUTOR_ENABLED=false` until named approvals and staging failure-mode evidence are recorded |
| Human semantic-grounding review is pending for 8/8 cases | AI enablement blocker | A named reviewer checks all eight answerable cases and records 8/8 decisions; automation is not approval |
| Accessibility evidence is automated/browser-based and does not include Android TalkBack, a physical-device audit or a complete WCAG audit | Incomplete mobile/accessibility gate | QA completes manual WCAG checks plus TalkBack, swipe-order and 200% text-scaling checks on the EAS Preview |
| Gateway-level limiting for GET requests, invalid JWTs and attempts rejected before database mutation is absent; monitoring dashboards are also absent | Staging security/operations gate | Configure and test gateway limits and dashboards in staging |
| Only one active membership per account is supported | Product limitation | Add tenant switching when a validated pilot requires it |
| Submission remains text-only | Deliberate scope limit | Add file/URL only with quarantine, scanning and signed-download controls |

## External sign-off

| Gate | Name | Evidence URL or artifact | Date | Decision |
|---|---|---|---|---|
| Human Product/Tech Lead | _Unassigned_ | _Pending_ | _Pending_ | NO-GO |
| Independent QA/Security Reviewer | _Unassigned_ | _Pending_ | _Pending_ | NO-GO |
| School Admin/Teacher/Moderator UAT representative | _Unassigned_ | _Pending_ | _Pending_ | NO-GO |
| Student/mobile UAT representative | _Unassigned_ | _Pending_ | _Pending_ | NO-GO |
| Privacy/Safeguarding reviewer, for AI provider transfer or real users | _Unassigned_ | _Pending_ | _Pending_ | NO-GO |
| AI semantic-grounding reviewer, 8/8 answerable cases | _Unassigned_ | _Pending_ | _Pending_ | NO-GO |
| Release Operator | _Unassigned_ | _Pending_ | _Pending_ | NO-GO |
| Hosted CI/Gitleaks | `faf3c09ad0d3ef9daeb8a5719c533f1779de5c8f` | [CI run 30398353676](https://github.com/HaydernCenterpoint/sao-do-school-ai/actions/runs/30398353676) | 29 July 2026 | PASS |
