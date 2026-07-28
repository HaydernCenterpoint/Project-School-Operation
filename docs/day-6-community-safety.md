# Day 6 community safety core

## Scope

This Day 6 extension adds one tenant-safe, text-only community slice:

1. Every tenant has a school announcement space.
2. Every class has an automatically managed class space derived from academic membership.
3. Every tenant has one seeded club with explicit membership.
4. Authorized members can read chronological messages, post, reply and use the fixed `like` reaction.
5. Members can report a message, block another tenant member, mute a space and leave a club.
6. Admins and dedicated Moderators can inspect a tenant-scoped report queue and dismiss, hide, escalate or resolve a report.

AI remains **OFF**. There are no direct messages, anonymous/disappearing chat, files, images, external users, ranking, automated discipline or service-role request paths.

## Roles and boundaries

- `admin`, `moderator`, `teacher` and `student` remain tenant memberships.
- Moderator is a dedicated local role and does not gain class, assignment or submission access.
- The caller JWT and PostgreSQL RLS remain the authorization source of truth.
- Community writes run through exact-body BFF validation and atomic database RPCs.
- Clients cannot insert, update or delete community, report, moderation or audit rows directly.
- Audit records contain identifiers, action and reason codes only. Message text, report detail and moderation notes are excluded.
- Hidden content remains available only as moderation evidence.

## API surface

```text
GET  /api/community/spaces
GET  /api/community/spaces/<id>/messages
POST /api/community/spaces/<id>/messages
POST /api/community/messages/<id>/reactions
POST /api/community/messages/<id>/reports
POST /api/community/users/<id>/block
POST /api/community/spaces/<id>/mute
POST /api/community/spaces/<id>/leave
POST /api/community/spaces/<id>/slow-mode
GET  /api/community/moderation
POST /api/community/moderation/reports/<id>/actions
```

Requests are JSON-only, reject unknown fields and return non-enumerating errors for inaccessible identifiers.

Message creation and moderation decisions require a caller-generated UUID `Idempotency-Key`; exact retries return the original record instead of duplicating a write.

The current web/BFF inventory contains ten community route files in addition to the four academic route files.

## Safety contract

- Messages contain 1–4,000 trimmed characters.
- Replies are one level deep.
- Reactions use a fixed allowlist.
- Mentions are limited to five.
- Message rate and moderator-configured 0–300 second slow mode are enforced in PostgreSQL.
- A deterministic warning requires explicit confirmation before sensitive-looking phone, address, identity, bank, OTP or link content is posted.
- Reports use a fixed reason code and optional detail up to 1,000 characters.
- Duplicate open reports from the same reporter/message resolve deterministically.
- Blocking hides that author from the blocker without deleting moderation evidence.
- Muting changes attention state only; it does not revoke read access.
- Leaving is allowed for club spaces only. School and class access follows source membership.
- Moderator actions remain human decisions and never update an academic or learning profile.

## Verified local evidence

- A clean seed creates eight synthetic accounts across two tenants: six Admin/Teacher/Student academic accounts and two dedicated Moderator accounts.
- PostgreSQL authorization, academic workflow and Community Safety pass **202/202 pgTAP checks**.
- Both production API integration suites pass: academic and community.
- AI remains **OFF**; no provider key, retrieval path or model runtime is required by this slice.
- The combined production Chrome suite passes **15/15**, including report → Moderator queue → hide → member-view removal plus Moderator AX-tree, keyboard focus, 320 px and 200% page-scale checks.

## Acceptance gate

Local acceptance requires:

- Correct school/class/club space membership in both tenants.
- Same-space post, reply, reaction, report, block, mute and permitted leave.
- Non-member, cross-tenant and forged-ID denial.
- Report audit integrity and hidden-message evidence preservation.
- Moderator/Admin tenant isolation and explicit Moderator academic denial.
- Mobile loading, empty, error/retry, permission and realtime-disconnected states.
- Web moderation keyboard, focus, narrow-layout and 200% text-scale checks.
- Existing academic, security, accessibility and build regressions remain green.

Physical Android realtime, TalkBack and 200% text-scale evidence remains an external gate. The feature must not be promoted to real learners before privacy/safeguarding, retention, UAT and staging approvals are recorded.

## Deferred Days 4–5 backlog

The existing text assignment flow passes its end-to-end gate, but account provisioning, private file submission, attendance, standalone announcement management beyond the seeded school channel and in-app notification delivery remain incomplete. This Day 6 increment does not relabel those items as delivered.
