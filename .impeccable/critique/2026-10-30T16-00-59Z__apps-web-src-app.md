---
target: apps/web/src/app
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\datmk\\OneDrive\\Desktop\\Workspace\\Project SDU\\apps\\web\\src\\app"
timestamp: 2026-10-30T16-00-59Z
slug: apps-web-src-app
---
Method: dual-agent (A: design-review · B: detector-and-browser-scan)

#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Strong optimistic nav slider, AI quota meter, and unread badges; community chat polling (2.5s/5s) lacks a connection-lost or stale-sync indicator. |
| 2 | Match System / Real World | 3 | Authentic Vietnamese academic copy (`MSSV`, `Tín chỉ`, `giờ Việt Nam`) and bare MSSV login; `/portal` fabricates UUID-sliced `CLS-3A9F12` codes instead of real SDU class codes. |
| 3 | User Control and Freedom | 2 | `/student/ai` forces `target="_blank"` (`AppShell.tsx:46`) and plays a 1.55s full-screen blooming splash (`AiIntro.tsx`) in every new tab because its seen-flag uses `sessionStorage`. |
| 4 | Consistency and Standards | 2 | `app-phuong.css` remaps `--blue` to `#d62839` inside `.app-shell.sd-app` (violating `DESIGN.md` Two-World Palette Rule), and `AssignmentTable.tsx:86` uses a `more` (`⋯`) icon for direct page navigation. |
| 5 | Error Prevention | 3 | Coursework submission uses a 2-step confirmation + idempotency key + local draft recovery; `/portal` publishes assignments in one click without confirmation, and admin student status suspension (`Tạm khoá` / `Thôi học`) has no confirmation guard. |
| 6 | Recognition Rather Than Recall | 3 | AI composer attaches assignments directly and `@` mentions fold Vietnamese diacritics; tablet collapsed sidebar (`72px` at `641px–960px`) hides all 10 labels and hides `.side-toggle`. |
| 7 | Flexibility and Efficiency | 2 | `/portal` class creation forces scrolling through an unfiltered checkbox list of every student, and teacher grading stacks all student submissions with permanently open textareas. |
| 8 | Aesthetic and Minimalist Design | 3 | Clean individual layouts, but `app-phuong.css` re-introduces shadows and nested cards inside `.app-shell`, plus 8 `side-tab` stripes and 20 `bounce-easing` curves across feature CSS files. |
| 9 | Error Recovery | 4 | Exemplary plain-Vietnamese error mapping (`LoginForm.tsx`, `ai-client.ts`) and automatic draft/attachment restoration when AI streaming fails. |
| 10 | Help and Documentation | 2 | Sidebar `"Xem hướng dẫn"` link (`student/layout.tsx:46`) silently sends authenticated students to `/guest` (prospective student demo) instead of help documentation. |
| **Total** | | **27/40** | **Acceptable (67.5% — 1 point below Good)** |

#### Design Specificity Verdict

**LLM assessment (Assessment A):**
- **Where it shines:** The public welcome surface (`/`, `apps/web/src/app/page.tsx` + `landing.css`) and `.dash-frame` perforated studio ledger (`globals.css:228-229`) are genuinely rooted in Trường Đại học Sao Đỏ and Hải Phòng (documentary campus facts from 1969/2010/2026, custom SVG Hoa Phượng tree with 12s wind gusts, bare numeric MSSV login).
- **Where specificity breaks down:** `apps/web/src/components/app-phuong.css` overrides `.app-shell.sd-app` across `/student`, `/guest`, and `/portal`, replacing the calm Maritime Navy (`#071a34`) + University Blue (`#0066cc`) + flat Paper studio defined in `DESIGN.md` with peach-cream (`#fff6ee`), crimson (`#d62839` mapped onto `--blue`), and elevated drop shadows. When primary buttons, active tabs, completed chart bars, AND overdue danger badges all share the same red-orange spectrum, crimson loses its signal value. Additionally, `TodayPanel.tsx` renders floating shadowed cards with hardcoded demo data (`Còn nợ 4.350.000 đ`) directly above the flat live `.dash-frame` on `/student`.

