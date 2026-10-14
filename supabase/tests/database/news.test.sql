begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(9);

create temporary table src on commit drop as
select id from news_sources where url = 'https://saodo.edu.vn/vi/news/rss/thong-bao/';
grant select on src to authenticated;

set local role authenticated;

-- Department staff of Campus A run a sync.
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is(
  news_record_sync((select id from src), '[
    {"url":"https://example.edu.vn/tin-1.html","title":"Tin thử một","summary":"Tóm tắt","published_at":"2026-09-29T08:00:00Z"},
    {"url":"https://example.edu.vn/tin-2.html","title":"Tin thử hai"},
    {"url":"javascript:alert(1)","title":"Liên kết xấu"}
  ]'::jsonb),
  2, 'staff record new posts, skipping unsafe links'
);
select is(news_record_sync((select id from src), '[{"url":"https://example.edu.vn/tin-1.html","title":"Trùng"}]'::jsonb), 0, 'a link is recorded once');
select is((select category from news_posts where url = 'https://example.edu.vn/tin-2.html'), 'Thông báo', 'posts take the source category');
update news_posts set hidden = true where url = 'https://example.edu.vn/tin-2.html';
select is((select count(*) from news_posts where url like 'https://example.edu.vn/%'), 2::bigint, 'staff still see hidden posts');

-- Student 2200303.
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000002200303","role":"authenticated"}', true);
select is((select count(*) from news_posts where url like 'https://example.edu.vn/%'), 1::bigint, 'students see only visible posts');
select throws_ok($$select news_record_sync((select id from src), '[]'::jsonb)$$, '42501', null, 'students cannot sync');
select throws_ok($$insert into news_sources (tenant_id, kind, name, url) values ('a0000000-0000-0000-0000-000000000001', 'rss', 'Nguồn lạ', 'https://evil.example/rss')$$, '42501', null, 'students cannot add sources');
select is((select count(*) from news_sources), 15::bigint, 'students see source names');

-- Student B belongs to Campus B.
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select is((select count(*) from news_posts), 0::bigint, 'other campuses see no posts');

select * from finish();
rollback;
