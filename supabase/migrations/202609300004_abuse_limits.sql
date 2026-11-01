-- Anti-spam and abuse limits enforced by the database, so they hold however a request arrives
-- (browser straight to PostgREST, API route, or a scripted client with a stolen session).
-- Counters reuse private.academic_rate_limits from 202607280004_release_hardening.sql.

-- Counts one action for the caller and refuses it past `max` per window ('minute'|'hour'|'day').
-- No-op without a signed-in user (service role jobs, migrations, seeds).
create function private.rate_limit(bucket text, max integer, per text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  window_start timestamptz := date_trunc(per, clock_timestamp());
  used integer;
begin
  if actor is null then
    return;
  end if;
  -- Old windows are never read again; clear them now and then instead of on every call.
  if random() < 0.01 then
    delete from private.academic_rate_limits where window_started_at < now() - interval '2 days';
  end if;
  insert into private.academic_rate_limits (actor_id, capability, window_started_at, request_count)
  values (actor, bucket, window_start, 1)
  on conflict (actor_id, capability, window_started_at)
  do update set request_count = private.academic_rate_limits.request_count + 1
  returning request_count into used;
  if used > max then
    raise exception 'rate_limited' using errcode = 'P0001', hint = 'Retry after the current ' || per;
  end if;
end;
$$;
revoke all on function private.rate_limit(text, integer, text) from public, authenticated;

-- ---------- community chat ----------

create function private.guard_community_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.rate_limit('chat.message', 12, 'minute');
  perform private.rate_limit('chat.message.day', 600, 'day');
  -- The same text again in the same room within 30 seconds is a double send or a flood.
  if exists (
    select 1 from public.community_messages m
    where m.room_id = new.room_id and m.author_id = new.author_id
      and m.created_at > now() - interval '30 seconds'
      and lower(trim(m.body)) = lower(trim(new.body))
  ) then
    raise exception 'duplicate_message' using errcode = 'P0001';
  end if;
  if (select count(*) from regexp_matches(new.body, 'https?://', 'gi')) > 3 then
    raise exception 'too_many_links' using errcode = 'P0001';
  end if;
  -- 30+ of one character ("aaaaaaaa…", "!!!!!!…") is noise, not a message.
  if new.body ~ '(.)\1{29,}' then
    raise exception 'spam_pattern' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger community_messages_guard before insert on public.community_messages
  for each row execute function private.guard_community_message();

create function private.guard_community_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Nested ifs: PL/pgSQL may read new.kind even when another table fired the trigger.
  if tg_table_name = 'community_rooms' then
    if new.kind = 'group' then
      perform private.rate_limit('chat.room.create', 5, 'day');
    else
      perform private.rate_limit('chat.dm.open', 30, 'day');
    end if;
  elsif tg_table_name = 'community_members' then
    if new.user_id = auth.uid() then
      perform private.rate_limit('chat.room.join', 40, 'hour');
    end if;
  elsif tg_table_name = 'community_profiles' then
    perform private.rate_limit('profile.update', 20, 'hour');
  end if;
  return new;
end;
$$;
create trigger community_rooms_guard before insert on public.community_rooms
  for each row execute function private.guard_community_write();
create trigger community_members_guard before insert on public.community_members
  for each row execute function private.guard_community_write();
create trigger community_profiles_guard before update on public.community_profiles
  for each row execute function private.guard_community_write();

-- ---------- staff actions (all audited, so the audit insert is the choke point) ----------

create function private.guard_audited_action()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  case new.action
    when 'student.create' then perform private.rate_limit('staff.student.create', 1000, 'hour');
    when 'student.update' then perform private.rate_limit('staff.student.update', 300, 'hour');
    when 'student.status' then perform private.rate_limit('staff.student.status', 200, 'hour');
    when 'student.reset_password' then perform private.rate_limit('staff.password.reset', 60, 'hour');
    else null;
  end case;
  return new;
end;
$$;
create trigger audit_logs_guard before insert on public.audit_logs
  for each row execute function private.guard_audited_action();

-- ---------- news ----------

create function private.guard_news_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'news_sources' then
    perform private.rate_limit('news.source.add', 30, 'day');
  else
    perform private.rate_limit('news.post.moderate', 300, 'hour');
  end if;
  return new;
end;
$$;
create trigger news_sources_guard before insert on public.news_sources
  for each row execute function private.guard_news_write();
create trigger news_posts_guard before update on public.news_posts
  for each row execute function private.guard_news_write();

revoke all on function private.guard_community_message() from public;
revoke all on function private.guard_community_write() from public;
revoke all on function private.guard_audited_action() from public;
revoke all on function private.guard_news_write() from public;
