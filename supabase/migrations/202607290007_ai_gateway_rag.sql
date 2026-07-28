create table public.ai_tenant_policies (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  tutor_enabled boolean not null default false,
  daily_request_limit integer not null default 20
    check (daily_request_limit between 1 and 1000),
  provider text not null check (length(trim(provider)) between 1 and 100),
  model text not null check (length(trim(model)) between 1 and 100),
  privacy_policy_version text not null
    check (length(trim(privacy_policy_version)) between 1 and 100),
  privacy_approved_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.ai_consents (
  tenant_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  granted boolean not null,
  policy_version text not null
    check (length(trim(policy_version)) between 1 and 100),
  granted_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, user_id),
  foreign key (tenant_id, user_id)
    references public.memberships(tenant_id, user_id) on delete cascade,
  check (
    (granted and granted_at is not null and revoked_at is null)
    or (not granted and granted_at is null and revoked_at is not null)
  )
);

create table public.knowledge_documents (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  class_id uuid,
  title text not null check (length(trim(title)) between 1 and 300),
  source_name text not null
    check (length(trim(source_name)) between 1 and 300),
  mime_type text not null
    check (mime_type in ('text/plain', 'application/pdf')),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  status text not null default 'ready' check (status in ('ready', 'failed')),
  published boolean not null default true,
  idempotency_key uuid not null,
  payload_fingerprint text not null
    check (payload_fingerprint ~ '^[0-9a-f]{64}$'),
  ingested_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, idempotency_key),
  foreign key (tenant_id, class_id)
    references public.classes(tenant_id, id) on delete cascade,
  foreign key (tenant_id, ingested_by)
    references public.memberships(tenant_id, user_id)
);

create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  document_id uuid not null,
  chunk_index integer not null check (chunk_index between 0 and 199),
  page_number integer check (page_number between 1 and 100000),
  content text not null check (length(trim(content)) between 1 and 8000),
  search_vector tsvector generated always as (
    to_tsvector('simple'::regconfig, content)
  ) stored,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, document_id, chunk_index),
  foreign key (tenant_id, document_id)
    references public.knowledge_documents(tenant_id, id) on delete cascade
);

create index knowledge_chunks_search_idx
  on public.knowledge_chunks using gin(search_vector);
create index knowledge_documents_scope_idx
  on public.knowledge_documents(tenant_id, class_id, published, status);

create table public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  user_id uuid not null references auth.users(id),
  request_id uuid not null,
  class_id uuid not null,
  provider text not null check (length(trim(provider)) between 1 and 100),
  model text not null check (length(trim(model)) between 1 and 100),
  status text not null default 'started'
    check (status in ('started', 'answered', 'abstained', 'failed')),
  input_chars integer not null check (input_chars between 1 and 8000),
  latency_ms integer check (latency_ms between 0 and 120000),
  input_tokens integer check (input_tokens between 0 and 1000000),
  output_tokens integer check (output_tokens between 0 and 1000000),
  error_code text check (
    error_code is null
    or (
      length(error_code) between 1 and 100
      and error_code ~ '^[A-Z0-9_:-]+$'
    )
  ),
  output_hash text check (
    output_hash is null or output_hash ~ '^[0-9a-f]{64}$'
  ),
  retrieved_chunk_count integer
    check (retrieved_chunk_count between 0 and 20),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (tenant_id, id),
  unique (tenant_id, request_id),
  unique (user_id, request_id),
  foreign key (tenant_id, user_id)
    references public.memberships(tenant_id, user_id),
  foreign key (tenant_id, class_id)
    references public.classes(tenant_id, id),
  check (
    (status = 'started' and completed_at is null)
    or (status <> 'started' and completed_at is not null)
  )
);

create index ai_usage_events_quota_idx
  on public.ai_usage_events(tenant_id, user_id, created_at);

alter table public.ai_tenant_policies enable row level security;
alter table public.ai_consents enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.ai_usage_events enable row level security;

create policy ai_tenant_policies_select_member
on public.ai_tenant_policies for select to authenticated
using (
  private.has_tenant_role(
    tenant_id,
    array['admin', 'teacher', 'student']::public.member_role[]
  )
);

create policy ai_consents_select_self_or_admin
on public.ai_consents for select to authenticated
using (
  user_id = auth.uid()
  or private.has_tenant_role(
    tenant_id,
    array['admin']::public.member_role[]
  )
);

