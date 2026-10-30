---
name: Sao Do University Student Mobile
description: Pocket academic companion for Sao Do University students, pairing a Maritime Navy crest header with high-contrast bordered coursework cards.
colors:
  ink: "#071a34"
  blue: "#0066cc"
  red: "#d60000"
  yellow: "#ffea00"
  paper: "#ffffff"
  mist: "#f4f7fb"
  border: "#d8e0ec"
  muted: "#61708a"
  danger: "#b42318"
typography:
  display:
    fontFamily: "System"
    fontSize: "25px"
    fontWeight: 800
    lineHeight: 1.24
  headline:
    fontFamily: "System"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontFamily: "System"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.35
  body:
    fontFamily: "System"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "System"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.35
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  pill: "150px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "14px 20px"
    height: "48px"
  button-accent:
    backgroundColor: "{colors.red}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "14px 20px"
    height: "48px"
  card-course:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "16px"
---

# Design System: Sao Do University Student Mobile

## Overview

**Creative North Star: "The Red Flamboyant Studio"**

The Sao Do University mobile companion brings the university's Maritime Navy (`#071a34`), University Blue (`#0066cc`), Crimson (`#d60000`), and Crest Yellow (`#ffea00`) palette to students' phones in a pocket-first layout. The top `BrandHeader` echoes the official university emblem with a `124×124` crest lockup, dual tilted gold orbital rings, and angled crimson-and-gold book-spine rules over deep navy (`#071a34`), while the scrollable body below stays on crisp white (`#ffffff`) and mist (`#f4f7fb`) cards bordered by `1px` hairlines (`#d8e0ec`).

Every screen is built for outdoor legibility between classes, one-handed thumb navigation via a `72pt`-minimum 3-tab bottom bar (`Hôm nay`, `Lớp học`, `Tài khoản`), and resilient Vietnamese typography capped at `maxFontSizeMultiplier={2}` so system font scaling never clips critical submission controls.

**Key Characteristics:**
- Ceremonial navy crest header (`BrandHeader`, `minHeight: 238`) with gold orbital rings and angled crimson/gold rules transitioning into a clean mist-and-paper task list.
- Flat, hairline-bordered coursework and class cards (`border: 1px solid #d8e0ec`) with zero decorative shadow clutter.
- High-visibility 3-tab bottom navigation (`minHeight: 72`) with Crimson (`#d60000`) active tint and `700`-weight Vietnamese labels.
- Accessible dynamic text scaling (`maxFontSizeMultiplier={2}`) and `accessibilityIgnoresInvertColors` on the official university logo.

## Colors

The mobile palette is defined in `apps/mobile/lib/theme.ts` and mirrors the core institutional tokens of the web studio.

### Primary
- **Maritime Navy Ink** (`colors.ink`, `#071a34`): `BrandHeader` background, primary card titles, and body copy.
- **University Blue** (`colors.blue`, `#0066cc`): Primary interactive buttons, links, and class/assignment action highlights.

### Secondary
- **Crimson Crest Red** (`colors.red`, `#d60000`): Active bottom-tab tint (`tabBarActiveTintColor`), urgent submission CTAs, and the lower decorative rule on `BrandHeader`.
- **Crest Gold Yellow** (`colors.yellow`, `#ffea00`): Tenant campus subtitle (`styles.campus`) and orbital ring accents inside the navy `BrandHeader`.

### Tertiary
- **Overdue Garnet** (`colors.danger`, `#b42318`): Validation errors, overdue indicators, and failed network notices.

### Neutral
- **Crisp Studio Paper** (`colors.paper`, `#ffffff`): Coursework cards, input fields, and bottom tab bar surface.
- **Cool Mist Canvas** (`colors.mist`, `#f4f7fb`): Screen scroll background behind cards.
- **Slate Muted Copy** (`colors.muted`, `#61708a`): Inactive tab items (`tabBarInactiveTintColor`), secondary timestamps, and helper labels.
- **Structural Hairline Border** (`colors.border`, `#d8e0ec`): Top tab-bar divider and `1px` card outlines.

### Named Rules
**The Navy-Only Yellow Text Rule.** Crest Yellow (`#ffea00`) text and orbital lines may only render atop Maritime Navy (`#071a34`) inside `BrandHeader`, where contrast exceeds 13:1. Never place `#ffea00` text on white or mist surfaces.

## Typography

