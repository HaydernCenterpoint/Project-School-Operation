-- Community chat: tenant-wide group rooms, direct messages, replies and @mentions.
-- Additive only. Students cannot read each other's memberships, so chat keeps its own
-- public profile per member (name, class, bio) that everyone in the tenant may read.

create type public.community_room_kind as enum ('group', 'dm');

create table public.community_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null,
  display_name text not null check (length(trim(display_name)) between 1 and 80),
  student_code text check (student_code is null or student_code ~ '^\d{5,12}$'),
  class_name text check (class_name is null or length(class_name) <= 60),
  faculty text check (faculty is null or length(faculty) <= 80),
  bio text not null default '' check (length(bio) <= 300),
  created_at timestamptz not null default now(),
  foreign key (tenant_id, user_id) references public.memberships(tenant_id, user_id) on delete cascade
);

create table public.community_rooms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  kind public.community_room_kind not null default 'group',
  name text check (name is null or length(trim(name)) between 3 and 60),
  about text not null default '' check (length(about) <= 200),
  topic text not null default 'Tự do' check (topic in ('Học tập', 'Câu lạc bộ', 'Việc làm', 'Thể thao', 'Tự do')),
  -- An icon name from the web app's icon set (never emoji).
  icon text not null default 'message' check (icon in (
    'message', 'book', 'code', 'sparkle', 'briefcase', 'home', 'language', 'ball', 'music', 'pen', 'calendar', 'users'
  )),
  created_by uuid not null references auth.users(id),
  -- Sorted pair of participants, so one DM per pair.
  dm_key text unique,
  created_at timestamptz not null default now(),
  check ((kind = 'group' and name is not null and dm_key is null) or (kind = 'dm' and dm_key is not null))
);
create unique index community_rooms_group_name_idx
  on public.community_rooms(tenant_id, lower(name)) where kind = 'group';

create table public.community_members (
  room_id uuid not null references public.community_rooms(id) on delete cascade,
  user_id uuid not null references public.community_profiles(user_id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index community_members_user_idx on public.community_members(user_id);

create table public.community_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.community_rooms(id) on delete cascade,
  author_id uuid not null references public.community_profiles(user_id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 2000),
  reply_to uuid references public.community_messages(id) on delete set null,
  mentions uuid[] not null default '{}' check (cardinality(mentions) <= 20),
  created_at timestamptz not null default now()
);
create index community_messages_room_created_idx on public.community_messages(room_id, created_at);
create index community_messages_mentions_idx on public.community_messages using gin (mentions);

-- ---------- helpers ----------

create function private.community_tenant()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select tenant_id from public.community_profiles where user_id = auth.uid();
$$;

create function private.community_can_read(requested_room uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.community_rooms r
    join public.community_profiles p on p.user_id = auth.uid() and p.tenant_id = r.tenant_id
    where r.id = requested_room
      and (
        r.kind = 'group'
        or exists (select 1 from public.community_members m where m.room_id = r.id and m.user_id = auth.uid())
      )
  );
$$;

create function private.community_is_member(requested_room uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.community_members m where m.room_id = requested_room and m.user_id = auth.uid()
  );
$$;

revoke all on function private.community_tenant() from public;
revoke all on function private.community_can_read(uuid) from public;
revoke all on function private.community_is_member(uuid) from public;
grant execute on function private.community_tenant() to authenticated;
grant execute on function private.community_can_read(uuid) to authenticated;
grant execute on function private.community_is_member(uuid) to authenticated;

-- ---------- row level security ----------

alter table public.community_profiles enable row level security;
alter table public.community_rooms enable row level security;
alter table public.community_members enable row level security;
alter table public.community_messages enable row level security;

create policy community_profiles_select_tenant on public.community_profiles
  for select to authenticated using (tenant_id = private.community_tenant());
create policy community_profiles_update_self on public.community_profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy community_rooms_select_readable on public.community_rooms
  for select to authenticated using (private.community_can_read(id));

create policy community_members_select_readable on public.community_members
  for select to authenticated using (private.community_can_read(room_id));
-- Anyone may join a group of their tenant; DMs are only created by community_open_dm.
create policy community_members_join_group on public.community_members
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.community_rooms r
      where r.id = community_members.room_id and r.kind = 'group' and r.tenant_id = private.community_tenant()
    )
  );
create policy community_members_update_self on public.community_members
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy community_members_leave on public.community_members
  for delete to authenticated using (user_id = auth.uid());

create policy community_messages_select_readable on public.community_messages
  for select to authenticated using (private.community_can_read(room_id));
create policy community_messages_insert_member on public.community_messages
  for insert to authenticated with check (
    author_id = auth.uid()
    and private.community_is_member(room_id)
    and (reply_to is null or exists (
      select 1 from public.community_messages parent
      where parent.id = community_messages.reply_to and parent.room_id = community_messages.room_id
    ))
  );