create policy ai_usage_events_select_self_or_admin
on public.ai_usage_events for select to authenticated
using (
  user_id = auth.uid()
  or private.has_tenant_role(
    tenant_id,
    array['admin']::public.member_role[]
  )
);

grant select on public.ai_tenant_policies to authenticated;
grant select on public.ai_consents to authenticated;
grant select on public.ai_usage_events to authenticated;

revoke select on public.knowledge_documents from authenticated;
revoke select on public.knowledge_chunks from authenticated;
revoke insert, update, delete on public.ai_tenant_policies from authenticated;
revoke insert, update, delete on public.ai_consents from authenticated;
revoke insert, update, delete on public.knowledge_documents from authenticated;
revoke insert, update, delete on public.knowledge_chunks from authenticated;
revoke insert, update, delete on public.ai_usage_events from authenticated;

create function public.set_ai_tutor_consent(
  p_granted boolean,
  p_policy_version text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target_tenant uuid;
  current_version text;
  membership_count integer;
begin
  if actor is null
     or p_granted is null
     or length(trim(coalesce(p_policy_version, ''))) not between 1 and 100 then
    raise exception 'ai_consent_invalid' using errcode = 'P0001';
  end if;

  select
    (array_agg(membership.tenant_id order by membership.tenant_id))[1],
    (array_agg(
      policy.privacy_policy_version order by membership.tenant_id
    ))[1],
    count(*)::integer
  into target_tenant, current_version, membership_count
  from public.memberships membership
  join public.ai_tenant_policies policy
    on policy.tenant_id = membership.tenant_id
  where membership.user_id = actor
    and membership.role = 'student';

  if membership_count <> 1 then
    raise exception 'ai_consent_not_available' using errcode = 'P0001';
  end if;

  if trim(p_policy_version) <> current_version then
    if p_granted then
      raise exception 'ai_consent_policy_mismatch' using errcode = 'P0001';
    end if;
  end if;

  if not p_granted then
    update public.ai_consents consent
    set granted = false,
        granted_at = null,
        revoked_at = clock_timestamp(),
        updated_at = clock_timestamp()
    where consent.tenant_id = target_tenant
      and consent.user_id = actor;

    if found then
      return false;
    end if;

    if trim(p_policy_version) <> current_version then
      raise exception 'ai_consent_policy_mismatch' using errcode = 'P0001';
    end if;
  end if;

  insert into public.ai_consents (
    tenant_id,
    user_id,
    granted,
    policy_version,
    granted_at,
    revoked_at,
    updated_at
  )
  values (
    target_tenant,
    actor,
    p_granted,
    current_version,
    case when p_granted then clock_timestamp() end,
    case when not p_granted then clock_timestamp() end,
    clock_timestamp()
  )
  on conflict (tenant_id, user_id) do update
  set granted = excluded.granted,
      policy_version = excluded.policy_version,
      granted_at = excluded.granted_at,
      revoked_at = excluded.revoked_at,
      updated_at = excluded.updated_at;

  return p_granted;
end;
$$;

create function public.ingest_knowledge_document(
  p_document_id uuid,
  p_class_id uuid,
  p_title text,
  p_source_name text,
  p_mime_type text,
  p_sha256 text,
  p_chunks jsonb,
  p_idempotency_key uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target_tenant uuid;
  actor_role public.member_role;
  payload_fingerprint text;
  existing public.knowledge_documents%rowtype;
  chunk_count integer;
  total_chars bigint;
  membership_count integer;
  document_lock text;
  idempotency_lock text;
begin
  if actor is null
     or p_document_id is null
     or p_idempotency_key is null
     or length(trim(coalesce(p_title, ''))) not between 1 and 300
     or length(trim(coalesce(p_source_name, ''))) not between 1 and 300
     or p_mime_type is null
     or p_mime_type not in ('text/plain', 'application/pdf')
     or lower(coalesce(p_sha256, '')) !~ '^[0-9a-f]{64}$'
     or p_chunks is null
     or jsonb_typeof(p_chunks) <> 'array' then
    raise exception 'knowledge_document_invalid' using errcode = 'P0001';
  end if;

  chunk_count := jsonb_array_length(p_chunks);
  select coalesce(sum(length(chunk->>'content')), 0)
  into total_chars
  from jsonb_array_elements(p_chunks) chunk;

  if chunk_count not between 1 and 200
     or total_chars > 1000000
     or exists (
       select 1
       from jsonb_array_elements(p_chunks) chunk
       where jsonb_typeof(chunk) <> 'object'
          or chunk->>'content' is null
          or length(trim(chunk->>'content')) not between 1 and 8000
          or (
            chunk ? 'pageNumber'
            and (
              jsonb_typeof(chunk->'pageNumber') <> 'number'
              or (chunk->>'pageNumber') !~ '^[0-9]+$'
              or (chunk->>'pageNumber')::integer not between 1 and 100000
            )
          )
          or exists (
            select 1
            from jsonb_object_keys(chunk) key
            where key not in ('content', 'pageNumber')
          )
     ) then
    raise exception 'knowledge_document_invalid' using errcode = 'P0001';
  end if;

  if p_class_id is not null then
    select class.tenant_id, membership.role
    into target_tenant, actor_role
    from public.classes class
    join public.memberships membership
      on membership.tenant_id = class.tenant_id
     and membership.user_id = actor
    where class.id = p_class_id
      and (
        membership.role = 'admin'
        or (
          membership.role = 'teacher'
          and class.teacher_id = actor
        )
      );
  else
    select
      (array_agg(membership.tenant_id order by membership.tenant_id))[1],
      (array_agg(membership.role order by membership.tenant_id))[1],
      count(*)::integer
    into target_tenant, actor_role, membership_count
    from public.memberships membership
    where membership.user_id = actor
      and membership.role = 'admin';

    if membership_count <> 1 then
      target_tenant := null;
      actor_role := null;
    end if;
  end if;

  if target_tenant is null
     or actor_role not in ('admin', 'teacher')
     or (actor_role = 'teacher' and p_class_id is null) then
    raise exception 'knowledge_class_not_available' using errcode = 'P0001';
  end if;

  payload_fingerprint := encode(
    extensions.digest(
      convert_to(
        concat_ws(
          E'\x1f',
          p_document_id::text,
          coalesce(p_class_id::text, ''),
          trim(p_title),
          trim(p_source_name),
          p_mime_type,
          lower(p_sha256),
          p_chunks::text
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  document_lock := 'knowledge:document:' || p_document_id::text;
  idempotency_lock :=
    'knowledge:idempotency:' || target_tenant::text || ':' ||
    p_idempotency_key::text;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      least(document_lock, idempotency_lock),
      0
    )
  );
  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      greatest(document_lock, idempotency_lock),
      0
    )
  );

  select document.*
  into existing
  from public.knowledge_documents document
  where document.tenant_id = target_tenant
    and (
      document.id = p_document_id
      or document.idempotency_key = p_idempotency_key
    )
  limit 1;

  if found then
    if existing.id = p_document_id
       and existing.idempotency_key = p_idempotency_key
       and existing.payload_fingerprint = payload_fingerprint then
      return existing.id;
    end if;
    raise exception 'knowledge_idempotency_conflict' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.knowledge_documents document
    where document.id = p_document_id
  ) then
    raise exception 'knowledge_idempotency_conflict' using errcode = 'P0001';
  end if;

  insert into public.knowledge_documents (
    id,
    tenant_id,
    class_id,
    title,
    source_name,
    mime_type,
    sha256,
    status,
    published,
    idempotency_key,
    payload_fingerprint,
    ingested_by
  )
  values (
    p_document_id,
    target_tenant,
    p_class_id,
    trim(p_title),
    trim(p_source_name),
    p_mime_type,
    lower(p_sha256),
    'ready',
    true,
    p_idempotency_key,
    payload_fingerprint,
    actor
  );

  insert into public.knowledge_chunks (
    tenant_id,
    document_id,
    chunk_index,
    page_number,
    content
  )
  select
    target_tenant,
    p_document_id,
    chunk.ordinality::integer - 1,
    case
      when chunk.value ? 'pageNumber'
      then (chunk.value->>'pageNumber')::integer
    end,
    trim(chunk.value->>'content')
  from jsonb_array_elements(p_chunks) with ordinality chunk(value, ordinality);

  return p_document_id;
end;
$$;

create function public.retrieve_tutor_chunks(
  p_class_id uuid,
  p_query text,
  p_limit integer
)
returns table (
  "chunkId" uuid,
  "documentId" uuid,
  title text,
  "sourceName" text,
  "pageNumber" integer,
  content text,
  rank real
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target_tenant uuid;
  query tsquery;
begin
  if actor is null
     or p_class_id is null
     or length(trim(coalesce(p_query, ''))) not between 1 and 2000
     or p_limit is null
     or p_limit not between 1 and 10 then
    raise exception 'ai_retrieval_invalid' using errcode = 'P0001';
  end if;

  select class.tenant_id
  into target_tenant
  from public.classes class
  join public.memberships membership
    on membership.tenant_id = class.tenant_id
   and membership.user_id = actor
  where class.id = p_class_id
    and (
      membership.role = 'admin'
      or (
        membership.role = 'teacher'
        and class.teacher_id = actor
      )
      or (
        membership.role = 'student'
        and exists (
          select 1
          from public.class_members class_member
          where class_member.tenant_id = class.tenant_id
            and class_member.class_id = class.id
            and class_member.student_id = actor
        )
      )
    );

  if target_tenant is null then
    raise exception 'ai_class_not_available' using errcode = 'P0001';
  end if;

  query := websearch_to_tsquery('simple'::regconfig, trim(p_query));

  return query
  select
    chunk.id,
    document.id,
    document.title,
    document.source_name,
    chunk.page_number,
    chunk.content,
    ts_rank_cd(chunk.search_vector, query)
  from public.knowledge_chunks chunk
  join public.knowledge_documents document
    on document.tenant_id = chunk.tenant_id
   and document.id = chunk.document_id
  where chunk.tenant_id = target_tenant
    and document.status = 'ready'
    and document.published
    and (document.class_id is null or document.class_id = p_class_id)
    and chunk.search_vector @@ query
  order by
    ts_rank_cd(chunk.search_vector, query) desc,
    document.id,
    chunk.chunk_index
  limit p_limit;
end;
$$;

create function public.reserve_ai_tutor_request(
  p_request_id uuid,
  p_class_id uuid,
  p_input_chars integer
)
returns table (
  "usageId" uuid,
  provider text,
  model text,
  "dailyRemaining" integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target_tenant uuid;
  policy public.ai_tenant_policies%rowtype;
  used_today integer;
  new_usage_id uuid;
  quota_date date := (clock_timestamp() at time zone 'UTC')::date;
begin
  if actor is null
     or p_request_id is null
     or p_class_id is null
     or p_input_chars is null
     or p_input_chars not between 1 and 8000 then
    raise exception 'ai_request_invalid' using errcode = 'P0001';
  end if;

  select class.tenant_id
  into target_tenant
  from public.classes class
  join public.memberships membership
    on membership.tenant_id = class.tenant_id
   and membership.user_id = actor
   and membership.role = 'student'
  join public.class_members class_member
    on class_member.tenant_id = class.tenant_id
   and class_member.class_id = class.id
   and class_member.student_id = actor
  where class.id = p_class_id;

  if target_tenant is null then
    raise exception 'ai_class_not_available' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      target_tenant::text || ':' || actor::text || ':' ||
      quota_date::text,
      0
    )
  );

  update public.ai_usage_events usage
  set status = 'failed',
      latency_ms = 120000,
      input_tokens = 0,
      output_tokens = 0,
      error_code = 'REQUEST_EXPIRED',
      output_hash = null,
      retrieved_chunk_count = 0,
      completed_at = clock_timestamp()
  where usage.tenant_id = target_tenant
    and usage.user_id = actor
    and usage.status = 'started'
    and usage.created_at < clock_timestamp() - interval '2 minutes';

  if exists (
    select 1
    from public.ai_usage_events usage
    where usage.user_id = actor
      and usage.request_id = p_request_id
  ) then
    raise exception 'ai_duplicate_request' using errcode = 'P0001';
  end if;

  select tenant_policy.*
  into policy
  from public.ai_tenant_policies tenant_policy
  where tenant_policy.tenant_id = target_tenant;

  if policy.tenant_id is null
     or not policy.tutor_enabled
     or policy.privacy_approved_at is null then
    raise exception 'ai_tutor_disabled' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.ai_consents consent
    where consent.tenant_id = target_tenant
      and consent.user_id = actor
      and consent.granted
      and consent.policy_version = policy.privacy_policy_version
  ) then
    raise exception 'ai_consent_required' using errcode = 'P0001';
  end if;

  select count(*)::integer
  into used_today
  from public.ai_usage_events usage
  where usage.tenant_id = target_tenant
    and usage.user_id = actor
    and (usage.created_at at time zone 'UTC')::date = quota_date;

  if used_today >= policy.daily_request_limit then
    raise exception 'ai_daily_quota_exceeded' using errcode = 'P0001';
  end if;

  insert into public.ai_usage_events (
    tenant_id,
    user_id,
    request_id,
    class_id,
    provider,
    model,
    status,
    input_chars
  )
  values (
    target_tenant,
    actor,
    p_request_id,
    p_class_id,
    policy.provider,
    policy.model,
    'started',
    p_input_chars
  )
  returning id into new_usage_id;

  return query
  select
    new_usage_id,
    policy.provider,
    policy.model,
    policy.daily_request_limit - used_today - 1;
