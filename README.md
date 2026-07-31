# Muse — AI-Native Learning Platform

The repository is being implemented from
`AI_Native_Learning_Platform_Full_Stack_Implementation_Plan.md`.

Implemented phases:

- Phase 1: Supabase email authentication, SSR session handling, password
  recovery, and secure student/teacher/admin profiles.
- Phase 2: a student dashboard backed by owner-scoped Supabase projects,
  learning progress and recent activity summaries, plus the Educational Game
  project-creation template.
- Phase 3: persisted HTML/CSS/JavaScript project files, an editable workspace,
  sandboxed live preview, file version increments, and a private
  `project-assets` Storage bucket.
- Phase 4: a FastAPI service with a LangGraph Supervisor that routes to
  Planner, Coder, and Reviewer agents; authenticated chat, persisted sessions
  and messages, safe project-file updates, and per-request AI usage tracking.
- Phase 5: a role-protected educator dashboard for class metrics, student
  progress, project activity, and AI usage analytics.

## Supabase auth setup

1. Copy `.env.example` to `.env.local` and add the project URL and publishable
   key from Supabase.
2. Apply the migrations in `supabase/migrations/` to the Supabase project with
   `supabase db push --linked`.
3. Enable Email under Supabase Authentication providers.
4. Add `http://localhost:3000/auth/callback`,
   `http://localhost:3000/auth/confirm`, and the production callback URLs
   to the Supabase redirect allow list.
5. To send email OTPs instead of magic links, configure custom SMTP (or a
   Supabase plan that supports hosted template changes), then copy the files
   in `supabase/templates/` into the hosted Confirmation, Magic Link, and
   Recovery templates. The default free-tier mailer does not allow template
   modification through config-as-code. Set
   `NEXT_PUBLIC_EMAIL_OTP_ENABLED=true` after the OTP template is active.

Without Supabase environment variables, the root route stays in demo mode and
the login page shows setup guidance.

## Phase 2 test flow

1. Sign in and open `/`.
2. Confirm the student dashboard shows Projects, Active, Progress, and AI
   assists summaries.
3. Choose **Educational Game**, enter a project name and learning idea, and
   create the project.
4. Refresh the page and confirm the project still appears in the sidebar,
   continue-creating card, and recent activity.

The Market Research Report template is intentionally visible but unavailable;
the implementation plan calls for Educational Game first.

## Phase 3 test flow

1. Open an Educational Game project from the dashboard.
2. Switch between **Preview** and **Files**.
3. Edit `index.html`, `style.css`, or `script.js`; Preview reflects the draft
   immediately inside a sandboxed iframe.
4. Click **Save file**, refresh, reopen the project, and confirm the edit and
   incremented version persist.

Text source files live in `public.project_files`. Binary images are reserved
for the private `project-assets` bucket, using the object path
`<project-id>/<filename>` so Storage RLS can enforce project ownership.

## Phase 4/5 backend setup

The browser never receives the Supabase service-role key or DeepSeek key.
Configure them only in the Python service:

```bash
cp backend/.env.example backend/.env
cd backend
uv sync
uv run uvicorn app.main:app --reload
```

Fill `backend/.env` with:

- `SUPABASE_URL`: the same project URL used by the frontend
- `SUPABASE_PUBLISHABLE_KEY`: the browser-safe publishable key
- `SUPABASE_SERVICE_KEY`: the server-only Supabase service-role key
- `DEEPSEEK_API_KEY`: the model API key; without it, the API uses a safe
  development mentor response and does not modify files

Keep the Next.js app running on port 3000 and the API on port 8000. The
frontend sends the signed-in user's short-lived Supabase access token to the
API, which validates it before reading or changing a project.

## Phase 4 test flow

1. Open a project and ask Muse to plan an idea, change a file, or review the
   learning experience.
2. Confirm the response identifies the Planner, Coder, or Reviewer.
3. For a coding request, confirm the updated files appear immediately in the
   sandboxed Preview.
4. Refresh the dashboard and confirm **AI assists** has increased.

## Phase 5 test flow

1. Change a test profile's role to `teacher` or `admin` using the Supabase
   dashboard or a trusted server-side SQL session.
2. Sign in as that account and open **Educator dashboard** in the sidebar.
3. Verify Overview, Students, Projects, and AI analytics load.
4. Sign in as a student and confirm the educator API endpoints return 403 and
   the educator navigation is hidden.

## Original starter notes

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

This starter does not use `wrangler.jsonc`.

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
