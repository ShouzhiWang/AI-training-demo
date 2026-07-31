create type public.project_template as enum (
  'educational_game',
  'market_research_report'
);

create type public.project_status as enum (
  'draft',
  'active',
  'completed'
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.user_profiles (id) on delete cascade,
  name text not null
    constraint projects_name_length check (char_length(name) between 1 and 100),
  description text not null default ''
    constraint projects_description_length check (char_length(description) <= 500),
  template public.project_template not null,
  status public.project_status not null default 'draft',
  progress smallint not null default 0
    constraint projects_progress_range check (progress between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_owner_updated_at_idx
on public.projects (owner_id, updated_at desc);

alter table public.projects enable row level security;

revoke all on table public.projects from anon, authenticated;
grant select, insert, update on table public.projects to authenticated;

create policy "Students can read their own projects"
on public.projects
for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "Students can create their own projects"
on public.projects
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy "Students can update their own projects"
on public.projects
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create or replace function private.set_project_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_project_updated_at()
from public, anon, authenticated;

create trigger set_projects_updated_at
before update on public.projects
for each row execute function private.set_project_updated_at();