end;
$$;

create function public.finish_ai_tutor_request(
  p_request_id uuid,
  p_status text,
  p_latency_ms integer,
  p_input_tokens integer,
  p_output_tokens integer,
  p_error_code text,
  p_output_hash text,
  p_retrieved_chunk_count integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  finished_usage_id uuid;
begin
  if actor is null
     or p_request_id is null
     or p_status is null
     or p_status not in ('answered', 'abstained', 'failed')
     or p_latency_ms is null
     or p_latency_ms not between 0 and 120000
     or p_input_tokens is null
     or p_input_tokens not between 0 and 1000000
     or p_output_tokens is null
     or p_output_tokens not between 0 and 1000000
     or p_retrieved_chunk_count is null
     or p_retrieved_chunk_count not between 0 and 20
     or (
       p_error_code is not null
       and (
         length(p_error_code) not between 1 and 100
         or p_error_code !~ '^[A-Z0-9_:-]+$'
       )
     )
     or (
       p_output_hash is not null
       and lower(p_output_hash) !~ '^[0-9a-f]{64}$'
     )
     or (p_status in ('failed', 'abstained') and p_error_code is null)
     or (p_status = 'answered' and p_error_code is not null) then
    raise exception 'ai_completion_invalid' using errcode = 'P0001';
  end if;

  update public.ai_usage_events usage
  set status = p_status,
      latency_ms = p_latency_ms,
      input_tokens = p_input_tokens,
      output_tokens = p_output_tokens,
      error_code = p_error_code,
      output_hash = lower(p_output_hash),
      retrieved_chunk_count = p_retrieved_chunk_count,
      completed_at = clock_timestamp()
  where usage.request_id = p_request_id
    and usage.user_id = actor
    and usage.status = 'started'
  returning usage.id into finished_usage_id;

  if finished_usage_id is null then
    raise exception 'ai_request_not_available' using errcode = 'P0001';
  end if;

  return finished_usage_id;
end;
$$;

create function private.audit_ai_gateway()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_table_name = 'knowledge_documents' then
    insert into public.audit_logs (
      tenant_id, actor_id, action, entity_type, entity_id, metadata
    )
    values (
      new.tenant_id,
      auth.uid(),
      'ai.knowledge.ingested',
      'knowledge_documents',
      new.id,
      jsonb_build_object(
        'class_id', new.class_id,
        'mime_type', new.mime_type,
        'sha256', new.sha256
      )
    );
  elsif tg_table_name = 'ai_consents' then
    insert into public.audit_logs (
      tenant_id, actor_id, action, entity_type, entity_id, metadata
    )
    values (
      new.tenant_id,
      auth.uid(),
      case
        when new.granted then 'ai.consent.granted'
        else 'ai.consent.revoked'
      end,
      'ai_consents',
      new.user_id,
      jsonb_build_object(
        'granted', new.granted,
        'policy_version', new.policy_version
      )
    );
  end if;

  return new;
end;
$$;

revoke all on function private.audit_ai_gateway() from public;

create trigger knowledge_documents_audit
after insert on public.knowledge_documents
for each row execute function private.audit_ai_gateway();

create trigger ai_consents_audit
after insert or update on public.ai_consents
for each row execute function private.audit_ai_gateway();

revoke all on function public.set_ai_tutor_consent(boolean, text) from public;
revoke all on function public.ingest_knowledge_document(
  uuid, uuid, text, text, text, text, jsonb, uuid
) from public;
revoke all on function public.retrieve_tutor_chunks(uuid, text, integer) from public;
revoke all on function public.reserve_ai_tutor_request(uuid, uuid, integer) from public;
revoke all on function public.finish_ai_tutor_request(
  uuid, text, integer, integer, integer, text, text, integer
) from public;

grant execute on function public.set_ai_tutor_consent(boolean, text)
to authenticated;
grant execute on function public.ingest_knowledge_document(
  uuid, uuid, text, text, text, text, jsonb, uuid
) to authenticated;
grant execute on function public.retrieve_tutor_chunks(uuid, text, integer)
to authenticated;
grant execute on function public.reserve_ai_tutor_request(uuid, uuid, integer)
to authenticated;
grant execute on function public.finish_ai_tutor_request(
  uuid, text, integer, integer, integer, text, text, integer
) to authenticated;
