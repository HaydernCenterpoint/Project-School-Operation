-- AI study assistant: private conversations, durable daily allowance and
-- request de-duplication. Additive only; academic tables are untouched.

create type public.ai_mode as enum ('explain', 'summarize', 'practice', 'plan');
create type public.ai_message_role as enum ('user', 'assistant');
create type public.ai_message_status as enum ('pending', 'complete', 'interrupted', 'failed');

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 120),
  mode public.ai_mode not null default 'explain',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Default retention is 30 days; see docs/operator-guide.md.
  expires_at timestamptz not null default now() + interval '30 days',
  unique (tenant_id, id),
  foreign key (tenant_id, owner_id)
    references public.memberships(tenant_id, user_id) on delete cascade
);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  conversation_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  role public.ai_message_role not null,
  content text not null default '' check (length(content) <= 40000),
  status public.ai_message_status not null default 'complete',
  request_id uuid not null,
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  created_at timestamptz not null default now(),
  unique (owner_id, request_id, role),
  foreign key (tenant_id, conversation_id)
    references public.ai_conversations(tenant_id, id) on delete cascade
);

create index ai_conversations_owner_updated_idx
  on public.ai_conversations(owner_id, updated_at desc);
create index ai_conversations_expires_idx on public.ai_conversations(expires_at);
create index ai_messages_conversation_created_idx
  on public.ai_messages(conversation_id, created_at);
create index ai_messages_owner_created_idx
  on public.ai_messages(owner_id, created_at desc) where role = 'assistant';
create index ai_messages_tenant_created_idx
  on public.ai_messages(tenant_id, created_at desc) where role = 'assistant';

-- Operators may override per tenant; missing rows use the function defaults.
create table private.ai_limits (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  student_daily_requests integer not null check (student_daily_requests between 0 and 10000),
  tenant_daily_requests integer not null check (tenant_daily_requests between 0 and 1000000)
);
revoke all on table private.ai_limits from public, authenticated;

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

create policy ai_conversations_select_owner
on public.ai_conversations for select to authenticated
using (owner_id = auth.uid());

create policy ai_conversations_delete_owner
on public.ai_conversations for delete to authenticated
using (owner_id = auth.uid());

create policy ai_messages_select_owner
on public.ai_messages for select to authenticated
using (owner_id = auth.uid());

grant select, delete on public.ai_conversations to authenticated;
grant select on public.ai_messages to authenticated;

-- Allowance window: calendar day in Asia/Ho_Chi_Minh.
create function private.ai_day_start()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select (date_trunc('day', now() at time zone 'Asia/Ho_Chi_Minh'))
    at time zone 'Asia/Ho_Chi_Minh';
$$;

