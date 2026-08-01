import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function fetchApp(path = "/", init) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
      ...init,
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("renders the Muse workspace in credential-free demo mode", async () => {
  const response = await fetchApp("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Muse — Learn by making/i);
  assert.match(html, /Hello World Lab/);
  assert.match(html, /Student dashboard/i);
  assert.match(html, /Educational Game/);
  assert.match(html, /Alex Lee/);
});

test("renders actionable Supabase setup guidance on the login page", async () => {
  const response = await fetchApp("/login");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Supabase setup required/);
  assert.match(html, /Supabase credentials are not configured yet/);
  assert.match(html, /\.env\.local/);
});

test("auth callback rejects external next destinations", async () => {
  const response = await fetchApp(
    "/auth/callback?next=https%3A%2F%2Fevil.example",
  );
  assert.equal(response.status, 307);
  assert.equal(
    new URL(response.headers.get("location")).pathname,
    "/auth/auth-code-error",
  );
  assert.match(
    response.headers.get("cache-control") ?? "",
    /private.*no-store/,
  );
});

test("email auth covers password, sign-up, OTP, and recovery flows", async () => {
  const [form, resetForm, confirmRoute] = await Promise.all([
    readFile(
      new URL("../app/login/email-auth-form.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/reset-password/password-reset-form.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/auth/confirm/route.ts", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(form, /signInWithPassword/);
  assert.match(form, /\.auth\.signUp/);
  assert.match(form, /signInWithOtp/);
  assert.match(form, /verifyOtp/);
  assert.match(form, /resetPasswordForEmail/);
  assert.match(
    form,
    /\{mode === "sign-in" && \(\s*<p className="auth-switch">[\s\S]*?Create an account/,
    "registration must remain visible when optional email OTP is disabled",
  );
  assert.match(resetForm, /updateUser\(\{\s*password\s*\}\)/);
  assert.match(confirmRoute, /token_hash/);
  assert.match(confirmRoute, /type === "recovery"/);
  assert.doesNotMatch(form, /signInWithOAuth|google/i);
});

test("profile migration keeps roles server-controlled and enables RLS", async () => {
  const migrations = new URL("../supabase/migrations/", import.meta.url);
  const migration = await readFile(
    new URL("20260731030818_create_user_profiles.sql", migrations),
    "utf8",
  );

  assert.match(migration, /create type public\.user_role/i);
  assert.match(migration, /default 'student'/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /using \(\(select auth\.uid\(\)\) = id\)/i);
  assert.doesNotMatch(
    migration,
    /raw_user_meta_data\s*->>\s*'role'/i,
    "editable user metadata must not control authorization roles",
  );
  assert.match(
    migration,
    /revoke all on function private\.handle_new_user\(\) from public, anon, authenticated/i,
  );
});

test("Phase 2 projects are persisted behind owner-scoped RLS", async () => {
  const [migration, dashboard] = await Promise.all([
    readFile(
      new URL(
        "../supabase/migrations/20260731055948_create_student_projects.sql",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL("../app/_components/student-dashboard.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(migration, /create table public\.projects/i);
  assert.match(migration, /enable row level security/i);
  assert.match(
    migration,
    /grant select, insert, update on table public\.projects to authenticated/i,
  );
  assert.match(migration, /with check \(\(select auth\.uid\(\)\) = owner_id\)/i);
  assert.match(migration, /projects_owner_updated_at_idx/i);
  assert.doesNotMatch(migration, /grant .*projects to anon/i);
  assert.match(dashboard, /\.rpc\("create_educational_game_project"/);
  assert.match(dashboard, /Educational Game/);
  assert.match(dashboard, /Market Research Report/);
});

test("Phase 3 persists project files and renders them in a sandbox", async () => {
  const [migration, templateMigration, workspace, projectTypes] = await Promise.all([
    readFile(
      new URL(
        "../supabase/migrations/20260731063730_create_project_workspace_files.sql",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../supabase/migrations/20260731090412_hello_world_project_template.sql",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL("../app/_components/platform-app.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../lib/projects.ts", import.meta.url), "utf8"),
  ]);

  assert.match(migration, /create table public\.project_files/i);
  assert.match(migration, /unique \(project_id, path\)/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /projects\.owner_id = \(select auth\.uid\(\)\)/i);
  assert.match(migration, /security invoker/i);
  assert.match(migration, /insert into storage\.buckets/i);
  assert.match(migration, /bucket_id = 'project-assets'/i);
  assert.doesNotMatch(migration, /security definer/i);
  assert.match(templateMigration, /Hello, world!/i);
  assert.match(templateMigration, /security invoker/i);
  assert.doesNotMatch(templateMigration, /security definer/i);

  assert.match(workspace, /\.from\("project_files"\)/);
  assert.match(workspace, /\.rpc\(\s*"save_project_changes"/);
  assert.match(workspace, /content: draftContent/);
  assert.match(workspace, /sandbox="allow-scripts"/);
  assert.match(workspace, /srcDoc=\{previewDocument\}/);
  assert.match(projectTypes, /buildPreviewDocument/);
});

test("Phase 4 routes authenticated agent requests and persists usage", async () => {
  const [migration, workspace, agentApi, graph] = await Promise.all([
    readFile(
      new URL(
        "../supabase/migrations/20260731065014_create_agent_sessions_and_usage.sql",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL("../app/_components/platform-app.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../backend/app/api/agents.py", import.meta.url), "utf8"),
    readFile(new URL("../backend/app/agents/graph.py", import.meta.url), "utf8"),
  ]);

  assert.match(migration, /create table public\.agent_sessions/i);
  assert.match(migration, /create table public\.agent_messages/i);
  assert.match(migration, /create table public\.ai_usage/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /Students can read their own AI usage/i);
  assert.doesNotMatch(migration, /grant insert .*authenticated/i);
  assert.match(workspace, /\/agent\/chat/);
  assert.match(workspace, /Authorization: `Bearer \$\{session\.access_token\}`/);
  assert.match(workspace, /payload\.file_updates/);
  assert.match(workspace, /MarkdownMessage/);
  assert.match(workspace, /Suggested replies/);
  assert.match(workspace, /payload\.suggestions/);
  assert.match(workspace, /Current AI model/);
  assert.match(workspace, /payload\.model/);
  assert.match(agentApi, /Depends\(get_current_user\)/);
  assert.match(graph, /StateGraph/);
  assert.match(graph, /planner|coder|reviewer/);
});

test("project conversations and version history survive refreshes", async () => {
  const [migration, workspace, projectTypes] = await Promise.all([
    readFile(
      new URL(
        "../supabase/migrations/20260731084021_persist_project_history.sql",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL("../app/_components/platform-app.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../lib/projects.ts", import.meta.url), "utf8"),
  ]);

  assert.match(migration, /create table public\.project_versions/i);
  assert.match(migration, /create table public\.project_version_files/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /private\.apply_project_changes/i);
  assert.match(migration, /private\.restore_project_snapshot/i);
  assert.match(migration, /revoke update on table public\.project_files from authenticated/i);
  assert.match(workspace, /\.from\("agent_sessions"\)/);
  assert.match(workspace, /\.from\("agent_messages"\)/);
  assert.match(workspace, /\.from\("project_versions"\)/);
  assert.match(workspace, /\.rpc\(\s*"restore_project_version"/);
  assert.doesNotMatch(workspace, /alex-lee\/habitat-heroes/);
  assert.doesNotMatch(workspace, /v3 · Add score and streak/);
  assert.match(projectTypes, /type ProjectVersion/);
});

test("Phase 5 educator portal is role-protected and exposes classroom views", async () => {
  const [dashboard, adminApi, dependencies] = await Promise.all([
    readFile(
      new URL("../app/_components/admin-dashboard.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../backend/app/api/admin.py", import.meta.url), "utf8"),
    readFile(new URL("../backend/app/dependencies.py", import.meta.url), "utf8"),
  ]);

  assert.match(dashboard, /\/admin\/\$\{endpoint\}/);
  assert.match(dashboard, /AI analytics/);
  assert.match(dashboard, /StudentTable/);
  assert.match(adminApi, /Depends\(require_educator\)/);
  assert.match(adminApi, /\/stats/);
  assert.match(adminApi, /\/students/);
  assert.match(adminApi, /\/projects/);
  assert.match(adminApi, /\/usage/);
  assert.match(dependencies, /Teacher or admin role required/);
});
