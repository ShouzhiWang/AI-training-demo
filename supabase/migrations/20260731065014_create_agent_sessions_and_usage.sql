create type public.agent_name as enum (
  'supervisor',
  'planner',
  'coder',
  'reviewer'
);

create type public.agent_session_status as enum (
  'active',
  'completed',
  'failed'
);

create type public.agent_message_role as enum (
  'student',
  'assistant',
  'system'
);

create table public.agent_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  current_agent public.agent_name not null default 'supervisor',
  status public.agent_session_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index agent_sessions_project_id_idx on public.agent_sessions (project_id);
create index agent_sessions_user_updated_at_idx
on public.agent_sessions (user_id, updated_at desc);

create table public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.agent_sessions (id) on delete cascade,
  role public.agent_message_role not null,
  agent public.agent_name,
  content text not null
    constraint agent_messages_content_length
    check (char_length(content) between 1 and 20000),
  created_at timestamptz not null default now()
);

create index agent_messages_session_created_at_idx
on public.agent_messages (session_id, created_at);

create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  session_id uuid references public.agent_sessions (id) on delete set null,
  agent public.agent_name not null,
  model text not null,
  input_tokens integer not null default 0
    constraint ai_usage_input_tokens_nonnegative check (input_tokens >= 0),
  output_tokens integer not null default 0
    constraint ai_usage_output_tokens_nonnegative check (output_tokens >= 0),
  cost numeric(12, 6) not null default 0
    constraint ai_usage_cost_nonnegative check (cost >= 0),
  created_at timestamptz not null default now()
);

create index ai_usage_user_created_at_idx
on public.ai_usage (user_id, created_at desc);
create index ai_usage_project_id_idx on public.ai_usage (project_id);
create index ai_usage_session_id_idx on public.ai_usage (session_id);

alter table public.agent_sessions enable row level security;
alter table public.agent_messages enable row level security;
alter table public.ai_usage enable row level security;

revoke all on table public.agent_sessions, public.agent_messages, public.ai_usage
from anon, authenticated;
grant select on table public.agent_sessions, public.agent_messages, public.ai_usage
to authenticated;

create policy "Students can read their own agent sessions"
on public.agent_sessions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Students can read messages from their own sessions"
on public.agent_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.agent_sessions
    where agent_sessions.id = agent_messages.session_id
      and agent_sessions.user_id = (select auth.uid())
  )
);

create policy "Students can read their own AI usage"
on public.ai_usage
for select
to authenticated
using ((select auth.uid()) = user_id);

create trigger set_agent_sessions_updated_at
before update on public.agent_sessions
for each row execute function private.set_project_updated_at();
