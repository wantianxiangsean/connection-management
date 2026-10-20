create extension if not exists pgcrypto;

create table if not exists public.people (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('contact', 'reference')),
  full_name text not null check (length(trim(full_name)) > 0),
  tier text check (tier in ('soul', 'close', 'friend', 'acquaintance')),
  role text not null default '',
  occupation text not null default '',
  region text not null default '',
  industry text not null default '',
  influence text check (influence in ('weak', 'medium', 'strong')),
  intimacy text check (intimacy in ('distant', 'medium', 'close')),
  influence_note text not null default '',
  intimacy_note text not null default '',
  family_summary text not null default '',
  career_summary text not null default '',
  notes text not null default '',
  cadence_days integer check (cadence_days is null or cadence_days > 0),
  snoozed_until date,
  first_met_on date,
  first_met_place text not null default '',
  first_met_story text not null default '',
  avatar_url text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint people_kind_tier_check check (
    (kind = 'contact' and tier is not null)
    or (kind = 'reference' and tier is null)
  )
);

create table if not exists public.connections (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  person_a_id text not null references public.people(id) on delete cascade,
  person_b_id text not null references public.people(id) on delete cascade,
  note text not null default '',
  created_at timestamptz not null default now(),
  constraint connection_distinct_people check (person_a_id < person_b_id),
  constraint connection_unique_pair unique (user_id, person_a_id, person_b_id)
);

create table if not exists public.interactions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id text not null references public.people(id) on delete cascade,
  occurred_on date not null,
  channel text not null check (channel in ('meeting', 'call', 'message', 'other')),
  summary text not null default ''
);

create table if not exists public.family_members (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id text not null references public.people(id) on delete cascade,
  name text not null,
  relation text not null default '',
  birthday date,
  note text not null default ''
);

create table if not exists public.career_entries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id text not null references public.people(id) on delete cascade,
  organization text not null default '',
  title text not null default '',
  started_on date,
  ended_on date,
  note text not null default ''
);

create table if not exists public.goals (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id text not null references public.people(id) on delete cascade,
  title text not null,
  details text,
  status text not null check (status in ('active', 'achieved', 'paused')),
  target_date date
);

create table if not exists public.important_dates (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id text not null references public.people(id) on delete cascade,
  label text not null,
  calendar_type text not null check (calendar_type in ('gregorian', 'lunar')),
  month smallint not null check (month between 1 and 12),
  day smallint not null check (day between 1 and 31),
  year smallint,
  is_leap_month boolean not null default false,
  repeat_annually boolean not null default true,
  note text not null default ''
);

create table if not exists public.detail_entries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id text not null references public.people(id) on delete cascade,
  category text not null,
  content text not null,
  observed_on date not null,
  follow_up_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id text not null references public.people(id) on delete cascade,
  detail_entry_id text references public.detail_entries(id) on delete set null,
  interaction_id text references public.interactions(id) on delete set null,
  file_name text not null,
  mime_type text not null,
  size bigint not null check (size between 0 and 10485760),
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.custom_fields (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  type text not null check (
    type in ('text', 'long_text', 'number', 'date', 'single_select', 'multi_select')
  ),
  options jsonb not null default '[]'::jsonb,
  display_order integer not null default 0,
  is_active boolean not null default true
);

create table if not exists public.custom_field_values (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id text not null references public.people(id) on delete cascade,
  field_id text not null references public.custom_fields(id) on delete cascade,
  value jsonb,
  constraint custom_value_unique unique (person_id, field_id)
);

create index if not exists people_user_tier_idx
  on public.people (user_id, tier)
  where deleted_at is null;
create index if not exists people_name_idx on public.people (user_id, full_name);
create index if not exists detail_entries_person_idx on public.detail_entries (user_id, person_id);
create index if not exists important_dates_person_idx on public.important_dates (user_id, person_id);

alter table public.people enable row level security;
alter table public.connections enable row level security;
alter table public.interactions enable row level security;
alter table public.family_members enable row level security;
alter table public.career_entries enable row level security;
alter table public.goals enable row level security;
alter table public.important_dates enable row level security;
alter table public.detail_entries enable row level security;
alter table public.attachments enable row level security;
alter table public.custom_fields enable row level security;
alter table public.custom_field_values enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'people',
    'connections',
    'interactions',
    'family_members',
    'career_entries',
    'goals',
    'important_dates',
    'detail_entries',
    'attachments',
    'custom_fields',
    'custom_field_values'
  ]
  loop
    execute format('drop policy if exists owner_all on public.%I', table_name);
    execute format(
      'create policy owner_all on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      table_name
    );
  end loop;
