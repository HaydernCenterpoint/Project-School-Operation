begin;

create extension if not exists pgtap with schema extensions;
create extension if not exists dblink with schema extensions;
set local search_path = public, extensions;
select no_plan();

select has_table('public', 'ai_tenant_policies', 'AI tenant policies exist');
select has_table('public', 'ai_consents', 'AI consents exist');
select has_table('public', 'knowledge_documents', 'knowledge documents exist');
select has_table('public', 'knowledge_chunks', 'knowledge chunks exist');
select has_table('public', 'ai_usage_events', 'AI usage events exist');

select ok(
  not exists (
    select 1 from pg_catalog.pg_extension where extname = 'vector'
  ),
  'RAG uses native PostgreSQL FTS without pgvector'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_attribute
    where attrelid = 'public.knowledge_chunks'::regclass
      and attname = 'search_vector'
      and attgenerated = 's'
  ),
  'knowledge chunk search vector is generated'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_indexes
    where schemaname = 'public'
      and tablename = 'knowledge_chunks'
      and indexdef ilike '%using gin (search_vector)%'
  ),
  'knowledge chunk FTS has a GIN index'
);

select is(
  (select count(*)::integer from ai_tenant_policies),
  2,
  'seed has one AI policy for each demo tenant'
);

select is(
  (
    select count(*)::integer
    from ai_tenant_policies
    where tutor_enabled
      and privacy_approved_at is not null
      and provider = 'openai-compatible'
      and model = 'citation-model-v1'
  ),
  2,
  'demo policies are enabled and privacy-approved with the expected runtime identifiers'
);

select is(
  (select count(*)::integer from ai_consents),
  0,
  'seed never grants student consent'
);

select is(
  (select count(*)::integer from knowledge_documents),
  2,
  'seed has distinct authorized documents for A and B'
);

select is(
  (select count(*)::integer from knowledge_chunks),
  4,
  'seed has deterministic chunks for A and B'
);

select ok(
  not has_table_privilege('authenticated', 'knowledge_documents', 'SELECT')
  and not has_table_privilege('authenticated', 'knowledge_chunks', 'SELECT'),
  'source content is read only through the retrieval RPC'
);

select ok(
  not has_table_privilege('authenticated', 'ai_tenant_policies', 'INSERT')
  and not has_table_privilege('authenticated', 'ai_consents', 'UPDATE')
  and not has_table_privilege('authenticated', 'knowledge_documents', 'INSERT')
  and not has_table_privilege('authenticated', 'knowledge_chunks', 'UPDATE')
  and not has_table_privilege('authenticated', 'ai_usage_events', 'INSERT'),
  'authenticated clients have no raw mutation privileges'
);

select ok(
  (
    select count(*) = 5
    from pg_catalog.pg_proc procedure
    join pg_catalog.pg_namespace namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname in (
        'set_ai_tutor_consent',
        'ingest_knowledge_document',
        'retrieve_tutor_chunks',
        'reserve_ai_tutor_request',
        'finish_ai_tutor_request'
      )
      and procedure.prosecdef
      and procedure.proconfig @> array['search_path=""']
  ),
  'all AI RPCs are SECURITY DEFINER with an empty search path'
);

select ok(
  (
    select regexp_count(
      pg_get_functiondef(
        'public.ingest_knowledge_document(uuid,uuid,text,text,text,text,jsonb,uuid)'::regprocedure
      ),
      'pg_advisory_xact_lock'
    ) = 2
  ),
  'ingest serializes both document and idempotency identities'
);

select ok(
  (
    select
      regexp_count(definition, 'quota_date') >= 3
      and regexp_count(
        definition,
        'clock_timestamp\(\) at time zone ''UTC'''
      ) = 1
    from (
      select pg_get_functiondef(
        'public.reserve_ai_tutor_request(uuid,uuid,integer)'::regprocedure
      ) definition
    ) function_definition
  ),
  'reservation captures one UTC quota date for its lock and count predicate'
);

