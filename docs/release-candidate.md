# Days 8–12 local release hardening

## Current decision

| Field | Current value |
|---|---|
| Label | **Academic Alpha / local hardening** |
| Data | Synthetic tenants and identities only |
| AI | **OFF**; no provider, key, retrieval or AI runtime is part of this candidate |
| External release decision | **NO-GO** until staging, EAS/device, UAT and sign-off gates are complete |

This document is an operator checklist, not evidence of a staging or production release.

## Evidence ledger

Local evidence recorded on 28 July 2026:

| Check | Latest result | Boundary |
|---|---|---|
| PostgreSQL authorization and academic workflow | Pass; 88 pgTAP checks (`71 + 17`) | Local Supabase only |
| Populated migration `002 → current` | Pass; legacy blank review normalized and current migrations reapplied | Disposable local database |
| Backup/restore smoke | Pass; public-data fingerprint matched after restore | Disposable seeded local database |
| Lint and TypeScript | Pass | Local workspace |
| Next.js production build and Expo Android export | Pass | Build/export only; no deployment or installed APK |
| Mobile build configuration validation | Pass; 2/2 | Fail-closed configuration tests |
| Web accessibility automation | Pass; Chrome AX-tree, Admin/Teacher keyboard and focus flow, 320 px layout, and measured CSS page-scale 200% | Glyph measured at 2.00× width and 2.04× height; critical controls and action text fit; Teacher document delta was +18 px |
| Repository and runtime security checks | Pass; one Hermes `.hbc` runtime binary scanned with no secret or service-role finding | Anon-key validator accepts only a publishable key or a JWT whose role is `anon` |
| Database mutation quotas | Pass; membership mutation quota added alongside academic mutation limits | Database boundary only |
| Production API integration on the latest hardening tree | Pass; 1/1 in two consecutive runs against the same database | Local production web/BFF with seeded Supabase |
| Production Chrome academic E2E on the latest hardening tree | Pass; 14/14 | Local production build; no staging claim |
| Android device critical-flow smoke | Not run | Requires EAS Preview and a physical device |

The local migration and restore scripts deliberately refuse to run without `ALLOW_LOCAL_DB_UPGRADE_SMOKE=1` or `ALLOW_LOCAL_DB_RESTORE_SMOKE=1`. They are not production restore tools.

Chrome's CDP operating-system text-scale override produced no measurable desktop metric change. The automation used CSS page-scale only where it produced a useful measurable result. The +18 px Teacher document delta is recorded explicitly; this evidence does not claim zero horizontal overflow or a complete WCAG audit.

## Release boundary

The current tree may be used for local demonstrations with synthetic data. It must not be described as staging-ready, production-ready or approved for real learners.

External promotion requires all of the following:

- A committed immutable Git SHA and a successful hosted CI run for that SHA.
- A named staging Supabase project and HTTPS web/BFF deployment.
- Fresh API integration and Chrome E2E evidence against the promoted build.
- An EAS Preview APK installed from scratch on a physical Android device.
- TalkBack, keyboard, focus, error-state and 200% text-scaling checks.
- UAT by named School Admin, Teacher and Student representatives.
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

Do not use `127.0.0.1`, `localhost` or `10.0.2.2` in an EAS build. Do not add an AI key: AI remains OFF.

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

   Run the migration-upgrade and restore smokes only against the disposable local Supabase project:

   ```text
   ALLOW_LOCAL_DB_UPGRADE_SMOKE=1 pnpm db:upgrade-smoke
   ALLOW_LOCAL_DB_RESTORE_SMOKE=1 pnpm db:restore-smoke
   ```

