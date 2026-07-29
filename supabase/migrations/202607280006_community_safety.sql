create type public.community_space_kind as enum ('school', 'class', 'club');
create type public.community_reaction as enum ('like');
create type public.community_report_reason as enum (
  'spam',
  'harassment',
  'hate',
  'dangerous',
  'misinformation',
  'other'
);
create type public.community_report_status as enum (
  'open',
  'escalated',
  'dismissed',
  'resolved'
);
create type public.community_moderation_action as enum (
  'dismiss',
  'hide',
  'escalate',
  'resolve'
);

create table public.community_spaces (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  kind public.community_space_kind not null,
  name text not null check (length(trim(name)) between 1 and 200),
  class_id uuid,
  slow_mode_seconds integer not null default 0
    check (slow_mode_seconds between 0 and 300),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, class_id)
    references public.classes(tenant_id, id) on delete cascade,
  check (
    (kind = 'class' and class_id is not null)
    or (kind <> 'class' and class_id is null)
  )
);

create unique index community_spaces_school_tenant_uidx
  on public.community_spaces(tenant_id)
  where kind = 'school';

create unique index community_spaces_class_uidx
  on public.community_spaces(tenant_id, class_id)
  where kind = 'class';

create table public.space_members (
  tenant_id uuid not null,
  space_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id),
  unique (tenant_id, space_id, user_id),
  foreign key (tenant_id, space_id)
    references public.community_spaces(tenant_id, id) on delete cascade,
  foreign key (tenant_id, user_id)
    references public.memberships(tenant_id, user_id) on delete cascade
);

create table public.community_messages (
  id uuid primary key,
  tenant_id uuid not null,
  space_id uuid not null,
  author_id uuid not null references auth.users(id),
  body text not null check (length(trim(body)) between 1 and 4000),
  reply_to_id uuid,
  mentioned_user_ids uuid[] not null default '{}'::uuid[]
    check (
      cardinality(mentioned_user_ids) <= 5
      and array_position(mentioned_user_ids, null) is null
    ),
  hidden_at timestamptz,
  hidden_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (tenant_id, space_id, id),
  foreign key (tenant_id, space_id)
    references public.community_spaces(tenant_id, id) on delete cascade,
  foreign key (tenant_id, author_id)
    references public.memberships(tenant_id, user_id),
  foreign key (tenant_id, space_id, reply_to_id)
    references public.community_messages(tenant_id, space_id, id),
  foreign key (tenant_id, hidden_by)
    references public.memberships(tenant_id, user_id),
  check (
    (hidden_at is null and hidden_by is null)
    or (hidden_at is not null and hidden_by is not null)
  )
);

create index community_messages_space_created_idx
  on public.community_messages(space_id, created_at desc);
create index community_messages_author_created_idx
  on public.community_messages(author_id, created_at desc);

create table public.message_reactions (
  tenant_id uuid not null,
  space_id uuid not null,
  message_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction public.community_reaction not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, reaction),
  foreign key (tenant_id, space_id, message_id)
    references public.community_messages(tenant_id, space_id, id) on delete cascade,
  foreign key (tenant_id, user_id)
    references public.memberships(tenant_id, user_id) on delete cascade
);

create table public.content_reports (
  id uuid primary key,
  tenant_id uuid not null,
  space_id uuid not null,
  message_id uuid not null,
  reporter_id uuid not null references auth.users(id),
  reason public.community_report_reason not null,
  detail text check (
    detail is null or length(trim(detail)) between 1 and 1000
  ),
  status public.community_report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  unique (tenant_id, id),
  foreign key (tenant_id, space_id, message_id)
    references public.community_messages(tenant_id, space_id, id),
  foreign key (tenant_id, reporter_id)
    references public.memberships(tenant_id, user_id),
  foreign key (tenant_id, resolved_by)
    references public.memberships(tenant_id, user_id),
  check (
    (status in ('open', 'escalated') and resolved_at is null and resolved_by is null)
    or (
      status in ('dismissed', 'resolved')
      and resolved_at is not null
      and resolved_by is not null
    )
  )
);

create index content_reports_tenant_status_created_idx
  on public.content_reports(tenant_id, status, created_at);
create unique index content_reports_active_reporter_uidx
  on public.content_reports(tenant_id, message_id, reporter_id)
  where status in ('open', 'escalated');

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  report_id uuid not null,
  moderator_id uuid not null references auth.users(id),
  action public.community_moderation_action not null,
  note text check (note is null or length(trim(note)) between 1 and 1000),
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, report_id)
    references public.content_reports(tenant_id, id),
  foreign key (tenant_id, moderator_id)
    references public.memberships(tenant_id, user_id)
);

create table public.blocks (
  tenant_id uuid not null,
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tenant_id, blocker_id, blocked_user_id),
  foreign key (tenant_id, blocker_id)
    references public.memberships(tenant_id, user_id) on delete cascade,
  foreign key (tenant_id, blocked_user_id)
    references public.memberships(tenant_id, user_id) on delete cascade,
  check (blocker_id <> blocked_user_id)
);

