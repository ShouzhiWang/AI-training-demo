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
  assert.match(html, /Habitat Heroes/);
  assert.match(html, /Tell Muse what you want to change/);
  assert.match(html, /Alex Lee/);
});

test("renders actionable Supabase setup guidance on the login page", async () => {
  const response = await fetchApp("/login");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Welcome to Muse/);
  assert.match(html, /Supabase credentials are not configured yet/);
  assert.match(html, /\.env\.local/);
});

test("OAuth callback rejects external next destinations", async () => {
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
