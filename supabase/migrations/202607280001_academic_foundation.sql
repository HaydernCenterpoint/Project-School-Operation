create type public.member_role as enum ('admin', 'teacher', 'student');

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create table public.memberships (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id),
  unique (tenant_id, user_id, role)
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  teacher_id uuid not null references auth.users(id),
  teacher_role public.member_role generated always as ('teacher'::public.member_role) stored,
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, teacher_id, teacher_role)
    references public.memberships(tenant_id, user_id, role)
);

create table public.class_members (
  tenant_id uuid not null,
  class_id uuid not null,
  student_id uuid not null references auth.users(id),
  student_role public.member_role generated always as ('student'::public.member_role) stored,
  created_at timestamptz not null default now(),
  primary key (class_id, student_id),
  foreign key (tenant_id, class_id)
    references public.classes(tenant_id, id) on delete cascade,
  foreign key (tenant_id, student_id, student_role)
    references public.memberships(tenant_id, user_id, role)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  action text not null check (length(trim(action)) > 0),
  entity_type text not null check (length(trim(entity_type)) > 0),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, actor_id)
    references public.memberships(tenant_id, user_id)
);

create index memberships_user_id_idx on public.memberships(user_id);
create index classes_teacher_id_idx on public.classes(teacher_id);
create index class_members_student_id_idx on public.class_members(student_id);
create index audit_logs_tenant_created_at_idx
  on public.audit_logs(tenant_id, created_at desc);

create schema private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create function private.has_tenant_role(
  requested_tenant_id uuid,
  requested_roles public.member_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.tenant_id = requested_tenant_id
      and m.user_id = auth.uid()
      and m.role = any(requested_roles)
  );
$$;

create function private.can_view_class(requested_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.classes c
    join public.memberships m
      on m.tenant_id = c.tenant_id
     and m.user_id = auth.uid()
    where c.id = requested_class_id
      and (
        m.role = 'admin'
        or (m.role = 'teacher' and c.teacher_id = auth.uid())
        or (
          m.role = 'student'
          and exists (
            select 1
            from public.class_members cm
            where cm.class_id = c.id
              and cm.student_id = auth.uid()
          )
        )
      )
  );
$$;

revoke all on function private.has_tenant_role(uuid, public.member_role[]) from public;
revoke all on function private.can_view_class(uuid) from public;
grant execute on function private.has_tenant_role(uuid, public.member_role[]) to authenticated;
grant execute on function private.can_view_class(uuid) to authenticated;

alter table public.tenants enable row level security;
alter table public.memberships enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.audit_logs enable row level security;

create policy tenants_select_member
on public.tenants for select to authenticated
using (
  private.has_tenant_role(
    id,
    array['admin', 'teacher', 'student']::public.member_role[]
  )
);

create policy memberships_select_self_or_admin
on public.memberships for select to authenticated
using (
  user_id = auth.uid()
  or private.has_tenant_role(
    tenant_id,
    array['admin']::public.member_role[]
  )
);

create policy memberships_admin_insert
on public.memberships for insert to authenticated
with check (
  private.has_tenant_role(
    tenant_id,
    array['admin']::public.member_role[]
  )
);

create policy memberships_admin_update
on public.memberships for update to authenticated
using (
  private.has_tenant_role(
    tenant_id,
    array['admin']::public.member_role[]
  )
)
with check (
  private.has_tenant_role(
    tenant_id,
    array['admin']::public.member_role[]
  )
);

create policy memberships_admin_delete
on public.memberships for delete to authenticated
using (
  private.has_tenant_role(
    tenant_id,
    array['admin']::public.member_role[]
  )
);

create policy classes_select_authorized
on public.classes for select to authenticated
using (private.can_view_class(id));

create policy classes_admin_insert
on public.classes for insert to authenticated
with check (
  private.has_tenant_role(
    tenant_id,
    array['admin']::public.member_role[]
  )
);

create policy classes_admin_update
on public.classes for update to authenticated
using (
  private.has_tenant_role(
    tenant_id,
    array['admin']::public.member_role[]
  )
)
with check (
  private.has_tenant_role(
    tenant_id,
    array['admin']::public.member_role[]
  )
);

create policy classes_admin_delete
on public.classes for delete to authenticated
using (
  private.has_tenant_role(
    tenant_id,
    array['admin']::public.member_role[]
  )
);

create policy class_members_select_authorized
on public.class_members for select to authenticated
using (
  private.has_tenant_role(
    tenant_id,
    array['admin']::public.member_role[]
  )
  or exists (
    select 1
    from public.classes c
    where c.id = class_id
      and c.tenant_id = tenant_id
      and c.teacher_id = auth.uid()
  )
);

create policy class_members_admin_or_teacher_insert
on public.class_members for insert to authenticated
with check (
  private.has_tenant_role(
    tenant_id,
    array['admin']::public.member_role[]
  )
  or exists (
    select 1
    from public.classes c
    where c.id = class_id
      and c.tenant_id = tenant_id
      and c.teacher_id = auth.uid()
  )
);

create policy class_members_admin_or_teacher_delete
on public.class_members for delete to authenticated
using (
  private.has_tenant_role(
    tenant_id,
    array['admin']::public.member_role[]
  )
  or exists (
    select 1
    from public.classes c
    where c.id = class_id
      and c.tenant_id = tenant_id
      and c.teacher_id = auth.uid()
  )
);

create policy audit_logs_select_admin
on public.audit_logs for select to authenticated
using (
  private.has_tenant_role(
    tenant_id,
    array['admin']::public.member_role[]
  )
);

create policy audit_logs_insert_actor
on public.audit_logs for insert to authenticated
with check (
  actor_id = auth.uid()
  and private.has_tenant_role(
    tenant_id,
    array['admin', 'teacher', 'student']::public.member_role[]
  )
);

grant select on public.tenants to authenticated;
grant select, insert, update, delete on public.memberships to authenticated;
grant select, insert, update, delete on public.classes to authenticated;
grant select, insert, delete on public.class_members to authenticated;
grant select, insert on public.audit_logs to authenticated;
grant usage, select on sequence public.audit_logs_id_seq to authenticated;