create table public.mutes (
  tenant_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  space_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (space_id, user_id),
  foreign key (tenant_id, user_id)
    references public.memberships(tenant_id, user_id) on delete cascade,
  foreign key (tenant_id, space_id)
    references public.community_spaces(tenant_id, id) on delete cascade
);

create function private.ensure_school_community_space()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('app.seed_mode', true), 'off') = 'on' then
    return new;
  end if;

  insert into public.community_spaces (
    tenant_id, kind, name, created_by
  )
  select new.tenant_id, 'school', tenant.name, new.user_id
  from public.tenants tenant
  where tenant.id = new.tenant_id
  on conflict (tenant_id) where kind = 'school' do nothing;

  return new;
end;
$$;

create function private.ensure_class_community_space()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('app.seed_mode', true), 'off') = 'on' then
    return new;
  end if;

  insert into public.community_spaces (
    tenant_id, kind, name, class_id, created_by
  )
  values (
    new.tenant_id, 'class', new.name, new.id, new.teacher_id
  )
  on conflict (tenant_id, class_id) where kind = 'class'
  do update set name = excluded.name;

  return new;
end;
$$;

create trigger memberships_ensure_school_community_space
after insert on public.memberships
for each row execute function private.ensure_school_community_space();

create trigger classes_ensure_class_community_space
after insert or update of name, teacher_id on public.classes
for each row execute function private.ensure_class_community_space();

insert into public.community_spaces (
  tenant_id, kind, name, created_by
)
select tenant.id, 'school', tenant.name, creator.user_id
from public.tenants tenant
cross join lateral (
  select membership.user_id
  from public.memberships membership
  where membership.tenant_id = tenant.id
  order by
    case membership.role
      when 'admin' then 1
      when 'moderator' then 2
      when 'teacher' then 3
      else 4
    end,
    membership.user_id
  limit 1
) creator
on conflict (tenant_id) where kind = 'school' do nothing;

insert into public.community_spaces (
  tenant_id, kind, name, class_id, created_by
)
select class.tenant_id, 'class', class.name, class.id, class.teacher_id
from public.classes class
on conflict (tenant_id, class_id) where kind = 'class'
do update set name = excluded.name;

create function private.can_access_community_space(
  requested_space_id uuid,
  allow_moderation_access boolean default true
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.community_spaces s
    join public.memberships m
      on m.tenant_id = s.tenant_id
     and m.user_id = auth.uid()
    where s.id = requested_space_id
      and (
        (allow_moderation_access and m.role in ('admin', 'moderator'))
        or s.kind = 'school'
        or (s.kind = 'class' and m.role in ('admin', 'moderator'))
        or (
          s.kind = 'class'
          and (
            (m.role = 'teacher' and exists (
              select 1
              from public.classes c
              where c.tenant_id = s.tenant_id
                and c.id = s.class_id
                and c.teacher_id = auth.uid()
            ))
            or
            (m.role = 'student' and exists (
              select 1
              from public.class_members cm
              where cm.tenant_id = s.tenant_id
                and cm.class_id = s.class_id
                and cm.student_id = auth.uid()
            ))
          )
        )
        or (
          s.kind = 'club'
          and exists (
            select 1
            from public.space_members sm
            where sm.tenant_id = s.tenant_id
              and sm.space_id = s.id
              and sm.user_id = auth.uid()
          )
        )
      )
  );
$$;

create function private.can_moderate_community(requested_tenant_id uuid)
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
      and m.role in ('admin', 'moderator')
  );
$$;

create function private.can_post_community_space(requested_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.community_spaces s
    join public.memberships m
      on m.tenant_id = s.tenant_id
     and m.user_id = auth.uid()
    where s.id = requested_space_id
      and (
        (s.kind = 'school' and m.role in ('admin', 'teacher', 'moderator'))
        or (s.kind = 'class' and m.role in ('admin', 'moderator'))
        or (
          s.kind = 'class'
          and (
            (m.role = 'teacher' and exists (
              select 1
              from public.classes c
              where c.tenant_id = s.tenant_id
                and c.id = s.class_id
                and c.teacher_id = auth.uid()
            ))
            or
            (m.role = 'student' and exists (
              select 1
              from public.class_members cm
              where cm.tenant_id = s.tenant_id
                and cm.class_id = s.class_id
                and cm.student_id = auth.uid()
            ))
          )
        )
        or (
          s.kind = 'club'
          and exists (
            select 1
            from public.space_members sm
            where sm.tenant_id = s.tenant_id
              and sm.space_id = s.id
              and sm.user_id = auth.uid()
          )
        )
      )
  );
$$;

create function private.community_message_visible(requested_message_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.community_messages message
    where message.id = requested_message_id
      and private.can_access_community_space(message.space_id)
      and (
        message.hidden_at is null
        or private.can_moderate_community(message.tenant_id)
      )
      and (
        private.can_moderate_community(message.tenant_id)
        or not exists (
          select 1
          from public.blocks b
          where b.tenant_id = message.tenant_id
            and b.blocker_id = auth.uid()
            and b.blocked_user_id = message.author_id
        )
      )
  );
$$;

