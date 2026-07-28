create table private.academic_rate_limits (
  actor_id uuid not null references auth.users(id) on delete cascade,
  capability text not null,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (actor_id, capability, window_started_at)
);

create index academic_rate_limits_window_idx
  on private.academic_rate_limits(window_started_at);

revoke all on table private.academic_rate_limits from public, authenticated;

create function private.enforce_academic_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  capability_name text;
  request_limit integer;
  current_count integer;
  window_start timestamptz := date_trunc('minute', clock_timestamp());
begin
  if actor is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_table_name = 'memberships' then
    capability_name := 'membership.write';
    request_limit := 30;
  elsif tg_table_name = 'classes' and tg_op = 'INSERT' then
    capability_name := 'class.create';
    request_limit := 10;
  elsif tg_table_name = 'assignments' then
    capability_name := 'assignment.write';
    request_limit := 30;
  elsif tg_table_name = 'submissions' and tg_op = 'INSERT' then
    capability_name := 'submission.create';
    request_limit := 10;
  elsif tg_table_name = 'submissions' and tg_op = 'UPDATE' then
    capability_name := 'feedback.write';
    request_limit := 30;
  else
    return new;
  end if;

  delete from private.academic_rate_limits
  where window_started_at < window_start - interval '1 day';

  insert into private.academic_rate_limits (
    actor_id,
    capability,
    window_started_at,
    request_count
  )
  values (actor, capability_name, window_start, 1)
  on conflict (actor_id, capability, window_started_at)
  do update
    set request_count = private.academic_rate_limits.request_count + 1
  returning request_count into current_count;

  if current_count > request_limit then
    raise exception 'rate_limited'
      using errcode = 'P0001', hint = 'Retry after 60 seconds';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_academic_rate_limit() from public;

create trigger memberships_rate_limit
before insert or update or delete on public.memberships
for each row execute function private.enforce_academic_rate_limit();

create trigger classes_rate_limit
before insert on public.classes
for each row execute function private.enforce_academic_rate_limit();

create trigger assignments_rate_limit
before insert or update on public.assignments
for each row execute function private.enforce_academic_rate_limit();

create trigger submissions_rate_limit
before insert or update on public.submissions
for each row execute function private.enforce_academic_rate_limit();
