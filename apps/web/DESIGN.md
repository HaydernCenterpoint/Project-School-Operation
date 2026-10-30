---
name: Sao Do University Campus Study Studio
description: Warm Hoa Phuong Do editorial energy on public surfaces paired with a crisp, framed navy-and-paper academic studio inside student and faculty portals.
colors:
  ink: "#071a34"
  ink-secondary: "#1d3150"
  blue: "#0066cc"
  blue-deep: "#0052a3"
  sky: "#e8f1fc"
  sky-tint: "#d6e6fa"
  red: "#d60000"
  red-soft: "#fdeceb"
  flamboyant-red: "#d62839"
  flamboyant-coral: "#ff6b4a"
  flamboyant-gold: "#f4b942"
  leaf-green: "#2e9e5b"
  yellow-demo: "#ffea00"
  paper: "#ffffff"
  cream-paper: "#fff8f0"
  mist: "#f4f7fb"
  border: "#dce4ef"
  shell-border: "#e4e7ec"
  muted: "#61708a"
  success: "#067647"
  success-soft: "#e3f6ec"
  warning: "#8a5a00"
  warning-soft: "#fff4d6"
  danger: "#b42318"
typography:
  display:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "3.5rem"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "GeistSans, Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "1.9rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "GeistSans, Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "1.45rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: "GeistSans, Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "GeistSans, Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: "0.02em"
rounded:
  shell-control: "10px"
  shell-panel: "12px"
  shell-card: "14px"
  control: "14px"
  panel: "18px"
  card: "24px"
  dialog: "28px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "0 22px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.blue-deep}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "0 22px"
    height: "48px"
  button-accent:
    backgroundColor: "{colors.red}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "0 22px"
    height: "48px"
  button-quiet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 22px"
    height: "48px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.blue}"
    rounded: "{rounded.control}"
    padding: "0 22px"
    height: "48px"
  button-dark:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.shell-control}"
    padding: "0 14px"
    height: "40px"
  chip-default:
    backgroundColor: "{colors.sky}"
    textColor: "{colors.blue-deep}"
    rounded: "{rounded.pill}"
    padding: "3px 12px"
    height: "28px"
  input-default:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
    height: "50px"
  card-studio:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.shell-card}"
    padding: "20px"
---

# Design System: Sao Do University Campus Study Studio

## Overview

**Creative North Star: "The Red Flamboyant Studio"**

The Sao Do University web platform balances two purposeful atmospheres under one institutional roof. On the public welcome surface (`/`), the system opens into warm sunlit cream (`#fff8f0`), flamboyant red (`#d62839`), coral (`#ff6b4a`), and leaf green (`#2e9e5b`), celebrating Hải Phòng (Thành phố Hoa Phượng Đỏ) and the university's technical heritage since 1969 through editorial serif headlines, calligraphic accents, and gentle botanical motion.

Once a student, teacher, or administrator steps inside the working campus (`/student`, `/guest`, `/portal`), the atmosphere shifts to a crisp, distraction-free study studio. Two outlined white panels float on a cool mist canvas (`#f4f7fb` / `#f5f6f8`) separated by an 8px gap, anchored by deep maritime navy (`#071a34`) and university blue (`#0066cc`). Every metric, deadline bar, and submission table is framed by hairlines and dotted divider bands rather than heavy shadows, keeping daily academic work calm, scannable, and trustworthy.

**Key Characteristics:**
- Dual-atmosphere architecture: warm sunlit Hoa Phượng Đỏ editorial welcome (`/`) transitioning into a crisp, framed navy-and-paper studio shell (`/student`, `/portal`).
- Outlined studio geometry: 1px structural borders (`#dce4ef` outside, `#e4e7ec` inside the shell) and 16px radial-dot divider bands replace nested card shadows.
- Vietnamese-first typographic clarity: full diacritic legibility across Playfair Display, Dancing Script, Be Vietnam Pro, and GeistSans, paired with `tabular-nums` on every deadline, counter, and grade metric.
- Tactile, high-contrast controls: 44px to 50px touch heights, 3px university-blue focus rings, and semantic status pills verified at ≥3:1 border/muted contrast.
- Respectful institutional branding: the official Sao Do University crest (`sao-do-logo.png`) anchors splash states, route progress, and sidebar lockups without distortion.

## Colors

