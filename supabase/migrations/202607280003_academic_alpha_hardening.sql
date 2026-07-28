drop policy if exists classes_admin_insert on public.classes;
drop policy if exists classes_admin_update on public.classes;
drop policy if exists classes_admin_delete on public.classes;
drop policy if exists class_members_admin_or_teacher_insert on public.class_members;
drop policy if exists class_members_admin_or_teacher_delete on public.class_members;

revoke insert, update, delete, truncate on public.classes from authenticated;
revoke insert, update, delete, truncate on public.class_members from authenticated;

alter table public.submissions
  drop constraint submissions_feedback_check,
  drop constraint submissions_check,
  add constraint submissions_feedback_length_check
    check (feedback is null or length(trim(feedback)) between 1 and 5000)
    not valid,
  add constraint submissions_review_state_check
    check (
      (
        status = 'submitted'
        and feedback is null
        and feedback_at is null
        and feedback_by is null
      )
      or
      (
        status = 'reviewed'
        and feedback is not null
        and feedback_at is not null
        and feedback_by is not null
      )
    )
    not valid;

update public.submissions
set status = 'submitted',
    feedback = null,
    feedback_at = null,
    feedback_by = null
where status = 'reviewed'
  and (feedback is null or length(trim(feedback)) = 0);

alter table public.submissions
  validate constraint submissions_feedback_length_check,
  validate constraint submissions_review_state_check;

create or replace function public.create_class_with_members(
  class_name text,
  teacher_id uuid,
  student_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  actor_tenant uuid;
  new_class_id uuid := gen_random_uuid();
begin
  if actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select m.tenant_id
    into strict actor_tenant
  from public.memberships m
  where m.user_id = actor
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

create or replace function public.review_submission(
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

  if p_feedback is null or length(trim(p_feedback)) not between 1 and 5000 then
    raise exception 'Feedback must contain between 1 and 5000 non-whitespace characters'
      using errcode = '22023';
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
