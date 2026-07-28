create function public.get_tutor_citation_detail(
  p_chunk_id uuid,
  p_class_id uuid
)
returns table (
  id uuid,
  title text,
  "sourceName" text,
  "pageNumber" integer,
  content text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    chunk.id,
    document.title,
    document.source_name,
    chunk.page_number,
    chunk.content
  from public.knowledge_chunks chunk
  join public.knowledge_documents document
    on document.tenant_id = chunk.tenant_id
   and document.id = chunk.document_id
  join public.classes class
    on class.tenant_id = chunk.tenant_id
   and class.id = p_class_id
  join public.memberships membership
    on membership.tenant_id = class.tenant_id
   and membership.user_id = auth.uid()
   and membership.role = 'student'
  join public.class_members class_member
    on class_member.tenant_id = class.tenant_id
   and class_member.class_id = class.id
   and class_member.student_id = membership.user_id
  join public.ai_tenant_policies policy
    on policy.tenant_id = class.tenant_id
   and policy.tutor_enabled
   and policy.privacy_approved_at is not null
  join public.ai_consents consent
    on consent.tenant_id = class.tenant_id
   and consent.user_id = membership.user_id
   and consent.granted
   and consent.policy_version = policy.privacy_policy_version
  where chunk.id = p_chunk_id
    and document.status = 'ready'
    and document.published
    and (document.class_id is null or document.class_id = class.id);
$$;

revoke all on function public.get_tutor_citation_detail(uuid, uuid) from public;
grant execute on function public.get_tutor_citation_detail(uuid, uuid)
to authenticated;