do $$
begin
  perform extensions.dblink_connect(
    'ingest_race_one',
    'host=supabase_db_saodo-university port=5432 dbname=' || current_database() ||
    ' user=postgres password=postgres sslmode=disable'
  );
  perform extensions.dblink_connect(
    'ingest_race_two',
    'host=supabase_db_saodo-university port=5432 dbname=' || current_database() ||
    ' user=postgres password=postgres sslmode=disable'
  );
  perform pg_advisory_lock(7290007::bigint);
  perform extensions.dblink_send_query(
    'ingest_race_one',
    $race$
      with session_context as materialized (
        select set_config(
          'request.jwt.claims',
          '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',
          false
        )
      ),
      barrier as materialized (
        select pg_advisory_xact_lock_shared(7290007::bigint)
        from session_context
      )
      select public.ingest_knowledge_document(
        'a7c00000-0000-0000-0000-000000000001',
        'a1000000-0000-0000-0000-000000000001',
        'Concurrent canonical document',
        'concurrent-canonical.txt',
        'text/plain',
        repeat('7', 64),
        '[{"content":"CONCURRENT_CANONICAL_CONTENT","pageNumber":71}]'::jsonb,
        'a7c10000-0000-4000-8000-000000000001'
      )
      from barrier
    $race$
  );
  perform extensions.dblink_send_query(
    'ingest_race_two',
    $race$
      with session_context as materialized (
        select set_config(
          'request.jwt.claims',
          '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',
          false
        )
      ),
      barrier as materialized (
        select pg_advisory_xact_lock_shared(7290007::bigint)
        from session_context
      )
      select public.ingest_knowledge_document(
        'a7c00000-0000-0000-0000-000000000001',
        'a1000000-0000-0000-0000-000000000001',
        'Concurrent canonical document',
        'concurrent-canonical.txt',
        'text/plain',
        repeat('7', 64),
        '[{"content":"CONCURRENT_CANONICAL_CONTENT","pageNumber":71}]'::jsonb,
        'a7c10000-0000-4000-8000-000000000001'
      )
      from barrier
    $race$
  );
end;
$$;

select is(
  extensions.dblink_is_busy('ingest_race_one'),
  1,
  'first ingest session is concurrently waiting at the start barrier'
);

select is(
  extensions.dblink_is_busy('ingest_race_two'),
  1,
  'second ingest session is concurrently waiting at the start barrier'
);

do $$
begin
  perform pg_advisory_unlock(7290007::bigint);
end;
$$;

create temporary table ingest_race_results (
  document_id uuid not null
) on commit drop;

insert into ingest_race_results (document_id)
select result.document_id
from extensions.dblink_get_result('ingest_race_one')
  as result(document_id uuid);

insert into ingest_race_results (document_id)
select result.document_id
from extensions.dblink_get_result('ingest_race_two')
  as result(document_id uuid);

select is(
  (
    select count(*)::integer
    from ingest_race_results
    where document_id = 'a7c00000-0000-0000-0000-000000000001'
  ),
  2,
  'both concurrent exact replays return the canonical document ID'
);

select is(
  (
    select count(*)::integer
    from knowledge_documents
    where id = 'a7c00000-0000-0000-0000-000000000001'
      and title = 'Concurrent canonical document'
      and idempotency_key = 'a7c10000-0000-4000-8000-000000000001'
  ),
  1,
  'concurrent ingest creates exactly one canonical document'
);

select is(
  (
    select count(*)::integer
    from knowledge_chunks
    where document_id = 'a7c00000-0000-0000-0000-000000000001'
      and content = 'CONCURRENT_CANONICAL_CONTENT'
      and page_number = 71
  ),
  1,
  'concurrent ingest creates exactly one canonical chunk'
);

select is(
  (
    select count(*)::integer
    from audit_logs
    where action = 'ai.knowledge.ingested'
      and entity_id = 'a7c00000-0000-0000-0000-000000000001'
  ),
  1,
  'concurrent ingest emits exactly one canonical audit event'
);

do $$
begin
  perform extensions.dblink_exec(
    'ingest_race_one',
    $cleanup$
      delete from public.audit_logs
      where action = 'ai.knowledge.ingested'
        and entity_id = 'a7c00000-0000-0000-0000-000000000001';
      delete from public.knowledge_documents
      where id = 'a7c00000-0000-0000-0000-000000000001';
    $cleanup$
  );
  perform extensions.dblink_disconnect('ingest_race_one');
  perform extensions.dblink_disconnect('ingest_race_two');
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select is(
  (
    select count(*)::integer
    from retrieve_tutor_chunks(
      'a1000000-0000-0000-0000-000000000001',
      'AURORA_A_ONLY',
      5
    )
  ),
  1,
  'enrolled student retrieves a published chunk from the own class'
);

