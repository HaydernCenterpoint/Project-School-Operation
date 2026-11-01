# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Students (Sinh viên Trường Đại học Sao Đỏ):** Access the student workspace (`/student`) on desktop and mobile browsers to track weekly assignment deadlines, submit coursework (`text` submissions with idempotent state), read teacher feedback, collaborate in real-time class/faculty community channels (`/student/community`), follow official school news (`/student/news`), and consult the private AI Study Assistant (`/student/ai`).
- **Teachers (Giảng viên):** Use the unified academic portal (`/portal`) to manage classes, publish assignments with deadlines, review student submissions, and record grading feedback.
- **School Administrators (Quản trị viên):** Use `/portal` to provision classes, manage student/teacher rosters and memberships, oversee community moderation, and monitor tenant-level academic operations.
- **Prospective Students, Parents & Guests (Khách tham quan / Thí sinh):** Visit the public landing page (`/`) and labelled read-only guest demo (`/guest`) to explore Sao Do University's history (founded 1969, upgraded to University 2010), 7 faculties, campus life in Hải Phòng, and academic studio experience before signing in.

## Product Purpose

Sao Do University Academic Platform (`sao-do-school-ai`) is a tenant-safe academic learning, community, and AI study workspace for Trường Đại học Sao Đỏ. It unifies official school announcements, coursework submission and grading, real-time student community channels, and a quota-governed AI study assistant into a single Vietnamese-first digital campus. Success means students never miss a deadline, teachers grade and return feedback without friction, and every academic or AI interaction remains strictly isolated within the user's school tenant.

## Positioning

A multi-tenant academic studio purpose-built for Trường Đại học Sao Đỏ where every mutation, community message, and AI study session executes through Bearer-JWT Next.js route handlers backed by atomic PostgreSQL RPCs and Row-Level Security (`tenant_id` isolation), never exposing a privileged admin bypass to user requests.

## Operating Context

- All interface copy, statuses, and mapped error messages are 100% Vietnamese with full diacritics (`html lang="vi"`).
- Dates format in `vi-VN` and assignment deadlines display in `Asia/Ho_Chi_Minh` with explicit `(giờ Việt Nam)` labelling.
- Student workflows revolve around an 8-week rolling deadline horizon, submission status tracking (`Chưa nộp`, `Đã nộp`, `Đã chấm`), daily AI query allowances, and faculty/class community channels supporting images, video, and voice notes.
- Currently operating at **Academic Alpha / local & Cloudflare Workers deployment hardening** stage with seeded multi-tenant fixtures (`saodo.edu.vn`).

## Capabilities and Constraints

- **Web Stack:** Next.js 16.2.12 (App Router, Turbopack), React 19.2.3, TypeScript 5.9.3, GSAP 3.15, `@opennextjs/cloudflare` deployed on Cloudflare Workers, backed by Supabase Auth, PostgreSQL (RLS + pgTAP), and Storage.
- **Routes:** Public landing (`/`), login (`/login`), clearly labelled read-only guest mode (`/guest`), student studio (`/student`, `/student/classes`, `/student/assignments/[id]`, `/student/community`, `/student/news`, `/student/ai`, `/student/account`), and unified Admin/Teacher management shell (`/portal`).
- **Security & Quota Boundaries:** Strict Content Security Policy (`next.config.ts`), server-only secrets (`AI_API_KEY`, `NEWS_CRON_SECRET`), database-enforced daily AI quota per student, and idempotency keys on submissions and AI requests.
- **Pending Official Asset:** The official campus architectural drawing at `apps/web/public/campus-drawing.webp` (or `.jpg`/`.png`) is not yet supplied by the university; until provided, `apps/web/public/campus-sketch.svg` is rendered as a clearly labelled temporary sketch.

## Brand Commitments

- **Institution Identity:** Trường Đại học Sao Đỏ (Sao Do University — SDU), Министерства Công Thương (Ministry of Industry and Trade).
- **Official Logo:** `assets/brand/sao-do-university-logo.png` (served at `apps/web/public/sao-do-logo.png`) must be used unchanged — never recoloured, cropped, spun, or redrawn.
- **Regional & Cultural Anchor:** Public welcome experience celebrates Hải Phòng — Thành phố Hoa Phượng Đỏ (flamboyant flower motif, sunny academic energy) alongside Sao Đỏ's engineering and vocational heritage since 1969.
- **Voice:** Clear, respectful, academic Vietnamese — supportive for students, precise and scannable for teachers and administrators.

## Evidence on Hand

- **Brand & Photo Sources:** `assets/brand/sao-do-university-logo.png`, faculty photography in `apps/web/public/truong/khoa-*.jpg`, and documented provenance in `docs/design/nguon-anh-truong.md`.
- **Design & QA Documentation:** `docs/design/brand-system.md`, `docs/design/fidelity-ledger.md`, `docs/release-candidate.md`, `docs/operator-guide.md`, and baseline screenshots under `docs/design/redesign-*.png` and `docs/design/qa-*.png`.
- **Automated Verification:** 100+ pgTAP database security/RLS checks (`supabase/tests/`), Playwright/CDP E2E and accessibility suites (`tests/`), and shared Zod/TypeScript contracts (`packages/contracts`).
- **Explicit Absences:** No fabricated student testimonials, unverified employment percentages, or unconfirmed tuition/scholarship figures may be invented.

## Product Principles

1. **Tenant and Role Truth First:** Every number, badge, deadline, and AI allowance shown in the interface must come from the authenticated user's authorised tenant data; guest mode (`/guest`) must always remain unmistakably labelled as sample data.
2. **Vietnamese Academic Clarity:** Write natural, diacritic-complete Vietnamese with explicit Vietnam timezone markers (`giờ Việt Nam`) and human-readable error translations so students and faculty never face raw technical codes.
3. **Institutional Pride Without Clutter:** Let Sao Đỏ's heritage and Hải Phòng's Hoa Phượng Đỏ identity shine on public Persuade surfaces while keeping daily Student and Portal Operate workspaces calm, high-density, and task-focused.
4. **Respect the Official Crest:** Treat the Sao Do University logo and verified campus photography as documentary artifacts — never distort, recolour, or fabricate institutional imagery.

## Accessibility & Inclusion

- Minimum 3:1 contrast for supporting copy and input borders (`--muted`), verified by automated contrast tests (`tests/accessibility/color-contrast.test.mjs`).
- Minimum 44×44 px touch targets on interactive controls and 3 px high-visibility focus outlines.
- Full keyboard navigation across Admin/Teacher and Student flows, 320 px mobile viewport support, 200% CSS page-scale resilience, and `prefers-reduced-motion` support that halts decorative petals, shimmer, and floating motion while preserving static status feedback.