The palette pairs authoritative Maritime Navy and University Blue for daily academic workspaces with sunlit Flamboyant Red, Coral, and Cream reserved for public cultural storytelling and urgent action states.

### Primary
- **University Blue** (`--blue`, `#0066cc` / hover `--blue-deep`, `#0052a3`): Primary interactive actions, text links, focus outlines, and active filter highlights across login and portal surfaces.
- **Maritime Navy Ink** (`--ink`, `#071a34` / secondary `--ink-2`, `#1d3150`): Primary typography, active sidebar navigation pills (`aria-current="page"`), completed chart bars, and dark studio action buttons.
- **Soft Sky Wash** (`--sky`, `#e8f1fc` / `--sky-2`, `#d6e6fa`): Default chip backgrounds, icon tile fills, ghost button hover states, and informational notice banners.

### Secondary
- **Crimson Crest Red** (`--red`, `#d60000` / soft `--red-soft`, `#fdeceb`): Used sparingly for urgent CTA bands, unread notification dots, live status indicators, and danger hover fills.
- **Hoa Phuong Flamboyant Red** (`--sd-red`, `#d62839` / coral `--sd-coral`, `#ff6b4a`): Exclusive to the public welcome surface (`/`) for pill CTAs, eyebrow markers, calligraphic headline gradients, and focus rings (4.9:1 on white, 4.6:1 on cream).

### Tertiary
- **Hai Phong Sun Gold & Leaf Green** (`--sd-gold`, `#f4b942` / `--sd-leaf`, `#2e9e5b`): Botanical accents, timeline badges, and kicker labels on the public welcome surface.
- **Guest Demo Signal Yellow** (`--yellow`, `#ffea00`): Reserved exclusively for the `.chip.demo` badge and `.guest-banner` (`#fffbe0` background, `#f4e27a` border) so sample mode is never mistaken for live student records.
- **Semantic Status Trio** (Success `#067647` on `#e3f6ec`, Warning `#8a5a00` on `#fff4d6`, Danger `#b42318` on `#fdeceb`): Assignment submission states (`Đã chấm`, `Sắp hết hạn`, `Quá hạn`) and system feedback notices.

### Neutral
- **Crisp Studio Paper** (`--paper`, `#ffffff`): Primary surface for sidebar, main workspace container, auth cards, and data tables.
- **Sunlit Cream Paper** (`--sd-bg`, `#fff8f0` / raised `#ffefe4`): Warm background canvas for the public welcome experience (`/`).
- **Cool Mist Canvas** (`--mist`, `#f4f7fb` / shell `#f5f6f8`): Outer app background behind the framed studio panels, table hover tints, and skeleton loaders.
- **Slate Muted Copy** (`--muted`, `#61708a`): Supporting metadata, timestamps, table secondary lines, and resting input borders (tested at ≥3:1 contrast against white).
- **Structural Hairline Border** (`--border`, `#dce4ef` / shell `--border`, `#e4e7ec`): 1px dividers separating studio cells, table rows, and card frames.

### Named Rules
**The Two-World Palette Rule.** Warm cream (`#fff8f0`) and coral-red gradients belong to the public welcome surface (`/`). Inside `/student`, `/guest`, and `/portal`, surfaces stay strictly on Crisp Studio Paper (`#ffffff`) and Cool Mist (`#f4f7fb`) so long study sessions remain visually quiet.

**The Sparse Crimson Rule.** Crimson (`#d60000`) is an alarm and a seal, never a wallpaper. Inside the workspace it appears only on live notification dots, urgent overdue badges, or destructive confirmations.

**The Guest Yellow Lock Rule.** Signal Yellow (`#ffea00`) is reserved solely for identifying read-only guest mode (`/guest`). Never assign it to ordinary warnings or decorative tags.

## Typography

**Display Font:** Playfair Display (with Georgia, serif fallback) on public storytelling headlines; Dancing Script (cursive) for single-phrase calligraphic accents (`<em>`).
**Body Font:** GeistSans (app shell and portals) and Be Vietnam Pro (public welcome surface), both with full Vietnamese diacritic coverage and `system-ui, sans-serif` fallback.
**Label/Mono Font:** GeistSans with `font-variant-numeric: tabular-nums` for all counters, deadlines, and grade tables.