3. **Take and verify a target backup.** Use the Supabase provider backup/PITR procedure for the exact target project. Record backup ID, timestamp, retention and restore owner. A local dump is not sufficient evidence.
4. **Review migrations.** Confirm the target is at the expected predecessor version. Dry-run the linked migration with the approved Supabase CLI, inspect the SQL, then apply append-only migrations. Never run `db reset` against a shared environment.
5. **Deploy web/BFF.** Configure the four web variables above in the deployment provider, deploy the immutable SHA, and record the provider deployment/version ID.
6. **Smoke web/API.** Verify login for all three synthetic roles, cross-tenant denial, class creation, assignment publication, one idempotent submission replay, feedback and rate-limit `429` with `Retry-After`.
7. **Build EAS Preview.** Configure the preview environment, build the APK, install it from scratch, and run the Student class → assignment → submission → feedback flow.
8. **Collect signatures.** Attach CI, migration, backup, E2E, device, accessibility and UAT evidence to the sign-off table. No signature may be inferred from a passing command.

## Rollback runbook

1. Freeze writes and traffic for the affected flow; record the incident time and target IDs.
2. Roll web/BFF back to the previous immutable deployment through the hosting provider.
3. Do not apply a handwritten down migration. PostgreSQL migrations are append-only; prefer a reviewed forward fix.
4. If data integrity is at risk, isolate the current database and restore the verified provider backup/PITR point into a new recovery instance first.
5. Compare tenant, membership, class, assignment, submission and audit counts; rerun cross-tenant checks before directing traffic to the recovered instance.
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
4. Validate schema version, row-count fingerprint, RLS, audit records and the academic critical flow.
5. Switch traffic only after Human Lead and QA/Security approval.

## Gitleaks provenance

CI downloads Gitleaks `v8.30.1` from the upstream GitHub release, verifies archive SHA-256
`551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb`, then runs:

```text
gitleaks git --redact --no-banner
```

This provenance is defined in `.github/workflows/ci.yml`. It becomes release evidence only when the hosted CI run URL and immutable Git SHA are recorded below.

## Known issues

| Issue | Severity / consequence | Owner / exit condition |
|---|---|---|
| No staging or production deployment | Release blocker | Release Operator records deployment IDs and smoke evidence |
| No EAS Preview install or physical-device/TalkBack evidence | Release blocker | Mobile QA records build URL, device and checklist |
| No UAT or privacy/safeguarding approval | Release blocker for any pilot | Product Lead records approvals |
| Hosted CI/Gitleaks run URL and immutable SHA are not recorded | Release blocker | Repository owner commits, pushes and records the green run |
| Accessibility evidence is automated/browser-based and does not include Android TalkBack, a physical-device audit or a complete WCAG audit | Incomplete mobile/accessibility gate | QA completes manual WCAG checks plus TalkBack, swipe-order and 200% text-scaling checks on the EAS Preview |
| Gateway-level limiting for GET requests, invalid JWTs and attempts rejected before database mutation is absent; monitoring dashboards are also absent | Staging security/operations gate | Configure and test gateway limits and dashboards in staging |
| Only one active membership per account is supported | Product limitation | Add tenant switching when a validated pilot requires it |
| Submission remains text-only | Deliberate scope limit | Add file/URL only with quarantine, scanning and signed-download controls |

## External sign-off

| Gate | Name | Evidence URL or artifact | Date | Decision |
|---|---|---|---|---|
| Human Product/Tech Lead | _Unassigned_ | _Pending_ | _Pending_ | NO-GO |
| Independent QA/Security Reviewer | _Unassigned_ | _Pending_ | _Pending_ | NO-GO |
| School Admin/Teacher UAT representative | _Unassigned_ | _Pending_ | _Pending_ | NO-GO |
| Student/mobile UAT representative | _Unassigned_ | _Pending_ | _Pending_ | NO-GO |
| Privacy/Safeguarding reviewer, if real users | _Unassigned_ | _Pending_ | _Pending_ | NO-GO |
| Release Operator | _Unassigned_ | _Pending_ | _Pending_ | NO-GO |
| Hosted CI/Gitleaks | _Pending SHA_ | _Pending run URL_ | _Pending_ | NO-GO |
