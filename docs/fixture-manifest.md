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

### Department staff and student records

Source: [`supabase/seed-admin.sql`](../supabase/seed-admin.sql). A Campus A staff account (role `staff`) for the management area at `/quan-tri`, plus a fictional student record (date of birth, class, faculty, phone) for every seeded student. Teacher A also teaches `2200301` and `2200302`.

| Tenant | Role | Display name | Email | Password | User UUID |
|---|---|---|---|---|---|
| Sao Do Campus A | `staff` | Phòng Đào tạo A | `daotao.a@saodo.test` | `Password123!` | `10000000-0000-0000-0000-0000000000a1` |

### Community chat students

Source: [`supabase/seed-community.sql`](../supabase/seed-community.sql). Ten more Campus A students for the **Cộng đồng** chat, with fictional names, classes and bios. Sign in with the student code and password `1111` (local only). User UUIDs follow `10000000-0000-0000-0000-00000<code>`.

| Code | Display name | Class |
|---|---|---|
| `2200301` | Nguyễn Minh Anh | DC.CNTT17.10 |
| `2200302` | Trần Đức Huy | DC.CNTT17.10 |
| `2200303` | Lê Thu Trang | DC.KT17.02 |
| `2200304` | Phạm Quốc Bảo | DC.CK17.05 |
| `2200305` | Hoàng Ngọc Linh | DC.NNA17.01 |
| `2200306` | Vũ Thành Đạt | DC.CNTT16.08 |
| `2200307` | Đặng Khánh Vy | DC.KT18.03 |
| `2200308` | Bùi Gia Khánh | DC.DT17.04 |
| `2200309` | Đỗ Phương Thảo | DC.CNTT18.02 |
| `2200310` | Ngô Hải Nam | DC.OTO17.01 |

The same file seeds seven group rooms (`e0000000-…-000000000001` to `…07`), one direct message between `2200301` and `2200286` (`…08`) and sample messages with replies and @mentions.

## Tenant, class, and assignment references

| Reference | Campus A | Campus B |
|---|---|---|
| Tenant | Sao Do Campus A: `a0000000-0000-0000-0000-000000000001` | Sao Do Campus B: `b0000000-0000-0000-0000-000000000001` |
| Class | AI Foundations A: `a1000000-0000-0000-0000-000000000001` | AI Foundations B: `b1000000-0000-0000-0000-000000000001` |
| Assigned Teacher | `10000000-0000-0000-0000-000000000002` | `20000000-0000-0000-0000-000000000002` |
| Enrolled Student | `10000000-0000-0000-0000-000000000003` | `20000000-0000-0000-0000-000000000003` |
| Published assignment | Academic Alpha A: `a2000000-0000-0000-0000-000000000001` | Academic Alpha B: `b2000000-0000-0000-0000-000000000001` |

Both assignments use the instruction `Complete the tenant-safe academic workflow exercise.` Their due time is calculated when the seed runs as seven days after seeding, so `due_at` is not a stable timestamp. No submission or feedback row is seeded.