**Character:** Editorial warmth and calligraphic pride on the campus welcome page give way to engineered, tabular precision inside the academic studio, ensuring Vietnamese stacked diacritics (`ổ`, `ự`, `ễ`) never clip or collide.

### Hierarchy
- **Display** (800 weight, `clamp(2.6rem, 4.6vw, 4.3rem)`, line-height 1.08, letter-spacing `-0.025em`): Public hero title on `/`, paired with a `1.35em` Dancing Script gradient accent line.
- **Headline** (700 weight, `clamp(1.8rem, 3vw, 2.6rem)` on auth/sections or `1.9rem` on cards, line-height 1.2, letter-spacing `-0.02em`): Page-level and auth-card headings with `text-wrap: balance`.
- **Title** (600–700 weight, `1.45rem` dashboard header / `1.75rem` metric values, line-height 1.2, letter-spacing `-0.01em`): Workspace section headers and primary KPI readouts.
- **Body** (400 weight, `16px` root / `15px` inside `.app-shell`, line-height 1.6 to 1.75, max-width `56ch`–`65ch`): Coursework descriptions, AI assistant responses, and community messages.
- **Label** (650–700 weight, `12px`–`14px`, letter-spacing `0.02em` to `0.06em`, uppercase on `.nav-group p` and `.sd-eyebrow`): Status chips, table headers, sidebar section headers, and eyebrows.

### Named Rules
**The Vietnamese Diacritic Clearance Rule.** Headings must never set `line-height` below `1.08` (or `1.2` in UI controls) and must never clip vertical overflow without `0.02em–0.12em` block padding, preserving stacked Vietnamese tone marks.

**The Tabular Metric Rule.** Every numeric counter, deadline countdown, chart axis, and AI quota readout must apply `font-variant-numeric: tabular-nums` so columns align vertically and updates never jitter horizontally.

## Layout

The platform uses two distinct spatial models matched to surface mode:

- **Public Welcome Surface (`/` — Persuade):** Full-bleed sunlit cream canvas with a sticky `72px` glass navigation bar (`backdrop-filter: saturate(1.4) blur(14px)`). Content sits in a `1400px` max-width container with `clamp(16px, 4vw, 48px)` horizontal padding and a 12-column-equivalent 6fr/6fr split hero (`clamp(24px, 3vw, 48px)` gap).
- **Framed Studio Shell (`/student`, `/guest`, `/portal` — Operate):** A viewport-pinned `100svh` grid with `8px` outer padding, `8px` gap, and two outlined white containers on a `#f5f6f8` canvas:
  - **Sidebar (`.app-side`):** `248px` wide (`72px` when `.is-collapsed` is active), sticky (`top: 8px`, `height: calc(100svh - 16px)`), housing the brand lockup, grouped navigation, AI allowance meter card, and account actions.
  - **Main Workspace (`.app-main`):** Flex column with a sticky `60px` blurred header (`.app-top`), a centered `1360px` max-width content well (`padding: 20px clamp(16px, 2vw, 24px) 32px`), and a bordered footer.
  - **Dashboard Frame (`.dash-frame`):** Instead of separate floating cards, dashboard sections sit inside a single bordered frame divided by `1px solid #e4e7ec` hairlines and `16px` dotted bands (`.frame-gap`), with a `1.55fr / 1fr` split row for the 8-week deadline chart and 2×2 stat grid, followed by a 3-column metric row and full-width sortable assignment table.
- **Responsive Breakpoints:**
  - `≤960px`: Auth split collapses to a single column; dashboard `.split-row` stacks vertically; tablet studio shell condenses.
  - `≤768px`: Desktop sidebar hides in favor of a floating bottom navigation bar (`.app-bottom`) with safe-area inset padding; data tables stack into mobile cards.
  - `320px` and `200%` CSS zoom: Tested floor where all critical action controls wrap cleanly without horizontal truncation.

## Elevation & Depth

**The Flat-Studio, Warm-Hero Hybrid.** Inside the `.app-shell` workspace, `--shadow-sm` is explicitly reset to `none`: panels, metric cells, and tables are completely flat at rest and rely on `1px solid` borders (`#e4e7ec`) and subtle background shifts (`#ffffff` vs `#f4f7fb`) for hierarchy. Ambient shadows appear only on public hero frames, auth cards, floating popovers, and primary CTA buttons.