select is(
  (
    select concat_ws('|', "sourceName", "pageNumber"::text, content)
    from retrieve_tutor_chunks(
      'a1000000-0000-0000-0000-000000000001',
      'AURORA_A_ONLY',
      5
    )
  ),
  'campus-a-solar-guide.pdf|11|AURORA_A_ONLY: Disconnect the solar training panel before inspection.',
  'retrieval returns citation source, page, and authorized content'
);

select is(
  (
    select count(*)::integer
    from retrieve_tutor_chunks(
      'a1000000-0000-0000-0000-000000000001',
      'BENTHIC_B_ONLY',
      5
    )
  ),
  0,
  'tenant A query cannot retrieve tenant B content'
);

select throws_ok(
  $$select * from retrieve_tutor_chunks(
    'b1000000-0000-0000-0000-000000000001',
    'BENTHIC_B_ONLY',
    5
  )$$,
  'P0001',
  'ai_class_not_available',
  'cross-tenant class ID tampering has a non-enumerating denial'
);

select lives_ok(
  $$select * from retrieve_tutor_chunks(
    'a1000000-0000-0000-0000-000000000001',
    repeat('aurora ', 100),
    5
  )$$,
  'retrieval accepts a query longer than 500 and at most 2000 characters'
);

select throws_ok(
  $$select * from retrieve_tutor_chunks(
    'a1000000-0000-0000-0000-000000000001',
    repeat('x', 2001),
    5
  )$$,
  'P0001',
  'ai_retrieval_invalid',
  'retrieval rejects a query longer than 2000 characters'
);

select throws_ok(
  $$select count(*) from knowledge_documents$$,
  '42501',
  null,
  'student cannot bypass retrieval with a direct document select'
);

select throws_ok(
  $$select set_ai_tutor_consent(true, 'wrong-version')$$,
  'P0001',
  'ai_consent_policy_mismatch',
  'student cannot consent to a stale privacy policy'
);

select is(
  set_ai_tutor_consent(true, 'pilot-2026-07'),
  true,
  'student grants own tutor consent'
);

reset role;

select is(
  (
    select concat_ws(
      '|',
      granted::text,
      policy_version,
      (granted_at is not null)::text,
      (revoked_at is null)::text
    )
    from ai_consents
    where tenant_id = 'a0000000-0000-0000-0000-000000000001'
      and user_id = '10000000-0000-0000-0000-000000000003'
  ),
  'true|pilot-2026-07|true|true',
  'granted consent is tenant-scoped and timestamped'
);

select is(
  (
    select count(*)::integer
    from audit_logs
    where action = 'ai.consent.granted'
      and actor_id = '10000000-0000-0000-0000-000000000003'
      and metadata = jsonb_build_object(
        'granted', true,
        'policy_version', 'pilot-2026-07'
      )
  ),
  1,
  'consent grant audit contains only state and policy code'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select is(
  set_ai_tutor_consent(false, 'pilot-2026-07'),
  false,
  'student can revoke own tutor consent'
);

select throws_ok(
  $$select * from reserve_ai_tutor_request(
    'a7500000-0000-4000-8000-000000000099',
    'a1000000-0000-0000-0000-000000000001',
    10
  )$$,
  'P0001',
  'ai_consent_required',
  'reservation requires active consent matching the policy version'
);

select throws_ok(
  $$select ingest_knowledge_document(
    'a7400000-0000-0000-0000-000000000099',
    'a1000000-0000-0000-0000-000000000001',
    'Student document',
    'student.txt',
    'text/plain',
    repeat('8', 64),
    '[{"content":"not authorized","pageNumber":1}]'::jsonb,
    'a7410000-0000-4000-8000-000000000099'
  )$$,
  'P0001',
  'knowledge_class_not_available',
  'student cannot ingest a class document'
);

reset role;

select is(
  (
    select concat_ws(
      '|',
      granted::text,
      (granted_at is null)::text,
      (revoked_at is not null)::text
    )
    from ai_consents
    where tenant_id = 'a0000000-0000-0000-0000-000000000001'
      and user_id = '10000000-0000-0000-0000-000000000003'
  ),
  'false|true|true',
  'revoked consent is explicit and timestamped'
);

select is(
  (
    select count(*)::integer
    from audit_logs
    where action = 'ai.consent.revoked'
      and actor_id = '10000000-0000-0000-0000-000000000003'
  ),
  1,
  'consent revoke is audited'
);

update ai_tenant_policies
set privacy_policy_version = 'pilot-2026-08'
where tenant_id = 'a0000000-0000-0000-0000-000000000001';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select is(
  set_ai_tutor_consent(false, 'pilot-2026-08'),
  false,
  'student can revoke after the tenant policy version changes'
);

reset role;

select is(
  (
    select policy_version
    from ai_consents
    where tenant_id = 'a0000000-0000-0000-0000-000000000001'
      and user_id = '10000000-0000-0000-0000-000000000003'
  ),
  'pilot-2026-07',
  'revoke preserves the originally stored consent policy version'
);

update ai_tenant_policies
set privacy_policy_version = 'pilot-2026-07'
where tenant_id = 'a0000000-0000-0000-0000-000000000001';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000009","role":"authenticated"}',
  true
);

