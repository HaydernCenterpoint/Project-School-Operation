# Sao Do University — Campus Study Studio

Current design source for the web experience (September 2026). It replaces the
earlier 8–12px corner rule and the "GSAP only on the access page" motion rule.
The implementation brief is `docs/design/rebuild-prompt-plan.md`.

## Source assets

- Logo: `assets/brand/sao-do-university-logo.png` (web copy `apps/web/public/sao-do-logo.png`). Used unchanged — never recoloured, cropped, spun or redrawn.
- Campus drawing: **not supplied yet.** Put the official file at `apps/web/public/campus-drawing.webp` (or `.jpg` / `.png`) and rebuild. Until then `apps/web/public/campus-sketch.svg` is a clearly labelled temporary sketch.

## Tokens (`apps/web/src/app/globals.css`)

| Token | Value | Use |
|---|---|---|
| `--ink` | `#071A34` | Headings, navy panels |
| `--blue` / `--blue-deep` | `#0066CC` / `#0052A3` | Primary actions, links, active navigation |
| `--sky` | `#E8F1FC` | Active navigation, chips, soft highlights |
| `--red` | `#D60000` | Sparingly: login CTA band, urgent states |
| `--yellow` | `#FFEA00` | Guest-mode label only |
| `--paper` / `--mist` | `#FFFFFF` / `#F4F7FB` | Cards / app background |
| `--muted` | `#61708A` | Supporting copy and input borders (≥3:1) |
| `--success`, `--warning`, `--danger` | `#067647`, `#8A5A00`, `#B42318` | Status chips on their soft backgrounds |

All text pairs are checked in `tests/accessibility/color-contrast.test.mjs`.

## Geometry

| Element | Radius |
|---|---|
| Buttons, inputs, icon buttons | 14px (`--r-control`) |
| Compact panels, list rows, notices | 18px (`--r-panel`) |
| Primary cards | 24px (`--r-card`) |
| Dialogs, hero frames, CTA band | 28px (`--r-dialog`) |
| Chips, avatars | pill |

Touch targets are at least 44px. Focus is a 3px university-blue outline (inputs use a blue ring).

## Layout

- Welcome page (`apps/web/src/app/landing.css`) celebrates Hải Phòng, Thành phố Hoa Phượng Đỏ: light and sunny only (cream `#FFF8F0`, flamboyant red `#E63946`/`#D62839`, coral `#FF6B4A`, golden `#F4B942`, leaf green `#2E9E5B`; small text uses `#D62839`, `#1F7A45` or `#6B5553` for contrast on cream). Type: Playfair Display headings, Dancing Script calligraphic accents (gradient "Thích ứng."), Be Vietnam Pro body; all loaded with Vietnamese subsets via `next/font`. Motif (`components/landing/Phuong.tsx`): a generated SVG flamboyant tree in the hero and the Hải Phòng band, five-petal flowers as eyebrow icons, timeline markers and section dividers. `FallingPetals.tsx`: 14 CSS-only petals and leaves drift down the page gutters behind the content (no pointer events, fewer on phones, removed under reduced motion); the tree canopy sways gently. Content and photo sources are unchanged: `docs/design/nguon-anh-truong.md`.
- Login: navy art panel with the drawing + rounded form card; single column below 960px.
- Student and guest use a **framed studio shell** modelled on the open-source shadcndashboard layout: light-gray canvas, sidebar and main area as two outlined white panels (8px gap, 14px radius), grouped sidebar navigation with small uppercase section labels and a navy active item, an AI-allowance card with a progress meter at the bottom of the sidebar, and a top bar with sidebar toggle, assignment search, feedback notifications (native `popover`) and avatar. Tablet shows an icon rail; phones get a floating bottom navigation.
- Inside the shell controls are 10px and panels 12–14px, flat (borders instead of shadows); buttons stay rounded.
- Dashboard: greeting + actions → one bordered frame split by thin lines and dotted bands: update strip → deadline chart (assignments due per week for 8 weeks, submitted vs open) beside a 2×2 study summary → three metrics (unsubmitted, due in 3 days, AI requests today) → sortable assignment table (stacked rows on phones). Every number comes from the student's authorised data.

## Motion

- Controls 150ms, entrances 240–700ms, `cubic-bezier(.2,.8,.2,1)`.
- **Logo loading:** on every hard load a server-rendered splash shows the logo with a soft halo until React hydrates (no artificial delay; hidden by CSS after 12s even without JavaScript, with a reload link after 6s). Route changes show a top progress bar and a small logo pill only if navigation takes longer than 150ms. `loading.tsx` shows the same logo for pending server routes.
- `prefers-reduced-motion`: halos, shimmer and floating cards stop; the static logo and status text remain.

## Language

All interface copy is Vietnamese with full diacritics (`html lang="vi"`); dates use `vi-VN` and deadlines are shown in `Asia/Ho_Chi_Minh` with “(giờ Việt Nam)”. API error codes are mapped to Vietnamese in `apps/web/src/lib/academic-client.ts` and `ai-client.ts`.

## Evidence

Screenshots in this folder, captured from the production build against the local seeded database: `redesign-welcome-*` (1440/390), `redesign-login-*`, `redesign-guest-1440`, `redesign-dashboard-*` (1440/768/390), `redesign-assignments-1440`, `redesign-guest-768`, `redesign-assignment-*`, `redesign-ai-*` (AI answer streamed from a local fake provider, not a real model).
