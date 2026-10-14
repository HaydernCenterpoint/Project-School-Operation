begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(10);

set local role authenticated;

-- Student 2200286: member of group room 1 and the DM ...08 with 2200301; not a member of room 6.
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000002200286","role":"authenticated"}', true);

select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner_id) values
    ('community-media', 'e0000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000002200286/11111111-1111-1111-1111-111111111111.jpg', '10000000-0000-0000-0000-000002200286'),
    ('community-media', 'e0000000-0000-0000-0000-000000000008/10000000-0000-0000-0000-000002200286/22222222-2222-2222-2222-222222222222.mp4', '10000000-0000-0000-0000-000002200286')$$,
  'a member uploads into their own folder of a room'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id) values
    ('community-media', 'e0000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000002200301/33333333-3333-3333-3333-333333333333.jpg', '10000000-0000-0000-0000-000002200286')$$,
  '42501', null, 'nobody uploads into someone else''s folder'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id) values
    ('community-media', 'e0000000-0000-0000-0000-000000000006/10000000-0000-0000-0000-000002200286/44444444-4444-4444-4444-444444444444.jpg', '10000000-0000-0000-0000-000002200286')$$,
  '42501', null, 'uploading needs room membership'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id) values
    ('community-media', 'e0000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000002200286/55555555-5555-5555-5555-555555555555.html', '10000000-0000-0000-0000-000002200286')$$,
  '42501', null, 'only photo and video extensions are stored'
);

select lives_ok(
  $$insert into community_messages (room_id, author_id, body, media) values ('e0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000002200286', '',
    array['e0000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000002200286/11111111-1111-1111-1111-111111111111.jpg'])$$,
  'a photo without text is a message'
);
select is((select last_body from community_overview() where id = 'e0000000-0000-0000-0000-000000000001'), 'Ảnh', 'a photo-only message previews as Ảnh');
select throws_ok(
  $$insert into community_messages (room_id, author_id, body, media) values ('e0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000002200286', 'Ảnh của bạn',
    array['e0000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000002200301/66666666-6666-6666-6666-666666666666.jpg'])$$,
  '42501', null, 'a message cannot attach another student''s file'
);
select throws_ok(
  $$insert into community_messages (room_id, author_id, body, media) values ('e0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000002200286', '',
    array['e0000000-0000-0000-0000-000000000008/10000000-0000-0000-0000-000002200286/22222222-2222-2222-2222-222222222222.mp4'])$$,
  '42501', null, 'a message cannot attach a file from another room'
);
select throws_ok(
  $$insert into community_messages (room_id, author_id, body) values ('e0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000002200286', '   ')$$,
  '23514', null, 'a message needs text or a file'
);

-- Student 2200303 is not part of that DM, so its video stays hidden.
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000002200303","role":"authenticated"}', true);
select is(
  (select count(*) from storage.objects where bucket_id = 'community-media' and name like 'e0000000-0000-0000-0000-000000000008/%'),
  0::bigint, 'outsiders cannot read files of a DM'
);

select * from finish();
rollback;