revoke all on function private.can_access_community_space(uuid, boolean) from public;
revoke all on function private.can_moderate_community(uuid) from public;
revoke all on function private.can_post_community_space(uuid) from public;
revoke all on function private.community_message_visible(uuid) from public;
grant execute on function private.can_access_community_space(uuid, boolean) to authenticated;
grant execute on function private.can_moderate_community(uuid) to authenticated;
grant execute on function private.can_post_community_space(uuid) to authenticated;
grant execute on function private.community_message_visible(uuid) to authenticated;

alter table public.community_spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.community_messages enable row level security;
alter table public.message_reactions enable row level security;
alter table public.content_reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.blocks enable row level security;
alter table public.mutes enable row level security;

create policy community_spaces_select_accessible
on public.community_spaces for select to authenticated
using (private.can_access_community_space(id));

create policy space_members_select_accessible
on public.space_members for select to authenticated
using (
  user_id = auth.uid()
  or private.can_access_community_space(space_id)
);

create policy community_messages_select_visible
on public.community_messages for select to authenticated
using (private.community_message_visible(id));

create policy message_reactions_select_visible
on public.message_reactions for select to authenticated
using (private.community_message_visible(message_id));

create policy content_reports_select_owner_or_moderator
on public.content_reports for select to authenticated
using (
  reporter_id = auth.uid()
  or private.can_moderate_community(tenant_id)
);

create policy moderation_actions_select_moderator
on public.moderation_actions for select to authenticated
using (private.can_moderate_community(tenant_id));

create policy blocks_select_owner
on public.blocks for select to authenticated
using (blocker_id = auth.uid());

create policy mutes_select_owner
on public.mutes for select to authenticated
using (user_id = auth.uid());

grant select on public.community_spaces to authenticated;
grant select on public.space_members to authenticated;
grant select on public.community_messages to authenticated;
grant select on public.message_reactions to authenticated;
grant select on public.content_reports to authenticated;
grant select on public.moderation_actions to authenticated;
grant select on public.blocks to authenticated;
grant select on public.mutes to authenticated;

revoke insert, update, delete, truncate
  on public.community_spaces,
     public.space_members,
     public.community_messages,
     public.message_reactions,
     public.content_reports,
     public.moderation_actions,
     public.blocks,
     public.mutes
  from authenticated;

drop policy tenants_select_member on public.tenants;
create policy tenants_select_member
on public.tenants for select to authenticated
using (
  private.has_tenant_role(
    id,
    array['admin', 'teacher', 'student', 'moderator']::public.member_role[]
  )
);

