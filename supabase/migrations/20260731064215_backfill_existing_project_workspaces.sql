insert into public.project_files (project_id, path, content)
select
  projects.id,
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
      <p>Which answer best matches your learning goal?</p>
      <div class="answer-grid">
        <button data-correct="true">The thoughtful answer</button>
        <button data-correct="false">A different idea</button>
      </div>
      <p id="feedback" aria-live="polite">Choose an answer to begin.</p>
    </main>
  </body>
</html>$html$
from public.projects
where projects.template = 'educational_game'
on conflict (project_id, path) do nothing;

insert into public.project_files (project_id, path, content)
select
  projects.id,
  'style.css',
  $css$:root {
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  color: #20352a;
  background: #eef4ed;
}
* { box-sizing: border-box; }
body { min-height: 100vh; margin: 0; display: grid; place-items: center; padding: 32px; }
.game-shell { width: min(620px, 100%); padding: 42px; border-radius: 24px; background: white; box-shadow: 0 24px 70px rgba(32, 65, 45, .12); text-align: center; }
.eyebrow { color: #4f8064; font-size: 12px; font-weight: 800; letter-spacing: .14em; }
h1 { font-family: Georgia, serif; font-size: 44px; font-weight: 500; }
.answer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 28px 0 20px; }
button { min-height: 58px; border: 1px solid #cad8cc; border-radius: 14px; background: #f7faf7; font: inherit; font-weight: 700; cursor: pointer; }
button:hover { border-color: #6e9a7e; background: #edf5ef; }
#feedback { color: #6b766e; }$css$
from public.projects
where projects.template = 'educational_game'
on conflict (project_id, path) do nothing;

insert into public.project_files (project_id, path, content)
select
  projects.id,
  'script.js',
  $js$const feedback = document.querySelector("#feedback");
document.querySelectorAll("[data-correct]").forEach((button) => {
  button.addEventListener("click", () => {
    feedback.textContent = button.dataset.correct === "true"
      ? "Great reasoning! Explain why that answer fits."
      : "Good try. Look for the answer that connects most clearly.";
  });
});$js$
from public.projects
where projects.template = 'educational_game'
on conflict (project_id, path) do nothing;
