# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

- **Students (Sinh viên Trường Đại học Sao Đỏ):** Use the mobile app on Android and iOS phones to check enrolled classes, track upcoming assignment deadlines on the go, submit text coursework with offline-resilient idempotency keys, and read teacher grading feedback.

## Product Purpose

The Sao Do University Student Mobile App (`apps/mobile`) gives students fast, reliable pocket access to their classes, assignments, submissions, and teacher feedback, backed by the same tenant-isolated Supabase Auth and BFF API as the web platform.

## Positioning

A focused native student companion app (`Expo 57` / `React Native 0.86`) that shares strict `@sao-do/contracts` validation and tenant-scoped Bearer-JWT security with the web platform while respecting mobile safe areas, touch ergonomics, and zero-secret client bundle rules.

## Operating Context

- Used by students on personal Android and iOS devices between classes.
- All user-facing copy, status badges, and error messages are in Vietnamese (`vi-VN`, `Asia/Ho_Chi_Minh`).
- Connects to the web BFF (`/api/v1/*`) via `EXPO_PUBLIC_API_URL` and Supabase Auth via publishable anon credentials only (validated by `scripts/validate-mobile-build-env.mjs`).

## Capabilities and Constraints

- **Mobile Stack:** Expo SDK 57 (`expo-router` 57), React 19.2.3, React Native 0.86, `@sao-do/contracts`, `@supabase/supabase-js`.
- **Core Flows:** Sign in / session persistence (`AsyncStorage`), enrolled class list, assignment detail & deadline inspection, idempotent text submission, and teacher feedback review.
- **Security Gate:** Client bundle (`Hermes .hbc`) must never contain privileged backend credentials or server secrets; verified by `tests/security/` and `scripts/validate-mobile-build-env.mjs`.

## Brand Commitments

- **Institution Identity:** Trường Đại học Sao Đỏ (Sao Do University — SDU).
- **Official Logo:** `assets/brand/sao-do-university-logo.png` used unchanged without recolouring, cropping, or distortion.
- **Voice:** Concise, supportive Vietnamese tailored for quick mobile scanning.

## Evidence on Hand

- Shared domain contracts in `packages/contracts` and mobile concept reference at `docs/design/mobile-home-concept.png`.
- Mobile environment and Hermes binary security checks in `scripts/validate-mobile-build-env.mjs` and `tests/security/`.

## Product Principles

1. **Pocket Triage First:** Surface urgent deadlines, submission status, and newly returned teacher feedback immediately upon opening the app.
2. **Idempotent & Safe Submissions:** Protect student coursework on flaky mobile networks with idempotent submission keys and clear Vietnamese confirmation states.
3. **Native Touch Ergonomics:** Honour OS safe areas, minimum 44–48 pt touch targets, and system back/navigation gestures across iOS and Android.

## Accessibility & Inclusion

- High-contrast text and status badges readable in bright outdoor campus lighting.
- Touch targets sized for thumb operation with clear focus and loading states.