create function public.list_community_spaces()
returns table (
  id uuid,
  tenant_id uuid,
  kind public.community_space_kind,
  name text,
  class_id uuid,
  slow_mode_seconds integer,
  muted boolean,
  can_leave boolean,
  can_post boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id,
    s.tenant_id,
    s.kind,
    s.name,
    s.class_id,
    s.slow_mode_seconds,
    exists (
      select 1
      from public.mutes mute
      where mute.tenant_id = s.tenant_id
        and mute.space_id = s.id
        and mute.user_id = auth.uid()
    ) as muted,
    s.kind = 'club'
      and exists (
        select 1
        from public.space_members sm
        where sm.tenant_id = s.tenant_id
          and sm.space_id = s.id
          and sm.user_id = auth.uid()
      ) as can_leave,
    private.can_post_community_space(s.id) as can_post
  from public.community_spaces s
  where auth.uid() is not null
    and private.can_access_community_space(s.id)
  order by
    case s.kind when 'school' then 1 when 'class' then 2 else 3 end,
    s.name,
    s.id;
$$;

create function public.list_community_messages(
  p_space_id uuid,
  p_before timestamptz default null,
  p_limit integer default 50,
  p_message_id uuid default null
)
returns table (
  id uuid,
  tenant_id uuid,
  space_id uuid,
  author_id uuid,
  author_display_name text,
  author_role public.member_role,
  blocked_by_me boolean,
  text text,
  reply_to_id uuid,
  reply_author_display_name text,
  reply_text text,
  reaction_kind public.community_reaction,
  reaction_count bigint,
  reacted_by_me boolean,
  report_count bigint,
  reported_by_me boolean,
  hidden boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.can_access_community_space(p_space_id) then
    raise exception 'community_unauthorized' using errcode = '42501';
  end if;

  if p_limit is null or p_limit not between 1 and 100 then
    raise exception 'community_invalid_limit' using errcode = '22023';
  end if;

  return query
  select
    message.id,
    message.tenant_id,
    message.space_id,
    message.author_id,
    coalesce(author.display_name, author.email, 'Community member') as author_display_name,
    author.role,
    exists (
      select 1 from public.blocks own_block
      where own_block.tenant_id = message.tenant_id
        and own_block.blocker_id = auth.uid()
        and own_block.blocked_user_id = message.author_id
    ) as blocked_by_me,
    case
      when exists (
        select 1
        from public.blocks own_block
        where own_block.tenant_id = message.tenant_id
          and own_block.blocker_id = auth.uid()
          and own_block.blocked_user_id = message.author_id
      )
      and not private.can_moderate_community(message.tenant_id)
      then ''
      else message.body
    end,
    case when reply_visible then parent.id end,
    case when reply_visible then coalesce(parent_author.display_name, parent_author.email, 'Community member') end,
    case when reply_visible then parent.body end,
    'like'::public.community_reaction,
    (
      select count(*)
      from public.message_reactions reaction
      where reaction.tenant_id = message.tenant_id
        and reaction.message_id = message.id
        and reaction.reaction = 'like'
    ),
    exists (
      select 1
      from public.message_reactions own_reaction
      where own_reaction.tenant_id = message.tenant_id
        and own_reaction.message_id = message.id
        and own_reaction.user_id = auth.uid()
        and own_reaction.reaction = 'like'
    ),
    case
      when private.can_moderate_community(message.tenant_id) then (
        select count(*)
        from public.content_reports report
        where report.tenant_id = message.tenant_id
          and report.message_id = message.id
      )
      else 0::bigint
    end,
    exists (
      select 1
      from public.content_reports own_report
      where own_report.tenant_id = message.tenant_id
        and own_report.message_id = message.id
        and own_report.reporter_id = auth.uid()
        and own_report.status in ('open', 'escalated')
    ),
    message.hidden_at is not null,
    message.created_at
  from public.community_messages message
  join public.memberships author
    on author.tenant_id = message.tenant_id
   and author.user_id = message.author_id
  left join public.community_messages parent
    on parent.tenant_id = message.tenant_id
   and parent.space_id = message.space_id
   and parent.id = message.reply_to_id
  left join public.memberships parent_author
    on parent_author.tenant_id = parent.tenant_id
   and parent_author.user_id = parent.author_id
  cross join lateral (
    select
      parent.id is not null
      and (
        parent.hidden_at is null
        or private.can_moderate_community(parent.tenant_id)
      )
      and (
        private.can_moderate_community(parent.tenant_id)
        or not exists (
          select 1 from public.blocks parent_block
          where parent_block.tenant_id = parent.tenant_id
            and parent_block.blocker_id = auth.uid()
            and parent_block.blocked_user_id = parent.author_id
        )
      ) as reply_visible
  ) reply_access
  where message.space_id = p_space_id
    and (p_message_id is null or message.id = p_message_id)
    and (p_before is null or message.created_at < p_before)
    and (
      message.hidden_at is null
      or private.can_moderate_community(message.tenant_id)
    )
  order by message.created_at desc, message.id desc
  limit p_limit;
end;
$$;

create function private.post_community_message(
  p_message_id uuid,
  p_space_id uuid,
  p_text text,
  p_reply_to_id uuid,
  p_mentioned_user_ids uuid[],
  p_privacy_warning_confirmed boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target_space public.community_spaces%rowtype;
  parent public.community_messages%rowtype;
  replay public.community_messages%rowtype;
  mention_count integer;
  textual_mention_count integer;
  latest_message_at timestamptz;
begin
  if actor is null then
    raise exception 'community_unauthorized' using errcode = '42501';
  end if;

  if p_message_id is null then
    raise exception 'community_invalid_message_id' using errcode = '22023';
  end if;

  select s.*
    into target_space
  from public.community_spaces s
  where s.id = p_space_id;

  if not found then
    raise exception 'community_space_not_found' using errcode = 'P0001';
  end if;

  if not private.can_post_community_space(p_space_id) then
    raise exception 'community_unauthorized' using errcode = '42501';
  end if;

  if p_text is null or length(trim(p_text)) not between 1 and 4000 then
    raise exception 'community_invalid_text' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(actor::text),
    pg_catalog.hashtext('community_message')
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('community_message_id'),
    pg_catalog.hashtext(p_message_id::text)
  );

  select message.*
    into replay
  from public.community_messages message
  where message.id = p_message_id;

  if found then
    if replay.tenant_id = target_space.tenant_id
       and replay.space_id = p_space_id
       and replay.author_id = actor
       and replay.body = trim(p_text)
       and replay.reply_to_id is not distinct from p_reply_to_id
       and replay.mentioned_user_ids = coalesce(p_mentioned_user_ids, '{}'::uuid[]) then
      return p_message_id;
    end if;

    raise exception 'community_message_id_conflict' using errcode = '23505';
  end if;

  if not coalesce(p_privacy_warning_confirmed, false)
     and (
       p_text ~* '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}'
       or p_text ~ '(^|[^0-9])([0-9][ -]?){8,15}([^0-9]|$)'
       or p_text ~* '(https?://|www\.)'
       or p_text ~* '\m(otp|one[- ]time( password| code)?|verification code|mã xác thực|mã otp)\M'
       or p_text ~* '\m(cccd|cmnd|passport|citizen id|identity card|national id|driver.?s licen[cs]e|căn cước|hộ chiếu)\M'
       or p_text ~* '\m(bank|banking|bank account|account number|số tài khoản|so tai khoan|iban|swift|ngân hàng)\M'
       or p_text ~* '\m(home address|street address|address|street|road|avenue|postcode|zip code|dia chi|duong|địa chỉ|đường|phường|quận)\M'
     ) then
    raise exception 'community_privacy_confirmation_required' using errcode = '22023';
  end if;

  if coalesce(cardinality(p_mentioned_user_ids), 0) > 5 then
    raise exception 'community_mentions_limit' using errcode = '22023';
  end if;

  select count(*)::integer
    into textual_mention_count
  from regexp_matches(
    p_text,
    '(^|[^[:alnum:]_.%+-])@[[:alnum:]_.-]+',
    'g'
  );

  if textual_mention_count > 5 then
    raise exception 'community_mentions_limit' using errcode = '22023';
  end if;

  if array_position(p_mentioned_user_ids, null) is not null
     or (
       select count(*) <> count(distinct mentioned_user_id)
       from unnest(coalesce(p_mentioned_user_ids, '{}'::uuid[]))
         as mentions(mentioned_user_id)
     ) then
    raise exception 'community_invalid_mentions' using errcode = '22023';
  end if;

  select count(*)
    into mention_count
  from unnest(coalesce(p_mentioned_user_ids, '{}'::uuid[]))
    as mentions(mentioned_user_id)
  join public.memberships mentioned
    on mentioned.tenant_id = target_space.tenant_id
   and mentioned.user_id = mentions.mentioned_user_id
  where not exists (
    select 1
    from public.blocks block_relation
    where block_relation.tenant_id = target_space.tenant_id
      and (
        (
          block_relation.blocker_id = actor
          and block_relation.blocked_user_id = mentions.mentioned_user_id
        )
        or (
          block_relation.blocker_id = mentions.mentioned_user_id
          and block_relation.blocked_user_id = actor
        )
      )
  );

  if mention_count <> coalesce(cardinality(p_mentioned_user_ids), 0) then
    raise exception 'community_invalid_mentions' using errcode = '22023';
  end if;

  if p_reply_to_id is not null then
    select message.*
      into parent
    from public.community_messages message
    where message.tenant_id = target_space.tenant_id
      and message.space_id = p_space_id
      and message.id = p_reply_to_id;

    if not found then
      raise exception 'community_message_not_found' using errcode = 'P0001';
    end if;

    if parent.reply_to_id is not null then
      raise exception 'community_reply_depth' using errcode = '22023';
    end if;

    if exists (
      select 1
      from public.blocks block_relation
      where block_relation.tenant_id = target_space.tenant_id
        and (
          (block_relation.blocker_id = actor and block_relation.blocked_user_id = parent.author_id)
          or
          (block_relation.blocker_id = parent.author_id and block_relation.blocked_user_id = actor)
        )
    ) then
      raise exception 'community_blocked' using errcode = '42501';
    end if;
  end if;

  if (
    select count(*)
    from public.community_messages recent
    where recent.author_id = actor
      and recent.space_id = p_space_id
      and recent.created_at >= clock_timestamp() - interval '1 minute'
  ) >= 10 then
    raise exception 'community_rate_limited'
      using errcode = 'P0001', hint = 'Retry after 60 seconds';
  end if;

  if target_space.slow_mode_seconds > 0 then
    select max(recent.created_at)
      into latest_message_at
    from public.community_messages recent
    where recent.space_id = p_space_id
      and recent.author_id = actor;

    if latest_message_at is not null
       and latest_message_at
         > clock_timestamp() - make_interval(secs => target_space.slow_mode_seconds) then
      raise exception 'community_slow_mode'
        using errcode = 'P0001',
              hint = format(
                'Retry after %s seconds',
                greatest(
                  1,
                  ceil(
                    extract(
                      epoch from (
                        latest_message_at
                        + make_interval(secs => target_space.slow_mode_seconds)
                        - clock_timestamp()
                      )
                    )
                  )::integer
                )
              );
    end if;
  end if;

  insert into public.community_messages (
    id,
    tenant_id,
    space_id,
    author_id,
    body,
    reply_to_id,
    mentioned_user_ids
  )
  values (
    p_message_id,
    target_space.tenant_id,
    p_space_id,
    actor,
    trim(p_text),
    p_reply_to_id,
    coalesce(p_mentioned_user_ids, '{}'::uuid[])
  )
  on conflict (id) do nothing;

  if not exists (
    select 1
    from public.community_messages saved
    where saved.id = p_message_id
      and saved.tenant_id = target_space.tenant_id
      and saved.space_id = p_space_id
      and saved.author_id = actor
      and saved.body = trim(p_text)
      and saved.reply_to_id is not distinct from p_reply_to_id
      and saved.mentioned_user_ids = coalesce(p_mentioned_user_ids, '{}'::uuid[])
  ) then
    raise exception 'community_message_id_conflict' using errcode = '23505';
  end if;

  return p_message_id;
end;
$$;

create function public.post_community_message(
  p_message_id uuid,
  p_space_id uuid,
  p_text text,
  p_reply_to_id uuid,
  p_privacy_warning_confirmed boolean
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select private.post_community_message(
    p_message_id,
    p_space_id,
    p_text,
    p_reply_to_id,
    '{}'::uuid[],
    p_privacy_warning_confirmed
  );
$$;

create function public.post_community_message(
  p_message_id uuid,
  p_space_id uuid,
  p_text text,
  p_reply_to_id uuid,
  p_mentioned_user_ids uuid[],
  p_privacy_warning_confirmed boolean
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select private.post_community_message(
    p_message_id,
    p_space_id,
    p_text,
    p_reply_to_id,
    p_mentioned_user_ids,
    p_privacy_warning_confirmed
  );
$$;

create function public.set_community_reaction(
  p_message_id uuid,
  p_reaction public.community_reaction,
  p_active boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target public.community_messages%rowtype;
begin
  select message.*
    into target
  from public.community_messages message
  where message.id = p_message_id;

  if actor is null
     or not found
     or target.hidden_at is not null
     or not private.can_access_community_space(target.space_id, false) then
    raise exception 'community_message_not_found' using errcode = 'P0001';
  end if;

  if not coalesce(p_active, false) then
    delete from public.message_reactions reaction
    where reaction.message_id = target.id
      and reaction.user_id = actor
      and reaction.reaction = p_reaction;
    return false;
  end if;

  insert into public.message_reactions (
    tenant_id, space_id, message_id, user_id, reaction
  )
  values (
    target.tenant_id, target.space_id, target.id, actor, p_reaction
  )
  on conflict do nothing;
  return true;
end;
$$;

create function public.report_community_message(
  p_report_id uuid,
  p_message_id uuid,
  p_reason public.community_report_reason,
  p_detail text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target public.community_messages%rowtype;
  saved_report_id uuid;
begin
  if p_report_id is null then
    raise exception 'community_invalid_report_id' using errcode = '22023';
  end if;

  if p_detail is not null and length(trim(p_detail)) not between 1 and 1000 then
    raise exception 'community_invalid_report_detail' using errcode = '22023';
  end if;

  select message.*
    into target
  from public.community_messages message
  where message.id = p_message_id;

  if actor is null
     or not found
     or target.hidden_at is not null
     or not private.can_access_community_space(target.space_id, false) then
    raise exception 'community_message_not_found' using errcode = 'P0001';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(actor::text),
    pg_catalog.hashtext('community_report')
  );

  select report.id
    into saved_report_id
  from public.content_reports report
  where report.tenant_id = target.tenant_id
    and report.message_id = target.id
    and report.reporter_id = actor
    and report.status in ('open', 'escalated');

  if found then
    return saved_report_id;
  end if;

  if (
    select count(*)
    from public.content_reports recent
    where recent.reporter_id = actor
      and recent.created_at >= clock_timestamp() - interval '1 minute'
  ) >= 5 then
    raise exception 'community_rate_limited'
      using errcode = 'P0001', hint = 'Retry after 60 seconds';
  end if;

  insert into public.content_reports (
    id,
    tenant_id,
    space_id,
    message_id,
    reporter_id,
    reason,
    detail
  )
  values (
    p_report_id,
    target.tenant_id,
    target.space_id,
    target.id,
    actor,
    p_reason,
    nullif(trim(p_detail), '')
  )
  on conflict (tenant_id, message_id, reporter_id)
    where status in ('open', 'escalated')
  do update set id = public.content_reports.id
  returning id into saved_report_id;

  return saved_report_id;
end;
$$;

create function public.set_community_block(
  p_user_id uuid,
  p_blocked boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  actor_tenant uuid;
begin
  select own_membership.tenant_id
    into actor_tenant
  from public.memberships own_membership
  where own_membership.user_id = actor;

  if actor is null
     or not found
     or p_user_id = actor
     or not exists (
       select 1
       from public.memberships target
       where target.tenant_id = actor_tenant
         and target.user_id = p_user_id
     ) then
    raise exception 'community_unauthorized' using errcode = '42501';
  end if;

  if coalesce(p_blocked, false) then
    insert into public.blocks (tenant_id, blocker_id, blocked_user_id)
    values (actor_tenant, actor, p_user_id)
    on conflict do nothing;
    return true;
  end if;

  delete from public.blocks block
  where block.tenant_id = actor_tenant
    and block.blocker_id = actor
    and block.blocked_user_id = p_user_id;
  return false;
end;
$$;

create function public.set_community_mute(
  p_space_id uuid,
  p_muted boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target_space public.community_spaces%rowtype;
begin
  select space.*
    into target_space
  from public.community_spaces space
  where space.id = p_space_id;

  if actor is null
     or not found
     or not private.can_access_community_space(p_space_id) then
    raise exception 'community_unauthorized' using errcode = '42501';
  end if;

  if coalesce(p_muted, false) then
    insert into public.mutes (tenant_id, user_id, space_id)
    values (target_space.tenant_id, actor, target_space.id)
    on conflict do nothing;
    return true;
  end if;

  delete from public.mutes mute
  where mute.tenant_id = target_space.tenant_id
    and mute.user_id = actor
    and mute.space_id = target_space.id;
  return false;
end;
$$;

create function public.leave_community_club(p_space_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target_space public.community_spaces%rowtype;
begin
  select space.*
    into target_space
  from public.community_spaces space
  where space.id = p_space_id;

  if actor is null or not found then
    raise exception 'community_unauthorized' using errcode = '42501';
  end if;

  if target_space.kind <> 'club' then
    raise exception 'community_leave_not_allowed' using errcode = '42501';
  end if;

  delete from public.space_members member
  where member.tenant_id = target_space.tenant_id
    and member.space_id = target_space.id
    and member.user_id = actor;

  if not found then
    raise exception 'community_unauthorized' using errcode = '42501';
  end if;

  return true;
end;
$$;

create function public.set_community_slow_mode(
  p_space_id uuid,
  p_seconds integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_space public.community_spaces%rowtype;
begin
  if p_seconds is null or p_seconds not between 0 and 300 then
    raise exception 'community_invalid_slow_mode' using errcode = '22023';
  end if;

  select space.*
    into target_space
  from public.community_spaces space
  where space.id = p_space_id;

  if auth.uid() is null
     or not found
     or not private.can_moderate_community(target_space.tenant_id) then
    raise exception 'community_unauthorized' using errcode = '42501';
  end if;

  update public.community_spaces
  set slow_mode_seconds = p_seconds
  where id = target_space.id
    and slow_mode_seconds is distinct from p_seconds;

  if found then
    insert into public.audit_logs (
      tenant_id,
      actor_id,
      action,
      entity_type,
      entity_id,
      metadata
    )
    values (
      target_space.tenant_id,
      auth.uid(),
      'community.space.slow_mode.updated',
      'community_spaces',
      target_space.id,
      jsonb_build_object('slow_mode_seconds', p_seconds)
    );
  end if;

  return p_seconds;
end;
$$;

create function public.list_community_moderation_queue(
  p_tenant_id uuid default null,
  p_limit integer default 50
)
returns table (
  id uuid,
  tenant_id uuid,
  message_id uuid,
  space_id uuid,
  reporter_id uuid,
  reporter_display_name text,
  reporter_role public.member_role,
  author_id uuid,
  author_display_name text,
  author_role public.member_role,
  message_text text,
  message_created_at timestamptz,
  reason public.community_report_reason,
  detail text,
  status public.community_report_status,
  hidden boolean,
  created_at timestamptz,
  resolved_at timestamptz,
  resolved_by uuid
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_tenant uuid;
begin
  select membership.tenant_id
    into actor_tenant
  from public.memberships membership
  where membership.user_id = auth.uid()
    and membership.role in ('admin', 'moderator');

  if auth.uid() is null
     or not found
     or (p_tenant_id is not null and p_tenant_id <> actor_tenant) then
    raise exception 'community_unauthorized' using errcode = '42501';
  end if;

  if p_limit is null or p_limit not between 1 and 100 then
    raise exception 'community_invalid_limit' using errcode = '22023';
  end if;

  return query
  select
    report.id,
    report.tenant_id,
    report.message_id,
    report.space_id,
    report.reporter_id,
    coalesce(reporter.display_name, reporter.email, 'Community member'),
    reporter.role,
    message.author_id,
    coalesce(author.display_name, author.email, 'Community member'),
    author.role,
    message.body,
    message.created_at,
    report.reason,
    report.detail,
    report.status,
    message.hidden_at is not null,
    report.created_at,
    report.resolved_at,
    report.resolved_by
  from public.content_reports report
  join public.community_messages message
    on message.tenant_id = report.tenant_id
   and message.space_id = report.space_id
   and message.id = report.message_id
  join public.memberships reporter
    on reporter.tenant_id = report.tenant_id
   and reporter.user_id = report.reporter_id
  join public.memberships author
    on author.tenant_id = message.tenant_id
   and author.user_id = message.author_id
  where report.tenant_id = actor_tenant
    and report.status in ('open', 'escalated')
  order by
    case report.status
      when 'open' then 1
      when 'escalated' then 2
      when 'dismissed' then 3
      else 4
    end,
    report.created_at,
    report.id
  limit p_limit;
end;
$$;

create function private.moderate_community_report(
  p_action_id uuid,
  p_report_id uuid,
  p_action public.community_moderation_action,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target public.content_reports%rowtype;
  replay public.moderation_actions%rowtype;
begin
  if actor is null then
    raise exception 'community_report_not_found' using errcode = 'P0001';
  end if;

  if p_action_id is null then
    raise exception 'community_invalid_action_id' using errcode = '22023';
  end if;

  if p_note is not null and length(trim(p_note)) not between 1 and 1000 then
    raise exception 'community_invalid_moderation_note' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('community_moderation_action'),
    pg_catalog.hashtext(p_action_id::text)
  );

  select moderation.*
    into replay
  from public.moderation_actions moderation
  where moderation.id = p_action_id;

  if found then
    if replay.report_id = p_report_id
       and replay.moderator_id = actor
       and replay.action = p_action
       and replay.note is not distinct from nullif(trim(p_note), '') then
      return p_action_id;
    end if;

    raise exception 'community_moderation_action_id_conflict' using errcode = '23505';
  end if;

  select report.*
    into target
  from public.content_reports report
  where report.id = p_report_id
  for update;

  if not found
     or not private.can_moderate_community(target.tenant_id) then
    raise exception 'community_report_not_found' using errcode = 'P0001';
  end if;

  if target.status in ('dismissed', 'resolved')
     or (p_action = 'escalate' and target.status = 'escalated') then
    raise exception 'community_invalid_transition' using errcode = 'P0001';
  end if;

  if p_action = 'hide' then
    update public.community_messages
    set hidden_at = coalesce(hidden_at, clock_timestamp()),
        hidden_by = coalesce(hidden_by, actor)
    where tenant_id = target.tenant_id
      and id = target.message_id;

    update public.content_reports
    set status = 'resolved',
        resolved_at = clock_timestamp(),
        resolved_by = actor
    where id = target.id;
  elsif p_action = 'escalate' then
    update public.content_reports
    set status = 'escalated'
    where id = target.id;
  elsif p_action = 'dismiss' then
    update public.content_reports
    set status = 'dismissed',
        resolved_at = clock_timestamp(),
        resolved_by = actor
    where id = target.id;
  else
    update public.content_reports
    set status = 'resolved',
        resolved_at = clock_timestamp(),
        resolved_by = actor
    where id = target.id;
  end if;

  insert into public.moderation_actions (
    id,
    tenant_id,
    report_id,
    moderator_id,
    action,
    note
  )
  values (
    p_action_id,
    target.tenant_id,
    target.id,
    actor,
    p_action,
    nullif(trim(p_note), '')
  );

  return p_action_id;
end;
$$;

create function public.moderate_community_report(
  p_action_id uuid,
  p_report_id uuid,
  p_action public.community_moderation_action,
  p_note text
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select private.moderate_community_report(
    p_action_id, p_report_id, p_action, p_note
  );
$$;

create function private.audit_community_safety()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_table_name = 'content_reports' then
    insert into public.audit_logs (
      tenant_id,
      actor_id,
      action,
      entity_type,
      entity_id,
      metadata
    )
    values (
      new.tenant_id,
      auth.uid(),
      'community.report.created',
      'content_reports',
      new.id,
      jsonb_build_object(
        'message_id', new.message_id,
        'space_id', new.space_id,
        'reason', new.reason
      )
    );
  elsif tg_table_name = 'moderation_actions' then
    insert into public.audit_logs (
      tenant_id,
      actor_id,
      action,
      entity_type,
      entity_id,
      metadata
    )
    values (
      new.tenant_id,
      auth.uid(),
      'community.moderation.' || new.action::text,
      'moderation_actions',
      new.id,
      jsonb_build_object(
        'report_id', new.report_id,
        'action', new.action
      )
    );
  end if;

  return new;
end;
$$;

revoke all on function private.post_community_message(
  uuid, uuid, text, uuid, uuid[], boolean
) from public;
revoke all on function private.ensure_school_community_space() from public;
revoke all on function private.ensure_class_community_space() from public;
revoke all on function private.moderate_community_report(
  uuid, uuid, public.community_moderation_action, text
) from public;
revoke all on function private.audit_community_safety() from public;

create trigger content_reports_audit
after insert on public.content_reports
for each row execute function private.audit_community_safety();

create trigger moderation_actions_audit
after insert on public.moderation_actions
for each row execute function private.audit_community_safety();

do $$
begin
  if exists (
    select 1
    from pg_catalog.pg_publication publication
    where publication.pubname = 'supabase_realtime'
  )
  and not exists (
    select 1
    from pg_catalog.pg_publication_rel publication_table
    join pg_catalog.pg_publication publication
      on publication.oid = publication_table.prpubid
    where publication.pubname = 'supabase_realtime'
      and publication_table.prrelid = 'public.community_messages'::regclass
  ) then
    alter publication supabase_realtime add table public.community_messages;
  end if;
end;
$$;

revoke all on function public.list_community_spaces() from public;
revoke all on function public.list_community_messages(uuid, timestamptz, integer, uuid) from public;
revoke all on function public.post_community_message(uuid, uuid, text, uuid, boolean) from public;
revoke all on function public.post_community_message(uuid, uuid, text, uuid, uuid[], boolean) from public;
revoke all on function public.set_community_reaction(uuid, public.community_reaction, boolean) from public;
revoke all on function public.report_community_message(uuid, uuid, public.community_report_reason, text) from public;
revoke all on function public.set_community_block(uuid, boolean) from public;
revoke all on function public.set_community_mute(uuid, boolean) from public;
revoke all on function public.set_community_slow_mode(uuid, integer) from public;
revoke all on function public.leave_community_club(uuid) from public;
revoke all on function public.list_community_moderation_queue(uuid, integer) from public;
revoke all on function public.moderate_community_report(
  uuid, uuid, public.community_moderation_action, text
) from public;

grant execute on function public.list_community_spaces() to authenticated;
grant execute on function public.list_community_messages(uuid, timestamptz, integer, uuid) to authenticated;
grant execute on function public.post_community_message(uuid, uuid, text, uuid, boolean) to authenticated;
grant execute on function public.post_community_message(uuid, uuid, text, uuid, uuid[], boolean) to authenticated;
grant execute on function public.set_community_reaction(uuid, public.community_reaction, boolean) to authenticated;
grant execute on function public.report_community_message(uuid, uuid, public.community_report_reason, text) to authenticated;
grant execute on function public.set_community_block(uuid, boolean) to authenticated;
grant execute on function public.set_community_mute(uuid, boolean) to authenticated;
grant execute on function public.set_community_slow_mode(uuid, integer) to authenticated;
grant execute on function public.leave_community_club(uuid) to authenticated;
grant execute on function public.list_community_moderation_queue(uuid, integer) to authenticated;
grant execute on function public.moderate_community_report(
  uuid, uuid, public.community_moderation_action, text
) to authenticated;
