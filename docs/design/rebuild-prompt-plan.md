# Đại học Sao Đỏ — website rebuild prompt and plan

Prepared 26 September 2026. Status: proposed design and implementation brief; no application changes made.

## Start here

Rebuild the Vietnamese web experience around students: a welcoming campus introduction, clear account and guest entry, a rounded modern dashboard, and a working AI study assistant. Preserve the university identity and existing data protections. This is a complete experience redesign with targeted backend extensions, not a database replacement.

The recommended direction is **Campus Study Studio**: white and pale blue surfaces, strong navy typography, university blue actions, restrained red highlights, generous spacing, and soft rounded geometry. The campus drawing should be the welcome page’s main visual; the logo should identify the university and provide loading feedback.

## Mandatory website language: Vietnamese

The planning document and execution prompt may be English, but the website must use natural Vietnamese with full diacritics throughout. This applies to welcome, login, guest, student, teacher, and admin screens, navigation, buttons, labels, placeholders, validation, notifications, dialogs, loading/empty/error states, accessibility labels, page titles, and metadata. Do not ship English template text or expose raw English API/provider errors; map error codes to helpful Vietnamese messages.

Use consistent terms: “Tổng quan”, “Lớp học”, “Bài tập”, “Trợ lý AI”, “Tài khoản”, “Đăng nhập”, “Đăng xuất”, “Tiếp tục với tư cách khách”, and “Đang tải…”. Keep `html lang="vi"`, format dates and numbers with `vi-VN`, and display academic deadlines in `Asia/Ho_Chi_Minh` with a clear timezone convention. Preserve UTF-8 and verify Vietnamese accents in every font weight.

AI replies and generated conversation titles default to Vietnamese. The assistant may use another language when the student explicitly requests it or the learning task requires it, such as English practice or translation. Preserve user-authored content, code, proper names, and the original logo lettering rather than automatically translating them. Internal code identifiers, API routes, and developer documentation may remain English; no language switcher is required.

Acceptance requires a Vietnamese copy review of every route and its loading, empty, validation, and error states, including assistive-technology text. No unintended English UI strings may remain.

## What the repository actually contains

| Area | Evidence | Implication |
|---|---|---|
| Web | `apps/web/package.json`: Next.js 16.2.12, React 19.2.3, TypeScript, Geist, GSAP | Retain this foundation; no framework migration is needed. |
| Welcome and login | `apps/web/src/app/page.tsx` | Currently one long page with a logo hero, scroll animation, and embedded email/password login. Split these journeys. |
| Portal | `apps/web/src/app/portal/page.tsx` | One large client component handles admin, teacher, and read-only student views. Separate student navigation and workflows. |
| Academic API | `apps/web/src/app/api`, `apps/web/src/lib/academic-api.ts` | Bearer token verification, membership checks, input limits, and user-scoped database access already exist. Extend them. |
| Student submissions | `apps/web/src/app/api/submissions/route.ts` | Text submission already supports student authorization and idempotency. Expose this capability on the web. |
| Database | `supabase/migrations`, `supabase/tests/database` | Existing tenant isolation, RLS, atomic academic RPCs, and quotas must survive the redesign. |
| Mobile | `apps/mobile`, `packages/contracts` | Expo consumes shared contracts and academic endpoints. Keep existing contracts compatible. A native mobile redesign is outside this web brief. |
| AI | `README.md` explicitly says AI is off | AI chat, provider integration, conversation persistence, and budgets are new work. |
| Assets | `assets/brand/sao-do-university-logo.png`, web copy at `apps/web/public/sao-do-logo.png` | Use the original logo unchanged. |
| Campus drawing | No separate drawing found in the searched project image files, including hidden/ignored project files outside generated directories | Obtain its path before final visual acceptance. Do not replace it with a UI screenshot or claim it was found. |

Existing test results in the README are historical evidence, not tests rerun for this plan. The working tree was clean at inspection.

## Approach decision

| Option | Trade-off |
|---|---|
| **Recommended: rebuild the web experience and extend the existing backend** | Delivers a visibly new product while preserving accounts, classes, mobile compatibility, and authorization work. |
| Cosmetic reskin only | Fastest, but leaves students without a complete web workflow or real AI integration. Does not satisfy the brief. |
| Replace frontend, backend, and database together | Adds migration and regression risk without an identified need. Avoid unless inspection uncovers a concrete blocker. |

The new design supersedes the old 8–12px corner preference and portal motion restriction in `docs/design/brand-system.md`. Update that document during implementation so there is one current design source.

## 1. Welcome, login, and guest experience

### Welcome `/`

