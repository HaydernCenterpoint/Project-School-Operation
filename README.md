# Sao Do University Academic Alpha + Community Safety

Days 1–3 foundation, the delivered text-only academic slice, the Day 6 Community Safety extension, the bounded Day 7 AI Tutor gateway, the Day 9 evaluation/citation hardening and Days 8–12 local release hardening for a tenant-safe school platform:

- Next.js portal for School Admin, Teacher, read-only Student status and a tenant-scoped Moderator queue.
- Expo app for classes, assignments, text submission, feedback and text-only community spaces.
- Supabase Auth/Postgres with tenant-scoped RLS and two synthetic tenants.
- Bearer-JWT BFF backed by atomic PostgreSQL RPCs; no service-role request path.
- The seed contains eight synthetic accounts: six Admin/Teacher/Student academic accounts and two dedicated Moderator accounts.
- The AI Tutor runtime is **OFF by default**. Students have a one-shot web panel and an Expo `/tutor` screen reached from Today; both use the server-only gateway and PostgreSQL lexical retrieval, with openable tenant-scoped citations and no transcript or history.
- The current label is **Academic Alpha / local candidate**, not staging or production.

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

The production-server AI checks run in CI after a clean seed. `pnpm test:ai-eval`, `pnpm test:integration` and `pnpm test:e2e:web` target the AI-on server with the loopback fake provider; `pnpm test:ai-off` targets a separate server with AI disabled and no provider configuration.

The guarded local migration and restore smokes are destructive to the disposable local Supabase database:

```powershell
$env:ALLOW_LOCAL_DB_UPGRADE_SMOKE = "1"
pnpm db:upgrade-smoke
Remove-Item Env:ALLOW_LOCAL_DB_UPGRADE_SMOKE

$env:ALLOW_LOCAL_DB_RESTORE_SMOKE = "1"
pnpm db:restore-smoke
Remove-Item Env:ALLOW_LOCAL_DB_RESTORE_SMOKE
```

Historical Day 6 evidence was **202/202 pgTAP checks**, two local production-BFF API integration suites and **15/15 local production-build Chrome E2E checks**. Accessibility automation covered Chrome AX-tree, Admin/Teacher and Moderator keyboard/focus flow, 320 px critical layouts and measured CSS page-scale 200%: glyph width 2.00×, height 2.04×, critical controls/action text fit, and Teacher document delta +18 px.

The immutable Day 10 implementation passes a clean database reset, **298/298 pgTAP checks**, schema lint, the fixed AI evaluation at **24/24 cases** (TAP 25 including its parent), all three seeded API integration suites at **1/1 each**, and **16/16 Chrome E2E checks**. The optimized Next.js build contains **17 BFF route files: four academic, ten community and three AI**. The Tutor E2E opens the authorized Campus A citation excerpt without exposing the Campus B marker, recovers through the real BFF after a provider 500, checks honest Cancel behavior and retries with a fresh request UUID. API evaluation also checks canonical 404 responses for malformed, unknown, foreign-tenant and wrong-class citation requests. A separate AI-off production server passes academic **1/1** and AI-off **1/1** without provider configuration or AI usage.

The fixed evaluation made 16 provider calls, recorded 10 terminal usage rows per Student and left no usage row in `started`. Hosted [CI run 30401561230](https://github.com/HaydernCenterpoint/sao-do-school-ai/actions/runs/30401561230) passed `quality` in 1m39s and `database` in 9m04s for immutable Day 10 implementation commit `88bac45e56d6dbee1fb15b1607dd8c6a08166663`. Human semantic-grounding review remains **PENDING for 8/8 answerable cases**; provider/privacy approval, gateway limiting/monitoring, staging, EAS physical-device/TalkBack, UAT and signatures remain external gates.

Day 10 freezes the migration-filename, web route/runtime/UI-component, Expo route, workspace-package and declared-dependency inventories, and maps mobile offline failures to a stable retryable error while preserving deliberate request cancellation. Configuration/freeze passes **5/5** and the focused mobile client suite passes **4/4** locally and in hosted CI.

Local CI configures a loopback fake OpenAI-compatible provider and uses only synthetic or de-identified seeded text chunks. The security evidence includes configuration/freeze **5/5**, contrast **2/2**, security canary **1/1**, repository/runtime scanning, an explicit scan of the new AI/UI files, and no configured provider environment name or value in generated client bundles. None of this validates an external provider.

CDP operating-system text scale had no measurable desktop metric effect, so CSS zoom was used only where it yielded a useful measurement. This does not claim zero horizontal overflow, a complete WCAG audit or Android TalkBack/device coverage.

Security evidence includes configuration/freeze **5/5 pass**, mobile API client **4/4 pass**, one Hermes `.hbc` runtime binary scanned with no secret/service-role finding, and an anon validator that accepts only publishable keys or JWTs with role `anon`. Database quotas now cover membership mutations, but gateway limits for GET, invalid JWT and pre-database rejected attempts still require staging configuration and testing.

The CI database job builds and starts the production Next.js bundle, then runs the academic, community and AI Tutor integration suites plus the dependency-free Chrome E2E. The Day 10 implementation SHA and green hosted run are recorded above; any later promoted SHA still requires its own fresh run.

Scope, evidence and current limitations are documented in:

- `docs/day-1-3-foundation.md`
- `docs/day-4-7-academic-alpha.md`
- `docs/day-7-ai-gateway-rag.md`
- [docs/day-9-ai-evaluation.md](docs/day-9-ai-evaluation.md)
- `docs/day-6-community-safety.md`
- `docs/fixture-manifest.md`
- `docs/operator-guide.md`
- `docs/release-candidate.md`
- `docs/design/brand-system.md`
- `docs/design/fidelity-ledger.md`
