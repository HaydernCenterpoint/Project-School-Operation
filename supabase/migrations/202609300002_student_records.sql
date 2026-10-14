-- Student records and accounts, managed by department staff and admins.
-- Staff create accounts here (sign-up stays disabled): each gets a random temporary password,
-- shown once, that the student must change on first sign-in. Teachers see and update the
-- contact details of students in classes they teach. Every change is written to audit_logs.

create type public.student_status as enum ('active', 'suspended', 'graduated', 'withdrawn');

create table public.student_records (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null,
  student_code text not null check (student_code ~ '^\d{5,12}$'),
  full_name text not null check (length(trim(full_name)) between 2 and 80),
  date_of_birth date check (date_of_birth >= '1950-01-01'),
  gender text check (gender in ('Nam', 'Nữ', 'Khác')),
  class_name text check (length(class_name) <= 40),
  faculty text check (length(faculty) <= 80),
  major text check (length(major) <= 80),
  cohort text check (length(cohort) <= 10),
  phone text check (phone ~ '^\+?[0-9][0-9 .-]{7,14}$'),
  personal_email text check (personal_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(personal_email) <= 120),
  status public.student_status not null default 'active',
  note text not null default '' check (length(note) <= 500),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, student_code),
  foreign key (tenant_id, user_id) references public.memberships(tenant_id, user_id) on delete cascade
);
create index student_records_tenant_class_idx on public.student_records(tenant_id, class_name);

-- ---------- helpers ----------

-- The tenant where the caller is admin or staff; null for everyone else.
create function private.staff_tenant()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select tenant_id from public.memberships
  where user_id = auth.uid() and role in ('admin', 'staff')
  limit 1;
$$;

create function private.teaches_student(student uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.class_members cm
    join public.classes c on c.id = cm.class_id
    where cm.student_id = student and c.teacher_id = auth.uid()
  );
$$;

-- Easy to read aloud and type: no 0/O, 1/l/I.
create function private.temp_password()
returns text
language sql
volatile
set search_path = ''
as $$
  select 'sd-' || string_agg(substr('abcdefghjkmnpqrstuvwxyz23456789', (get_byte(b, i) % 31) + 1, 1), '' order by i)
  from extensions.gen_random_bytes(8) as b, generate_series(0, 7) as i;
$$;

revoke all on function private.staff_tenant() from public;
revoke all on function private.teaches_student(uuid) from public;
revoke all on function private.temp_password() from public;
grant execute on function private.staff_tenant() to authenticated;
grant execute on function private.teaches_student(uuid) to authenticated;

-- ---------- row level security ----------

-- Staff are tenant members too, so they may read their campus like everyone else.
drop policy tenants_select_member on public.tenants;
create policy tenants_select_member on public.tenants for select to authenticated using (
  private.has_tenant_role(id, array['admin', 'staff', 'teacher', 'student']::public.member_role[])
);

alter table public.student_records enable row level security;

create policy student_records_select on public.student_records
  for select to authenticated using (
    user_id = auth.uid()
    or tenant_id = private.staff_tenant()
    or private.teaches_student(user_id)
  );
-- All writes go through the functions below.
grant select on public.student_records to authenticated;

-- ---------- account creation ----------

