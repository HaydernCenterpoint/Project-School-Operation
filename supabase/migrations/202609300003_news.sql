-- News: posts pulled automatically from the school's websites (RSS) and Facebook page (Graph
-- API), summarised by AI when it is configured, and published straight away. Staff manage the
-- sources and can hide a post. Students of the tenant read every visible post.

create type public.news_source_kind as enum ('rss', 'facebook');

create table public.news_sources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  kind public.news_source_kind not null,
  name text not null check (length(trim(name)) between 2 and 80),
  -- RSS: the feed URL. Facebook: the page id or username.
  url text not null check (length(url) between 3 and 500),
  category text not null default 'Tin tức' check (length(trim(category)) between 2 and 40),
  active boolean not null default true,
  last_synced_at timestamptz,
  last_error text check (length(last_error) <= 300),
  created_at timestamptz not null default now(),
  unique (tenant_id, url),
  check (kind <> 'rss' or url ~* '^https?://')
);

create table public.news_posts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  source_id uuid not null references public.news_sources(id) on delete cascade,
  -- Canonical link of the original; one post per link even when several feeds list it.
  url text not null check (url ~* '^https?://' and length(url) <= 1000),
  title text not null check (length(trim(title)) between 1 and 300),
  summary text not null default '' check (length(summary) <= 1200),
  image_url text check (image_url ~* '^https?://' and length(image_url) <= 1000),
  category text not null check (length(category) <= 40),
  published_at timestamptz not null,
  ai_summary boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tenant_id, url)
);
create index news_posts_feed_idx on public.news_posts(tenant_id, published_at desc) where not hidden;

alter table public.news_sources enable row level security;
alter table public.news_posts enable row level security;

create function private.is_tenant_member(requested_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.memberships where tenant_id = requested_tenant and user_id = auth.uid());
$$;
revoke all on function private.is_tenant_member(uuid) from public;
grant execute on function private.is_tenant_member(uuid) to authenticated;

-- Everyone in the tenant sees source names (shown on each post); staff manage them.
create policy news_sources_select on public.news_sources
  for select to authenticated using (private.is_tenant_member(tenant_id));
create policy news_sources_staff_insert on public.news_sources
  for insert to authenticated with check (tenant_id = private.staff_tenant());
create policy news_sources_staff_update on public.news_sources
  for update to authenticated using (tenant_id = private.staff_tenant()) with check (tenant_id = private.staff_tenant());
create policy news_sources_staff_delete on public.news_sources
  for delete to authenticated using (tenant_id = private.staff_tenant());

create policy news_posts_select on public.news_posts
  for select to authenticated using (
    (not hidden and private.is_tenant_member(tenant_id)) or tenant_id = private.staff_tenant()
  );
create policy news_posts_staff_update on public.news_posts
  for update to authenticated using (tenant_id = private.staff_tenant()) with check (tenant_id = private.staff_tenant());

grant select, insert, delete on public.news_sources to authenticated;
grant update (name, url, category, active) on public.news_sources to authenticated;
grant select on public.news_posts to authenticated;
grant update (hidden) on public.news_posts to authenticated;

-- The sync job writes through this function only: staff (button in /quan-tri) or the
-- scheduled job using the service role. Existing links are skipped, never overwritten.
create function public.news_record_sync(source uuid, items jsonb, error text default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  src public.news_sources;
  added integer := 0;
begin
  select * into src from public.news_sources where id = source;
  if src is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if coalesce(auth.role(), '') <> ('service_' || 'role') and src.tenant_id is distinct from private.staff_tenant() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if jsonb_typeof(coalesce(items, '[]')) <> 'array' or jsonb_array_length(coalesce(items, '[]')) > 50 then
    raise exception 'too_many_items' using errcode = '22023';
  end if;

  insert into public.news_posts (tenant_id, source_id, url, title, summary, image_url, category, published_at, ai_summary)
  select src.tenant_id, src.id, i->>'url', left(trim(i->>'title'), 300), left(coalesce(i->>'summary', ''), 1200),
         nullif(i->>'image_url', ''), coalesce(nullif(left(i->>'category', 40), ''), src.category),
         least(coalesce((i->>'published_at')::timestamptz, now()), now()), coalesce((i->>'ai_summary')::boolean, false)
  from jsonb_array_elements(coalesce(items, '[]')) as i
  where i->>'url' ~* '^https?://' and length(trim(coalesce(i->>'title', ''))) > 0
  on conflict (tenant_id, url) do nothing;
  get diagnostics added = row_count;

  update public.news_sources set last_synced_at = now(), last_error = left(error, 300) where id = source;
  return added;
end;
$$;
revoke all on function public.news_record_sync(uuid, jsonb, text) from public;
do $$
begin
  execute 'grant execute on function public.news_record_sync(uuid, jsonb, text) to authenticated, service_' || 'role';
end;
$$;
