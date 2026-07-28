alter table public.memberships
  add column display_name text,
  add column email text,
  add constraint memberships_display_name_check
    check (display_name is null or length(trim(display_name)) between 1 and 200),
  add constraint memberships_email_check
    check (email is null or length(trim(email)) between 3 and 320);

create type public.assignment_status as enum ('draft', 'published');
create type public.submission_status as enum ('submitted', 'reviewed');

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  class_id uuid not null,
  created_by uuid not null references auth.users(id),
  creator_role public.member_role generated always as ('teacher'::public.member_role) stored,
  title text not null check (length(trim(title)) between 1 and 200),
  instructions text not null default '' check (length(instructions) <= 10000),
  status public.assignment_status not null default 'draft',
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, class_id)
    references public.classes(tenant_id, id) on delete cascade,
  foreign key (tenant_id, created_by, creator_role)
    references public.memberships(tenant_id, user_id, role),
  check (due_at is null or due_at > created_at)
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  assignment_id uuid not null,
  student_id uuid not null references auth.users(id),
  student_role public.member_role generated always as ('student'::public.member_role) stored,
  content text not null
    check (length(trim(content)) between 1 and 20000),
  idempotency_key uuid not null,
  status public.submission_status not null default 'submitted',
  submitted_at timestamptz not null default now(),
  feedback text check (feedback is null or length(feedback) <= 5000),
  feedback_at timestamptz,
  feedback_by uuid references auth.users(id),
  feedback_role public.member_role generated always as ('teacher'::public.member_role) stored,
  unique (assignment_id, student_id),
  unique (student_id, idempotency_key),
  foreign key (tenant_id, assignment_id)
    references public.assignments(tenant_id, id) on delete cascade,
  foreign key (tenant_id, student_id, student_role)
    references public.memberships(tenant_id, user_id, role),
  foreign key (tenant_id, feedback_by, feedback_role)
    references public.memberships(tenant_id, user_id, role),
  check (
    (status = 'submitted' and feedback is null and feedback_at is null and feedback_by is null)
    or
    (status = 'reviewed' and feedback_at is not null and feedback_by is not null)
  )
);

create index assignments_class_id_idx on public.assignments(class_id);
create index submissions_assignment_id_idx on public.submissions(assignment_id);
create index submissions_student_id_idx on public.submissions(student_id);

alter table public.assignments enable row level security;
alter table public.submissions enable row level security;

create function private.can_read_assignment(requested_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.assignments a
    join public.classes c
      on c.tenant_id = a.tenant_id
     and c.id = a.class_id
    join public.memberships m
      on m.tenant_id = a.tenant_id
     and m.user_id = auth.uid()
    where a.id = requested_assignment_id
      and (
        m.role = 'admin'
        or (m.role = 'teacher' and c.teacher_id = auth.uid())
        or (
          m.role = 'student'
          and a.status = 'published'
          and exists (
            select 1
            from public.class_members cm
            where cm.tenant_id = a.tenant_id
              and cm.class_id = a.class_id
              and cm.student_id = auth.uid()
          )
        )
      )
  );
$$;

create function private.can_read_submission(requested_submission_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.submissions s
    join public.assignments a
      on a.tenant_id = s.tenant_id
     and a.id = s.assignment_id
    join public.classes c
      on c.tenant_id = a.tenant_id
     and c.id = a.class_id
    where s.id = requested_submission_id
      and (
        s.student_id = auth.uid()
        or c.teacher_id = auth.uid()
      )
  );
$$;

create function private.can_teacher_read_student_membership(
  requested_tenant_id uuid,
  requested_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.classes c
    join public.class_members cm
      on cm.tenant_id = c.tenant_id
     and cm.class_id = c.id
    where c.tenant_id = requested_tenant_id
      and c.teacher_id = auth.uid()
      and cm.student_id = requested_user_id
  );
$$;

revoke all on function private.can_read_assignment(uuid) from public;
revoke all on function private.can_read_submission(uuid) from public;
revoke all on function private.can_teacher_read_student_membership(uuid, uuid) from public;
grant execute on function private.can_read_assignment(uuid) to authenticated;
grant execute on function private.can_read_submission(uuid) to authenticated;
grant execute on function private.can_teacher_read_student_membership(uuid, uuid) to authenticated;

drop policy memberships_select_self_or_admin on public.memberships;

create policy memberships_select_self_admin_or_assigned_teacher
on public.memberships for select to authenticated
using (
  user_id = auth.uid()
  or private.has_tenant_role(
    tenant_id,
    array['admin']::public.member_role[]
  )
  or (
    role = 'student'
    and private.can_teacher_read_student_membership(tenant_id, user_id)
  )
);

create policy assignments_select_authorized
on public.assignments for select to authenticated
using (private.can_read_assignment(id));

create policy submissions_select_owner_or_teacher
on public.submissions for select to authenticated
using (private.can_read_submission(id));

