# Synthetic fixture manifest

This manifest records the local fixtures required by Gate 0. All identities and data are synthetic. The AI Tutor runtime is **OFF by default**, but the Day 7 fixture set includes synthetic, pre-chunked retrieval text for deterministic tenant-isolation tests. It contains no provider credential and is not approved for real learners or a school pilot.

Source of truth: [`supabase/seed.sql`](../supabase/seed.sql). The migrations constrain membership to the fixed `admin`, `moderator`, `teacher`, and `student` roles and enforce tenant-matched academic and community references.

## Sign-in identities

All eight accounts use the seed-only password `Password123!`.

| Tenant | Role | Display name | Email | User UUID |
|---|---|---|---|---|
| Sao Do Campus A | `admin` | Admin A | `admin.a@saodo.test` | `10000000-0000-0000-0000-000000000001` |
| Sao Do Campus A | `teacher` | Teacher A | `teacher.a@saodo.test` | `10000000-0000-0000-0000-000000000002` |
| Sao Do Campus A | `student` | Student A | `student.a@saodo.test` | `10000000-0000-0000-0000-000000000003` |
| Sao Do Campus A | `moderator` | Moderator A | `moderator.a@saodo.test` | `10000000-0000-0000-0000-000000000009` |
| Sao Do Campus B | `admin` | Admin B | `admin.b@saodo.test` | `20000000-0000-0000-0000-000000000001` |
| Sao Do Campus B | `teacher` | Teacher B | `teacher.b@saodo.test` | `20000000-0000-0000-0000-000000000002` |
| Sao Do Campus B | `student` | Student B | `student.b@saodo.test` | `20000000-0000-0000-0000-000000000003` |
| Sao Do Campus B | `moderator` | Moderator B | `moderator.b@saodo.test` | `20000000-0000-0000-0000-000000000009` |

## Tenant, class, and assignment references

| Reference | Campus A | Campus B |
|---|---|---|
| Tenant | Sao Do Campus A: `a0000000-0000-0000-0000-000000000001` | Sao Do Campus B: `b0000000-0000-0000-0000-000000000001` |
| Class | AI Foundations A: `a1000000-0000-0000-0000-000000000001` | AI Foundations B: `b1000000-0000-0000-0000-000000000001` |
| Assigned Teacher | `10000000-0000-0000-0000-000000000002` | `20000000-0000-0000-0000-000000000002` |
| Enrolled Student | `10000000-0000-0000-0000-000000000003` | `20000000-0000-0000-0000-000000000003` |
| Published assignment | Academic Alpha A: `a2000000-0000-0000-0000-000000000001` | Academic Alpha B: `b2000000-0000-0000-0000-000000000001` |
| School space | Sao Do Campus A: `a3000000-0000-0000-0000-000000000001` | Sao Do Campus B: `b3000000-0000-0000-0000-000000000001` |
| Class space | AI Foundations A: `a3000000-0000-0000-0000-000000000002` | AI Foundations B: `b3000000-0000-0000-0000-000000000002` |
| Seeded club | Responsible AI Club A: `a3000000-0000-0000-0000-000000000003` | Responsible AI Club B: `b3000000-0000-0000-0000-000000000003` |

Both assignments use the instruction `Complete the tenant-safe academic workflow exercise.` Their due time is calculated when the seed runs as seven days after seeding, so `due_at` is not a stable timestamp. No submission, feedback, community message, report or moderation action is seeded.

## Day 7 AI Tutor fixtures

Both tenant policies use provider ID `openai-compatible`, model `citation-model-v1`, privacy policy version `pilot-2026-07` and a daily limit of 20 requests. The policies are enabled in the database so authorization, consent and quota tests can run, but `.env.example` keeps the effective server runtime off. No Student consent or usage event is seeded.

| Tenant | Document | Source metadata | Seeded chunks |
|---|---|---|---|
| Campus A | Campus A Solar Safety: `a7000000-0000-0000-0000-000000000001` | `campus-a-solar-guide.pdf`, `application/pdf` | Two synthetic text chunks on pages 11 and 12 |
| Campus B | Campus B Marine Robotics: `b7000000-0000-0000-0000-000000000001` | `campus-b-marine-handbook.txt`, `text/plain` | Two synthetic text chunks on pages 21 and 22 |

The source names and MIME types are metadata. No PDF binary is seeded, uploaded or parsed, and no OCR runs in the local application. Retrieval uses the seeded text through PostgreSQL lexical full-text search; it does not use embeddings or `pgvector`.
