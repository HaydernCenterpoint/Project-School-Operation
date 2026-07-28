# Sao Do University Academic Alpha

Days 1–7 vertical slice plus Days 8–12 local release hardening for a tenant-safe school platform:

- Next.js portal for School Admin, Teacher and read-only Student status.
- Expo student app for classes, assignments, text submission and feedback.
- Supabase Auth/Postgres with tenant-scoped RLS and two synthetic tenants.
- Bearer-JWT BFF backed by atomic PostgreSQL RPCs; no service-role request path.
- AI is OFF. The current label is **Academic Alpha / local hardening**, not staging or production.

## Requirements

- Node 24.18
- pnpm 11.9
- Docker

## Start

```powershell
pnpm install
pnpm db:start
pnpm db:reset
pnpm dev:web
pnpm dev:mobile
```

Copy `.env.example` to each local runtime environment and fill it from the local Supabase status output. Do not commit local environment files.

For Android Emulator, `EXPO_PUBLIC_API_URL` uses `10.0.2.2` to reach the host. A physical device must use the development machine's reachable LAN address.

## Checks

```powershell
pnpm lint
pnpm typecheck
pnpm build:web
pnpm build:mobile
pnpm db:reset
pnpm test
pnpm db:lint
pnpm test:config
pnpm test:accessibility
pnpm test:security
pnpm security:check
```

The guarded local migration and restore smokes are destructive to the disposable local Supabase database:

```powershell
$env:ALLOW_LOCAL_DB_UPGRADE_SMOKE = "1"
pnpm db:upgrade-smoke
Remove-Item Env:ALLOW_LOCAL_DB_UPGRADE_SMOKE

$env:ALLOW_LOCAL_DB_RESTORE_SMOKE = "1"
pnpm db:restore-smoke
Remove-Item Env:ALLOW_LOCAL_DB_RESTORE_SMOKE
```

The latest local evidence is **88 pgTAP checks (71 + 17)**, production API integration **1/1 pass twice consecutively against the same database**, and Chrome E2E **14/14 pass**. Accessibility automation covers Chrome AX-tree, Admin/Teacher keyboard and focus flow, 320 px layout and measured CSS page-scale 200%: glyph width 2.00×, height 2.04×, critical controls/action text fit, and Teacher document delta +18 px.

CDP operating-system text scale had no measurable desktop metric effect, so CSS zoom was used only where it yielded a useful measurement. This does not claim zero horizontal overflow, a complete WCAG audit or Android TalkBack/device coverage.

Security evidence includes mobile configuration **2/2 pass**, one Hermes `.hbc` runtime binary scanned with no secret/service-role finding, and an anon validator that accepts only publishable keys or JWTs with role `anon`. Database quotas now cover membership mutations, but gateway limits for GET, invalid JWT and pre-database rejected attempts still require staging configuration and testing.

The CI database job builds and starts the production Next.js bundle, then runs the same seeded API integration and dependency-free Chrome E2E. Hosted CI provenance must still be recorded before external promotion.

Scope, evidence and current limitations are documented in:

- `docs/day-1-3-foundation.md`
- `docs/day-4-7-academic-alpha.md`
- `docs/fixture-manifest.md`
- `docs/operator-guide.md`
- `docs/release-candidate.md`
- `docs/design/brand-system.md`
- `docs/design/fidelity-ledger.md`