end
$$;

create or replace function public.load_connection_workspace()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'people', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'kind', p.kind,
        'fullName', p.full_name,
        'tier', p.tier,
        'role', p.role,
        'occupation', p.occupation,
        'region', p.region,
        'industry', p.industry,
        'influence', p.influence,
        'intimacy', p.intimacy,
        'influenceNote', p.influence_note,
        'intimacyNote', p.intimacy_note,
        'familySummary', p.family_summary,
        'careerSummary', p.career_summary,
        'notes', p.notes,
        'cadenceDays', p.cadence_days,
        'snoozedUntil', p.snoozed_until,
        'firstMetOn', p.first_met_on,
        'firstMetPlace', p.first_met_place,
        'firstMetStory', p.first_met_story,
        'avatarUrl', p.avatar_url,
        'deletedAt', p.deleted_at,
        'createdAt', p.created_at,
        'updatedAt', p.updated_at
      ) order by p.created_at)
      from public.people p where p.user_id = auth.uid()
    ), '[]'::jsonb),
    'connections', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'personAId', c.person_a_id,
        'personBId', c.person_b_id,
        'note', c.note
      ))
      from public.connections c where c.user_id = auth.uid()
    ), '[]'::jsonb),
    'interactions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'personId', i.person_id,
        'occurredOn', i.occurred_on,
        'channel', i.channel,
        'summary', i.summary
      ))
      from public.interactions i where i.user_id = auth.uid()
    ), '[]'::jsonb),
    'familyMembers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id,
        'personId', f.person_id,
        'name', f.name,
        'relation', f.relation,
        'birthday', f.birthday,
        'note', f.note
      ))
      from public.family_members f where f.user_id = auth.uid()
    ), '[]'::jsonb),
    'careerEntries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'personId', c.person_id,
        'organization', c.organization,
        'title', c.title,
        'startedOn', c.started_on,
        'endedOn', c.ended_on,
        'note', c.note
      ))
      from public.career_entries c where c.user_id = auth.uid()
    ), '[]'::jsonb),
    'goals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id,
        'personId', g.person_id,
        'title', g.title,
        'details', g.details,
        'status', g.status,
        'targetDate', g.target_date
      ))
      from public.goals g where g.user_id = auth.uid()
    ), '[]'::jsonb),
    'importantDates', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id,
        'personId', d.person_id,
        'label', d.label,
        'calendarType', d.calendar_type,
        'month', d.month,
        'day', d.day,
        'year', d.year,
        'isLeapMonth', d.is_leap_month,
        'repeatAnnually', d.repeat_annually,
        'note', d.note
      ))
      from public.important_dates d where d.user_id = auth.uid()
    ), '[]'::jsonb),
    'detailEntries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id,
        'personId', d.person_id,
        'category', d.category,
        'content', d.content,
        'observedOn', d.observed_on,
        'followUpOn', d.follow_up_on,
        'createdAt', d.created_at,
        'updatedAt', d.updated_at
      ))
      from public.detail_entries d where d.user_id = auth.uid()
    ), '[]'::jsonb),
    'attachments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'personId', a.person_id,
        'detailEntryId', a.detail_entry_id,
        'interactionId', a.interaction_id,
        'fileName', a.file_name,
        'mimeType', a.mime_type,
        'size', a.size,
        'storagePath', a.storage_path,
        'createdAt', a.created_at
      ))
      from public.attachments a where a.user_id = auth.uid()
    ), '[]'::jsonb),
    'customFields', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id,
        'label', f.label,
        'type', f.type,
        'options', f.options,
        'displayOrder', f.display_order,
        'isActive', f.is_active
      ) order by f.display_order)
      from public.custom_fields f where f.user_id = auth.uid()
    ), '[]'::jsonb),
    'customValues', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', v.id,
        'personId', v.person_id,
        'fieldId', v.field_id,
        'value', v.value
      ))
      from public.custom_field_values v where v.user_id = auth.uid()
    ), '[]'::jsonb)
  );
$$;

