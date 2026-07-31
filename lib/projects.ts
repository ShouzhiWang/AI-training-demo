export type ProjectTemplate =
  | "educational_game"
  | "market_research_report";

export type ProjectStatus = "draft" | "active" | "completed";

export type StudentProject = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  template: ProjectTemplate;
  status: ProjectStatus;
  progress: number;
  created_at: string;
  updated_at: string;
};

export type ProjectFile = {
  id: string;
  project_id: string;
  path: string;
  content: string;
  version: number;
  created_at: string;
  updated_at: string;
};

export const demoProject: StudentProject = {
  id: "demo-habitat-heroes",
  owner_id: "demo-student",
  name: "Habitat Heroes",
  description:
    "A matching game that helps young learners discover where animals live.",
  template: "educational_game",
  status: "active",
  progress: 68,
  created_at: "2026-07-28T02:42:00.000Z",
  updated_at: "2026-07-31T05:42:00.000Z",
};

const demoTimestamp = "2026-07-31T05:42:00.000Z";

export const demoProjectFiles: ProjectFile[] = [
  {
    id: "demo-index",
    project_id: demoProject.id,
    path: "index.html",
    version: 3,
    created_at: demoTimestamp,
    updated_at: demoTimestamp,
    content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Habitat Heroes</title>
  </head>
  <body>
    <main class="game-shell">
      <p class="eyebrow">HABITAT HEROES</p>
      <h1>Where does the fox live?</h1>
      <p>Choose the habitat that matches this animal.</p>
      <div class="answer-grid">
        <button data-correct="true">Forest</button>
        <button data-correct="false">Ocean</button>
        <button data-correct="false">Savanna</button>
      </div>
      <p id="feedback" aria-live="polite">Pick a habitat to begin.</p>
    </main>
  </body>
</html>`,
  },
  {
    id: "demo-style",
    project_id: demoProject.id,
    path: "style.css",
    version: 3,
    created_at: demoTimestamp,
    updated_at: demoTimestamp,
    content: `:root {
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  color: #24372c;
  background: #edf5eb;
}

* { box-sizing: border-box; }

body {
  min-height: 100vh;
  margin: 0;
  display: grid;
  place-items: center;
  padding: 28px;
  background: radial-gradient(circle at top right, #d7eadb, transparent 38%), #edf5eb;
}

.game-shell {
  width: min(680px, 100%);
  padding: 42px;
  border: 1px solid #d7e1d5;
  border-radius: 24px;
  background: white;
  box-shadow: 0 20px 60px rgba(34, 68, 45, 0.12);
  text-align: center;
}

.eyebrow {
  color: #4b8160;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .14em;
}

h1 {
  margin: 14px 0 10px;
  font-family: Georgia, serif;
  font-size: 44px;
  font-weight: 500;
}

.answer-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin: 28px 0 18px;
}

button {
  min-height: 58px;
  border: 1px solid #c8d8ca;
  border-radius: 14px;
  color: #285039;
  background: #f4f9f4;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

button:hover { background: #e6f2e8; border-color: #679477; }
#feedback { color: #657269; }`,
  },
  {
    id: "demo-script",
    project_id: demoProject.id,
    path: "script.js",
    version: 3,
    created_at: demoTimestamp,
    updated_at: demoTimestamp,
    content: `const feedback = document.querySelector("#feedback");

document.querySelectorAll("[data-correct]").forEach((button) => {
  button.addEventListener("click", () => {
    const isCorrect = button.dataset.correct === "true";
    feedback.textContent = isCorrect
      ? "Great thinking! Foxes live in forests."
      : "Not quite. Look for a habitat with trees.";
  });
});`,
  },
];

export function buildPreviewDocument(files: ProjectFile[]) {
  const html =
    files.find((file) => file.path === "index.html")?.content ??
    "<!doctype html><html><body><p>Add an index.html file to preview your project.</p></body></html>";
  const css = files.find((file) => file.path === "style.css")?.content ?? "";
  const javascript =
    files.find((file) => file.path === "script.js")?.content ?? "";

  const withStyles = html.includes("</head>")
    ? html.replace("</head>", `<style>${css}</style></head>`)
    : `<style>${css}</style>${html}`;
  const safeJavascript = javascript.replace(/<\/script/gi, "<\\/script");

  return withStyles.includes("</body>")
    ? withStyles.replace(
        "</body>",
        `<script>${safeJavascript}</script></body>`,
      )
    : `${withStyles}<script>${safeJavascript}</script>`;
}
