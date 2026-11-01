-- Student management fixtures (local only). A Campus A department staff account, and student
-- records for the seeded students. Every person, date and phone number is fictional.
-- Idempotent, so it can also be applied to a running database without a reset.

do $admin$
begin
if to_regclass('public.student_records') is null then
  return;
end if;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-0000000000a1', 'authenticated', 'authenticated',
  'daotao.a@saodo.test', crypt('Password123!', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{"name":"Phòng Đào tạo A"}', now(), now(), '', '', '', ''
) on conflict (id) do nothing;

insert into public.memberships (tenant_id, user_id, role, display_name, email)
values ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-0000000000a1', 'staff', 'Phòng Đào tạo A', 'daotao.a@saodo.test')
on conflict do nothing;

insert into public.student_records (
  user_id, tenant_id, student_code, full_name, date_of_birth, gender, class_name, faculty, major, cohort, phone, created_by
)
select ('10000000-0000-0000-0000-' || lpad(s.code, 12, '0'))::uuid, 'a0000000-0000-0000-0000-000000000001',
       s.code, s.name, s.birth::date, s.gender, s.class_name, s.faculty, s.major, s.cohort, s.phone,
       '10000000-0000-0000-0000-0000000000a1'
from (values
  ('2200286', 'Nguyễn Văn Đạt', '2004-07-03', 'Nam', 'DK13-CNTT1', 'Khoa Công nghệ thông tin', 'Công nghệ thông tin', 'K13', '0936651618'),
  ('2200301', 'Nguyễn Minh Anh', '2004-02-18', 'Nữ', 'DC.CNTT17.10', 'Khoa Công nghệ thông tin', 'Công nghệ thông tin', 'K17', '0900000301'),
  ('2200302', 'Trần Đức Huy', '2004-09-03', 'Nam', 'DC.CNTT17.10', 'Khoa Công nghệ thông tin', 'Công nghệ thông tin', 'K17', '0900000302'),
  ('2200303', 'Lê Thu Trang', '2004-11-21', 'Nữ', 'DC.KT17.02', 'Khoa Kinh tế', 'Kế toán', 'K17', '0900000303'),
  ('2200304', 'Phạm Quốc Bảo', '2004-07-09', 'Nam', 'DC.CK17.05', 'Khoa Cơ khí', 'Công nghệ kỹ thuật cơ khí', 'K17', '0900000304'),
  ('2200305', 'Hoàng Ngọc Linh', '2004-03-30', 'Nữ', 'DC.NNA17.01', 'Khoa Ngoại ngữ', 'Ngôn ngữ Anh', 'K17', '0900000305'),
  ('2200306', 'Vũ Thành Đạt', '2003-12-14', 'Nam', 'DC.CNTT16.08', 'Khoa Công nghệ thông tin', 'Công nghệ thông tin', 'K16', '0900000306'),
  ('2200307', 'Đặng Khánh Vy', '2005-06-25', 'Nữ', 'DC.KT18.03', 'Khoa Kinh tế', 'Quản trị kinh doanh', 'K18', '0900000307'),
  ('2200308', 'Bùi Gia Khánh', '2004-08-17', 'Nam', 'DC.DT17.04', 'Khoa Điện', 'Công nghệ kỹ thuật điện', 'K17', '0900000308'),
  ('2200309', 'Đỗ Phương Thảo', '2005-01-08', 'Nữ', 'DC.CNTT18.02', 'Khoa Công nghệ thông tin', 'Công nghệ thông tin', 'K18', '0900000309'),
  ('2200310', 'Ngô Hải Nam', '2004-10-02', 'Nam', 'DC.OTO17.01', 'Khoa Công nghệ ô tô', 'Công nghệ kỹ thuật ô tô', 'K17', '0900000310')
) as s(code, name, birth, gender, class_name, faculty, major, cohort, phone)
where exists (select 1 from public.memberships m where m.user_id = ('10000000-0000-0000-0000-' || lpad(s.code, 12, '0'))::uuid)
on conflict (user_id) do nothing;

-- Teacher A also teaches two of the new students, so the teacher view has more than one row.
insert into public.class_members (tenant_id, class_id, student_id)
select 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', id
from (values ('10000000-0000-0000-0000-000002200301'::uuid), ('10000000-0000-0000-0000-000002200302'::uuid)) as s(id)
where exists (select 1 from public.memberships m where m.user_id = s.id)
on conflict do nothing;

end
$admin$;