### Shadow Vocabulary
- **Subtle Resting Shadow** (`--shadow-sm: 0 1px 2px rgba(7, 26, 52, 0.06), 0 2px 8px rgba(7, 26, 52, 0.04)`): Quiet buttons and standalone cards outside the studio shell.
- **Elevated Card Shadow** (`--shadow-md: 0 10px 30px -12px rgba(7, 26, 52, 0.18), 0 2px 6px rgba(7, 26, 52, 0.05)`): Login `.auth-card` and floating route-progress `.nav-pill`.
- **Dialog & Popover Shadow** (`--shadow-lg: 0 30px 60px -24px rgba(7, 26, 52, 0.28)`): Notification `.popover-panel`, modal dialogs, and `.campus-frame`.
- **Primary Button Glow** (`0 8px 20px -8px rgba(0, 102, 204, 0.55)`): Tinted elevation under `.button-primary` (and `rgba(214, 40, 57, 0.8)` under `.sd-btn-primary` on the landing page).

### Named Rules
**The Flat-Inside-The-Shell Rule.** Never apply drop shadows to cards, stat cells, or table wrappers inside `.app-shell`. Divide interior workspace regions with `1px solid var(--border)` hairlines and `.frame-gap` dotted bands instead.

## Shapes

The system scales corner radii down as density increases, moving from generous editorial curves on public pages to compact, engineered radii inside the study studio:

- **Public & Auth Radii:** Controls `14px` (`--r-control`), compact notices/panels `18px` (`--r-panel`), primary cards `24px` (`--r-card`), hero frames and dialogs `28px` (`--r-dialog`), and landing buttons/chips `999px` (pill).
- **Studio Shell Radii (`.app-shell` override):** Controls tighten to `10px` (`--r-control`), sub-panels to `12px` (`--r-panel`), and outer studio frames to `14px` (`--r-card`).
- **Framed Mat Geometry:** Campus illustrations and faculty photography use a double-radius mat (outer frame `28px` with `12px` white padding, inner image `calc(28px - 10px)` = `18px`).
- **Dotted Structural Band (`.frame-gap`):** A signature `16px`-tall horizontal separator filled with `radial-gradient(circle, #c5ccd6 1px, transparent 1.4px) 0 50% / 10px 10px` between `1px` top and bottom borders.

## Components

Every component is built for immediate scanability, generous touch targets, and crisp keyboard focus.

### Buttons
- **Shape:** `14px` radius in auth/public flows (`10px` inside `.app-shell`, `999px` pill on `.sd-btn` landing buttons). Minimum height `48px` (`44px` on `.button-small`, `40px` on studio `.button-sm`).
- **Primary (`.button-primary`):** University Blue (`#0066cc`) background, white text (`650` weight), `0 22px` padding, tinted blue shadow (`0 8px 20px -8px rgba(0, 102, 204, 0.55)`).
- **Hover / Focus / Active:** Hover shifts to `--blue-deep` (`#0052a3`) and lifts `translateY(-1px)` over `150ms cubic-bezier(0.2, 0.8, 0.2, 1)`; active presses to `scale(0.98)`; `:focus-visible` renders a `3px solid #0066cc` outline with `2px` offset.
- **Secondary Variants:**
  - **Studio Dark (`.button-dark`):** Navy (`#071a34`) background, white text, used for primary actions inside the `.app-shell` studio.
  - **Quiet / Outline (`.button-quiet`, `.button-outline`):** White (`#ffffff`) background, `1px solid #dce4ef` border, `#071a34` text; hover shifts background to `#f4f7fb`.
  - **Ghost (`.button-ghost`):** Transparent background, `#0066cc` text; hover fills with `--sky` (`#e8f1fc`).
  - **Accent / Danger (`.button-accent`, `.button-danger`):** Crimson (`#d60000`) fill or `#b42318` text on white with `#f1c5c1` border.

### Chips
- **Style:** Pill radius (`999px`), `min-height: 28px`, `padding: 3px 12px`, `13px` font size at `650` weight, `6px` icon gap.
- **State Variants:**
  - Default / Info: `#0052a3` text on `#e8f1fc`.
  - Submitted (`.chip.submitted`): `#174ea6` text on `#dceaff`.
  - Reviewed / Success (`.chip.reviewed`, `.chip.success`): `#067647` text on `#e3f6ec`.
  - Due Soon / Warning (`.chip.soon`, `.chip.warning`): `#8a5a00` text on `#fff4d6`.
  - Overdue / Danger (`.chip.overdue`, `.chip.danger`): `#b42318` text on `#fdeceb`.
  - Guest Demo (`.chip.demo`): `#071a34` text on `#ffea00`.

