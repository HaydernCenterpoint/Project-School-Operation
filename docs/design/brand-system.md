# Sao Do University digital system

## Source of truth

- Logo: `assets/brand/sao-do-university-logo.png`
- Web concept: `docs/design/web-classes-concept.png`
- Mobile concept: `docs/design/mobile-home-concept.png`

The logo stays intact. The interface borrows its color and geometry without redrawing it.

## Tokens

| Token | Value | Use |
|---|---|---|
| Ink | `#071A34` | Navigation, headings |
| University blue | `#0066CC` | Links, selection, focus companion |
| Signal red | `#D60000` | Primary action, active mobile tab |
| Orbit yellow | `#FFEA00` | Thin keylines and orbit motif only |
| Paper | `#FFFFFF` | Main surfaces |
| Mist | `#F4F7FB` | Quiet secondary surface |
| Border | `#D8E0EC` | Dividers and inputs |
| Muted | `#61708A` | Supporting copy |
| Danger | `#B42318` | Errors |

Use Geist with system sans-serif fallback. Headings are wide and compact; control text is 14–15px with deliberate line height.

## Geometry

- The white book in the logo becomes a shallow angular divider.
- The yellow orbital ellipses become a thin decorative line in one branded region only.
- Corners stay restrained: 8–12px, not oversized.
- Tables and lists remain open; avoid nested cards and dashboard bento for operational screens.

## Components

- Web: fixed navy rail, white top bar, open table, split class detail, red primary action.
- Mobile: branded navy header, angular book divider, open class rows, three-item bottom navigation.
- Focus: 2px university blue plus 2px paper offset; yellow may reinforce focus on dark surfaces.
- Motion: GSAP is limited to the public access page. Portal motion uses CSS transitions and respects `prefers-reduced-motion`.

## Visible-copy inventory

Web portal:

- Đại học Sao Đỏ
- Tổng quan
- Lớp học
- Thành viên
- Cơ sở Hải Dương
- Quản trị viên
- Tạo lớp
- Chi tiết lớp

Mobile:

- Đại học Sao Đỏ
- Cơ sở Hải Dương
- Minh Anh
- Hôm nay
- Lớp học của tôi
- Lớp học
- Tài khoản

No decorative labels, fake metrics, charts or unrequested modules.
