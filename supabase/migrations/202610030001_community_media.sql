-- Community chat: photos and videos in messages.
-- Files live in a private Storage bucket at <room>/<author>/<uuid>.<ext>. Whoever may read the
-- room may read its files (through short-lived signed URLs); only members upload, only into
-- their own folder of that room. Messages list their files in `media`.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-media', 'community-media', false, 25 * 1024 * 1024,
  array['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
);

-- ---------- messages ----------

alter table public.community_messages
  add column media text[] not null default '{}' check (cardinality(media) <= 4);
-- A message is text, files, or both.
alter table public.community_messages drop constraint community_messages_body_check;
alter table public.community_messages add constraint community_messages_body_check
  check (length(body) <= 2000 and (length(trim(body)) >= 1 or cardinality(media) > 0));

-- Files may only come from the author's own folder of this room.
drop policy community_messages_insert_member on public.community_messages;
create policy community_messages_insert_member on public.community_messages
  for insert to authenticated with check (
    author_id = auth.uid()
    and private.community_is_member(room_id)
    and (reply_to is null or exists (
      select 1 from public.community_messages parent
      where parent.id = community_messages.reply_to and parent.room_id = community_messages.room_id
    ))
    and not exists (
      select 1 from unnest(media) path
      where path !~ ('^' || room_id || '/' || auth.uid() || '/[0-9a-f-]{36}\.(jpg|png|gif|webp|mp4|webm|mov)$')
    )
  );
grant insert (media) on public.community_messages to authenticated;

-- Same guard as before, except a duplicate must repeat the files too, so two photos in a row
-- without text are not a "double send".
create or replace function private.guard_community_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.rate_limit('chat.message', 12, 'minute');
  perform private.rate_limit('chat.message.day', 600, 'day');
  if exists (
    select 1 from public.community_messages m
    where m.room_id = new.room_id and m.author_id = new.author_id
      and m.created_at > now() - interval '30 seconds'
      and lower(trim(m.body)) = lower(trim(new.body))
      and m.media = new.media
  ) then
    raise exception 'duplicate_message' using errcode = 'P0001';
  end if;
  if (select count(*) from regexp_matches(new.body, 'https?://', 'gi')) > 3 then
    raise exception 'too_many_links' using errcode = 'P0001';
  end if;
  if new.body ~ '(.)\1{29,}' then
    raise exception 'spam_pattern' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- ---------- storage ----------

-- The room a file belongs to, or null for a malformed path (never an invalid-uuid error).
create function private.community_media_room(path text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case when split_part(path, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(path, '/', 1)::uuid end;
$$;
revoke all on function private.community_media_room(text) from public;
grant execute on function private.community_media_room(text) to authenticated;

create policy community_media_read on storage.objects
  for select to authenticated using (
    bucket_id = 'community-media' and private.community_can_read(private.community_media_room(name))
  );
-- ponytail: the daily cap counts rows, so a deleted file still counts for the day; good enough
-- against floods, move to private.rate_limit if storage grows its own triggers.
create policy community_media_upload on storage.objects
  for insert to authenticated with check (
    bucket_id = 'community-media'
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|gif|webp|mp4|webm|mov)$'
    and split_part(name, '/', 2) = auth.uid()::text
    and private.community_is_member(private.community_media_room(name))
    and (
      select count(*) from storage.objects o
      where o.bucket_id = 'community-media' and o.owner_id = auth.uid()::text and o.created_at > now() - interval '1 day'
    ) < 100
  );
create policy community_media_delete_own on storage.objects
  for delete to authenticated using (bucket_id = 'community-media' and owner_id = auth.uid()::text);

-- ---------- room list ----------

-- Same as before; a last message without text previews as "Ảnh" or "Video".
create or replace function public.community_overview()
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
    coalesce(nullif(trim(last.body), ''), case when last.media[1] ~ '\.(mp4|webm|mov)$' then 'Video' when last.media[1] is not null then 'Ảnh' end),
    last.display_name, last.created_at,
    (select m.user_id from public.community_members m where r.kind = 'dm' and m.room_id = r.id and m.user_id <> auth.uid() limit 1)
  from public.community_rooms r
  left join public.community_members me on me.room_id = r.id and me.user_id = auth.uid()
  left join lateral (
    select x.body, x.media, p.display_name, x.created_at
    from public.community_messages x join public.community_profiles p on p.user_id = x.author_id
    where x.room_id = r.id order by x.created_at desc limit 1
  ) last on true
  order by coalesce(last.created_at, r.created_at) desc;
$$;
