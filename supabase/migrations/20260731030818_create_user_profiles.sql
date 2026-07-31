create type public.user_role as enum ('student', 'teacher', 'admin');

create table public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null,
  role public.user_role not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

revoke all on table public.user_profiles from anon, authenticated;
grant select on table public.user_profiles to authenticated;

create policy "Users can read their own profile"
on public.user_profiles
for select
to authenticated
using ((select auth.uid()) = id);

create schema if not exists private;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_profiles (id, email, name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(new.email, 'Student'), '@', 1)
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

insert into public.user_profiles (id, email, name)
select
  id,
  coalesce(email, ''),
  coalesce(
    nullif(raw_user_meta_data ->> 'full_name', ''),
    nullif(raw_user_meta_data ->> 'name', ''),
    split_part(coalesce(email, 'Student'), '@', 1)
  )
from auth.users
on conflict (id) do nothing;