create or replace function public.save_connection_workspace(workspace jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  owner_id uuid := auth.uid();
begin
  if owner_id is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.custom_field_values where user_id = owner_id;
  delete from public.custom_fields where user_id = owner_id;
  delete from public.attachments where user_id = owner_id;
  delete from public.detail_entries where user_id = owner_id;
  delete from public.important_dates where user_id = owner_id;
  delete from public.goals where user_id = owner_id;
  delete from public.career_entries where user_id = owner_id;
  delete from public.family_members where user_id = owner_id;
  delete from public.interactions where user_id = owner_id;
  delete from public.connections where user_id = owner_id;
  delete from public.people where user_id = owner_id;

  insert into public.people (
    id, user_id, kind, full_name, tier, role, occupation, region, industry,
    influence, intimacy, influence_note, intimacy_note, family_summary,
    career_summary, notes, cadence_days, snoozed_until, first_met_on, first_met_place,
    first_met_story, avatar_url, deleted_at, created_at, updated_at
  )
  select
    p->>'id', owner_id, p->>'kind', p->>'fullName', nullif(p->>'tier', ''),
    coalesce(p->>'role', ''), coalesce(p->>'occupation', ''),
    coalesce(p->>'region', ''), coalesce(p->>'industry', ''),
    nullif(p->>'influence', ''), nullif(p->>'intimacy', ''),
    coalesce(p->>'influenceNote', ''), coalesce(p->>'intimacyNote', ''),
    coalesce(p->>'familySummary', ''), coalesce(p->>'careerSummary', ''),
    coalesce(p->>'notes', ''),
    nullif(p->>'cadenceDays', '')::integer, nullif(p->>'snoozedUntil', '')::date,
    nullif(p->>'firstMetOn', '')::date, coalesce(p->>'firstMetPlace', ''),
    coalesce(p->>'firstMetStory', ''), p->>'avatarUrl',
    nullif(p->>'deletedAt', '')::timestamptz,
    coalesce(nullif(p->>'createdAt', '')::timestamptz, now()),
    coalesce(nullif(p->>'updatedAt', '')::timestamptz, now())
  from jsonb_array_elements(coalesce(workspace->'people', '[]'::jsonb)) p;

  insert into public.connections (id, user_id, person_a_id, person_b_id, note)
  select c->>'id', owner_id, c->>'personAId', c->>'personBId', coalesce(c->>'note', '')
  from jsonb_array_elements(coalesce(workspace->'connections', '[]'::jsonb)) c;

  insert into public.interactions (id, user_id, person_id, occurred_on, channel, summary)
  select i->>'id', owner_id, i->>'personId', (i->>'occurredOn')::date,
    i->>'channel', coalesce(i->>'summary', '')
  from jsonb_array_elements(coalesce(workspace->'interactions', '[]'::jsonb)) i;

  insert into public.family_members (id, user_id, person_id, name, relation, birthday, note)
  select f->>'id', owner_id, f->>'personId', f->>'name',
    coalesce(f->>'relation', ''), nullif(f->>'birthday', '')::date,
    coalesce(f->>'note', '')
  from jsonb_array_elements(coalesce(workspace->'familyMembers', '[]'::jsonb)) f;

  insert into public.career_entries (
    id, user_id, person_id, organization, title, started_on, ended_on, note
  )
  select c->>'id', owner_id, c->>'personId', coalesce(c->>'organization', ''),
    coalesce(c->>'title', ''), nullif(c->>'startedOn', '')::date,
    nullif(c->>'endedOn', '')::date, coalesce(c->>'note', '')
  from jsonb_array_elements(coalesce(workspace->'careerEntries', '[]'::jsonb)) c;

  insert into public.goals (
    id, user_id, person_id, title, details, status, target_date
  )
  select g->>'id', owner_id, g->>'personId', g->>'title', g->>'details',
    g->>'status', nullif(g->>'targetDate', '')::date
  from jsonb_array_elements(coalesce(workspace->'goals', '[]'::jsonb)) g;

  insert into public.important_dates (
    id, user_id, person_id, label, calendar_type, month, day, year,
    is_leap_month, repeat_annually, note
  )
  select d->>'id', owner_id, d->>'personId', d->>'label', d->>'calendarType',
    (d->>'month')::smallint, (d->>'day')::smallint,
    nullif(d->>'year', '')::smallint, coalesce((d->>'isLeapMonth')::boolean, false),
    coalesce((d->>'repeatAnnually')::boolean, true), coalesce(d->>'note', '')
  from jsonb_array_elements(coalesce(workspace->'importantDates', '[]'::jsonb)) d;

  insert into public.detail_entries (
    id, user_id, person_id, category, content, observed_on, follow_up_on,
    created_at, updated_at
  )
  select d->>'id', owner_id, d->>'personId', d->>'category', d->>'content',
    (d->>'observedOn')::date, nullif(d->>'followUpOn', '')::date,
    coalesce(nullif(d->>'createdAt', '')::timestamptz, now()),
    coalesce(nullif(d->>'updatedAt', '')::timestamptz, now())
  from jsonb_array_elements(coalesce(workspace->'detailEntries', '[]'::jsonb)) d;

  insert into public.attachments (
    id, user_id, person_id, detail_entry_id, interaction_id, file_name, mime_type, size,
    storage_path, created_at
  )
  select a->>'id', owner_id, a->>'personId', nullif(a->>'detailEntryId', ''),
    nullif(a->>'interactionId', ''),
    a->>'fileName', a->>'mimeType', (a->>'size')::bigint, a->>'storagePath',
    coalesce(nullif(a->>'createdAt', '')::timestamptz, now())
  from jsonb_array_elements(coalesce(workspace->'attachments', '[]'::jsonb)) a;

  insert into public.custom_fields (
    id, user_id, label, type, options, display_order, is_active
  )
  select f->>'id', owner_id, f->>'label', f->>'type',
    coalesce(f->'options', '[]'::jsonb), coalesce((f->>'displayOrder')::integer, 0),
    coalesce((f->>'isActive')::boolean, true)
  from jsonb_array_elements(coalesce(workspace->'customFields', '[]'::jsonb)) f;

  insert into public.custom_field_values (id, user_id, person_id, field_id, value)
  select v->>'id', owner_id, v->>'personId', v->>'fieldId', v->'value'
  from jsonb_array_elements(coalesce(workspace->'customValues', '[]'::jsonb)) v;
end;
$$;

create or replace function public.search_contacts(search_query text)
returns table (id text, full_name text, tier text)
language sql
stable
security invoker
set search_path = public
as $$
  select p.id, p.full_name, p.tier
  from public.people p
  where p.user_id = auth.uid()
    and p.kind = 'contact'
    and p.deleted_at is null
    and (
      p.full_name ilike '%' || search_query || '%'
      or p.role ilike '%' || search_query || '%'
      or p.occupation ilike '%' || search_query || '%'
      or p.region ilike '%' || search_query || '%'
      or p.industry ilike '%' || search_query || '%'
      or exists (
        select 1 from public.detail_entries d
        where d.person_id = p.id
          and d.user_id = auth.uid()
          and (d.content ilike '%' || search_query || '%'
            or d.category ilike '%' || search_query || '%')
      )
      or exists (
        select 1 from public.goals g
        where g.person_id = p.id
          and g.user_id = auth.uid()
          and (g.title ilike '%' || search_query || '%'
            or coalesce(g.details, '') ilike '%' || search_query || '%')
      )
    )
  order by p.full_name;
$$;

create or replace function public.purge_expired_connection_people()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.people
  where user_id = auth.uid()
    and deleted_at is not null
    and deleted_at < now() - interval '30 days';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

grant execute on function public.load_connection_workspace() to authenticated;
grant execute on function public.save_connection_workspace(jsonb) to authenticated;
grant execute on function public.search_contacts(text) to authenticated;
grant execute on function public.purge_expired_connection_people() to authenticated;

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'connection-attachments',
  'connection-attachments',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists connection_attachments_owner_read on storage.objects;
drop policy if exists connection_attachments_owner_insert on storage.objects;
drop policy if exists connection_attachments_owner_update on storage.objects;
drop policy if exists connection_attachments_owner_delete on storage.objects;

create policy connection_attachments_owner_read
on storage.objects for select to authenticated
using (
  bucket_id = 'connection-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy connection_attachments_owner_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'connection-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy connection_attachments_owner_update
on storage.objects for update to authenticated
using (
  bucket_id = 'connection-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy connection_attachments_owner_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'connection-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);
