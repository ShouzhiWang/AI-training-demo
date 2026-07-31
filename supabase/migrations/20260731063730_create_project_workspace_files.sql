create table public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  path text not null
    constraint project_files_path_format
    check (
      char_length(path) between 1 and 160
      and path ~ '^[A-Za-z0-9][A-Za-z0-9._/-]*$'
      and path not like '%..%'
    ),
  content text not null default ''
    constraint project_files_content_size
    check (octet_length(content) <= 1048576),
  version integer not null default 1
    constraint project_files_version_positive check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_files_project_path_key unique (project_id, path)
);

create index project_files_project_id_idx
on public.project_files (project_id);

alter table public.project_files enable row level security;

revoke all on table public.project_files from anon, authenticated;
grant select, insert, update on table public.project_files to authenticated;

create policy "Students can read files from their own projects"
on public.project_files
for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = project_files.project_id
      and projects.owner_id = (select auth.uid())
  )
);

create policy "Students can create files in their own projects"
on public.project_files
for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects
    where projects.id = project_files.project_id
      and projects.owner_id = (select auth.uid())
  )
);

create policy "Students can update files in their own projects"
on public.project_files
for update
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = project_files.project_id
      and projects.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.projects
    where projects.id = project_files.project_id
      and projects.owner_id = (select auth.uid())
  )
);

create trigger set_project_files_updated_at
before update on public.project_files
for each row execute function private.set_project_updated_at();

create or replace function public.create_educational_game_project(
  p_name text,
  p_description text
)
returns public.projects
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  created_project public.projects;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if char_length(trim(p_name)) not between 1 and 100 then
    raise exception 'Project name must be between 1 and 100 characters';
  end if;

  if char_length(trim(p_description)) not between 1 and 500 then
    raise exception 'Learning idea must be between 1 and 500 characters';
  end if;

  insert into public.projects (
    owner_id,
    name,
    description,
    template,
    status,
    progress
  )
  values (
    (select auth.uid()),
    trim(p_name),
    trim(p_description),
    'educational_game',
    'draft',
    20
  )
  returning * into created_project;

  insert into public.project_files (project_id, path, content)
  values
    (
      created_project.id,
      'index.html',
      $html$<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Learning Quest</title>
  </head>
  <body>
    <main class="game-shell">
      <p class="eyebrow">LEARNING QUEST</p>
      <h1>Match the concept to the clue</h1>
      <p id="prompt">Which answer best matches the learning goal?</p>
      <div class="answer-grid">
        <button data-correct="true">The thoughtful answer</button>
        <button data-correct="false">A different idea</button>
      </div>
      <p id="feedback" aria-live="polite">Choose an answer to test your idea.</p>
    </main>
  </body>
</html>$html$
    ),
    (
      created_project.id,
      'style.css',
      $css$:root {
  color-scheme: light;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  background: #eef4ed;
  color: #20352a;
}

* { box-sizing: border-box; }

body {
  min-height: 100vh;
  margin: 0;
  display: grid;
  place-items: center;
  padding: 32px;
  background:
    radial-gradient(circle at top right, #d7eadb, transparent 36%),
    #eef4ed;
}

.game-shell {
  width: min(620px, 100%);
  padding: 42px;
  border: 1px solid #d8e2d8;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 24px 70px rgba(32, 65, 45, 0.12);
  text-align: center;
}

.eyebrow {
  margin: 0;
  color: #4f8064;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.14em;
}

h1 {
  margin: 14px 0 12px;
  font-family: Georgia, serif;
  font-size: clamp(32px, 7vw, 50px);
  font-weight: 500;
  line-height: 1.05;
}

#prompt, #feedback { color: #6b766e; line-height: 1.6; }

.answer-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 28px 0 20px;
}

button {
  min-height: 58px;
  border: 1px solid #cad8cc;
  border-radius: 14px;
  color: #294735;
  background: #f7faf7;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

button:hover { border-color: #6e9a7e; background: #edf5ef; }

@media (max-width: 520px) {
  body { padding: 16px; }
  .game-shell { padding: 28px 20px; }
  .answer-grid { grid-template-columns: 1fr; }
}$css$
    ),
    (
      created_project.id,
      'script.js',
      $js$const feedback = document.querySelector("#feedback");

document.querySelectorAll("[data-correct]").forEach((button) => {
  button.addEventListener("click", () => {
    const isCorrect = button.dataset.correct === "true";
    feedback.textContent = isCorrect
      ? "Great reasoning! Explain why that answer fits."
      : "Good try. Look for the answer that connects most clearly.";
  });
});$js$
    );

  return created_project;
end;
$function$;

revoke all on function public.create_educational_game_project(text, text)
from public, anon;
grant execute on function public.create_educational_game_project(text, text)
to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'project-assets',
  'project-assets',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Students can read assets from their own projects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'project-assets'
  and exists (
    select 1
    from public.projects
    where projects.id::text = (storage.foldername(name))[1]
      and projects.owner_id = (select auth.uid())
  )
);

create policy "Students can upload assets to their own projects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'project-assets'
  and exists (
    select 1
    from public.projects
    where projects.id::text = (storage.foldername(name))[1]
      and projects.owner_id = (select auth.uid())
  )
);

create policy "Students can replace assets in their own projects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'project-assets'
  and exists (
    select 1
    from public.projects
    where projects.id::text = (storage.foldername(name))[1]
      and projects.owner_id = (select auth.uid())
  )
)
with check (
  bucket_id = 'project-assets'
  and exists (
    select 1
    from public.projects
    where projects.id::text = (storage.foldername(name))[1]
      and projects.owner_id = (select auth.uid())
  )
);