Use a compact logo/navigation header and an airy hero with Vietnamese copy beside the campus drawing. Give the drawing approximately half the desktop composition, preserve its aspect ratio, and avoid cropping significant buildings or baked-in lettering. On mobile, stack the copy, entry actions, and drawing without pushing entry controls far below the first screen.

Suggested headline: **“Không gian học tập của bạn, tại Sao Đỏ.”** Supporting copy: “Theo dõi lớp học, hoàn thành bài tập và học cùng trợ lý AI.” Display the AI claim only when that feature is available; otherwise use academic-only copy.

Provide two distinct actions: **“Đăng nhập”** and **“Khám phá với tư cách khách”**. Below the hero, explain the actual student journey with a short product preview and a compact introduction to study support. Remove the long technical manifesto about roles and database access. Avoid fabricated usage counts, testimonials, schedules, and grades.

Animate the drawing container with a gentle opacity/position entrance. Do not assume a flat raster drawing has separate layers. A pending asset is a documented visual dependency; use an explicitly temporary development placeholder until supplied, never as the finished result.

### Login `/login`

Use a split desktop layout: campus artwork and university identity on one side, a calm rounded form panel on the other. Mobile becomes a single-column form with compact branding.

Retain Supabase email/password login. Include persistent labels, password visibility, autocomplete, keyboard submission, pending feedback, and clear Vietnamese errors. Add password recovery only with a working recovery route and configured callback. Never ship a decorative recovery link.

Students enter `/student`; teachers and admins retain their authorized portal workflow. Preserve old `/#dang-nhap` entry links through a visible login link/anchor compatibility treatment. Keep `/portal` as a compatible role-aware entry route. Validate any return URL as a local allowed destination.

### Guest `/guest`

Default assumption: guest access is a useful public demo with clearly labeled synthetic data, not an anonymous account with school-data privileges. Show a sample dashboard and a prerecorded study interaction marked **“Nội dung minh họa”**. No private classes, submissions, profiles, or paid AI calls are available to guests.

Keep a visible **“Chế độ khách”** label and an easy login action. Guest restrictions must be enforced on APIs as well as in the interface. Live guest AI can be a later, explicitly budgeted feature.

### Logo loading behavior

Use the actual logo, retaining its colors, proportions, lettering, and readability. Animate a subtle halo or opacity around it; do not spin or distort the university name.

On every hard reload, show branded startup feedback while initialization is pending, then dismiss promptly. On every route navigation, provide a brief nonblocking logo transition; show an expanded loading state only while the destination is genuinely pending. Use route loading boundaries plus a shared navigation indicator, accounting for cached transitions and browser back/forward. Do not add a forced multi-second delay.

Use local skeletons for dashboard data and inline feedback for AI generation so typing and the page remain usable. Respect reduced motion with a static logo and status text. Include accessible status announcements, avoid repeated announcements per streamed token, and always offer a recoverable error state if initialization fails.

## 2. Student dashboard and visual system

### Visual rules

| Element | Proposed treatment |
|---|---|
| Palette | Navy `#071A34`, university blue `#0066CC`, white, pale blue `#F4F7FB`; red `#D60000` used sparingly. Yellow remains a small brand accent. Validate actual text/background combinations. |
| Corners | Buttons and inputs 14px; compact panels 18px; primary cards 24px; dialogs 28px. Pills only for tags/avatar treatments. |
| Typography | Reuse Geist, verify Vietnamese diacritics and wrapping. Body 16px with comfortable line height; quieter dashboard headings than the welcome hero. |
| Motion | Control feedback about 120–180ms; page/card entrances about 180–260ms. Reuse CSS and installed GSAP where needed. Reduced-motion alternatives throughout. |
| Layout | Desktop sidebar plus workspace; tablet collapsible navigation; mobile bottom navigation for core student destinations. No hover-only actions. |

Use soft elevation and consistent spacing rather than nested boxes everywhere. Keep focus visible, touch targets at least 44px, and rounded controls readable in all disabled, hover, error, and busy states.

### Proposed routes

| Route | Student purpose |
|---|---|
| `/student` | See what needs attention and resume study. |
| `/student/classes`, `/student/classes/[id]` | View enrolled classes and published assignments. |
| `/student/assignments`, `/student/assignments/[id]` | Review instructions, submit text, and read feedback. |
| `/student/ai` | Work with the AI study assistant and conversation history. |
| `/student/account` | View account information, sign out, and manage supported preferences. |

The home dashboard should prioritize a personal greeting, upcoming assignment deadlines, enrolled classes, recent feedback, and one **“Học cùng AI”** action. Derive counts from real authorized data. An assignment deadline list is supported by existing data; a class timetable is not, so do not invent scheduled lectures.

Keep the main work column spacious with a narrower upcoming-work panel at desktop widths. Use distinct layouts for deadlines, class cards, and feedback rather than identical statistic tiles. Empty states should suggest a real next action and never fabricate progress.

