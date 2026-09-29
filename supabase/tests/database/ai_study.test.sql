begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(12);

insert into private.ai_limits (tenant_id, student_daily_requests, tenant_daily_requests)
values ('a0000000-0000-0000-0000-000000000001', 2, 1000);

set local role authenticated;

-- Student A
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select is(
  ai_reserve('c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Ôn tập', 'explain', 'Giải thích đệ quy'),
  'reserved',
  'student reserves a first generation'
);
select is(
  ai_reserve('c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Ôn tập', 'explain', 'Giải thích đệ quy'),
  'duplicate',
  'the same request id never reserves twice'
);
select throws_ok(
  $$select ai_reserve('c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'x', 'explain', 'Câu tiếp')$$,
  'P0001', 'ai_busy',
  'a second concurrent generation is refused'
);

select ai_finish('c0000000-0000-0000-0000-000000000001', 'Đệ quy là…', 'complete', 10, 20);
select is(
  (select status::text from ai_messages where request_id = 'c0000000-0000-0000-0000-000000000001' and role = 'assistant'),
  'complete',
  'finish records the answer'
);
select ai_finish('c0000000-0000-0000-0000-000000000001', 'ghi đè', 'failed', 0, 0);
select is(
  (select content from ai_messages where request_id = 'c0000000-0000-0000-0000-000000000001' and role = 'assistant'),
  'Đệ quy là…',
  'a finished answer cannot be overwritten'
);

select is(
  ai_reserve('c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'x', 'practice', 'Cho tôi câu hỏi'),
  'reserved',
  'second request within allowance'
);
select ai_finish('c0000000-0000-0000-0000-000000000003', 'Câu 1…', 'complete', 1, 1);
select throws_ok(
  $$select ai_reserve('c0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', 'x', 'explain', 'Thêm')$$,
  'P0001', 'ai_quota_exceeded',
  'daily allowance is enforced in the database'
);
select is((select used from ai_usage_status()), 2, 'usage reports consumed requests');

-- Student B (other tenant)
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);
select is((select count(*)::integer from ai_conversations), 0, 'other students cannot list the conversation');
select is((select count(*)::integer from ai_messages), 0, 'other students cannot read messages');
select throws_ok(
  $$select ai_reserve('c0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000001', 'x', 'explain', 'Chen vào')$$,
  '42501', null,
  'other students cannot append to a foreign conversation'
);

-- Teacher A has no AI allowance.
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
select throws_ok(
  $$select ai_reserve('c0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000002', 'x', 'explain', 'Xin chào')$$,
  '42501', null,
  'non-students cannot reserve AI generations'
);

select * from finish();
rollback;
