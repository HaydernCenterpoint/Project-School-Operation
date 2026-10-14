begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(11);

-- Start from an unread state, whatever earlier local use has read.
update community_members set last_read_at = now() - interval '20 days'
where room_id = 'e0000000-0000-0000-0000-000000000001' and user_id = '10000000-0000-0000-0000-000002200286';

set local role authenticated;

-- Student 2200286: member of rooms 1, 2, 5 and the DM with 2200301.
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000002200286","role":"authenticated"}', true);

select is((select count(*) from community_overview() where kind = 'group'), 7::bigint, 'sees every group of the tenant');
select ok(exists (select 1 from community_overview() where id = 'e0000000-0000-0000-0000-000000000008'), 'sees own DM');
select ok((select pings > 0 from community_overview() where id = 'e0000000-0000-0000-0000-000000000001'), 'an unread @mention counts as a ping');
select lives_ok(
  $$insert into community_messages (room_id, author_id, body) values ('e0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000002200286', 'Chào cả nhà')$$,
  'a member posts in a joined group'
);
select throws_ok(
  $$insert into community_messages (room_id, author_id, body) values ('e0000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000002200286', 'Xin chào')$$,
  '42501', null, 'posting needs membership'
);
select throws_ok(
  $$insert into community_messages (room_id, author_id, body, reply_to) values ('e0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000002200286', 'Trả lời', 'e1000000-0000-0000-0000-000000000006')$$,
  '42501', null, 'a reply cannot point into another room'
);
select is(community_open_dm('10000000-0000-0000-0000-000002200301'), 'e0000000-0000-0000-0000-000000000008'::uuid, 'opening an existing DM reuses it');
select throws_ok(
  $$select community_create_room('Nhóm thử icon', '', 'Tự do', '💬')$$,
  '23514', null, 'room icons are icon names, never emoji'
);

-- Student 2200303 is not part of that DM.
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000002200303","role":"authenticated"}', true);
select is((select count(*) from community_messages where room_id = 'e0000000-0000-0000-0000-000000000008'), 0::bigint, 'outsiders cannot read a DM');
select is((select count(*) from community_rooms where id = 'e0000000-0000-0000-0000-000000000008'), 0::bigint, 'outsiders cannot see a DM exists');

-- Student B belongs to another tenant.
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select community_enter();
select is((select count(*) from community_rooms), 0::bigint, 'other tenants see no rooms');

select * from finish();
rollback;