Enable student text submission through the existing API, respecting its 20,000-character limit, assignment policies, and idempotency semantics. Preserve draft text during recoverable failures; do not imply post-submission editing exists unless explicitly implemented. AI-generated notes never submit an assignment automatically.

## 3. AI study workspace and backend

### Student experience

Start with four modes: **Giải thích bài học**, **Tóm tắt nội dung**, **Luyện tập câu hỏi**, and **Lập kế hoạch học tập**. These are task instructions within one conversation service, not four separate systems.

Support streamed answers, stop generation, retry failed requests, copy text, conversation history, and deletion. Preserve the draft on errors. Render formatted answers safely; do not execute generated HTML or code. Show clear Vietnamese states for unavailable service, expired login, exhausted allowance, connection loss, and provider errors.

Version one accepts typed/pasted text and optionally an explicitly selected authorized assignment. File uploads, document indexing, OCR, web search, and autonomous tools are later scope. If source context is supplied, show real source references; general model answers must not invent citations. AI guidance should help the student reason and clearly distinguish suggestions from teacher feedback.

### Request path

Browser sends its authenticated request to the Next.js backend. The backend validates identity, membership, ownership, payload, limits, and selected academic context; calls the configured provider with a server-only credential; streams the answer; and records conversation state and usage. The browser never receives a provider secret.

Reuse `getAcademicContext` and user-scoped Supabase access. Never trust a client-supplied tenant or owner ID. Authorization must be rechecked when reopening conversations or attaching assignment context. Do not introduce service-role access into ordinary student requests.

### Proposed API and persistence

| Surface | Responsibility |
|---|---|
| `POST /api/ai/chat` | Validate a conversation/message/mode request and idempotency key; return a stream of typed start, delta, complete, or error events. |
| `GET/POST /api/ai/conversations` | List with pagination or create the current user's conversations. |
| `GET/DELETE /api/ai/conversations/[id]` | Read or delete an owned conversation; never expose another user's content. |
| `GET /api/ai/usage` | Report current server-enforced allowance and reset information. |
| New database tables | Conversations, messages, and usage reservations/events, with tenant and owner scoping, constraints, indexes, and RLS. |

Use one provider adapter with an explicit server-side model allowlist. Provider and model are unresolved deployment choices; verify their official API documentation, streaming format, retention options, and current pricing before implementation. Do not expose an arbitrary provider URL or model selector to students.

Proposed server configuration: `AI_ENABLED`, `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`, and per-student/per-tenant budget settings. None of the secrets use `NEXT_PUBLIC_` or `EXPO_PUBLIC_`. Keep AI disabled until configuration and integration checks pass; academic workflows must continue working independently.

### Reliability, privacy, and cost controls

1. Enforce request size, input/output token ceilings, per-user concurrency, and durable rate/budget limits before provider calls. Reserve allowance atomically so simultaneous requests cannot bypass limits; reconcile actual usage after completion and handle abandoned reservations conservatively.
2. Give each generation a unique request key and persisted state. Duplicate requests must not silently trigger extra billable generations. Persist completed or interrupted results accurately; never present a partial stream as complete. Abort provider work on user cancellation/disconnection where supported and impose a server timeout.
3. Treat supplied academic material as untrusted content. Send only the selected authorized context, never unrelated students' work. Keep authorization independent of model instructions. Do not give the model database mutation tools.
4. Explain before first use that selected content is sent to an AI provider. Default proposed chat retention is 30 days, subject to school policy; implement deletion and scheduled cleanup. Keep logs to request IDs, timing, status, and usage rather than message bodies or tokens. Provider-side retention must be documented separately.
5. Test cross-tenant and cross-user access, expired sessions, malformed and oversized inputs, stream failures, cancellation, concurrent quota exhaustion, and duplicate requests. Validate actual deployment streaming and timeout behavior before enabling AI externally.

## 4. Implementation sequence

| Phase | Work and likely files | Exit condition |
|---|---|---|
| 1 — Baseline and design foundation | Capture current flows; locate drawing; revise `docs/design/brand-system.md`; introduce reusable controls and tokens through `apps/web/src/app/globals.css` and focused component files. | Rounded controls and Vietnamese typography verified at mobile and desktop widths; existing auth/API baseline recorded. |
| 2 — Entry experience | Rebuild `src/app/page.tsx`; add login and guest routes; integrate branded loading through layout/loading components. | Welcome → login → correct role works; guest isolation and reload/navigation feedback verified. |
| 3 — Student workspace | Add student layout/routes; extract reusable portal concerns; reuse `academic-client.ts`; extend shared contracts only where required. | Student can find a class, view an assignment, submit once, and read feedback; admin/teacher and mobile contracts still work. |
| 4 — AI vertical slice | Add AI routes, provider adapter, typed contracts, additive migrations, RLS, quota RPCs, and student chat UI. | One authenticated text conversation streams, persists, cancels, reopens, and deletes safely; limits and isolation pass. |
| 5 — Release validation | Extend meaningful tests under existing test directories; update README/operator/release/design evidence; verify staging and rollback. | New flows work end to end, visual/accessibility evidence recorded, and unresolved configuration limits clearly documented. |

