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
values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin.a@saodo.test', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Admin A"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'teacher.a@saodo.test', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Teacher A"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'student.a@saodo.test', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Student A"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin.b@saodo.test', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Admin B"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'teacher.b@saodo.test', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Teacher B"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'student.b@saodo.test', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Student B"}', now(), now(), '', '', '', ''),
  -- Local student account 2200286 (Nguyễn Văn Đạt · DK13-CNTT1): the form maps 2200286 to this address.
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000002200286', 'authenticated', 'authenticated', '2200286@sv.saodo.edu.vn', crypt('1111', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Nguyễn Văn Đạt"}', now(), now(), '', '', '', '');

insert into public.tenants (id, name)
values
  ('a0000000-0000-0000-0000-000000000001', 'Sao Do Campus A'),
  ('b0000000-0000-0000-0000-000000000001', 'Sao Do Campus B');

insert into public.memberships (tenant_id, user_id, role, display_name, email)
values
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'admin', 'Admin A', 'admin.a@saodo.test'),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'teacher', 'Teacher A', 'teacher.a@saodo.test'),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'student', 'Student A', 'student.a@saodo.test'),
  ('b0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'admin', 'Admin B', 'admin.b@saodo.test'),
  ('b0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'teacher', 'Teacher B', 'teacher.b@saodo.test'),
  ('b0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'student', 'Student B', 'student.b@saodo.test'),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000002200286', 'student', 'Nguyễn Văn Đạt', '2200286@sv.saodo.edu.vn');

insert into public.classes (id, tenant_id, teacher_id, name)
values
  ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'AI Foundations A'),
  ('b1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'AI Foundations B');

insert into public.class_members (tenant_id, class_id, student_id)
values
  ('a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003'),
  ('b0000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000002200286');

insert into public.assignments (
  id, tenant_id, class_id, created_by, title, instructions, status, due_at
)
values
  (
    'a2000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    'Academic Alpha A',
    'Complete the tenant-safe academic workflow exercise.',
    'published',
    now() + interval '7 days'
  ),
  (
    'b2000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    'Academic Alpha B',
    'Complete the tenant-safe academic workflow exercise.',
    'published',
    now() + interval '7 days'
  );
