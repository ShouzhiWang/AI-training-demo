alter table public.agent_messages
add column suggestions text[] not null default '{}';

grant usage on schema private to authenticated, service_role;

create table public.project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  version integer not null
    constraint project_versions_version_positive check (version > 0),
  title text not null
    constraint project_versions_title_length check (char_length(title) between 1 and 140),
  source text not null
    constraint project_versions_source_valid check (source in ('initial', 'manual', 'agent', 'restore')),
  created_at timestamptz not null default now(),
  constraint project_versions_project_version_key unique (project_id, version)
);

create index project_versions_project_created_at_idx
on public.project_versions (project_id, created_at desc);

create table public.project_version_files (
  id uuid primary key default gen_random_uuid(),
  project_version_id uuid not null references public.project_versions (id) on delete cascade,
  path text not null
    constraint project_version_files_path_format
    check (
      char_length(path) between 1 and 160
      and path ~ '^[A-Za-z0-9][A-Za-z0-9._/-]*$'
      and path not like '%..%'
    ),
  content text not null
    constraint project_version_files_content_size
    check (octet_length(content) <= 1048576),
  file_version integer not null
    constraint project_version_files_version_positive check (file_version > 0),
  constraint project_version_files_version_path_key unique (project_version_id, path)
);

create index project_version_files_version_id_idx
on public.project_version_files (project_version_id);

alter table public.project_versions enable row level security;
alter table public.project_version_files enable row level security;

revoke all on table public.project_versions, public.project_version_files
from anon, authenticated;
grant select on table public.project_versions, public.project_version_files
to authenticated;

create policy "Students can read versions from their own projects"
on public.project_versions
for select
to authenticated
using (
  project_id in (
    select id
    from public.projects
    where owner_id = (select auth.uid())
  )
);

create policy "Students can read files from their own project versions"
on public.project_version_files
for select
to authenticated
using (
  project_version_id in (
    select project_versions.id
    from public.project_versions
    join public.projects on projects.id = project_versions.project_id
    where projects.owner_id = (select auth.uid())
  )
);

with inserted_versions as (
  insert into public.project_versions (project_id, version, title, source, created_at)
  select projects.id, 1, 'Initial project files', 'initial', projects.created_at
  from public.projects
  where exists (
    select 1 from public.project_files where project_files.project_id = projects.id
  )
  on conflict (project_id, version) do nothing
  returning id, project_id
)
insert into public.project_version_files (
  project_version_id,
  path,
  content,
  file_version
)
select
  inserted_versions.id,
  project_files.path,
  project_files.content,
  project_files.version
from inserted_versions
join public.project_files on project_files.project_id = inserted_versions.project_id;