create function private.create_student(tenant uuid, actor uuid, p jsonb)
returns table (user_id uuid, temp_password text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := trim(p->>'student_code');
  v_name text := regexp_replace(trim(coalesce(p->>'full_name', '')), '\s+', ' ', 'g');
  v_email text;
  v_id uuid := gen_random_uuid();
  v_password text := private.temp_password();
  v_birth date := nullif(p->>'date_of_birth', '')::date;
begin
  if v_code is null or v_code !~ '^\d{5,12}$' then
    raise exception 'invalid_code' using errcode = '22023';
  end if;
  if v_birth is not null and v_birth > current_date - interval '14 years' then
    raise exception 'invalid_birth' using errcode = '22023';
  end if;
  v_email := v_code || '@sv.saodo.edu.vn';
  if exists (select 1 from auth.users u where u.email = v_email) then
    raise exception 'student_exists' using errcode = '23505';
  end if;

  -- ponytail: writes auth.users directly (like the seed) because no service-role key is
  -- configured; move to the Auth admin API from a server route if GoTrue ever requires identities.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
    extensions.crypt(v_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"],"must_change_password":true}',
    jsonb_build_object('name', v_name), now(), now(), '', '', '', ''
  );
  insert into public.memberships (tenant_id, user_id, role, display_name, email)
  values (tenant, v_id, 'student', v_name, v_email);
  insert into public.student_records (
    user_id, tenant_id, student_code, full_name, date_of_birth, gender, class_name, faculty,
    major, cohort, phone, personal_email, created_by
  ) values (
    v_id, tenant, v_code, v_name, v_birth, nullif(p->>'gender', ''), nullif(trim(p->>'class_name'), ''),
    nullif(trim(p->>'faculty'), ''), nullif(trim(p->>'major'), ''), nullif(trim(p->>'cohort'), ''),
    nullif(trim(p->>'phone'), ''), nullif(trim(p->>'personal_email'), ''), actor
  );
  insert into public.audit_logs (tenant_id, actor_id, action, entity_type, entity_id, metadata)
  values (tenant, actor, 'student.create', 'student', v_id, jsonb_build_object('student_code', v_code));
  return query select v_id, v_password;
end;
$$;
revoke all on function private.create_student(uuid, uuid, jsonb) from public, authenticated;

create function public.staff_create_student(p jsonb)
returns table (user_id uuid, temp_password text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  tenant uuid := private.staff_tenant();
begin
  if tenant is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query select * from private.create_student(tenant, auth.uid(), p);
end;
$$;

-- Bulk import: every row succeeds or fails on its own, so one bad row never blocks the rest.
create function public.staff_import_students(rows jsonb)
returns table (row_no integer, student_code text, ok boolean, message text, temp_password text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  tenant uuid := private.staff_tenant();
  item jsonb;
  n integer := 0;
  created record;
begin
  if tenant is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) > 500 then
    raise exception 'too_many_rows' using errcode = '22023';
  end if;
  for item in select value from jsonb_array_elements(rows) loop
    n := n + 1;
    begin
      select * into created from private.create_student(tenant, auth.uid(), item);
      return query select n, item->>'student_code', true, 'Đã tạo tài khoản', created.temp_password;
    exception
      when unique_violation then
        return query select n, item->>'student_code', false, 'Mã sinh viên đã có tài khoản', null::text;
      when others then
        return query select n, item->>'student_code', false,
          case sqlerrm
            when 'invalid_code' then 'Mã sinh viên phải gồm 5–12 chữ số'
            when 'invalid_birth' then 'Ngày sinh không hợp lệ'
            else 'Dữ liệu không hợp lệ (kiểm tra họ tên, giới tính, số điện thoại, email)'
          end, null::text;
    end;
  end loop;
end;
$$;

-- ---------- changes ----------

-- Staff may change every field; a teacher only the contact details of their own students.
create function public.staff_update_student(target uuid, p jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec public.student_records;
  staff boolean;
begin
  select * into rec from public.student_records where user_id = target;
  if rec is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  -- coalesce: for non-staff staff_tenant() is null, and a null here would skip both checks below.
  staff := coalesce(rec.tenant_id = private.staff_tenant(), false);
  if not staff and not private.teaches_student(target) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not staff and exists (
    select 1 from jsonb_object_keys(p) k where k not in ('phone', 'personal_email', 'note')
  ) then
    raise exception 'forbidden_field' using errcode = '42501';
  end if;
  if p ? 'date_of_birth' and nullif(p->>'date_of_birth', '')::date > current_date - interval '14 years' then
    raise exception 'invalid_birth' using errcode = '22023';
  end if;

  update public.student_records r set
    full_name = case when p ? 'full_name' then regexp_replace(trim(p->>'full_name'), '\s+', ' ', 'g') else r.full_name end,
    date_of_birth = case when p ? 'date_of_birth' then nullif(p->>'date_of_birth', '')::date else r.date_of_birth end,
    gender = case when p ? 'gender' then nullif(p->>'gender', '') else r.gender end,
    class_name = case when p ? 'class_name' then nullif(trim(p->>'class_name'), '') else r.class_name end,
    faculty = case when p ? 'faculty' then nullif(trim(p->>'faculty'), '') else r.faculty end,
    major = case when p ? 'major' then nullif(trim(p->>'major'), '') else r.major end,
    cohort = case when p ? 'cohort' then nullif(trim(p->>'cohort'), '') else r.cohort end,
    phone = case when p ? 'phone' then nullif(trim(p->>'phone'), '') else r.phone end,
    personal_email = case when p ? 'personal_email' then nullif(trim(p->>'personal_email'), '') else r.personal_email end,
    note = case when p ? 'note' then coalesce(p->>'note', '') else r.note end,
    updated_at = now()
  where r.user_id = target
  returning * into rec;

  -- Keep the names shown elsewhere in step with the record.
  update public.memberships set display_name = rec.full_name
  where user_id = target and display_name is distinct from rec.full_name;
  update public.community_profiles set
    display_name = rec.full_name, class_name = rec.class_name, faculty = rec.faculty
  where user_id = target;

  insert into public.audit_logs (tenant_id, actor_id, action, entity_type, entity_id, metadata)
  values (rec.tenant_id, auth.uid(), 'student.update', 'student', target, jsonb_build_object('fields', (select jsonb_agg(k) from jsonb_object_keys(p) k)));
end;
$$;

-- Suspended or withdrawn students cannot sign in; graduates keep read access.
create function public.staff_set_student_status(target uuid, new_status public.student_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  tenant uuid := private.staff_tenant();
begin
  update public.student_records set status = new_status, updated_at = now()
  where user_id = target and tenant_id = tenant;
  if not found then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update auth.users set banned_until = case when new_status in ('suspended', 'withdrawn') then 'infinity'::timestamptz end
  where id = target;
  insert into public.audit_logs (tenant_id, actor_id, action, entity_type, entity_id, metadata)
  values (tenant, auth.uid(), 'student.status', 'student', target, jsonb_build_object('status', new_status));
end;
$$;

create function public.staff_reset_password(target uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  tenant uuid := private.staff_tenant();
  password text := private.temp_password();
begin
  if not exists (select 1 from public.student_records where user_id = target and tenant_id = tenant) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update auth.users set
    encrypted_password = extensions.crypt(password, extensions.gen_salt('bf')),
    raw_app_meta_data = coalesce(raw_app_meta_data, '{}') || '{"must_change_password":true}',
    updated_at = now()
  where id = target;
  insert into public.audit_logs (tenant_id, actor_id, action, entity_type, entity_id, metadata)
  values (tenant, auth.uid(), 'student.reset_password', 'student', target, '{}');
  return password;
end;
$$;

-- Called by the signed-in user right after they set their own new password.
create function public.account_password_changed()
returns void
language sql
security definer
set search_path = ''
as $$
  update auth.users set raw_app_meta_data = raw_app_meta_data - 'must_change_password'
  where id = auth.uid();
$$;

-- Community profiles start from the student record when there is one.
create or replace function public.community_enter()
returns public.community_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.community_profiles;
begin
  insert into public.community_profiles (user_id, tenant_id, display_name, student_code, class_name, faculty)
  select m.user_id, m.tenant_id, coalesce(nullif(trim(m.display_name), ''), 'Thành viên'),
         coalesce(s.student_code, case when split_part(m.email, '@', 1) ~ '^\d{5,12}$' then split_part(m.email, '@', 1) end),
         s.class_name, s.faculty
  from public.memberships m
  left join public.student_records s on s.user_id = m.user_id
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

revoke all on function public.staff_create_student(jsonb) from public;
revoke all on function public.staff_import_students(jsonb) from public;
revoke all on function public.staff_update_student(uuid, jsonb) from public;
revoke all on function public.staff_set_student_status(uuid, public.student_status) from public;
revoke all on function public.staff_reset_password(uuid) from public;
revoke all on function public.account_password_changed() from public;
grant execute on function public.staff_create_student(jsonb) to authenticated;
grant execute on function public.staff_import_students(jsonb) to authenticated;
grant execute on function public.staff_update_student(uuid, jsonb) to authenticated;
grant execute on function public.staff_set_student_status(uuid, public.student_status) to authenticated;
grant execute on function public.staff_reset_password(uuid) to authenticated;
grant execute on function public.account_password_changed() to authenticated;