create policy community_messages_delete_own on public.community_messages
  for delete to authenticated using (author_id = auth.uid());

grant select, update (bio) on public.community_profiles to authenticated;
grant select on public.community_rooms to authenticated;
grant select, insert, delete on public.community_members to authenticated;
grant update (last_read_at) on public.community_members to authenticated;
grant select, insert (room_id, author_id, body, reply_to, mentions), delete on public.community_messages to authenticated;

-- ---------- functions ----------

-- Creates the caller's profile from their membership on first visit; returns it either way.
create function public.community_enter()
returns public.community_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.community_profiles;
begin
  insert into public.community_profiles (user_id, tenant_id, display_name, student_code)
  select m.user_id, m.tenant_id, coalesce(nullif(trim(m.display_name), ''), 'Thành viên'),
         case when split_part(m.email, '@', 1) ~ '^\d{5,12}$' then split_part(m.email, '@', 1) end
  from public.memberships m
  where m.user_id = auth.uid()
  order by m.created_at
  limit 1
  on conflict (user_id) do nothing;
  select * into result from public.community_profiles where user_id = auth.uid();
  if result is null then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  return result;
end;
$$;

create function public.community_create_room(room_name text, room_about text, room_topic text, room_icon text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  tenant uuid := private.community_tenant();
  room uuid;
begin
  if tenant is null then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  insert into public.community_rooms (tenant_id, kind, name, about, topic, icon, created_by)
  values (tenant, 'group', regexp_replace(trim(room_name), '\s+', ' ', 'g'), trim(coalesce(room_about, '')),
          room_topic, coalesce(nullif(trim(room_icon), ''), 'message'), auth.uid())
  returning id into room;
  insert into public.community_members (room_id, user_id) values (room, auth.uid());
  return room;
end;
$$;

-- Returns the DM room between the caller and another member, creating it on first use.
create function public.community_open_dm(other_user uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  tenant uuid := private.community_tenant();
  pair text;
  room uuid;
begin
  if tenant is null or other_user = auth.uid() or not exists (
    select 1 from public.community_profiles where user_id = other_user and tenant_id = tenant
  ) then
    raise exception 'invalid_dm' using errcode = '22023';
  end if;
  pair := least(auth.uid()::text, other_user::text) || ':' || greatest(auth.uid()::text, other_user::text);
  select id into room from public.community_rooms where dm_key = pair;
  if room is null then
    insert into public.community_rooms (tenant_id, kind, created_by, dm_key)
    values (tenant, 'dm', auth.uid(), pair)
    on conflict (dm_key) do nothing
    returning id into room;
    if room is null then
      select id into room from public.community_rooms where dm_key = pair;
    end if;
    insert into public.community_members (room_id, user_id)
    values (room, auth.uid()), (room, other_user)
    on conflict do nothing;
  end if;
  return room;
end;
$$;

-- Everything the room picker needs in one call: rooms I can see, with counts for me.
create function public.community_overview()
returns table (
  id uuid,
  kind public.community_room_kind,
  name text,
  about text,
  topic text,
  icon text,
  created_at timestamptz,
  member_count bigint,
  joined boolean,
  unread bigint,
  pings bigint,
  last_body text,
  last_author text,
  last_at timestamptz,
  dm_user uuid
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    r.id, r.kind, r.name, r.about, r.topic, r.icon, r.created_at,
    (select count(*) from public.community_members m where m.room_id = r.id),
    me.user_id is not null,
    (select count(*) from public.community_messages x
       where me.user_id is not null and x.room_id = r.id and x.created_at > me.last_read_at and x.author_id <> auth.uid()),
    (select count(*) from public.community_messages x
       where me.user_id is not null and x.room_id = r.id and x.created_at > me.last_read_at and auth.uid() = any(x.mentions)),
    last.body, last.display_name, last.created_at,
    (select m.user_id from public.community_members m where r.kind = 'dm' and m.room_id = r.id and m.user_id <> auth.uid() limit 1)
  from public.community_rooms r
  left join public.community_members me on me.room_id = r.id and me.user_id = auth.uid()
  left join lateral (
    select x.body, p.display_name, x.created_at
    from public.community_messages x join public.community_profiles p on p.user_id = x.author_id
    where x.room_id = r.id order by x.created_at desc limit 1
  ) last on true
  order by coalesce(last.created_at, r.created_at) desc;
$$;

revoke all on function public.community_enter() from public;
revoke all on function public.community_create_room(text, text, text, text) from public;
revoke all on function public.community_open_dm(uuid) from public;
revoke all on function public.community_overview() from public;
grant execute on function public.community_enter() to authenticated;
grant execute on function public.community_create_room(text, text, text, text) to authenticated;
grant execute on function public.community_open_dm(uuid) to authenticated;
grant execute on function public.community_overview() to authenticated;
