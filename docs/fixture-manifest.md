# Synthetic fixture manifest

This manifest records the local fixtures required by Gate 0. All identities and data are synthetic. **AI is OFF**: no provider, key, retrieval corpus, or AI runtime belongs to this fixture set. Use it only for the local sandbox; it is not approved for real learners or a school pilot.

Source of truth: [`supabase/seed.sql`](../supabase/seed.sql). The migrations constrain membership to the fixed `admin`, `teacher`, and `student` roles and enforce tenant-matched Teacher and Student references.

## Sign-in identities

All six accounts use the seed-only password `Password123!`.

| Tenant | Role | Display name | Email | User UUID |
|---|---|---|---|---|
| Sao Do Campus A | `admin` | Admin A | `admin.a@saodo.test` | `10000000-0000-0000-0000-000000000001` |
| Sao Do Campus A | `teacher` | Teacher A | `teacher.a@saodo.test` | `10000000-0000-0000-0000-000000000002` |
| Sao Do Campus A | `student` | Student A | `student.a@saodo.test` | `10000000-0000-0000-0000-000000000003` |
| Sao Do Campus A | `student` | Sinh viên 2200286 (đăng nhập bằng mã `2200286`, mật khẩu `1111`, chỉ dùng local) | `2200286@sv.saodo.edu.vn` | `10000000-0000-0000-0000-000002200286` |
| Sao Do Campus B | `admin` | Admin B | `admin.b@saodo.test` | `20000000-0000-0000-0000-000000000001` |
| Sao Do Campus B | `teacher` | Teacher B | `teacher.b@saodo.test` | `20000000-0000-0000-0000-000000000002` |
| Sao Do Campus B | `student` | Student B | `student.b@saodo.test` | `20000000-0000-0000-0000-000000000003` |

## Tenant, class, and assignment references

| Reference | Campus A | Campus B |
|---|---|---|
| Tenant | Sao Do Campus A: `a0000000-0000-0000-0000-000000000001` | Sao Do Campus B: `b0000000-0000-0000-0000-000000000001` |
| Class | AI Foundations A: `a1000000-0000-0000-0000-000000000001` | AI Foundations B: `b1000000-0000-0000-0000-000000000001` |
| Assigned Teacher | `10000000-0000-0000-0000-000000000002` | `20000000-0000-0000-0000-000000000002` |
| Enrolled Student | `10000000-0000-0000-0000-000000000003` | `20000000-0000-0000-0000-000000000003` |
| Published assignment | Academic Alpha A: `a2000000-0000-0000-0000-000000000001` | Academic Alpha B: `b2000000-0000-0000-0000-000000000001` |

Both assignments use the instruction `Complete the tenant-safe academic workflow exercise.` Their due time is calculated when the seed runs as seven days after seeding, so `due_at` is not a stable timestamp. No submission or feedback row is seeded.