**Deterministic scan (Assessment B):**
- **Static scan (`apps/web/src`):** **406 findings** (12 warnings, 394 advisories):
  - `side-tab` (9 warnings — 8 genuine card left/top accent stripes in `globals.css:311`, `community.css:174,221`, `news.css:55`, `schedule.css:97,199`, `portal.css:100,155`; 1 false positive on `.bubble blockquote` at `globals.css:534`).
  - `bounce-easing` (20 advisories — `cubic-bezier(.34, 1.56, .64, 1)` overshoot springs in `portal.css`, `community.css`, `admin.css`, `ai-workspace.css`, `news.css` contradicting `DESIGN.md`'s smooth deceleration `--ease`).
  - `design-system-font-size` (186 advisories — 13 genuine sub-12px sizes at `10px–11.5px` in `schedule.css`, `community.css`, `ai-workspace.css`, `portal.css`, `globals.css` that hurt Vietnamese diacritic legibility; ~128 are false positives from sizes documented in `DESIGN.md` prose).
  - `gradient-text` (`landing.css:91`, 1 warning) and `design-system-font` (`globals.css:528,547`, 2 warnings on code/math blocks) are **false positives** explicitly sanctioned by `DESIGN.md`.
- **Live browser scan (`http://localhost:3000`, `/login`, `/guest`):** **17 findings** (12 warnings, 5 advisories):
  - **Both assessments converged independently on `app-phuong.css`:** The browser detector flagged **4 `nested-cards` warnings** (`div.guest-banner`, `div.dash-header`, `div.dash-frame`, `#ai-demo` inside `.app-main`) and **1 `dark-glow` warning** (`a.button.button-primary` blue shadow on dark `#1f1517`) on `/guest` — all caused by `app-phuong.css` turning `.app-main` and interior sections into nested shadowed cards.
  - **6 WCAG AA `low-contrast` findings caught by browser pixel scan (missed by LLM review):**
    1. `/guest` `#top-search` placeholder: **3.9:1** (`#757575` on dark `#1f1517`, needs 4.5:1).
    2. `/guest` `a.avatar`: **3.3:1** (`#ffffff` 14px text on coral-red gradient `#ff7a4d -> #d62839` in `app-phuong.css:43`, needs 4.5:1).
    3. `/` `section.sd-city-band p.sd-eyebrow`: **4.4:1** (`#1f7a45` on `#ffe3d6` gradient).
    4. `/` `div.sd-life-text p.sd-eyebrow`: **4.46:1** (`#d62839` on `#fff1d8` gradient).
    5. `/login` `aside.auth-art p.sd-eyebrow`: **4.49:1** (`#d62839` on `#fff1e4` gradient).
    6. `/` `a.sd-news-card.sd-news-accent > p`: **4.3:1** (`#fff1ea` on `#d6342c` gradient).

#### Overall Impression
The platform has real architectural backbone and authentic Hải Phòng / Đại học Sao Đỏ identity, but a late theme layer (`app-phuong.css`) bled the public landing page's flamboyant red-and-cream aesthetics into the daily working studio, creating nested-card clutter, contrast regressions, and colour-signal overload alongside unscalable teacher grading lists in `/portal`.

#### What's Working
1. **Idempotent, Draft-Safe Coursework Submission (`apps/web/src/app/student/assignments/[id]/page.tsx:44-94`):** Combines `localStorage` auto-saved drafts, payload-bound `Idempotency-Key` UUIDs, and a two-step inline confirmation so flaky connections never lose or duplicate student work.
2. **Vietnamese Diacritic-Folding Search & `@` Mentions (`apps/web/src/components/community/ChatRoom.tsx:36-57`):** `NFD` + `đ/Đ` normalization lets students type `@anh` or `toan` without accents while rendering proper Vietnamese diacritics.
3. **Perforated Studio Ledger Architecture (`apps/web/src/app/globals.css:228-265`):** The `.dash-frame` + `.frame-gap` radial-dot divider band (`16px`) and `tabular-nums` KPI grid give the student dashboard a crisp academic-ledger feel.

#### Priority Issues

- **[P1] What**: `app-phuong.css` breaches `DESIGN.md`'s "Two-World Palette" & "Flat-Inside-The-Shell" rules, causing 4 `nested-cards` warnings, 1 `dark-glow` warning, and crimson signal overload.
  - **Why it matters**: Remapping `--blue` to `#d62839` inside `.app-shell.sd-app` makes active tabs, primary buttons, completed chart bars, and overdue danger badges all share the same red-orange hue, while re-adding `box-shadow` creates card-in-card clutter.
  - **Fix**: Reconcile `app-phuong.css` with `DESIGN.md` — keep `.app-shell` surfaces flat (`box-shadow: none` on interior frames so `.guest-banner`, `.dash-header`, `.dash-frame`, and `#ai-demo` don't nest cards), restore University Blue (`#0066cc`) / Maritime Navy (`#071a34`) for functional controls and completed bars, and reserve `#d60000`/`#d62839` for overdue/unread/accent moments.
  - **Suggested command**: `/impeccable colorize`

- **[P1] What**: 6 WCAG AA text contrast failures across `/guest`, `/`, and `/login`, plus 13 sub-12px Vietnamese label sizes (`10px–11.5px`).
  - **Why it matters**: `#top-search::placeholder` (3.9:1 in dark mode) and `.sd-app .avatar` (3.3:1 white on `#f15d46` midpoint) fail WCAG AA, while `10px–11px` uppercase text clips or blurs stacked Vietnamese tone marks (`ổ`, `ự`, `ễ`).
  - **Fix**: Darken `.sd-app .avatar` gradient to `linear-gradient(135deg, #c81d2e, #8f111d)` (≥4.8:1), set explicit `::placeholder` contrast in dark mode (`#b9a5a2`), nudge `--sd-red` (`#c81e30`) and `--sd-leaf-ink` (`#196b3b`) on warm gradients so all `.sd-eyebrow` and `.sd-news-accent` copy exceeds 4.5:1, and raise all `10px–11.5px` labels to ≥`12px` (`0.75rem`).
  - **Suggested command**: `/impeccable audit` (followed by `/impeccable typeset`)

- **[P1] What**: Teacher & Admin Portal (`/portal`, `apps/web/src/app/(quan-ly)/portal/page.tsx:328-448`) does not scale for real 40–70 student classes.
  - **Why it matters**: Class creation lists every student in an unsearchable checkbox grid, and grading an assignment renders all student submissions with permanently expanded `<textarea>` boxes and no filter for ungraded (`submitted`) vs. graded (`reviewed`) work.
  - **Fix**: Collapse the `"Công bố bài tập"` form behind a header toggle/dialog, add a search/cohort filter to `.lp-members`, add a `Tất cả / Chờ chấm / Đã chấm` filter pill bar above `.lp-submissions`, and collapse already-graded rows into a compact summary with an `"Sửa nhận xét"` button.
  - **Suggested command**: `/impeccable distill`

- **[P2] What**: `/student` home page stacks `TodayPanel` (shadowed cards with hardcoded demo debt `"Còn nợ 4.350.000 đ"`) directly above the live `.dash-frame` ledger.
  - **Why it matters**: Violates `PRODUCT.md` Principle #1 (never mix unlabelled sample numbers with live student records). Freshmen see a 4.35M VND tuition debt warning before noticing the tiny 12px footnote at the bottom of the widget.
  - **Fix**: Unify `TodayPanel` into the flat `.dash-frame` hairline aesthetic, and place a prominent `.chip.demo` (`Dữ liệu minh họa`) badge in the `TodayPanel` header whenever sample schedule/tuition fixtures are rendered.
  - **Suggested command**: `/impeccable clarify`

- **[P2] What**: Forced `target="_blank"` on `/student/ai` + repeated 1.55s full-screen `AiIntro` splash in every new tab + 10 ungrouped sidebar items + tablet (`641px–960px`) label blackout.
  - **Why it matters**: Every new tab has a fresh `sessionStorage`, forcing students to watch the 1.55s flower splash repeatedly; mobile users get stranded in orphan tabs; and tablet/200%-zoom users at `641px–960px` see 10 unlabelled icons with `.side-toggle` hidden.
  - **Fix**: Open `/student/ai` in the same tab by default, move `"sao-do:ai-intro-seen"` to `localStorage` (and skip the splash when `?assignment=` is present), group the 10 sidebar items under 3 section headers (`Học tập`, `Dịch vụ & Đời sống`, `Cộng đồng & AI`), keep `.side-toggle` visible on tablet widths, and replace the 8 decorative `side-tab` stripes and 20 `bounce-easing` springs with clean borders and `var(--ease)`.
  - **Suggested command**: `/impeccable polish`

#### Persona Red Flags
- **Alex (Impatient Power User)**: Forced 1.55s `AiIntro` splash on every new AI tab; `#top-search` has no `Ctrl+K` / `/` shortcut and triggers a full-page reload; 10 ungrouped sidebar items.
- **Sam (Accessibility-Dependent User)**: At `641px–960px` (tablet or 150%–200% desktop zoom), `.app-shell` collapses to `72px` icon-only mode AND hides `.side-toggle` (`globals.css:415-420`), leaving 10 mystery icons with no way to expand labels; 6 contrast misses (`3.3:1` on `.avatar`, `3.9:1` on dark search placeholder).
- **Casey (Distracted Mobile User)**: Mobile assignment table (`≤640px`, `globals.css:438`) hides column 4 (`"Còn 2 ngày"` / `"Quá hạn"` relative countdown), leaving only raw timestamps; tapping `"AI"` in the bottom bar opens a new browser tab and strands navigation.
- **Minh (Sinh viên năm nhất) & Cô Lan (Giảng viên chấm bài)**: Minh sees a scary hardcoded `"Còn nợ 4.350.000 đ"` tuition card on `/student` and cannot attach PDF/images to coursework submissions (unlike AI and Community chat). Cô Lan must scroll past an always-open creation form and 60 open textareas to grade one student.

#### Minor Observations
- `AssignmentTable.tsx:86` uses `<Icon name="more" />` (`⋯`) for a direct link to the assignment page instead of a chevron/arrow.
- `student/layout.tsx:46` labels the `/guest` demo link as `"Xem hướng dẫn"`, misleading logged-in students.
- `FacultyRail.tsx` on `/` renders 7 faculty cards as non-clickable `<figure>` elements with `Dancing Script` captions.
- Destructive actions in `quan-tri/page.tsx:204`, `student/ai/page.tsx:212`, and `ChatRoom.tsx:273` use raw `window.confirm()` instead of `<dialog>`, while student suspension (`Tạm khoá` / `Thôi học`) has no confirmation at all.

#### Questions to Consider
1. Should `app-phuong.css` be toned down inside `/student` and `/portal` so the daily workspace honours `DESIGN.md`'s calm Navy/Blue/Paper studio contract while keeping the Hoa Phượng warmth as a subtle header accent?
2. Should `TodayPanel`'s hardcoded schedule/tuition cards carry an explicit `Dữ liệu minh họa` badge in their header so students never mistake fixture debt for a real university bill?
3. How much faster could teachers grade if `/portal` collapsed graded submissions and filtered directly to `Chờ chấm`?