create or replace function private.request_actor(p_actor_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  authenticated_actor uuid;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') = 'service_role' then
    if p_actor_id is null then
      raise exception 'Actor is required';
    end if;
    return p_actor_id;
  end if;

  authenticated_actor := (select auth.uid());
  if authenticated_actor is not null then
    if authenticated_actor <> p_actor_id then
      raise exception 'Actor does not match authenticated user';
    end if;
    return authenticated_actor;
  end if;

  raise exception 'Authentication required';
end;
$function$;

revoke all on function private.request_actor(uuid)
from public, anon, authenticated;
grant execute on function private.request_actor(uuid)
to authenticated, service_role;

create or replace function private.apply_project_changes(
  p_project_id uuid,
  p_actor_id uuid,
  p_changes jsonb,
  p_title text,
  p_source text
)
returns setof public.project_files
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := private.request_actor(p_actor_id);
  change_item jsonb;
  changed_content text;
  next_version integer;
  saved_version_id uuid;
  updated_count integer;
begin
  if jsonb_typeof(p_changes) <> 'array'
    or jsonb_array_length(p_changes) not between 1 and 20 then
    raise exception 'Changes must contain between 1 and 20 files';
  end if;

  if (
    select count(*) <> count(distinct item ->> 'path')
    from jsonb_array_elements(p_changes) as item
  ) then
    raise exception 'Each file path may only be changed once';
  end if;

  if char_length(trim(p_title)) not between 1 and 140 then
    raise exception 'Version title must be between 1 and 140 characters';
  end if;

  if p_source not in ('manual', 'agent') then
    raise exception 'Invalid version source';
  end if;

  perform 1
  from public.projects
  where id = p_project_id and owner_id = actor_id
  for update;
  if not found then
    raise exception 'Project not found';
  end if;

  select coalesce(max(version), 0) + 1
  into next_version
  from public.project_versions
  where project_id = p_project_id;

  insert into public.project_versions (project_id, version, title, source)
  values (p_project_id, next_version, trim(p_title), p_source)
  returning id into saved_version_id;

  for change_item in
    select value from jsonb_array_elements(p_changes)
  loop
    if jsonb_typeof(change_item -> 'path') <> 'string'
      or jsonb_typeof(change_item -> 'content') <> 'string' then
      raise exception 'Every change requires a path and content';
    end if;

    changed_content := change_item ->> 'content';
    if octet_length(changed_content) > 1048576 then
      raise exception 'File content exceeds the 1 MB limit';
    end if;

    update public.project_files
    set
      content = changed_content,
      version = version + 1
    where
      project_id = p_project_id
      and path = change_item ->> 'path';

    get diagnostics updated_count = row_count;
    if updated_count <> 1 then
      raise exception 'Unknown project file: %', change_item ->> 'path';
    end if;
  end loop;

  insert into public.project_version_files (
    project_version_id,
    path,
    content,
    file_version
  )
  select saved_version_id, path, content, version
  from public.project_files
  where project_id = p_project_id;

  update public.projects
  set status = 'active', progress = greatest(progress, 45)
  where id = p_project_id and owner_id = actor_id;

  return query
  select *
  from public.project_files
  where project_id = p_project_id
  order by path;
end;
$function$;

revoke all on function private.apply_project_changes(uuid, uuid, jsonb, text, text)
from public, anon, authenticated;
grant execute on function private.apply_project_changes(uuid, uuid, jsonb, text, text)
to authenticated, service_role;

create or replace function public.save_project_changes(
  p_project_id uuid,
  p_actor_id uuid,
  p_changes jsonb,
  p_title text,
  p_source text
)
returns setof public.project_files
language sql
security invoker
set search_path = ''
as $function$
  select *
  from private.apply_project_changes(
    p_project_id,
    p_actor_id,
    p_changes,
    p_title,
    p_source
  );
$function$;

revoke all on function public.save_project_changes(uuid, uuid, jsonb, text, text)
from public, anon;
grant execute on function public.save_project_changes(uuid, uuid, jsonb, text, text)
to authenticated, service_role;

create or replace function private.restore_project_snapshot(
  p_version_id uuid,
  p_actor_id uuid
)
returns setof public.project_files
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := private.request_actor(p_actor_id);
  target_project_id uuid;
  target_version integer;
  next_version integer;
  restored_version_id uuid;
begin
  select project_versions.project_id, project_versions.version
  into target_project_id, target_version
  from public.project_versions
  join public.projects on projects.id = project_versions.project_id
  where project_versions.id = p_version_id
    and projects.owner_id = actor_id;

  if target_project_id is null then
    raise exception 'Version not found';
  end if;

  perform 1
  from public.projects
  where id = target_project_id and owner_id = actor_id
  for update;

  update public.project_files
  set
    content = snapshot.content,
    version = project_files.version + 1
  from public.project_version_files as snapshot
  where snapshot.project_version_id = p_version_id
    and project_files.project_id = target_project_id
    and project_files.path = snapshot.path;

  select coalesce(max(version), 0) + 1
  into next_version
  from public.project_versions
  where project_id = target_project_id;

  insert into public.project_versions (project_id, version, title, source)
  values (
    target_project_id,
    next_version,
    format('Restore version %s', target_version),
    'restore'
  )
  returning id into restored_version_id;

  insert into public.project_version_files (
    project_version_id,
    path,
    content,
    file_version
  )
  select restored_version_id, path, content, version
  from public.project_files
  where project_id = target_project_id;

  update public.projects
  set status = 'active'
  where id = target_project_id and owner_id = actor_id;

  return query
  select *
  from public.project_files
  where project_id = target_project_id
  order by path;
end;
$function$;

revoke all on function private.restore_project_snapshot(uuid, uuid)
from public, anon, authenticated;
grant execute on function private.restore_project_snapshot(uuid, uuid)
to authenticated, service_role;

create or replace function public.restore_project_version(
  p_version_id uuid,
  p_actor_id uuid
)
returns setof public.project_files
language sql
security invoker
set search_path = ''
as $function$
  select *
  from private.restore_project_snapshot(p_version_id, p_actor_id);
$function$;

revoke all on function public.restore_project_version(uuid, uuid)
from public, anon;
grant execute on function public.restore_project_version(uuid, uuid)
to authenticated, service_role;

create or replace function private.capture_project_file_inserts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  inserted_project_id uuid;
  inserted_project_owner uuid;
  next_version integer;
  captured_version_id uuid;
begin
  for inserted_project_id in
    select distinct project_id from inserted_files
  loop
    select owner_id
    into inserted_project_owner
    from public.projects
    where id = inserted_project_id
    for update;

    select coalesce(max(version), 0) + 1
    into next_version
    from public.project_versions
    where project_id = inserted_project_id;

    insert into public.project_versions (project_id, version, title, source)
    values (
      inserted_project_id,
      next_version,
      case when next_version = 1 then 'Initial project files' else 'Files added' end,
      case when next_version = 1 then 'initial' else 'manual' end
    )
    returning id into captured_version_id;

    insert into public.project_version_files (
      project_version_id,
      path,
      content,
      file_version
    )
    select captured_version_id, path, content, version
    from public.project_files
    where project_id = inserted_project_id;
  end loop;
  return null;
end;
$function$;

revoke all on function private.capture_project_file_inserts()
from public, anon, authenticated;

create trigger capture_project_file_insert_history
after insert on public.project_files
referencing new table as inserted_files
for each statement execute function private.capture_project_file_inserts();

revoke update on table public.project_files from authenticated;