**Display Font:** Native platform system font (SF Pro on iOS, Roboto on Android) at `800` weight for the `25px` `BrandHeader` school title.
**Body Font:** Native platform system font (`400`–`600` weight) for Vietnamese assignment descriptions and feedback.
**Label/Mono Font:** Native platform system font (`700` weight, `13px`) for bottom tab labels and status badges.

**Character:** Native system typography ensures zero font-loading flash on mobile networks and full Vietnamese diacritic rendering, guarded by `maxFontSizeMultiplier={2}` across headers and tab bars.

### Hierarchy
- **Display** (`800` weight, `25px`, line-height `31px`): University title (`Đại học Sao Đỏ`) in `BrandHeader`.
- **Headline** (`700` weight, `18px`–`20px`, line-height `25px`): Student name in `BrandHeader` and screen section titles.
- **Title** (`700` weight, `17px`, line-height `23px`): Campus/tenant subtitle and class card titles.
- **Body** (`400` weight, `15px`, line-height `22px`): Assignment instructions, submission text, and teacher feedback.
- **Label** (`700` weight, `13px`): Bottom tab bar labels (`Hôm nay`, `Lớp học`, `Tài khoản`) and metadata badges.

### Named Rules
**The Multiplier Ceiling Rule.** Every persistent navigation label and header text node must set `maxFontSizeMultiplier={2}` so large OS accessibility text scales legibly without overflowing fixed bars.

## Layout

- **Top-Level Navigation:** Expo Router `Tabs` (`apps/mobile/app/(tabs)/_layout.tsx`) with three destinations (`index` Hôm nay, `classes` Lớp học, `account` Tài khoản), `headerShown: false`, `minHeight: 72`, `paddingTop: 6`, `paddingBottom: 8`, and `borderTopColor: #d8e0ec`.
- **Brand Header (`BrandHeader.tsx`):** `minHeight: 238`, `paddingHorizontal: 24`, `paddingTop: 22`, `paddingBottom: 42`, horizontal flex row with `20px` gap between the `124×124` crest and identity stack, finished with a `50×50` rotated paper diamond (`bookPoint`) at the bottom edge.
- **Content Stack:** Vertical scroll containers on `#f4f7fb` mist with `16px`–`24px` horizontal padding and `12px`–`16px` vertical gaps between bordered `#ffffff` cards.

## Elevation & Depth

**Flat Bordered Cards.** Mobile cards and list rows (`ClassRow`, assignment cards) use `1px` `#d8e0ec` borders on `#ffffff` paper against `#f4f7fb` mist rather than drop shadows, keeping scroll performance at 60–120 fps across Android and iOS devices.

## Shapes

- **Cards & Controls:** `8px` to `12px` rounded corners on cards, buttons, and text inputs.
- **Header Orbits:** `borderRadius: 150` pill ellipses (`220×86` at `18deg` and `206×74` at `-16deg`) clipped inside `BrandHeader`.

## Components

### Buttons
- **Shape:** `12px` radius, minimum `48pt` height for thumb reachability.
- **Primary:** `#0066cc` background with `#ffffff` `700`-weight label; Crimson `#d60000` for high-priority submission CTAs.

### Cards / Containers (`ClassRow` & Assignment Cards)
- **Corner Style:** `12px` radius.
- **Background:** `#ffffff` on `#f4f7fb` screen background.
- **Border:** `1px solid #d8e0ec`.
- **Internal Padding:** `16px`.

### Inputs / Fields
- **Style:** Multiline coursework `TextInput` on `#ffffff` with `1px solid #61708a` border, `12px` radius, and `12px 16px` padding.

### Navigation (`TabLayout`)
- **Style:** Bottom tab bar (`minHeight: 72`, `#ffffff` background, `1px` `#d8e0ec` top border), `below-icon` label position, active tint `#d60000`, inactive tint `#61708a`.

## Do's and Don'ts

### Do:
- **Do** import all palette values from `apps/mobile/lib/theme.ts` (`colors.ink`, `colors.blue`, `colors.red`, `colors.yellow`, `colors.paper`, `colors.mist`, `colors.border`, `colors.muted`, `colors.danger`).
- **Do** keep `accessibilityIgnoresInvertColors` and `accessibilityLabel="Biểu trưng Đại học Sao Đỏ"` on the university logo `Image`.
- **Do** size every interactive `Pressable` or `TouchableOpacity` to at least `48×48` dp/pt.

### Don't:
- **Don't** place `colors.yellow` (`#ffea00`) text on light backgrounds (`colors.paper` or `colors.mist`).
- **Don't** embed server secrets or service-role keys in mobile styles, config, or bundle code.
