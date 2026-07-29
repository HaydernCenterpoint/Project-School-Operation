select set_config('app.seed_mode', 'on', false);

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
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000009', 'authenticated', 'authenticated', 'moderator.a@saodo.test', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Moderator A"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin.b@saodo.test', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Admin B"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'teacher.b@saodo.test', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Teacher B"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'student.b@saodo.test', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Student B"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000009', 'authenticated', 'authenticated', 'moderator.b@saodo.test', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Moderator B"}', now(), now(), '', '', '', '');

insert into public.tenants (id, name)
values
  ('a0000000-0000-0000-0000-000000000001', 'Sao Do Campus A'),
  ('b0000000-0000-0000-0000-000000000001', 'Sao Do Campus B');

insert into public.memberships (tenant_id, user_id, role, display_name, email)
values
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'admin', 'Admin A', 'admin.a@saodo.test'),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'teacher', 'Teacher A', 'teacher.a@saodo.test'),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'student', 'Student A', 'student.a@saodo.test'),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000009', 'moderator', 'Moderator A', 'moderator.a@saodo.test'),
  ('b0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'admin', 'Admin B', 'admin.b@saodo.test'),
  ('b0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'teacher', 'Teacher B', 'teacher.b@saodo.test'),
  ('b0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'student', 'Student B', 'student.b@saodo.test'),
  ('b0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000009', 'moderator', 'Moderator B', 'moderator.b@saodo.test');

insert into public.classes (id, tenant_id, teacher_id, name)
values
  ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'AI Foundations A'),
  ('b1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'AI Foundations B');

insert into public.class_members (tenant_id, class_id, student_id)
values
  ('a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003'),
  ('b0000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003');

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

insert into public.community_spaces (
  id, tenant_id, kind, name, class_id, slow_mode_seconds, created_by
)
values
  (
    'a3000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'school',
    'Sao Do Campus A',
    null,
    0,
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    'a3000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'class',
    'AI Foundations A',
    'a1000000-0000-0000-0000-000000000001',
    0,
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    'a3000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'club',
    'Responsible AI Club A',
    null,
    0,
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    'b3000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'school',
    'Sao Do Campus B',
    null,
    0,
    '20000000-0000-0000-0000-000000000001'
  ),
  (
    'b3000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    'class',
    'AI Foundations B',
    'b1000000-0000-0000-0000-000000000001',
    0,
    '20000000-0000-0000-0000-000000000001'
  ),
  (
    'b3000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000001',
    'club',
    'Responsible AI Club B',
    null,
    0,
    '20000000-0000-0000-0000-000000000001'
  );

insert into public.space_members (tenant_id, space_id, user_id)
values
  ('a0000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000009'),
  ('a0000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000009'),
  ('b0000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002'),
  ('b0000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003'),
  ('b0000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000009'),
  ('b0000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002'),
  ('b0000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003'),
  ('b0000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003'),
  ('b0000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000009');

insert into public.ai_tenant_policies (
  tenant_id,
  tutor_enabled,
  daily_request_limit,
  provider,
  model,
  privacy_policy_version,
  privacy_approved_at
)
values
  (
    'a0000000-0000-0000-0000-000000000001',
    true,
    20,
    'openai-compatible',
    'citation-model-v1',
    'pilot-2026-07',
    '2026-07-29 00:00:00+00'
  ),
  (
    'b0000000-0000-0000-0000-000000000001',
    true,
    20,
    'openai-compatible',
    'citation-model-v1',
    'pilot-2026-07',
    '2026-07-29 00:00:00+00'
  );

insert into public.knowledge_documents (
  id,
  tenant_id,
  class_id,
  title,
  source_name,
  mime_type,
  sha256,
  status,
  published,
  idempotency_key,
  payload_fingerprint,
  ingested_by
)
values
  (
    'a7000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'Campus A Solar Safety',
    'campus-a-solar-guide.pdf',
    'application/pdf',
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'ready',
    true,
    'a7100000-0000-4000-8000-000000000001',
    'a720000000000000000000000000000000000000000000000000000000000001',
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    'b7000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'Campus B Marine Robotics',
    'campus-b-marine-handbook.txt',
    'text/plain',
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    'ready',
    true,
    'b7100000-0000-4000-8000-000000000001',
    'b720000000000000000000000000000000000000000000000000000000000001',
    '20000000-0000-0000-0000-000000000001'
  );

insert into public.knowledge_chunks (
  id,
  tenant_id,
  document_id,
  chunk_index,
  page_number,
  content
)
values
  (
    'a7300000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'a7000000-0000-0000-0000-000000000001',
    0,
    11,
    'AURORA_A_ONLY: Disconnect the solar training panel before inspection.'
  ),
  (
    'a7300000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'a7000000-0000-0000-0000-000000000001',
    1,
    12,
    'Campus A learners record panel voltage only with teacher supervision.'
  ),
  (
    'b7300000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'b7000000-0000-0000-0000-000000000001',
    0,
    21,
    'BENTHIC_B_ONLY: Seal the marine robot battery housing before launch.'
  ),
  (
    'b7300000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    'b7000000-0000-0000-0000-000000000001',
    1,
    22,
    'Campus B learners rinse the marine sensor with fresh water after testing.'
  );

select set_config('app.seed_mode', 'off', false);
