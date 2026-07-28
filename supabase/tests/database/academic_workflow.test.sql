begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(71);

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
  '10000000-0000-0000-0000-000000000005',
  'authenticated',
  'authenticated',
  'audit.member@saodo.test',
  crypt('Password123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Audit Member"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);

insert into public.memberships (
  tenant_id, user_id, role, display_name, email
)
values (
  'a0000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000004',
  'student',
  'Student A2',
  'student.a2@saodo.test'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

insert into memberships (
  tenant_id, user_id, role, display_name, email
)
values (
  'a0000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000005',
  'student',
  'Audit Member',
  'audit.member@saodo.test'
);

update memberships
set display_name = 'Audit Member Updated'
where tenant_id = 'a0000000-0000-0000-0000-000000000001'
  and user_id = '10000000-0000-0000-0000-000000000005';

delete from memberships
where tenant_id = 'a0000000-0000-0000-0000-000000000001'
  and user_id = '10000000-0000-0000-0000-000000000005';

select results_eq(
  $$select action
    from audit_logs
    where entity_type = 'memberships'
      and entity_id = '10000000-0000-0000-0000-000000000005'
    order by id$$,
  $$values
    ('membership.insert'::text),
    ('membership.update'::text),
    ('membership.delete'::text)$$,
  'membership insert, update, and delete are audited'
);

select is(
  (
    select count(*)::integer
    from audit_logs
    where tenant_id = 'a0000000-0000-0000-0000-000000000001'
      and actor_id = '10000000-0000-0000-0000-000000000001'
      and entity_id = '10000000-0000-0000-0000-000000000005'
      and created_at is not null
  ),
  3,
  'membership audit rows record tenant, actor, entity, and timestamp'
);

select is(
  (
    select count(*)::integer
    from assignments
    where id = 'a2000000-0000-0000-0000-000000000001'
  ),
  1,
  'admin reads only own tenant seeded assignment'
);

select is(
  (select count(*)::integer from submissions),
  0,
  'admin cannot read submissions'
);

select throws_ok(
  $$insert into assignments (
      tenant_id, class_id, created_by, title
    ) values (
      'a0000000-0000-0000-0000-000000000001',
      'a1000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000002',
      'Raw admin write'
    )$$,
  '42501',
  null,
  'raw assignment insert is revoked'
);

select throws_ok(
  $$select save_assignment(
      null,
      'a1000000-0000-0000-0000-000000000001',
      'Admin forgery',
      '',
      null,
      'draft'
    )$$,
  '42501',
  null,
  'admin cannot create an assignment'
);

select throws_ok(
  $$insert into classes (
      tenant_id, teacher_id, name
    ) values (
      'a0000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000002',
      'Raw admin class'
    )$$,
  '42501',
  null,
  'admin cannot insert a class outside the RPC'
);

select throws_ok(
  $$update classes
    set name = 'Raw admin update'
    where id = 'a1000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'admin cannot update a class outside the RPC'
);

select throws_ok(
  $$delete from classes
    where id = 'a1000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'admin cannot delete a class outside the RPC'
);

select set_config(
  'test.class_id',
  create_class_with_members(
    'RPC Class A',
    '10000000-0000-0000-0000-000000000002',
    array['10000000-0000-0000-0000-000000000004']::uuid[]
  )::text,
  true
);

select is(
  (
    select count(*)::integer
    from class_members
    where class_id = current_setting('test.class_id')::uuid
      and student_id = '10000000-0000-0000-0000-000000000004'
  ),
  1,
  'class RPC atomically creates its roster'
);

select throws_ok(
  $$select create_class_with_members(
      'Duplicate roster',
      '10000000-0000-0000-0000-000000000002',
      array[
        '10000000-0000-0000-0000-000000000004',
        '10000000-0000-0000-0000-000000000004'
      ]::uuid[]
    )$$,
  '22023',
  null,
  'class RPC rejects duplicate students'
);

select throws_ok(
  $$select create_class_with_members(
      'Cross tenant teacher',
      '20000000-0000-0000-0000-000000000002',
      array['10000000-0000-0000-0000-000000000004']::uuid[]
    )$$,
  '23503',
  null,
  'class RPC rejects a teacher from another tenant'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select throws_ok(
  $$select create_class_with_members(
      'Teacher forgery',
      '10000000-0000-0000-0000-000000000002',
      array['10000000-0000-0000-0000-000000000004']::uuid[]
    )$$,
  '42501',
  null,
  'teacher cannot call the admin class RPC'
);

select throws_ok(
  format(
    'insert into class_members (tenant_id, class_id, student_id) values (%L, %L, %L)',
    'a0000000-0000-0000-0000-000000000001',
    current_setting('test.class_id'),
    '10000000-0000-0000-0000-000000000003'
  ),
  '42501',
  null,
  'teacher cannot add a roster member outside the class RPC'
);

select throws_ok(
  format(
    'delete from class_members where class_id = %L and student_id = %L',
    current_setting('test.class_id'),
    '10000000-0000-0000-0000-000000000004'
  ),
  '42501',
  null,
  'teacher cannot remove a roster member outside the class RPC'
);

select is(
  (
    select count(*)::integer
    from assignments
    where id = 'a2000000-0000-0000-0000-000000000001'
  ),
  1,
  'teacher reads assigned tenant assignment'
);

select is(
  (
    select count(*)::integer
    from assignments
    where tenant_id = 'b0000000-0000-0000-0000-000000000001'
  ),
  0,
  'teacher cannot read cross-tenant assignments'
);

select throws_ok(
  $$select save_assignment(
      'b2000000-0000-0000-0000-000000000001',
      'b1000000-0000-0000-0000-000000000001',
      'Forged update',
      '',
      null,
      'published'
    )$$,
  '42501',
  null,
  'teacher cannot forge a cross-tenant assignment ID'
);

select throws_ok(
  $$insert into assignments (
      tenant_id, class_id, created_by, title
    ) values (
      'a0000000-0000-0000-0000-000000000001',
      'a1000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000002',
      'Raw teacher write'
    )$$,
  '42501',
  null,
  'teacher cannot bypass assignment RPC'
);

select set_config(
  'test.assignment_id',
  save_assignment(
    null,
    'a1000000-0000-0000-0000-000000000001',
    'RPC Draft',
    'Safe instructions',
    null,
    'draft'
  )::text,
  true
);

select is(
  (
    select status::text
    from assignments
    where id = current_setting('test.assignment_id')::uuid
  ),
  'draft',
  'assigned teacher creates a draft'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select is(
  (
    select count(*)::integer
    from assignments
    where id = 'a2000000-0000-0000-0000-000000000001'
  ),
  1,
  'student sees only the seeded published assignment'
);

select is(
  (
    select count(*)::integer
    from assignments
    where id = current_setting('test.assignment_id')::uuid
  ),
  0,
  'student cannot see a draft'
);

select throws_ok(
  format(
    'select submit_assignment(%L, %L, %L)',
    current_setting('test.assignment_id'),
    'draft attempt',
    '30000000-0000-0000-0000-000000000001'
  ),
  '42501',
  null,
  'student cannot submit a draft'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select is(
  save_assignment(
    current_setting('test.assignment_id')::uuid,
    'a1000000-0000-0000-0000-000000000001',
    'RPC Draft',
    'Safe instructions',
    null,
    'published'
  ),
  current_setting('test.assignment_id')::uuid,
  'assigned teacher publishes the draft'
);

select is(
  (
    select status::text
    from assignments
    where id = current_setting('test.assignment_id')::uuid
  ),
  'published',
  'published status is stored'
);

select throws_ok(
  format(
    'select save_assignment(%L, %L, %L, %L, null, %L)',
    current_setting('test.assignment_id'),
    'a1000000-0000-0000-0000-000000000001',
    'RPC Draft',
    'Safe instructions',
    'draft'
  ),
  '22023',
  null,
  'published assignment cannot return to draft'
);

select is(
  save_assignment(
    current_setting('test.assignment_id')::uuid,
    'a1000000-0000-0000-0000-000000000001',
    'RPC Draft',
    'Safe instructions',
    null,
    'published'
  ),
  current_setting('test.assignment_id')::uuid,
  'identical assignment retry is a no-op'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select is(
  (
    select count(*)::integer
    from assignments
    where id = current_setting('test.assignment_id')::uuid
  ),
  1,
  'student sees newly published assignment'
);

select throws_ok(
  format(
    'select submit_assignment(%L, %L, %L)',
    current_setting('test.assignment_id'),
    '   ',
    '30000000-0000-0000-0000-000000000001'
  ),
  '23514',
  null,
  'blank submission content is rejected'
);

select throws_ok(
  format(
    'select submit_assignment(%L, repeat(%L, 20001), %L)',
    current_setting('test.assignment_id'),
    'x',
    '30000000-0000-0000-0000-000000000001'
  ),
  '23514',
  null,
  '20001-character submission content is rejected'
);

select set_config(
  'test.submission_id',
  submit_assignment(
    current_setting('test.assignment_id')::uuid,
    repeat('x', 20000),
    '30000000-0000-0000-0000-000000000001'
  )::text,
  true
);

select is(
  (
    select length(content)::integer
    from submissions
    where id = current_setting('test.submission_id')::uuid
  ),
  20000,
  '20000-character submission content is accepted'
);

select is(
  submit_assignment(
    current_setting('test.assignment_id')::uuid,
    repeat('x', 20000),
    '30000000-0000-0000-0000-000000000001'
  ),
  current_setting('test.submission_id')::uuid,
  'same idempotency key and exact payload returns existing ID'
);

select throws_ok(
  format(
    'select submit_assignment(%L, %L, %L)',
    current_setting('test.assignment_id'),
    'different payload',
    '30000000-0000-0000-0000-000000000001'
  ),
  '22023',
  null,
  'reused idempotency key with different payload is rejected'
);

select throws_ok(
  format(
    'select submit_assignment(%L, %L, %L)',
    current_setting('test.assignment_id'),
    'second submission',
    '30000000-0000-0000-0000-000000000002'
  ),
  '23505',
  null,
  'second submission with a new key is rejected'
);

select throws_ok(
  format(
    'insert into submissions (tenant_id, assignment_id, student_id, content, idempotency_key) values (%L, %L, %L, %L, %L)',
    'a0000000-0000-0000-0000-000000000001',
    current_setting('test.assignment_id'),
    '10000000-0000-0000-0000-000000000003',
    'raw submission',
    '30000000-0000-0000-0000-000000000003'
  ),
  '42501',
  null,
  'student cannot bypass submission RPC'
);

select is(
  (
    select count(*)::integer
    from submissions
    where id = current_setting('test.submission_id')::uuid
  ),
  1,
  'student sees only own submission'
);

select is(
  (
    select count(*)::integer
    from submissions
    where tenant_id = 'b0000000-0000-0000-0000-000000000001'
  ),
  0,
  'student cannot see cross-tenant submissions'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select is(
  (
    select count(*)::integer
    from assignments
    where id = current_setting('test.assignment_id')::uuid
  ),
  0,
  'other tenant student cannot read assignment'
);

select throws_ok(
  format(
    'select submit_assignment(%L, %L, %L)',
    current_setting('test.assignment_id'),
    'forged tenant',
    '30000000-0000-0000-0000-000000000004'
  ),
  '42501',
  null,
  'other tenant student cannot submit forged assignment ID'
);

select is(
  (
    select count(*)::integer
    from submissions
    where id = current_setting('test.submission_id')::uuid
  ),
  0,
  'other tenant student cannot read submission'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select throws_ok(
  format(
    'select review_submission(%L, %L)',
    current_setting('test.submission_id'),
    'forged review'
  ),
  '42501',
  null,
  'other tenant teacher cannot review submission'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select is(
  (
    select count(*)::integer
    from submissions
    where id = current_setting('test.submission_id')::uuid
  ),
  1,
  'assigned teacher sees class submission'
);

select throws_ok(
  format(
    'update submissions set content = %L where id = %L',
    'teacher tampering',
    current_setting('test.submission_id')
  ),
  '42501',
  null,
  'teacher cannot update submission content or identity'
);

select throws_ok(
  format(
    'select review_submission(%L, null)',
    current_setting('test.submission_id')
  ),
  '22023',
  null,
  'null feedback is rejected'
);

select throws_ok(
  format(
    'select review_submission(%L, %L)',
    current_setting('test.submission_id'),
    ''
  ),
  '22023',
  null,
  'empty feedback is rejected'
);

select throws_ok(
  format(
    'select review_submission(%L, %L)',
    current_setting('test.submission_id'),
    '   '
  ),
  '22023',
  null,
  'whitespace-only feedback is rejected'
);

select throws_ok(
  format(
    'select review_submission(%L, repeat(%L, 5001))',
    current_setting('test.submission_id'),
    'f'
  ),
  '22023',
  null,
  'feedback over 5000 characters is rejected'
);

select is(
  review_submission(
    current_setting('test.submission_id')::uuid,
    'Strong tenant isolation.'
  ),
  current_setting('test.submission_id')::uuid,
  'assigned teacher reviews submission'
);

select is(
  (
    select status::text
    from submissions
    where id = current_setting('test.submission_id')::uuid
      and feedback = 'Strong tenant isolation.'
      and feedback_by = '10000000-0000-0000-0000-000000000002'
  ),
  'reviewed',
  'review stores teacher feedback metadata'
);

select is(
  (
    select count(*)::integer
    from pg_constraint
    where conrelid = 'public.submissions'::regclass
      and conname = 'submissions_review_state_check'
      and pg_get_constraintdef(oid) like '%feedback IS NOT NULL%'
  ),
  1,
  'reviewed submission has a database-level non-null feedback constraint'
);

select is(
  review_submission(
    current_setting('test.submission_id')::uuid,
    'Strong tenant isolation.'
  ),
  current_setting('test.submission_id')::uuid,
  'identical review retry is a no-op'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select is(
  (
    select feedback
    from submissions
    where id = current_setting('test.submission_id')::uuid
  ),
  'Strong tenant isolation.',
  'student reads feedback on own submission'
);

select throws_ok(
  format(
    'update submissions set feedback = %L where id = %L',
    'student tampering',
    current_setting('test.submission_id')
  ),
  '42501',
  null,
  'student cannot update feedback'
);

reset role;

do $$
declare
  seconds_remaining double precision :=
    60 - extract(second from clock_timestamp());
begin
  if seconds_remaining < 2 then
    perform pg_sleep(seconds_remaining + 0.1);
  end if;
end;
$$;

insert into private.academic_rate_limits (
  actor_id,
  capability,
  window_started_at,
  request_count
)
values (
  '10000000-0000-0000-0000-000000000002',
  'feedback.write',
  date_trunc('minute', clock_timestamp()),
  29
)
on conflict (actor_id, capability, window_started_at)
do update set request_count = 29;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select is(
  review_submission(
    current_setting('test.submission_id')::uuid,
    'Rate threshold write 30.'
  ),
  current_setting('test.submission_id')::uuid,
  'feedback write 30 succeeds'
);

reset role;

select is(
  (
    select request_count
    from private.academic_rate_limits
    where actor_id = '10000000-0000-0000-0000-000000000002'
      and capability = 'feedback.write'
      and window_started_at = date_trunc('minute', clock_timestamp())
  ),
  30,
  'successful feedback write stores exact threshold count'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select throws_ok(
  format(
    'select review_submission(%L, %L)',
    current_setting('test.submission_id'),
    'Rate threshold write 31.'
  ),
  'P0001',
  'rate_limited',
  'feedback write above threshold is rejected'
);

reset role;

select is(
  (
    select request_count
    from private.academic_rate_limits
    where actor_id = '10000000-0000-0000-0000-000000000002'
      and capability = 'feedback.write'
      and window_started_at = date_trunc('minute', clock_timestamp())
  ),
  30,
  'rejected feedback write leaves threshold count unchanged'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select throws_ok(
  $$insert into audit_logs (
      tenant_id, actor_id, action, entity_type
    ) values (
      'a0000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001',
      'spoofed',
      'assignment'
    )$$,
  '42501',
  null,
  'direct audit spoof is denied'
);

select is(
  (
    select count(*)::integer
    from audit_logs
    where action = 'assignment.created'
      and entity_id = current_setting('test.assignment_id')::uuid
  ),
  1,
  'assignment create audits once'
);

select is(
  (
    select count(*)::integer
    from audit_logs
    where action = 'assignment.published'
      and entity_id = current_setting('test.assignment_id')::uuid
  ),
  1,
  'assignment publish audits once'
);

select is(
  (
    select count(*)::integer
    from audit_logs
    where action = 'submission.created'
      and entity_id = current_setting('test.submission_id')::uuid
  ),
  1,
  'submission create and replay audit once'
);

select is(
  (
    select count(*)::integer
    from audit_logs
    where action = 'feedback.updated'
      and entity_id = current_setting('test.submission_id')::uuid
  ),
  2,
  'successful feedback changes audit exactly once each'
);

select is(
  (
    select count(*)::integer
    from audit_logs
    where action = 'class.insert'
      and entity_id = current_setting('test.class_id')::uuid
  ),
  1,
  'class RPC writes trusted class audit'
);

select is(
  (
    select count(*)::integer
    from audit_logs
    where action = 'class_member.insert'
      and entity_id = '10000000-0000-0000-0000-000000000004'
      and actor_id = '10000000-0000-0000-0000-000000000001'
  ),
  1,
  'class RPC writes trusted roster audit'
);

select is(
  (
    select count(*)::integer
    from audit_logs
    where actor_id in (
        '10000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000003'
      )
      and entity_id in (
        '10000000-0000-0000-0000-000000000005',
        '10000000-0000-0000-0000-000000000004',
        current_setting('test.class_id')::uuid,
        current_setting('test.assignment_id')::uuid,
        current_setting('test.submission_id')::uuid
      )
  ),
  10,
  'failed and replayed mutations create no audit rows'
);

select is(
  (
    select count(*)::integer
    from audit_logs
    where entity_id in (
        '10000000-0000-0000-0000-000000000005',
        '10000000-0000-0000-0000-000000000004',
        current_setting('test.class_id')::uuid,
        current_setting('test.assignment_id')::uuid,
        current_setting('test.submission_id')::uuid
      )
      and (
        metadata <> '{}'::jsonb
        or metadata::text ~* '(instruction|submission|feedback|content)'
      )
  ),
  0,
  'audit metadata contains no academic content'
);

select is(
  (select count(*)::integer from submissions),
  0,
  'admin still cannot read submission content'
);

select is(
  (
    select count(*)::integer
    from assignments
    where id in (
      'a2000000-0000-0000-0000-000000000001',
      current_setting('test.assignment_id')::uuid
    )
  ),
  2,
  'admin reads tenant assignments after workflow'
);

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
      and display_name is not null
      and email is not null
  ),
  4,
  'admin can identify all tenant members'
);

select is(
  (
    select count(*)::integer
    from assignments
    where tenant_id = 'b0000000-0000-0000-0000-000000000001'
  ),
  0,
  'admin cannot read assignments from another tenant'
);

select is(
  (
    select count(*)::integer
    from audit_logs
    where tenant_id = 'b0000000-0000-0000-0000-000000000001'
  ),
  0,
  'admin cannot read another tenant audit rows'
);

select * from finish();
rollback;