create function public.ai_usage_status()
returns table (used integer, daily_limit integer, resets_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  actor_tenant uuid;
begin
  select m.tenant_id into strict actor_tenant
  from public.memberships m
  where m.user_id = actor and m.role = 'student';

  return query
  select
    (select count(*)::integer from public.ai_messages x
      where x.owner_id = actor and x.role = 'assistant'
        and x.created_at >= private.ai_day_start()),
    coalesce((select l.student_daily_requests from private.ai_limits l
      where l.tenant_id = actor_tenant), 30),
    private.ai_day_start() + interval '1 day';
exception
  when no_data_found or too_many_rows then
    raise exception 'Student membership required' using errcode = '42501';
end;
$$;

-- Atomically checks allowance and concurrency, creates the conversation when
-- needed and records the user message plus a pending assistant message.
-- Returns 'reserved' or 'duplicate' (the request id was already used).
create function public.ai_reserve(
  p_request_id uuid,
  p_conversation_id uuid,
  p_title text,
  p_mode public.ai_mode,
  p_content text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  actor_tenant uuid;
  student_limit integer;
  tenant_limit integer;
  conversation public.ai_conversations%rowtype;
begin
  if actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_content, ''))) not between 1 and 8000 then
    raise exception 'invalid content' using errcode = '22023';
  end if;

  select m.tenant_id into strict actor_tenant
  from public.memberships m
  where m.user_id = actor and m.role = 'student';

  -- Serialises concurrent reservations for the same student.
  perform pg_advisory_xact_lock(hashtextextended('ai:' || actor::text, 0));

  if exists (
    select 1 from public.ai_messages x
    where x.owner_id = actor and x.request_id = p_request_id
  ) then
    return 'duplicate';
  end if;

  -- Opportunistic retention cleanup for this student.
  delete from public.ai_conversations c
  where c.owner_id = actor and c.expires_at < now();

  -- Abandoned generations older than two minutes stop blocking but still count.
  update public.ai_messages x
    set status = 'interrupted'
  where x.owner_id = actor and x.status = 'pending'
    and x.created_at < now() - interval '2 minutes';

  if exists (
    select 1 from public.ai_messages x
    where x.owner_id = actor and x.status = 'pending'
  ) then
    raise exception 'ai_busy' using errcode = 'P0001';
  end if;

  select
    coalesce(l.student_daily_requests, 30),
    coalesce(l.tenant_daily_requests, 1000)
  into student_limit, tenant_limit
  from (select 1) one
  left join private.ai_limits l on l.tenant_id = actor_tenant;

  if (select count(*) from public.ai_messages x
      where x.owner_id = actor and x.role = 'assistant'
        and x.created_at >= private.ai_day_start()) >= student_limit
     or (select count(*) from public.ai_messages x
      where x.tenant_id = actor_tenant and x.role = 'assistant'
        and x.created_at >= private.ai_day_start()) >= tenant_limit then
    raise exception 'ai_quota_exceeded' using errcode = 'P0001';
  end if;

  select * into conversation
  from public.ai_conversations c
  where c.id = p_conversation_id;

  if not found then
    insert into public.ai_conversations (id, tenant_id, owner_id, title, mode)
    values (
      p_conversation_id,
      actor_tenant,
      actor,
      left(coalesce(nullif(trim(p_title), ''), 'Cuộc trò chuyện mới'), 120),
      p_mode
    );
  elsif conversation.owner_id <> actor then
    raise exception 'not_found' using errcode = '42501';
  else
    update public.ai_conversations
      set updated_at = now(), mode = p_mode,
          expires_at = now() + interval '30 days'
    where id = p_conversation_id;
  end if;

  insert into public.ai_messages
    (tenant_id, conversation_id, owner_id, role, content, status, request_id)
  values
    (actor_tenant, p_conversation_id, actor, 'user', trim(p_content), 'complete', p_request_id),
    (actor_tenant, p_conversation_id, actor, 'assistant', '', 'pending', p_request_id);

  return 'reserved';
exception
  when no_data_found or too_many_rows then
    raise exception 'Student membership required' using errcode = '42501';
end;
$$;

-- Records the final assistant text. Only a still-pending message changes, so a
-- replayed or late completion cannot overwrite a finished answer.
create function public.ai_finish(
  p_request_id uuid,
  p_content text,
  p_status public.ai_message_status,
  p_input_tokens integer,
  p_output_tokens integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status = 'pending' then
    raise exception 'invalid status' using errcode = '22023';
  end if;

  update public.ai_messages x
    set content = left(coalesce(p_content, ''), 40000),
        status = p_status,
        input_tokens = greatest(p_input_tokens, 0),
        output_tokens = greatest(p_output_tokens, 0)
  where x.owner_id = auth.uid()
    and x.request_id = p_request_id
    and x.role = 'assistant'
    and x.status = 'pending';
end;
$$;

-- Scheduled cleanup for every tenant (e.g. daily via pg_cron).
create function private.purge_expired_ai_conversations()
returns integer
language sql
security definer
set search_path = ''
as $$
  with removed as (
    delete from public.ai_conversations where expires_at < now() returning 1
  )
  select count(*)::integer from removed;
$$;

revoke all on function private.ai_day_start() from public;
revoke all on function private.purge_expired_ai_conversations() from public;
revoke all on function public.ai_usage_status() from public;
revoke all on function public.ai_reserve(uuid, uuid, text, public.ai_mode, text) from public;
revoke all on function public.ai_finish(uuid, text, public.ai_message_status, integer, integer) from public;
grant execute on function private.ai_day_start() to authenticated;
grant execute on function public.ai_usage_status() to authenticated;
grant execute on function public.ai_reserve(uuid, uuid, text, public.ai_mode, text) to authenticated;
grant execute on function public.ai_finish(uuid, text, public.ai_message_status, integer, integer) to authenticated;