Keep implementation slices reviewable. Follow the ponytail ladder: skip unnecessary work, reuse existing code, prefer standard/native capabilities, add dependencies only for a demonstrated gap. Avoid a new state framework, queue, vector database, or second animation library without a concrete requirement.

Apply additive migrations and retain existing data. Do not run database reset or destructive smoke scripts against valuable data. Preserve the legacy portal entry and make AI independently disableable. Rollback should disable AI and revert web deployment without deleting academic data.

## 5. Acceptance and handoff

Run the applicable existing scripts: lint, typecheck, web build, database/RLS tests, API integration, web E2E, accessibility, configuration, and security checks. Run mobile build and compatibility checks when shared contracts or APIs change. Use a disposable local database for destructive fixture preparation. Report what actually ran and distinguish prior evidence from current evidence.

Verify 320px, 390px, 768px, and 1440px layouts; 200% zoom; keyboard-only interaction; visible focus; Vietnamese text; reduced motion; slow/offline network recovery; long AI answers; and loading/error/empty states. Verify contrast, scrolling, mobile keyboard behavior, and no unintended horizontal overflow. Target LCP under 2.5s, INP under 200ms, and CLS under 0.1, measuring rather than claiming success from code inspection.

Required end-to-end journeys: guest demo remains isolated; student login routes correctly; assignment submission remains idempotent; teacher feedback appears for its student; AI cannot read someone else's chat or assignment; disabled/misconfigured AI leaves classes usable. Validate hard reload, cached navigation, back/forward, and failed navigation with logo feedback.

Provide screenshots of welcome, login, guest, dashboard, assignment, and AI views at desktop/mobile sizes; migration/configuration notes; test evidence; and remaining limitations. Do not label the platform production-ready based only on local tests.

## Copy-ready execution prompt

Rebuild the Đại học Sao Đỏ Vietnamese website in this repository using `docs/design/rebuild-prompt-plan.md` as the implementation brief. First recheck repository instructions, current code, and working-tree changes. Implement the five phases in order, preserving existing student data, Supabase authorization/RLS, admin/teacher capabilities, and Expo API compatibility.

LANGUAGE REQUIREMENT: This prompt is English, but all website interface text must be Vietnamese with full diacritics, including every role's screens, navigation, forms, buttons, guest demo content, notifications, loading/empty/error states, accessibility labels, and metadata. Translate API/provider failures into helpful Vietnamese messages rather than exposing raw errors. Keep `html lang="vi"`, use `vi-VN` date/number formatting and `Asia/Ho_Chi_Minh` for academic deadlines. AI replies and generated chat titles default to Vietnamese unless the student requests another language or the learning task requires it. Preserve user content, code, proper names, and original logo lettering. Review all routes and states for unintended English text before completion.

Create a distinctly new Campus Study Studio design: airy white/pale blue surfaces, navy typography, university blue actions, restrained red accents, 14px rounded buttons/inputs, 24px primary cards, comfortable Vietnamese typography, and smooth accessible motion. Use the original school logo unchanged and the user's campus drawing as the welcome hero. If the drawing is still missing, report that dependency precisely and complete independent work without inventing the asset.

Separate welcome, login, and clearly labeled guest demo routes. Add real logo feedback on reload and route navigation without artificial blocking delays. Build a student dashboard with real classes, deadlines, assignments, text submission, feedback, account access, and an AI study workspace. Every visible action must work or have an explicit unavailable state.

Implement AI through authenticated server endpoints, a single configurable provider adapter, private conversation persistence, RLS, atomic quotas, request deduplication, cancellation, safe rendering, and Vietnamese error states. Never expose provider credentials, call paid AI for anonymous guests, bypass tenant isolation, fabricate academic data, or treat generated text as a submitted assignment. Keep AI disabled until configuration and verification succeed. Provider/model credentials are deployment inputs, not values to invent.

Reuse the existing stack and academic API before adding dependencies. Use additive migrations. Run the appropriate existing and new checks, inspect the result in a real browser, and deliver screenshots plus exact verification results. Update the design and operator documentation to match the final implementation. Finish with a concise report of changed behavior, tests, and any remaining external dependencies.