### Cards / Containers
- **Corner Style:** `24px` on standalone `.auth-card`; `14px` on `.app-side`, `.app-main`, and `.dash-frame` inside the studio shell.
- **Background:** Crisp white (`#ffffff`) against `#f4f7fb` / `#f5f6f8` mist canvas.
- **Shadow Strategy:** `var(--shadow-md)` on standalone auth cards; `none` inside `.app-shell`.
- **Border:** `1px solid #dce4ef` (`#e4e7ec` inside `.app-shell`).
- **Internal Padding:** `20px` inside `.cell-body`, `.stat-cell`, and `.metric-cell`; `clamp(24px, 4vw, 40px)` on `.auth-card`.

### Inputs / Fields
- **Style:** `min-height: 50px` (`40px` on `.top-search input`), `padding: 12px 16px`, white background, `1px solid #61708a` (`--muted`, ensuring ≥3:1 resting border contrast), `14px` radius (`10px` in studio shell).
- **Focus:** `border-color: #0066cc` with a `0 0 0 4px rgba(0, 102, 204, 0.2)` focus ring (`0 0 0 3px rgba(7, 26, 52, 0.12)` on `.top-search`).
- **Error / Invalid:** `[aria-invalid="true"]` sets `border-color: #b42318` with `.form-error` (`#b42318`, `600` weight) below.

### Navigation
- **Studio Sidebar (`.app-nav`):** Grouped under `12px` uppercase `#61708a` labels (`letter-spacing: 0.06em`). Links are `40px` tall, `10px` radius, `18px` SVG icon + label (`#1d3150`, `500` weight). Hover fills `#f4f7fb`; active page (`[aria-current="page"]`) fills solid `#071a34` with `#ffffff` text.
- **AI Allowance Footer Card (`.plan-card`):** Pinned at the bottom of `.app-side` with a `6px` rounded progress meter (`.meter`) filled in `#071a34` showing remaining daily AI queries.
- **Public Sticky Header (`.sd-nav`):** `72px` height, warm translucent cream (`rgba(255, 248, 240, 0.82)`), pill links that turn `#d62839` on `#ffefe4` hover.

### Logo Splash & Route Progress
- **Boot Splash & Nav Pill (`.boot-splash`, `.nav-progress`, `.nav-pill`):** Hard loads display the 88px Sao Do University crest inside dual pulsing blue/crimson rings (`halo` keyframe, `1.8s`) with a 12s CSS-only fallback timeout. Route transitions longer than `150ms` trigger a `3px` top gradient bar (`linear-gradient(90deg, #0066cc, #d60000)`) and a bottom-right blurred pill (`backdrop-filter: blur(8px)`) with the breathing crest.

## Do's and Don'ts

### Do:
- **Do** use `1px solid #e4e7ec` hairlines and `.frame-gap` radial-dot bands (`16px` height) to subdivide dashboard and portal data inside `.app-shell`.
- **Do** keep resting form input borders at `#61708a` (`--muted`) on white surfaces so input boundaries maintain ≥3:1 contrast.
- **Do** apply `font-variant-numeric: tabular-nums` on every deadline, submission counter, and AI allowance readout.
- **Do** render the Sao Do University crest (`/sao-do-logo.png`) at its natural aspect ratio without recolouring, cropping, or spinning it.
- **Do** halt ambient petal animations, shimmer, and breathing halos under `@media (prefers-reduced-motion: reduce)`.

### Don't:
- **Don't** mix the public welcome palette (`#fff8f0` cream, `#ff6b4a` coral, Playfair Display / Dancing Script) into the `/student` or `/portal` workspaces.
- **Don't** stack cards inside cards with drop shadows inside `.app-shell`; interior studio surfaces must remain flat (`box-shadow: none`).
- **Don't** use Signal Yellow (`#ffea00`) for anything other than the read-only `/guest` mode indicator.
- **Don't** set interactive controls below `44×44px` on public/mobile views or `40px` height inside the desktop studio shell.
