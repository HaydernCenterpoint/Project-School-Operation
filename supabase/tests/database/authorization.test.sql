begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(17);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
values (
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-0000-0000-000000000004',
  'authenticated',
  'authenticated',
  'student.a2@saodo.test',
  crypt('Password123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Student A2"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);

insert into public.memberships (tenant_id, user_id, role)
values (
  'a0000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000004',
  'student'
);

insert into public.class_members (tenant_id, class_id, student_id)
values (
  'a0000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000004'
);

select throws_ok(
  $$insert into classes (tenant_id, teacher_id, name)
    values (
      'a0000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000003',
      'Invalid student teacher'
    )$$,
  '23503',
  null,
  'a student membership cannot be assigned as class teacher'
);

select throws_ok(
  $$insert into class_members (tenant_id, class_id, student_id)
    values (
      'a0000000-0000-0000-0000-000000000001',
      'a1000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000002'
    )$$,
  '23503',
  null,
  'a teacher membership cannot be enrolled as a student'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select is((select count(*)::integer from tenants where id = 'a0000000-0000-0000-0000-000000000001'), 1, 'admin sees own tenant');
select is(
  (
    select count(*)::integer
    from memberships
    where user_id in (
      '10000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000002',
      '10000000-0000-0000-0000-000000000003',
      '10000000-0000-0000-0000-000000000004'
    )
  ),
  4,
  'admin sees seeded and test memberships in own tenant'
);
select is((select count(*)::integer from classes where id = 'a1000000-0000-0000-0000-000000000001'), 1, 'admin sees seeded class in own tenant');
select is(
  (
    select count(*)::integer
    from class_members
    where class_id = 'a1000000-0000-0000-0000-000000000001'
      and student_id in (
        '10000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000004'
      )
  ),
  2,
  'admin sees seeded class test roster'
);
select is((select count(*)::integer from memberships where tenant_id = 'b0000000-0000-0000-0000-000000000001'), 0, 'admin cannot see another tenant memberships');

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select is(
  (
    select count(*)::integer
    from memberships
    where user_id in (
      '10000000-0000-0000-0000-000000000002',
      '10000000-0000-0000-0000-000000000003',
      '10000000-0000-0000-0000-000000000004'
    )
  ),
  3,
  'teacher sees self and test students in assigned class'
);
select is((select count(*)::integer from classes where id = 'a1000000-0000-0000-0000-000000000001'), 1, 'teacher sees seeded assigned class');
select is(
  (
    select count(*)::integer
    from class_members
    where class_id = 'a1000000-0000-0000-0000-000000000001'
      and student_id in (
        '10000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000004'
      )
  ),
  2,
  'teacher sees seeded assigned class test roster'
);
select is((select count(*)::integer from classes where tenant_id = 'b0000000-0000-0000-0000-000000000001'), 0, 'teacher cannot see another tenant class');

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select is((select count(*)::integer from memberships where user_id = '10000000-0000-0000-0000-000000000003'), 1, 'student sees own membership');
select is((select count(*)::integer from classes where id = 'a1000000-0000-0000-0000-000000000001'), 1, 'student sees seeded enrolled class');
select is((select count(*)::integer from class_members), 0, 'student cannot read the class roster');
select is((select count(*)::integer from classes where tenant_id = 'b0000000-0000-0000-0000-000000000001'), 0, 'student cannot see another tenant class');

select throws_ok(
  $$insert into classes (tenant_id, teacher_id, name)
    values (
      'b0000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000002',
      'Cross-tenant attack'
    )$$,
  '42501',
  null,
  'student cannot create a class in another tenant'
);

select throws_ok(
  $$insert into audit_logs (tenant_id, actor_id, action, entity_type)
    values (
      'a0000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000003',
      'class.viewed',
      'class'
    )$$,
  '42501',
  null,
  'student cannot spoof an audit event'
);

select * from finish();
rollback;
