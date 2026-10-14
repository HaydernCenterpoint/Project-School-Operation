begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(17);

set local role authenticated;

-- Department staff of Campus A.
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

select ok((select count(*) from student_records) >= 11, 'staff see every student record of their campus');
select is((select count(*) from tenants), 1::bigint, 'staff can read their own campus');

create temporary table made on commit drop as
select * from staff_create_student('{"student_code":"2209999","full_name":"  Sinh  viên   Thử  ","class_name":"DC.CNTT19.01","gender":"Nữ"}');
select matches((select temp_password from made), '^sd-[a-hj-km-np-z2-9]{8}$', 'a new account gets a readable temporary password');
select is((select full_name from student_records where student_code = '2209999'), 'Sinh viên Thử', 'names are trimmed and spaces collapsed');
select throws_ok(
  $$select * from staff_create_student('{"student_code":"2209999","full_name":"Trùng mã"}')$$,
  '23505', null, 'a student code gets only one account'
);

select results_eq(
  $$select ok, message from staff_import_students('[{"student_code":"2209998","full_name":"Nhập Một"},{"student_code":"12ab","full_name":"Sai Mã"},{"student_code":"2209997","full_name":"Nhập Hai","phone":"xx"}]') order by row_no$$,
  $$values (true, 'Đã tạo tài khoản'), (false, 'Mã sinh viên phải gồm 5–12 chữ số'), (false, 'Dữ liệu không hợp lệ (kiểm tra họ tên, giới tính, số điện thoại, email)')$$,
  'bulk import keeps good rows and reports each bad one'
);

select staff_set_student_status('10000000-0000-0000-0000-000002200310', 'suspended');
reset role;
select is((select banned_until from auth.users where id = '10000000-0000-0000-0000-000002200310'), 'infinity'::timestamptz, 'a suspended student cannot sign in');
select ok(
  (select encrypted_password = extensions.crypt((select temp_password from made), encrypted_password) from auth.users u join made on made.user_id = u.id),
  'the temporary password signs in'
);
select ok((select (raw_app_meta_data->>'must_change_password')::boolean from auth.users u join made on made.user_id = u.id), 'and must be changed first');
set local role authenticated;

-- Teacher A teaches 2200286, 2200301, 2200302 (and Student A).
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is(
  (select array_agg(student_code order by student_code) from student_records where student_code like '22003%' or student_code = '2200286'),
  array['2200286', '2200301', '2200302'], 'a teacher sees only students in their classes'
);
select lives_ok($$select staff_update_student('10000000-0000-0000-0000-000002200301', '{"phone":"0911222333"}')$$, 'a teacher updates contact details');
select throws_ok($$select staff_update_student('10000000-0000-0000-0000-000002200301', '{"full_name":"Đổi Tên"}')$$, '42501', null, 'but not the name');
select throws_ok($$select staff_update_student('10000000-0000-0000-0000-000002200303', '{"phone":"0911222333"}')$$, '42501', null, 'nor students of other classes');
select throws_ok($$select staff_reset_password('10000000-0000-0000-0000-000002200301')$$, '42501', null, 'teachers cannot reset passwords');

-- Student 2200303.
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000002200303","role":"authenticated"}', true);
select is((select count(*) from student_records), 1::bigint, 'a student sees only their own record');
select throws_ok($$select * from staff_create_student('{"student_code":"2209996","full_name":"Tự Tạo"}')$$, '42501', null, 'students cannot create accounts');

-- Student B belongs to Campus B.
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select is((select count(*) from student_records), 0::bigint, 'other campuses see nothing');

select * from finish();
rollback;
