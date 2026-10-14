begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(8);

-- Start from clean counters for the two actors used here.
delete from private.academic_rate_limits
where actor_id in ('10000000-0000-0000-0000-000002200286', '10000000-0000-0000-0000-000002200301');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000002200286","role":"authenticated"}', true);

create function pg_temp.say(body text) returns void language sql as $$
  insert into public.community_messages (room_id, author_id, body)
  values ('e0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000002200286', body);
$$;

select lives_ok($$select pg_temp.say('Chào cả lớp')$$, 'a normal message goes through');
select throws_ok($$select pg_temp.say('  chào CẢ lớp ')$$, 'P0001', 'duplicate_message', 'the same text again right away is refused');
select throws_ok($$select pg_temp.say('xem https://a.vn https://b.vn https://c.vn https://d.vn')$$, 'P0001', 'too_many_links', 'more than three links is refused');
select throws_ok($$select pg_temp.say('hay quaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')$$, 'P0001', 'spam_pattern', 'a flood of one character is refused');

-- Refused messages roll their count back, so 1 + 11 more reach the per-minute cap of 12.
select lives_ok($$select pg_temp.say('tin ' || n) from generate_series(1, 11) n$$, 'a busy conversation stays within the limit');
select throws_ok($$select pg_temp.say('tin cuối')$$, 'P0001', 'rate_limited', 'the 13th message in a minute is refused');

-- Group creation: five a day.
select lives_ok($$select community_create_room('Nhóm thử ' || n, '', 'Tự do', 'message') from generate_series(1, 5) n$$, 'five new groups in a day are fine');
select throws_ok($$select community_create_room('Nhóm thử 6', '', 'Tự do', 'message')$$, 'P0001', 'rate_limited', 'the sixth group in a day is refused');

select * from finish();
rollback;