select throws_ok(
  $$select set_ai_tutor_consent(true, 'pilot-2026-07')$$,
  'P0001',
  'ai_consent_not_available',
  'moderator cannot grant tutor consent'
);

select throws_ok(
  $$select ingest_knowledge_document(
    'a7400000-0000-0000-0000-000000000009',
    'a1000000-0000-0000-0000-000000000001',
    'Moderator document',
    'moderator.txt',
    'text/plain',
    repeat('9', 64),
    '[{"content":"not authorized","pageNumber":1}]'::jsonb,
    'a7410000-0000-4000-8000-000000000009'
  )$$,
  'P0001',
  'knowledge_class_not_available',
  'moderator is explicitly denied document ingestion'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select throws_ok(
  $$select set_ai_tutor_consent(true, 'pilot-2026-07')$$,
  'P0001',
  'ai_consent_not_available',
  'teacher cannot grant tutor consent'
);

select is(
  ingest_knowledge_document(
    'a7400000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'Teacher Class Notes',
    'teacher-a-notes.txt',
    'text/plain',
    repeat('c', 64),
    '[{"content":"HELIOGRAPH_TEACHER_ONLY class note","pageNumber":31}]'::jsonb,
    'a7410000-0000-4000-8000-000000000001'
  ),
  'a7400000-0000-0000-0000-000000000001'::uuid,
  'owning teacher ingests a class-scoped text document'
);

select is(
  ingest_knowledge_document(
    'a7400000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'Teacher Class Notes',
    'teacher-a-notes.txt',
    'text/plain',
    repeat('c', 64),
    '[{"content":"HELIOGRAPH_TEACHER_ONLY class note","pageNumber":31}]'::jsonb,
    'a7410000-0000-4000-8000-000000000001'
  ),
  'a7400000-0000-0000-0000-000000000001'::uuid,
  'exact ingest replay returns the original document'
);

select throws_ok(
  $$select ingest_knowledge_document(
    'a7400000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'Changed title',
    'teacher-a-notes.txt',
    'text/plain',
    repeat('c', 64),
    '[{"content":"HELIOGRAPH_TEACHER_ONLY class note","pageNumber":31}]'::jsonb,
    'a7410000-0000-4000-8000-000000000001'
  )$$,
  'P0001',
  'knowledge_idempotency_conflict',
  'mismatched ingest replay is rejected'
);

select throws_ok(
  $$select ingest_knowledge_document(
    'a7400000-0000-0000-0000-000000000002',
    null,
    'Tenant wide',
    'teacher-tenant-wide.txt',
    'text/plain',
    repeat('d', 64),
    '[{"content":"teacher cannot publish tenant wide"}]'::jsonb,
    'a7410000-0000-4000-8000-000000000002'
  )$$,
  'P0001',
  'knowledge_class_not_available',
  'teacher cannot ingest a tenant-wide document'
);

select throws_ok(
  $$select ingest_knowledge_document(
    'a7400000-0000-0000-0000-000000000003',
    'b1000000-0000-0000-0000-000000000001',
    'Wrong tenant',
    'wrong-tenant.txt',
    'text/plain',
    repeat('e', 64),
    '[{"content":"cross tenant"}]'::jsonb,
    'a7410000-0000-4000-8000-000000000003'
  )$$,
  'P0001',
  'knowledge_class_not_available',
  'teacher cannot tamper with a cross-tenant class ID'
);

select throws_ok(
  $$select ingest_knowledge_document(
    'a7400000-0000-0000-0000-000000000010',
    'a1000000-0000-0000-0000-000000000001',
    'Too many chunks',
    'too-many.txt',
    'text/plain',
    repeat('1', 64),
    (
      select jsonb_agg(jsonb_build_object('content', 'valid'))
      from generate_series(1, 201)
    ),
    'a7410000-0000-4000-8000-000000000010'
  )$$,
  'P0001',
  'knowledge_document_invalid',
  'ingest rejects more than 200 chunks'
);

select throws_ok(
  $$select ingest_knowledge_document(
    'a7400000-0000-0000-0000-000000000011',
    'a1000000-0000-0000-0000-000000000001',
    'Oversized chunk',
    'oversized.txt',
    'text/plain',
    repeat('2', 64),
    jsonb_build_array(jsonb_build_object('content', repeat('x', 8001))),
    'a7410000-0000-4000-8000-000000000011'
  )$$,
  'P0001',
  'knowledge_document_invalid',
  'ingest rejects chunk content longer than 8000 characters'
);

select throws_ok(
  $$select ingest_knowledge_document(
    'a7400000-0000-0000-0000-000000000012',
    'a1000000-0000-0000-0000-000000000001',
    'Invalid page',
    'invalid-page.txt',
    'text/plain',
    repeat('3', 64),
    '[{"content":"valid","pageNumber":100001}]'::jsonb,
    'a7410000-0000-4000-8000-000000000012'
  )$$,
  'P0001',
  'knowledge_document_invalid',
  'ingest rejects out-of-range page numbers'
);

select throws_ok(
  $$select ingest_knowledge_document(
    'a7400000-0000-0000-0000-000000000013',
    'a1000000-0000-0000-0000-000000000001',
    'Oversized document',
    'oversized-document.txt',
    'text/plain',
    repeat('4', 64),
    (
      select jsonb_agg(jsonb_build_object('content', repeat('x', 8000)))
      from generate_series(1, 126)
    ),
    'a7410000-0000-4000-8000-000000000013'
  )$$,
  'P0001',
  'knowledge_document_invalid',
  'ingest rejects total source content larger than one million characters'
);

reset role;

select is(
  (
    select concat_ws(
      '|',
      status,
      published::text,
      class_id::text,
      ingested_by::text
    )
    from knowledge_documents
    where id = 'a7400000-0000-0000-0000-000000000001'
  ),
  'ready|true|a1000000-0000-0000-0000-000000000001|10000000-0000-0000-0000-000000000002',
  'ingest publishes a ready document synchronously in the authorized class'
);

select is(
  (
    select count(*)::integer
    from knowledge_chunks
    where document_id = 'a7400000-0000-0000-0000-000000000001'
      and page_number = 31
      and content = 'HELIOGRAPH_TEACHER_ONLY class note'
  ),
  1,
  'ingest creates the validated chunk once'
);

select is(
  (
    select count(*)::integer
    from audit_logs
    where action = 'ai.knowledge.ingested'
      and entity_id = 'a7400000-0000-0000-0000-000000000001'
      and not (metadata ? 'title')
      and not (metadata ? 'source_name')
      and not (metadata::text ilike '%HELIOGRAPH%')
  ),
  1,
  'ingest audit contains identifiers and codes but no source text'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select is(
  ingest_knowledge_document(
    'a7400000-0000-0000-0000-000000000004',
    null,
    'Campus A Common Policy',
    'campus-a-common.pdf',
    'application/pdf',
    repeat('f', 64),
    '[{"content":"PARALLAX_ADMIN_TENANT_WIDE policy","pageNumber":41}]'::jsonb,
    'a7410000-0000-4000-8000-000000000004'
  ),
  'a7400000-0000-0000-0000-000000000004'::uuid,
  'admin can ingest a tenant-wide PDF document'
);

select throws_ok(
  $$update knowledge_documents
    set published = false
    where id = 'a7400000-0000-0000-0000-000000000004'$$,
  '42501',
  null,
  'admin cannot bypass RPCs with raw document mutation'
);

select throws_ok(
  $$insert into audit_logs (
      tenant_id, actor_id, action, entity_type, entity_id, metadata
    ) values (
      'a0000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001',
      'ai.knowledge.ingested',
      'knowledge_documents',
      'a7400000-0000-0000-0000-000000000004',
      '{}'::jsonb
    )$$,
  '42501',
  null,
  'authenticated actor cannot spoof an AI audit row'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select is(
  (
    select count(*)::integer
    from retrieve_tutor_chunks(
      'a1000000-0000-0000-0000-000000000001',
      'PARALLAX_ADMIN_TENANT_WIDE',
      5
    )
  ),
  1,
  'enrolled student retrieves an own-tenant published tenant-wide document'
);

reset role;
update knowledge_documents
set published = false
where id = 'a7400000-0000-0000-0000-000000000004';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select is(
  (
    select count(*)::integer
    from retrieve_tutor_chunks(
      'a1000000-0000-0000-0000-000000000001',
      'PARALLAX_ADMIN_TENANT_WIDE',
      5
    )
  ),
  0,
  'unpublished document is excluded from retrieval'
);

reset role;
update knowledge_documents
set published = true,
    status = 'failed'
where id = 'a7400000-0000-0000-0000-000000000004';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select is(
  (
    select count(*)::integer
    from retrieve_tutor_chunks(
      'a1000000-0000-0000-0000-000000000001',
      'PARALLAX_ADMIN_TENANT_WIDE',
      5
    )
  ),
  0,
  'failed document is excluded from retrieval'
);

select is(
  set_ai_tutor_consent(true, 'pilot-2026-07'),
  true,
  'student restores current consent for quota tests'
);

reset role;
update ai_tenant_policies
set privacy_approved_at = null
where tenant_id = 'a0000000-0000-0000-0000-000000000001';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select throws_ok(
  $$select * from reserve_ai_tutor_request(
    'a7500000-0000-4000-8000-000000000098',
    'a1000000-0000-0000-0000-000000000001',
    10
  )$$,
  'P0001',
  'ai_tutor_disabled',
  'reservation requires tenant privacy approval'
);

reset role;
update ai_tenant_policies
set daily_request_limit = 2,
    privacy_approved_at = '2026-07-29 00:00:00+00'
where tenant_id = 'a0000000-0000-0000-0000-000000000001';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select is(
  (
    select concat_ws('|', provider, model, "dailyRemaining"::text)
    from reserve_ai_tutor_request(
      'a7500000-0000-4000-8000-000000000001',
      'a1000000-0000-0000-0000-000000000001',
      120
    )
  ),
  'openai-compatible|citation-model-v1|1',
  'first reservation returns configured provider/model and remaining quota'
);

select is(
  (
    select "dailyRemaining"
    from reserve_ai_tutor_request(
      'a7500000-0000-4000-8000-000000000002',
      'a1000000-0000-0000-0000-000000000001',
      121
    )
  ),
  0,
  'second reservation atomically consumes the final daily slot'
);

select throws_ok(
  $$select * from reserve_ai_tutor_request(
    'a7500000-0000-4000-8000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    120
  )$$,
  'P0001',
  'ai_duplicate_request',
  'duplicate request ID is rejected before quota evaluation'
);

select throws_ok(
  $$select * from reserve_ai_tutor_request(
    'a7500000-0000-4000-8000-000000000003',
    'a1000000-0000-0000-0000-000000000001',
    122
  )$$,
  'P0001',
  'ai_daily_quota_exceeded',
  'quota N plus one is rejected'
);

select is(
  finish_ai_tutor_request(
    'a7500000-0000-4000-8000-000000000001',
    'answered',
    850,
    30,
    70,
    null,
    repeat('1', 64),
    2
  ),
  (
    select id
    from ai_usage_events
    where request_id = 'a7500000-0000-4000-8000-000000000001'
  ),
  'student finishes own started request with bounded metadata'
);

select is(
  finish_ai_tutor_request(
    'a7500000-0000-4000-8000-000000000002',
    'abstained',
    400,
    20,
    0,
    'NO_GROUNDED_SOURCE',
    null,
    0
  ),
  (
    select id
    from ai_usage_events
    where request_id = 'a7500000-0000-4000-8000-000000000002'
  ),
  'student records an abstention reason as a bounded code'
);

select throws_ok(
  $$select finish_ai_tutor_request(
    'a7500000-0000-4000-8000-000000000099',
    'abstained',
    1,
    0,
    0,
    null,
    null,
    0
  )$$,
  'P0001',
  'ai_completion_invalid',
  'abstained completion requires a bounded reason code'
);

select throws_ok(
  $$select finish_ai_tutor_request(
    'a7500000-0000-4000-8000-000000000001',
    'answered',
    850,
    30,
    70,
    null,
    repeat('1', 64),
    2
  )$$,
  'P0001',
  'ai_request_not_available',
  'completed request cannot be finished twice'
);

reset role;

select is(
  (
    select concat_ws(
      '|',
      status,
      latency_ms::text,
      input_tokens::text,
      output_tokens::text,
      retrieved_chunk_count::text,
      (completed_at is not null)::text
    )
    from ai_usage_events
    where request_id = 'a7500000-0000-4000-8000-000000000001'
  ),
  'answered|850|30|70|2|true',
  'usage completion stores metrics only'
);

select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ai_usage_events'
      and column_name in (
        'prompt',
        'question',
        'answer',
        'content',
        'source',
        'sources',
        'metadata'
      )
  ),
  'usage events have no prompt, answer, source, content, or free-form metadata fields'
);

select ok(
  not exists (
    select 1
    from audit_logs
    where action like 'ai.%'
      and (
        metadata ? 'prompt'
        or metadata ? 'question'
        or metadata ? 'answer'
        or metadata ? 'content'
        or metadata ? 'source'
        or metadata ? 'source_name'
      )
  ),
  'AI audit metadata has no prompt, answer, or source text'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select throws_ok(
  $$select finish_ai_tutor_request(
    'a7500000-0000-4000-8000-000000000001',
    'failed',
    1,
    0,
    0,
    'PROVIDER_ERROR',
    null,
    0
  )$$,
  'P0001',
  'ai_request_not_available',
  'tenant B student cannot finish tenant A usage by request ID'
);

select throws_ok(
  $$select * from reserve_ai_tutor_request(
    'b7500000-0000-4000-8000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    10
  )$$,
  'P0001',
  'ai_class_not_available',
  'tenant B student cannot reserve against tenant A class'
);

select is(
  set_ai_tutor_consent(true, 'pilot-2026-07'),
  true,
  'tenant B student grants consent for stale-request recovery tests'
);

reset role;

update ai_tenant_policies
set daily_request_limit = 3
where tenant_id = 'b0000000-0000-0000-0000-000000000001';

insert into ai_usage_events (
  id,
  tenant_id,
  user_id,
  request_id,
  class_id,
  provider,
  model,
  status,
  input_chars,
  created_at
)
values
  (
    'b7600000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000003',
    'b7500000-0000-4000-8000-000000000090',
    'b1000000-0000-0000-0000-000000000001',
    'openai-compatible',
    'citation-model-v1',
    'started',
    90,
    clock_timestamp() - interval '3 minutes'
  ),
  (
    'b7600000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000003',
    'b7500000-0000-4000-8000-000000000091',
    'b1000000-0000-0000-0000-000000000001',
    'openai-compatible',
    'citation-model-v1',
    'started',
    91,
    clock_timestamp()
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select is(
  (
    select "dailyRemaining"
    from reserve_ai_tutor_request(
      'b7500000-0000-4000-8000-000000000092',
      'b1000000-0000-0000-0000-000000000001',
      92
    )
  ),
  0,
  'stale recovery keeps the expired request counted against daily quota'
);

reset role;

select is(
  (
    select concat_ws(
      '|',
      status,
      error_code,
      latency_ms::text,
      input_tokens::text,
      output_tokens::text,
      retrieved_chunk_count::text,
      (output_hash is null)::text,
      (completed_at is not null)::text
    )
    from ai_usage_events
    where request_id = 'b7500000-0000-4000-8000-000000000090'
  ),
  'failed|REQUEST_EXPIRED|120000|0|0|0|true|true',
  'old started request is finalized with bounded content-free metadata'
);

select is(
  (
    select concat_ws(
      '|',
      status,
      (error_code is null)::text,
      (completed_at is null)::text
    )
    from ai_usage_events
    where request_id = 'b7500000-0000-4000-8000-000000000091'
  ),
  'started|true|true',
  'fresh started request is not touched by stale recovery'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select throws_ok(
  $$select * from reserve_ai_tutor_request(
    'b7500000-0000-4000-8000-000000000090',
    'b1000000-0000-0000-0000-000000000001',
    90
  )$$,
  'P0001',
  'ai_duplicate_request',
  'expired request ID cannot be replayed'
);

select throws_ok(
  $$select * from reserve_ai_tutor_request(
    'b7500000-0000-4000-8000-000000000093',
    'b1000000-0000-0000-0000-000000000001',
    93
  )$$,
  'P0001',
  'ai_daily_quota_exceeded',
  'stale recovery does not free a consumed quota slot'
);

reset role;

select * from finish();
rollback;
