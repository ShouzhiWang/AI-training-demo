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
    <title>Hello World Lab</title>
  </head>
  <body>
    <main class="hello-card">
      <p class="eyebrow">YOUR FIRST WEB PROJECT</p>
      <h1 id="greeting">Hello, world!</h1>
      <p>Press the button to greet the world in another language.</p>
      <button id="say-hello">Say hello</button>
      <p id="counter" aria-live="polite">You have shared 0 greetings.</p>
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
  color: #20352a;
  background: #eef4ed;
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

.hello-card {
  width: min(620px, 100%);
  padding: 48px 42px;
  border: 1px solid #d8e2d8;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.94);
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
  font-size: clamp(38px, 8vw, 58px);
  font-weight: 500;
  line-height: 1.05;
}

.hello-card > p:not(.eyebrow) {
  color: #6b766e;
  line-height: 1.6;
}

button {
  min-height: 52px;
  margin: 18px 0 8px;
  border: 1px solid #5d8d70;
  border-radius: 14px;
  padding: 0 26px;
  color: #ffffff;
  background: #397052;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

button:hover { background: #2e6045; transform: translateY(-1px); }

#counter { font-size: 14px; }

@media (max-width: 520px) {
  body { padding: 16px; }
  .hello-card { padding: 34px 22px; }
}$css$
    ),
    (
      created_project.id,
      'script.js',
      $js$const greetings = [
  "Hello, world!",
  "Hola, mundo!",
  "Bonjour, le monde!",
  "你好，世界！"
];
const greeting = document.querySelector("#greeting");
const counter = document.querySelector("#counter");
let count = 0;

document.querySelector("#say-hello").addEventListener("click", () => {
  count += 1;
  greeting.textContent = greetings[count % greetings.length];
  counter.textContent =
    `You have shared ${count} ${count === 1 ? "greeting" : "greetings"}.`;
});$js$
    );

  return created_project;
end;
$function$;

revoke all on function public.create_educational_game_project(text, text)
from public, anon;
grant execute on function public.create_educational_game_project(text, text)
to authenticated;
