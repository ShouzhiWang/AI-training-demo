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

export type ProjectVersionFile = {
  id: string;
  project_version_id: string;
  path: string;
  content: string;
  file_version: number;
};

export type ProjectVersion = {
  id: string;
  project_id: string;
  version: number;
  title: string;
  source: "initial" | "manual" | "agent" | "restore";
  created_at: string;
  project_version_files: ProjectVersionFile[];
};

export const demoProject: StudentProject = {
  id: "demo-hello-world",
  owner_id: "demo-student",
  name: "Hello World Lab",
  description:
    "A friendly first project that introduces interactive web development.",
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
    <title>Hello World Lab</title>
  </head>
  <body>
    <main class="game-shell">
      <p class="eyebrow">YOUR FIRST WEB PROJECT</p>
      <h1 id="greeting">Hello, world!</h1>
      <p>Press the button to greet the world in another language.</p>
      <button id="say-hello">Say hello</button>
      <p id="counter" aria-live="polite">You have shared 0 greetings.</p>
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

button {
  margin: 22px 0 14px;
  min-height: 58px;
  padding: 0 28px;
  border: 1px solid #c8d8ca;
  border-radius: 14px;
  color: #285039;
  background: #f4f9f4;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

button:hover { background: #e6f2e8; border-color: #679477; }
#counter { color: #657269; }`,
  },
  {
    id: "demo-script",
    project_id: demoProject.id,
    path: "script.js",
    version: 3,
    created_at: demoTimestamp,
    updated_at: demoTimestamp,
    content: `const greetings = ["Hello, world!", "Hola, mundo!", "Bonjour, le monde!", "你好，世界！"];
const greeting = document.querySelector("#greeting");
const counter = document.querySelector("#counter");
let count = 0;

document.querySelector("#say-hello").addEventListener("click", () => {
  count += 1;
  greeting.textContent = greetings[count % greetings.length];
  counter.textContent = \`You have shared \${count} \${count === 1 ? "greeting" : "greetings"}.\`;
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