grant select on public.assignments to authenticated;
grant select on public.submissions to authenticated;
revoke insert, update, delete on public.assignments from authenticated;
revoke insert, update, delete on public.submissions from authenticated;

drop policy audit_logs_insert_actor on public.audit_logs;
revoke insert on public.audit_logs from authenticated;
revoke usage, select on sequence public.audit_logs_id_seq from authenticated;

create function private.audit_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  row_tenant uuid;
  row_id uuid;
  audit_action text;
begin
  if actor is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  row_tenant := case when tg_op = 'DELETE' then old.tenant_id else new.tenant_id end;

  if tg_table_name = 'memberships' then
    row_id := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
    audit_action := 'membership.' || lower(tg_op);
  elsif tg_table_name = 'classes' then
    row_id := case when tg_op = 'DELETE' then old.id else new.id end;
    audit_action := 'class.' || lower(tg_op);
  elsif tg_table_name = 'class_members' then
    row_id := case when tg_op = 'DELETE' then old.student_id else new.student_id end;
    audit_action := 'class_member.' || lower(tg_op);
  elsif tg_table_name = 'assignments' then
    row_id := case when tg_op = 'DELETE' then old.id else new.id end;
    if tg_op = 'INSERT' then
      audit_action := case
        when new.status = 'published' then 'assignment.published'
        else 'assignment.created'
      end;
    elsif tg_op = 'UPDATE' and old.status = 'draft' and new.status = 'published' then
      audit_action := 'assignment.published';
    else
      audit_action := 'assignment.updated';
    end if;
  elsif tg_table_name = 'submissions' then
    row_id := case when tg_op = 'DELETE' then old.id else new.id end;
    audit_action := case
      when tg_op = 'INSERT' then 'submission.created'
      when tg_op = 'UPDATE' then 'feedback.updated'
      else 'submission.deleted'
    end;
  else
    raise exception 'Unsupported audited table: %', tg_table_name;
  end if;

  insert into public.audit_logs (
    tenant_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    row_tenant,
    actor,
    audit_action,
    tg_table_name,
    row_id,
    '{}'::jsonb
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.audit_mutation() from public;

create trigger memberships_audit_mutation
after insert or update or delete on public.memberships
for each row execute function private.audit_mutation();

create trigger classes_audit_mutation
after insert or update or delete on public.classes
for each row execute function private.audit_mutation();

create trigger class_members_audit_mutation
after insert or update or delete on public.class_members
for each row execute function private.audit_mutation();

create trigger assignments_audit_mutation
after insert or update or delete on public.assignments
for each row execute function private.audit_mutation();

create trigger submissions_audit_mutation
after insert or update or delete on public.submissions
for each row execute function private.audit_mutation();

create function public.create_class_with_members(
  class_name text,
  teacher_id uuid,
  student_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_tenant uuid;
  new_class_id uuid := gen_random_uuid();
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select m.tenant_id
    into strict actor_tenant
  from public.memberships m
  where m.user_id = auth.uid()
    and m.role = 'admin';

  if class_name is null or length(trim(class_name)) = 0 then
    raise exception 'Class name is required' using errcode = '22023';
  end if;

  if coalesce(cardinality(student_ids), 0) = 0
     or array_position(student_ids, null) is not null
     or (
       select count(*) <> count(distinct student_id)
       from unnest(student_ids) as requested(student_id)
     ) then
    raise exception 'Student list must be nonempty, non-null, and unique'
      using errcode = '22023';
  end if;

  insert into public.classes (id, tenant_id, teacher_id, name)
  values (new_class_id, actor_tenant, teacher_id, trim(class_name));

  insert into public.class_members (tenant_id, class_id, student_id)
  select actor_tenant, new_class_id, requested.student_id
  from unnest(student_ids) as requested(student_id);

  return new_class_id;
exception
  when no_data_found then
    raise exception 'Admin membership required' using errcode = '42501';
  when too_many_rows then
    raise exception 'Admin must belong to exactly one tenant' using errcode = '22023';
end;
$$;

revoke all on function public.create_class_with_members(text, uuid, uuid[]) from public;
grant execute on function public.create_class_with_members(text, uuid, uuid[]) to authenticated;

create function public.save_assignment(
  p_assignment_id uuid,
  p_class_id uuid,
  p_title text,
  p_instructions text,
  p_due_at timestamptz,
  p_status public.assignment_status
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  actor_tenant uuid;
  existing public.assignments%rowtype;
  saved_id uuid;
begin
  if actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select c.tenant_id
    into strict actor_tenant
  from public.classes c
  join public.memberships m
    on m.tenant_id = c.tenant_id
   and m.user_id = actor
   and m.role = 'teacher'
  where c.id = p_class_id
    and c.teacher_id = actor;

  if p_assignment_id is null then
    insert into public.assignments (
      tenant_id, class_id, created_by, title, instructions, due_at, status
    )
    values (
      actor_tenant,
      p_class_id,
      actor,
      p_title,
      coalesce(p_instructions, ''),
      p_due_at,
      coalesce(p_status, 'draft')
    )
    returning id into saved_id;
    return saved_id;
  end if;

  select a.*
    into existing
  from public.assignments a
  where a.id = p_assignment_id
  for update;

  if not found then
    insert into public.assignments (
      id, tenant_id, class_id, created_by, title, instructions, due_at, status
    )
    values (
      p_assignment_id,
      actor_tenant,
      p_class_id,
      actor,
      p_title,
      coalesce(p_instructions, ''),
      p_due_at,
      coalesce(p_status, 'draft')
    )
    returning id into saved_id;
    return saved_id;
  end if;

  if existing.tenant_id <> actor_tenant
     or existing.class_id <> p_class_id
     or existing.created_by <> actor then
    raise exception 'Assigned teacher and assignment required' using errcode = '42501';
  end if;

  if existing.status = 'published' and p_status = 'draft' then
    raise exception 'Published assignments cannot return to draft'
      using errcode = '22023';
  end if;

  if existing.title is not distinct from p_title
     and existing.instructions is not distinct from coalesce(p_instructions, '')
     and existing.due_at is not distinct from p_due_at
     and existing.status is not distinct from p_status then
    return existing.id;
  end if;

  update public.assignments
  set title = p_title,
      instructions = coalesce(p_instructions, ''),
      due_at = p_due_at,
      status = p_status,
      updated_at = now()
  where id = existing.id
  returning id into saved_id;

  return saved_id;
exception
  when no_data_found then
    raise exception 'Assigned teacher and assignment required' using errcode = '42501';
  when too_many_rows then
    raise exception 'Ambiguous teacher membership' using errcode = '22023';
end;
$$;

revoke all on function public.save_assignment(uuid, uuid, text, text, timestamptz, public.assignment_status) from public;
grant execute on function public.save_assignment(uuid, uuid, text, text, timestamptz, public.assignment_status) to authenticated;

create function public.submit_assignment(
  p_assignment_id uuid,
  p_content text,
  p_idempotency_key uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  actor_tenant uuid;
  replay public.submissions%rowtype;
  submitted_id uuid;
begin
  if actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(actor::text || ':' || p_assignment_id::text, 0));

  select a.tenant_id
    into strict actor_tenant
  from public.assignments a
  join public.classes c
    on c.tenant_id = a.tenant_id
   and c.id = a.class_id
  join public.memberships m
    on m.tenant_id = a.tenant_id
   and m.user_id = actor
   and m.role = 'student'
  join public.class_members cm
    on cm.tenant_id = a.tenant_id
   and cm.class_id = a.class_id
   and cm.student_id = actor
  where a.id = p_assignment_id
    and a.status = 'published';

  select s.*
    into replay
  from public.submissions s
  where s.student_id = actor
    and s.idempotency_key = p_idempotency_key;

  if found then
    if replay.assignment_id = p_assignment_id
       and replay.content is not distinct from p_content then
      return replay.id;
    end if;
    raise exception 'Idempotency key was reused with a different payload'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.submissions s
    where s.assignment_id = p_assignment_id
      and s.student_id = actor
  ) then
    raise exception 'Assignment was already submitted' using errcode = '23505';
  end if;

  insert into public.submissions (
    tenant_id, assignment_id, student_id, content, idempotency_key
  )
  values (
    actor_tenant, p_assignment_id, actor, p_content, p_idempotency_key
  )
  returning id into submitted_id;

  return submitted_id;
exception
  when no_data_found then
    raise exception 'Published enrolled assignment required' using errcode = '42501';
  when too_many_rows then
    raise exception 'Ambiguous student membership' using errcode = '22023';
end;
$$;

revoke all on function public.submit_assignment(uuid, text, uuid) from public;
grant execute on function public.submit_assignment(uuid, text, uuid) to authenticated;

create function public.review_submission(
  p_submission_id uuid,
  p_feedback text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  existing public.submissions%rowtype;
begin
  if actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select s.*
    into strict existing
  from public.submissions s
  join public.assignments a
    on a.tenant_id = s.tenant_id
   and a.id = s.assignment_id
  join public.classes c
    on c.tenant_id = a.tenant_id
   and c.id = a.class_id
  join public.memberships m
    on m.tenant_id = s.tenant_id
   and m.user_id = actor
   and m.role = 'teacher'
  where s.id = p_submission_id
    and c.teacher_id = actor
  for update of s;

  if existing.status = 'reviewed'
     and existing.feedback is not distinct from p_feedback then
    return existing.id;
  end if;

  update public.submissions
  set status = 'reviewed',
      feedback = p_feedback,
      feedback_at = now(),
      feedback_by = actor
  where id = existing.id;

  return existing.id;
exception
  when no_data_found then
    raise exception 'Assigned teacher and submission required' using errcode = '42501';
  when too_many_rows then
    raise exception 'Ambiguous teacher membership' using errcode = '22023';
end;
$$;

revoke all on function public.review_submission(uuid, text) from public;
grant execute on function public.review_submission(uuid, text) to authenticated;
