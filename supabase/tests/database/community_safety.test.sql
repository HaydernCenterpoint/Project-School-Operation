begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

select has_table('public', 'community_spaces', 'community spaces table exists');
select has_table('public', 'space_members', 'space members table exists');
select has_table('public', 'community_messages', 'community messages table exists');
select has_table('public', 'message_reactions', 'message reactions table exists');
select has_table('public', 'content_reports', 'content reports table exists');
select has_table('public', 'moderation_actions', 'moderation actions table exists');
select has_table('public', 'blocks', 'blocks table exists');
select has_table('public', 'mutes', 'mutes table exists');

select ok(
  'moderator' = any(enum_range(null::member_role)::text[]),
  'member_role has a dedicated moderator value'
);

select is(
  (select count(*)::integer from community_spaces),
  6,
  'seed creates school, class, and club spaces for both tenants'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'community_messages'
  ),
  'community messages are published for realtime delivery'
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
  '30000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'teacher.lifecycle@saodo.test',
  crypt('Password123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Lifecycle Teacher"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);

insert into tenants (id, name)
values ('c0000000-0000-0000-0000-000000000001', 'Lifecycle Campus');

insert into memberships (tenant_id, user_id, role, display_name, email)
values (
  'c0000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  'teacher',
  'Lifecycle Teacher',
  'teacher.lifecycle@saodo.test'
);

select is(
  (
    select count(*)::integer
    from community_spaces
    where tenant_id = 'c0000000-0000-0000-0000-000000000001'
      and kind = 'school'
  ),
  1,
  'first tenant membership creates the school community space'
);

insert into classes (id, tenant_id, teacher_id, name)
values (
  'c1000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  'Lifecycle Class'
);

select is(
  (
    select count(*)::integer
    from community_spaces
    where tenant_id = 'c0000000-0000-0000-0000-000000000001'
      and class_id = 'c1000000-0000-0000-0000-000000000001'
      and kind = 'class'
      and name = 'Lifecycle Class'
  ),
  1,
  'new class creates its matching community space'
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
select
  instance_id,
  '30000000-0000-0000-0000-000000000002',
  aud,
  role,
  'teacher.lifecycle.two@saodo.test',
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  '{"name":"Lifecycle Teacher Two"}',
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
from auth.users
where id = '30000000-0000-0000-0000-000000000001';

insert into memberships (tenant_id, user_id, role, display_name, email)
values (
  'c0000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000002',
  'teacher',
  'Lifecycle Teacher Two',
  'teacher.lifecycle.two@saodo.test'
);

select lives_ok(
  $$update classes
    set teacher_id = '30000000-0000-0000-0000-000000000002'
    where id = 'c1000000-0000-0000-0000-000000000001'$$,
  'class teacher can be reassigned after its community space is created'
);

select lives_ok(
  $$delete from memberships
    where tenant_id = 'c0000000-0000-0000-0000-000000000001'
      and user_id = '30000000-0000-0000-0000-000000000001'$$,
  'former space creator membership can be offboarded'
);

select is(
  (
    select count(*)::integer
    from community_spaces
    where tenant_id = 'c0000000-0000-0000-0000-000000000001'
  ),
  2,
  'school and class spaces survive creator offboarding'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select is(
  (select count(*)::integer from list_community_spaces()),
  3,
  'student lists only own-tenant accessible spaces'
);

select is(
  (
    select can_post
    from list_community_spaces()
    where id = 'a3000000-0000-0000-0000-000000000001'
  ),
  false,
  'school announcements are read-only for students'
);

select is(
  (
    select can_post
    from list_community_spaces()
    where id = 'a3000000-0000-0000-0000-000000000002'
  ),
  true,
  'enrolled student can post in the class space'
);

select is(
  (
    select can_post
    from list_community_spaces()
    where id = 'a3000000-0000-0000-0000-000000000003'
  ),
  true,
  'explicit club member can post in the club space'
);

select throws_ok(
  $$insert into community_messages (
      id, tenant_id, space_id, author_id, body
    ) values (
      'a5000000-0000-0000-0000-000000000090',
      'a0000000-0000-0000-0000-000000000001',
      'a3000000-0000-0000-0000-000000000002',
      '10000000-0000-0000-0000-000000000003',
      'raw write'
    )$$,
  '42501',
  null,
  'raw community message insert is denied'
);

select throws_ok(
  $$update community_spaces
    set slow_mode_seconds = 1
    where id = 'a3000000-0000-0000-0000-000000000002'$$,
  '42501',
  null,
  'raw community update is denied'
);

select throws_ok(
  $$delete from space_members
    where space_id = 'a3000000-0000-0000-0000-000000000003'
      and user_id = '10000000-0000-0000-0000-000000000003'$$,
  '42501',
  null,
  'raw community delete is denied'
);

select throws_ok(
  $$select post_community_message(
      'a5000000-0000-0000-0000-000000000091',
      'a3000000-0000-0000-0000-000000000001',
      'Student school announcement',
      null,
      false
    )$$,
  '42501',
  'community_unauthorized',
  'student cannot post to school announcements'
);

select is(
  post_community_message(
    'a5000000-0000-0000-0000-000000000001',
    'a3000000-0000-0000-0000-000000000002',
    'Student class parent',
    null,
    false
  ),
  'a5000000-0000-0000-0000-000000000001'::uuid,
  'student posts in an enrolled class'
);

select is(
  post_community_message(
    'a5000000-0000-0000-0000-000000000001',
    'a3000000-0000-0000-0000-000000000002',
    'Student class parent',
    null,
    false
  ),
  'a5000000-0000-0000-0000-000000000001'::uuid,
  'an exact message retry replays before rate and slow-mode checks'
);

select is(
  (
    select count(*)::integer
    from list_community_messages(
      'a3000000-0000-0000-0000-000000000002',
      null,
      50,
      'a5000000-0000-0000-0000-000000000001'
    )
  ),
  1,
  'message list can retrieve the exact replayed id'
);

select throws_ok(
  $$select post_community_message(
      'a5000000-0000-0000-0000-000000000001',
      'a3000000-0000-0000-0000-000000000002',
      'Changed retry payload',
      null,
      false
    )$$,
  '23505',
  'community_message_id_conflict',
  'a reused message id rejects a changed payload'
);

select throws_ok(
  $$select post_community_message(
      'a5000000-0000-0000-0000-000000000092',
      'a3000000-0000-0000-0000-000000000002',
      repeat('x', 4001),
      null,
      false
    )$$,
  '22023',
  'community_invalid_text',
  'message text is capped at 4000 characters'
);

select throws_ok(
  $$select post_community_message(
      'a5000000-0000-0000-0000-000000000093',
      'a3000000-0000-0000-0000-000000000002',
      'Too many mentions',
      null,
      array[
        '10000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000009',
        '20000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000002'
      ]::uuid[],
      false
    )$$,
  '22023',
  'community_mentions_limit',
  'message mentions are capped at five'
);

select throws_ok(
  $$select post_community_message(
      'a5000000-0000-0000-0000-00000000009a',
      'a3000000-0000-0000-0000-000000000002',
      '@one,@two;@three @four/@five (@six)',
      null,
      false
    )$$,
  '22023',
  'community_mentions_limit',
  'textual mentions cannot bypass the five-mention limit'
);

select throws_ok(
  $$select list_community_moderation_queue()$$,
  '42501',
  'community_unauthorized',
  'ordinary member cannot read the moderation queue'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select is(
  (
    select can_post
    from list_community_spaces()
    where id = 'a3000000-0000-0000-0000-000000000001'
  ),
  true,
  'teacher can post school announcements'
);

select is(
  post_community_message(
    'a5000000-0000-0000-0000-000000000002',
    'a3000000-0000-0000-0000-000000000001',
    'Teacher school announcement',
    null,
    false
  ),
  'a5000000-0000-0000-0000-000000000002'::uuid,
  'teacher posts a school announcement'
);

select is(
  (
    select count(*)::integer
    from list_community_spaces()
    where id = 'a3000000-0000-0000-0000-000000000003'
  ),
  0,
  'same-tenant non-member cannot see the club'
);

select throws_ok(
  $$select post_community_message(
      'a5000000-0000-0000-0000-000000000094',
      'a3000000-0000-0000-0000-000000000003',
      'Non-member club post',
      null,
      false
    )$$,
  '42501',
  'community_unauthorized',
  'same-tenant non-member cannot post in the club'
);

select throws_ok(
  $$select post_community_message(
      'a5000000-0000-0000-0000-000000000095',
      'b3000000-0000-0000-0000-000000000001',
      'Cross-tenant post',
      null,
      false
    )$$,
  '42501',
  'community_unauthorized',
  'cross-tenant posting is denied'
);

select is(
  post_community_message(
    'a5000000-0000-0000-0000-000000000003',
    'a3000000-0000-0000-0000-000000000002',
    'One-level reply',
    'a5000000-0000-0000-0000-000000000001',
    false
  ),
  'a5000000-0000-0000-0000-000000000003'::uuid,
  'teacher creates a one-level reply'
);

select is(
  post_community_message(
    'a5000000-0000-0000-0000-000000000004',
    'a3000000-0000-0000-0000-000000000002',
    'Teacher class root',
    null,
    false
  ),
  'a5000000-0000-0000-0000-000000000004'::uuid,
  'teacher creates a class root message'
);

select throws_ok(
  $$select post_community_message(
      'a5000000-0000-0000-0000-000000000096',
      'a3000000-0000-0000-0000-000000000002',
      'Contact teacher@example.test',
      null,
      false
    )$$,
  '22023',
  'community_privacy_confirmation_required',
  'personal contact text requires privacy confirmation'
);

select throws_ok(
  $$select post_community_message(
      'a5000000-0000-0000-0000-00000000008a',
      'a3000000-0000-0000-0000-000000000002',
      'Open https://example.test/private',
      null,
      false
    )$$,
  '22023',
  'community_privacy_confirmation_required',
  'obvious links require privacy confirmation'
);

select throws_ok(
  $$select post_community_message(
      'a5000000-0000-0000-0000-00000000008b',
      'a3000000-0000-0000-0000-000000000002',
      'OTP 123456',
      null,
      false
    )$$,
  '22023',
  'community_privacy_confirmation_required',
  'OTP codes require privacy confirmation'
);

select throws_ok(
  $$select post_community_message(
      'a5000000-0000-0000-0000-00000000008c',
      'a3000000-0000-0000-0000-000000000002',
      'Meet me at 123 Main Road',
      null,
      false
    )$$,
  '22023',
  'community_privacy_confirmation_required',
  'street addresses require privacy confirmation'
);

select throws_ok(
  $$select post_community_message(
      'a5000000-0000-0000-0000-00000000008d',
      'a3000000-0000-0000-0000-000000000002',
      'Gặp tại 12 đường Sao Đỏ, phường Sao Đỏ',
      null,
      false
    )$$,
  '22023',
  'community_privacy_confirmation_required',
  'accented Vietnamese addresses require privacy confirmation'
);

select throws_ok(
  $$select post_community_message(
      'a5000000-0000-0000-0000-000000000090',
      'a3000000-0000-0000-0000-000000000002',
      'Gửi căn cước và hộ chiếu của bạn',
      null,
      false
    )$$,
  '22023',
  'community_privacy_confirmation_required',
  'Vietnamese identity terms require privacy confirmation'
);

select throws_ok(
  $$select post_community_message(
      'a5000000-0000-0000-0000-000000000091',
      'a3000000-0000-0000-0000-000000000002',
      'Không chia sẻ mã xác thực ngân hàng',
      null,
      false
    )$$,
  '22023',
  'community_privacy_confirmation_required',
  'Vietnamese verification and bank terms require privacy confirmation'
);

select is(
  post_community_message(
    'a5000000-0000-0000-0000-00000000008e',
    'a3000000-0000-0000-0000-000000000002',
    'A broad and important method for this lesson',
    null,
    false
  ),
  'a5000000-0000-0000-0000-00000000008e'::uuid,
  'privacy address matching does not flag words containing road'
);

select is(
  post_community_message(
    'a5000000-0000-0000-0000-00000000008f',
    'a3000000-0000-0000-0000-000000000002',
    'Đây là phương pháp quan trọng cho bài học',
    null,
    false
  ),
  'a5000000-0000-0000-0000-00000000008f'::uuid,
  'privacy address matching does not flag benign Vietnamese phrases'
);

select is(
  post_community_message(
    'a5000000-0000-0000-0000-000000000006',
    'a3000000-0000-0000-0000-000000000002',
    'Contact teacher@example.test',
    null,
    true
  ),
  'a5000000-0000-0000-0000-000000000006'::uuid,
  'confirmed privacy warning permits the post'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select throws_ok(
  $$select post_community_message(
      'a5000000-0000-0000-0000-000000000097',
      'a3000000-0000-0000-0000-000000000002',
      'Nested reply',
      'a5000000-0000-0000-0000-000000000003',
      false
    )$$,
  '22023',
  'community_reply_depth',
  'replies are limited to one level'
);

select is(
  set_community_reaction(
    'a5000000-0000-0000-0000-000000000004',
    'like',
    true
  ),
  true,
  'member can add the fixed allowlisted reaction'
);

select is(
  set_community_reaction(
    'a5000000-0000-0000-0000-000000000004',
    'like',
    false
  ),
  false,
  'member can remove the reaction'
);

select is(
  report_community_message(
    'a7000000-0000-0000-0000-000000000001',
    'a5000000-0000-0000-0000-000000000004',
    'harassment',
    'Sensitive report detail must stay out of audit.'
  ),
  'a7000000-0000-0000-0000-000000000001'::uuid,
  'member reports a visible message'
);

select is(
  report_community_message(
    'a7000000-0000-0000-0000-000000000002',
    'a5000000-0000-0000-0000-000000000004',
    'spam',
    'A duplicate attempt.'
  ),
  'a7000000-0000-0000-0000-000000000001'::uuid,
  'duplicate reports deterministically return the original id'
);

select throws_ok(
  $$select report_community_message(
      'a7000000-0000-0000-0000-000000000099',
      'a5000000-0000-0000-0000-000000000004',
      'other',
      repeat('x', 1001)
    )$$,
  '22023',
  'community_invalid_report_detail',
  'report detail is capped at 1000 characters'
);

reset role;

select is(
  (
    select count(*)::integer
    from audit_logs
    where action = 'community.report.created'
      and entity_id = 'a7000000-0000-0000-0000-000000000001'
  ),
  1,
  'report creation is audited exactly once despite duplicate retry'
);

select ok(
  not exists (
    select 1
    from audit_logs
    where action = 'community.report.created'
      and (
        metadata::text ilike '%Teacher class root%'
        or metadata::text ilike '%Sensitive report detail%'
        or metadata ? 'body'
        or metadata ? 'detail'
      )
  ),
  'report audit is content-free'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select is(
  set_community_mute(
    'a3000000-0000-0000-0000-000000000002',
    true
  ),
  true,
  'member can mute a space'
);

select is(
  (
    select muted
    from list_community_spaces()
    where id = 'a3000000-0000-0000-0000-000000000002'
  ),
  true,
  'space list exposes the member attention state'
);

select ok(
  exists (
    select 1
    from list_community_messages('a3000000-0000-0000-0000-000000000002')
    where id = 'a5000000-0000-0000-0000-000000000004'
  ),
  'muting a space does not filter its messages'
);

select is(
  set_community_block(
    '10000000-0000-0000-0000-000000000002',
    true
  ),
  true,
  'member can block another tenant member'
);

select is(
  (
    select coalesce(bool_and(blocked_by_me and text = ''), false)
    from list_community_messages('a3000000-0000-0000-0000-000000000002')
    where author_id = '10000000-0000-0000-0000-000000000002'
  ),
  true,
  'blocked author content is hidden while an unblock placeholder remains'
);

select throws_ok(
  $$select post_community_message(
      'a5000000-0000-0000-0000-000000000098',
      'a3000000-0000-0000-0000-000000000002',
      'Blocked reply',
      'a5000000-0000-0000-0000-000000000004',
      false
    )$$,
  '42501',
  'community_blocked',
  'block prevents replies between the two members'
);

select is(
  set_community_block(
    '10000000-0000-0000-0000-000000000002',
    false
  ),
  false,
  'member can unblock another member'
);

select ok(
  exists (
    select 1
    from list_community_messages('a3000000-0000-0000-0000-000000000002')
    where id = 'a5000000-0000-0000-0000-000000000004'
  ),
  'unblocked author is visible again'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000009","role":"authenticated"}',
  true
);

select is(
  set_community_slow_mode(
    'a3000000-0000-0000-0000-000000000003',
    300
  ),
  300,
  'moderator can configure slow mode'
);

select is(
  (
    select slow_mode_seconds
    from list_community_spaces()
    where id = 'a3000000-0000-0000-0000-000000000003'
  ),
  300,
  'space list exposes the configured slow mode'
);

reset role;

select is(
  (
    select count(*)::integer
    from audit_logs
    where action = 'community.space.slow_mode.updated'
      and entity_type = 'community_spaces'
      and entity_id = 'a3000000-0000-0000-0000-000000000003'
      and actor_id = '10000000-0000-0000-0000-000000000009'
      and metadata = '{"slow_mode_seconds": 300}'::jsonb
  ),
  1,
  'slow-mode policy changes are audited without community content'
);

set local role authenticated;

select is(
  set_community_slow_mode(
    'a3000000-0000-0000-0000-000000000003',
    300
  ),
  300,
  'repeating the same slow-mode policy is idempotent'
);

reset role;

select is(
  (
    select count(*)::integer
    from audit_logs
    where action = 'community.space.slow_mode.updated'
      and entity_id = 'a3000000-0000-0000-0000-000000000003'
      and actor_id = '10000000-0000-0000-0000-000000000009'
  ),
  1,
  'idempotent slow-mode replay does not duplicate audit evidence'
);

set local role authenticated;

select throws_ok(
  $$select set_community_slow_mode(
      'a3000000-0000-0000-0000-000000000003',
      301
    )$$,
  '22023',
  'community_invalid_slow_mode',
  'slow mode is capped at five minutes'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select throws_ok(
  $$select set_community_slow_mode(
      'a3000000-0000-0000-0000-000000000003',
      0
    )$$,
  '42501',
  'community_unauthorized',
  'ordinary member cannot configure slow mode'
);

select is(
  post_community_message(
    'a5000000-0000-0000-0000-000000000005',
    'a3000000-0000-0000-0000-000000000003',
    'First slow-mode club post',
    null,
    false
  ),
  'a5000000-0000-0000-0000-000000000005'::uuid,
  'first slow-mode post succeeds'
);

select is(
  post_community_message(
    'a5000000-0000-0000-0000-000000000005',
    'a3000000-0000-0000-0000-000000000003',
    'First slow-mode club post',
    null,
    false
  ),
  'a5000000-0000-0000-0000-000000000005'::uuid,
  'exact message replay succeeds while slow mode is active'
);

select throws_ok(
  $$select post_community_message(
      'a5000000-0000-0000-0000-000000000099',
      'a3000000-0000-0000-0000-000000000003',
      'Second slow-mode club post',
      null,
      false
    )$$,
  'P0001',
  'community_slow_mode',
  'slow mode rejects a second post inside the configured interval'
);

select throws_ok(
  $$select leave_community_club(
      'a3000000-0000-0000-0000-000000000001'
    )$$,
  '42501',
  'community_leave_not_allowed',
  'school spaces cannot be left'
);

select is(
  leave_community_club('a3000000-0000-0000-0000-000000000003'),
  true,
  'member can leave a club'
);

select is(
  (
    select count(*)::integer
    from list_community_spaces()
    where id = 'a3000000-0000-0000-0000-000000000003'
  ),
  0,
  'left club is no longer accessible'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000009","role":"authenticated"}',
  true
);

select is(
  (
    select count(*)::integer
    from tenants
    where id = 'a0000000-0000-0000-0000-000000000001'
  ),
  1,
  'moderator can read the own tenant session row'
);

select is(
  (select count(*)::integer from classes),
  0,
  'moderator cannot read academic classes'
);

select is(
  (select count(*)::integer from assignments),
  0,
  'moderator cannot read academic assignments'
);

select is(
  (
    select can_post
    from list_community_spaces()
    where id = 'a3000000-0000-0000-0000-000000000002'
  ),
  true,
  'moderator can manage a class community space without academic table access'
);

select is(
  set_community_block(
    '10000000-0000-0000-0000-000000000002',
    true
  ),
  true,
  'moderator may set a personal block'
);

select ok(
  exists (
    select 1
    from list_community_messages('a3000000-0000-0000-0000-000000000002')
    where id = 'a5000000-0000-0000-0000-000000000004'
  ),
  'moderator evidence listing ignores personal block filters'
);

select is(
  (
    select count(*)::integer
    from list_community_moderation_queue()
    where id = 'a7000000-0000-0000-0000-000000000001'
  ),
  1,
  'moderator can read the own-tenant report queue'
);

select is(
  (
    select author_role::text || ':' || reporter_role::text
    from list_community_moderation_queue()
    where id = 'a7000000-0000-0000-0000-000000000001'
  ),
  'teacher:student',
  'moderation queue returns typed author and reporter roles'
);

select is(
  (
    select message_text
    from list_community_moderation_queue()
    where id = 'a7000000-0000-0000-0000-000000000001'
  ),
  'Teacher class root',
  'moderation queue preserves message evidence'
);

select is(
  moderate_community_report(
    'a8000000-0000-0000-0000-000000000001',
    'a7000000-0000-0000-0000-000000000001',
    'hide',
    'Keep this moderation note out of audit.'
  ),
  'a8000000-0000-0000-0000-000000000001'::uuid,
  'moderator can hide a reported message with a client action id'
);

select is(
  moderate_community_report(
    'a8000000-0000-0000-0000-000000000001',
    'a7000000-0000-0000-0000-000000000001',
    'hide',
    'Keep this moderation note out of audit.'
  ),
  'a8000000-0000-0000-0000-000000000001'::uuid,
  'exact moderation retry replays before transition validation'
);

select is(
  (
    select count(*)::integer
    from moderation_actions
    where id = 'a8000000-0000-0000-0000-000000000001'
  ),
  1,
  'moderation action replay creates only one action record'
);

select throws_ok(
  $$select moderate_community_report(
      'a8000000-0000-0000-0000-000000000001',
      'a7000000-0000-0000-0000-000000000001',
      'resolve',
      'Changed retry payload.'
    )$$,
  '23505',
  'community_moderation_action_id_conflict',
  'reused moderation action id rejects a changed payload'
);

select is(
  (
    select status::text
    from content_reports
    where id = 'a7000000-0000-0000-0000-000000000001'
  ),
  'resolved',
  'hide resolves the report'
);

select is(
  (
    select count(*)::integer
    from list_community_moderation_queue()
    where id = 'a7000000-0000-0000-0000-000000000001'
  ),
  0,
  'resolved report leaves the active moderation queue'
);

select ok(
  exists (
    select 1
    from list_community_messages('a3000000-0000-0000-0000-000000000002')
    where id = 'a5000000-0000-0000-0000-000000000004'
      and hidden
  ),
  'moderator retains hidden message evidence'
);

reset role;

select ok(
  not exists (
    select 1
    from audit_logs
    where action = 'community.moderation.hide'
      and (
        metadata::text ilike '%Teacher class root%'
        or metadata::text ilike '%Keep this moderation note%'
        or metadata ? 'body'
        or metadata ? 'detail'
        or metadata ? 'note'
      )
  ),
  'moderation audit excludes message, report, and note content'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select is(
  (
    select count(*)::integer
    from list_community_messages('a3000000-0000-0000-0000-000000000002')
    where id = 'a5000000-0000-0000-0000-000000000004'
  ),
  0,
  'ordinary member cannot read a hidden message'
);

select throws_ok(
  $$select report_community_message(
      'a7000000-0000-0000-0000-000000000099',
      'a5000000-0000-0000-0000-000000000004',
      'spam',
      null
    )$$,
  'P0001',
  'community_message_not_found',
  'a hidden message cannot receive a new report'
);

select is(
  report_community_message(
    'a7000000-0000-0000-0000-000000000003',
    'a5000000-0000-0000-0000-000000000006',
    'dangerous',
    null
  ),
  'a7000000-0000-0000-0000-000000000003'::uuid,
  'member creates a second report for escalation'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select is(
  report_community_message(
    'a7000000-0000-0000-0000-000000000004',
    'a5000000-0000-0000-0000-000000000001',
    'spam',
    null
  ),
  'a7000000-0000-0000-0000-000000000004'::uuid,
  'teacher reports a class message for dismissal'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000009","role":"authenticated"}',
  true
);

select ok(
  moderate_community_report(
    'a8000000-0000-0000-0000-000000000002',
    'a7000000-0000-0000-0000-000000000004',
    'dismiss',
    null
  ) is not null,
  'moderator can dismiss a report without hiding content'
);

select is(
  (
    select status::text
    from content_reports
    where id = 'a7000000-0000-0000-0000-000000000004'
  ),
  'dismissed',
  'dismiss action records a distinct dismissed status'
);

select is(
  (
    select count(*)::integer
    from list_community_moderation_queue()
    where id = 'a7000000-0000-0000-0000-000000000004'
  ),
  0,
  'dismissed report leaves the active moderation queue'
);

select is(
  (
    select hidden
    from list_community_messages('a3000000-0000-0000-0000-000000000002')
    where id = 'a5000000-0000-0000-0000-000000000001'
  ),
  false,
  'dismiss does not hide the reported message'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select is(
  (
    select reported_by_me
    from list_community_messages('a3000000-0000-0000-0000-000000000002')
    where id = 'a5000000-0000-0000-0000-000000000001'
  ),
  false,
  'dismissed historical report does not keep reported_by_me active'
);

select is(
  report_community_message(
    'a7000000-0000-0000-0000-000000000005',
    'a5000000-0000-0000-0000-000000000001',
    'harassment',
    'A new incident after dismissal.'
  ),
  'a7000000-0000-0000-0000-000000000005'::uuid,
  'resolved or dismissed content can be reported again later'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000009","role":"authenticated"}',
  true
);

select ok(
  moderate_community_report(
    'a8000000-0000-0000-0000-000000000003',
    'a7000000-0000-0000-0000-000000000003',
    'escalate',
    null
  ) is not null,
  'moderator can escalate an open report'
);

select is(
  (
    select status::text
    from content_reports
    where id = 'a7000000-0000-0000-0000-000000000003'
  ),
  'escalated',
  'escalate moves the report into escalated state'
);

select ok(
  moderate_community_report(
    'a8000000-0000-0000-0000-000000000004',
    'a7000000-0000-0000-0000-000000000003',
    'resolve',
    null
  ) is not null,
  'moderator can resolve an escalated report'
);

select is(
  (
    select status::text
    from content_reports
    where id = 'a7000000-0000-0000-0000-000000000003'
  ),
  'resolved',
  'resolve closes an escalated report without hiding it'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select is(
  (
    select reported_by_me
    from list_community_messages('a3000000-0000-0000-0000-000000000002')
    where id = 'a5000000-0000-0000-0000-000000000006'
  ),
  false,
  'resolved historical report does not keep reported_by_me active'
);

select is(
  report_community_message(
    'a7000000-0000-0000-0000-000000000006',
    'a5000000-0000-0000-0000-000000000006',
    'other',
    'A new incident after resolution.'
  ),
  'a7000000-0000-0000-0000-000000000006'::uuid,
  'resolved content can be reported again later'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000009","role":"authenticated"}',
  true
);

select lives_ok(
  $$do $rate$
    declare
      sequence_number integer;
    begin
      for sequence_number in 1..10 loop
        perform post_community_message(
          (
            'a9000000-0000-0000-0000-'
            || lpad(sequence_number::text, 12, '0')
          )::uuid,
          'a3000000-0000-0000-0000-000000000001',
          'Moderator rate sample ' || sequence_number,
          null,
          false
        );
      end loop;
    end
  $rate$;$$,
  'ten moderator posts in one minute are allowed'
);

select throws_ok(
  $$select post_community_message(
      'a9000000-0000-0000-0000-000000000011',
      'a3000000-0000-0000-0000-000000000001',
      'Moderator rate overflow',
      null,
      false
    )$$,
  'P0001',
  'community_rate_limited',
  'eleventh post in one minute is rate limited'
);

select is(
  post_community_message(
    'a9000000-0000-0000-0000-000000000012',
    'a3000000-0000-0000-0000-000000000002',
    'Per-space rate budget',
    null,
    false
  ),
  'a9000000-0000-0000-0000-000000000012'::uuid,
  'message rate limit is scoped per actor and space'
);

select * from finish();
rollback;
