# Muse

Muse is an AI-native learning studio. Students describe an idea, work with an
AI mentor, edit a small web project, test it in a sandboxed preview, and review
their progress. Educators can inspect classroom activity and AI usage through a
role-protected dashboard.

This repository contains the current MVP. It uses email/password Supabase Auth,
a Next.js/React frontend, a FastAPI + LangGraph agent service, and Supabase
Postgres for application data. In-product GitHub import/export is not
implemented yet.

## What is included

- Email sign-up, sign-in, OTP confirmation, and password recovery.
- Student dashboard with owner-scoped projects and progress summaries.
- Educational Game projects with editable HTML, CSS, and JavaScript files.
- Sandboxed live preview, real file versions, line-change summaries, and
  snapshot restore.
- Persisted project conversations with rendered Markdown and suggested replies.
- Planner, Coder, and Reviewer agent routing through LangGraph.
- Safe project-file updates and per-request AI usage tracking.
- Teacher/admin dashboard for students, projects, progress, and usage analytics.

## Architecture

```text
Browser
  ├─ Next.js app (port 3000)
  │    └─ Supabase browser client: Auth + owner-scoped data
  └─ FastAPI agent service (port 8000)
       ├─ validates the Supabase access token
       ├─ routes work through LangGraph
       ├─ calls DeepSeek when configured
       └─ persists messages, file updates, snapshots, and usage in Supabase
```

The browser never receives the Supabase service-role key or the DeepSeek API
key. Authorization is enforced in both the API and Postgres RLS policies.

## Repository map

| Path | Purpose |
| --- | --- |
| `app/` | Next.js routes, auth screens, student workspace, and educator UI |
| `app/_components/platform-app.tsx` | Main student workspace shell |
| `app/_components/admin-dashboard.tsx` | Teacher/admin dashboard |
| `lib/` | Supabase clients and project/file types |
| `backend/app/` | FastAPI routes, LangGraph agents, DeepSeek integration |
| `supabase/migrations/` | Ordered database schema, RLS, RPC, and seed migrations |
| `supabase/templates/` | Optional hosted Auth email templates |
| `tests/` | Frontend build/render checks |
| `backend/tests/` | FastAPI and agent tests |
| `vercel.json` | Frontend Vercel build configuration |

## Prerequisites

- Node.js `>=22.13.0`
- Python `>=3.12`
- [`uv`](https://docs.astral.sh/uv/)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- A Supabase project with Email Auth enabled

Vercel CLI is only needed for deployment. The app can be developed locally
without a Vercel account.

## Local setup

### 1. Install dependencies

```bash
git clone https://github.com/ShouzhiWang/AI-training-demo.git
cd AI-training-demo
npm install
cd backend && uv sync && cd ..
```

### 2. Configure the frontend

```bash
cp .env.example .env.local
```

Set these values in `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_EMAIL_OTP_ENABLED=false
NEXT_PUBLIC_API_URL=http://localhost:8000
```

`NEXT_PUBLIC_*` values are intentionally browser-visible. Do not put a
service-role key or model key in this file.

### 3. Configure the agent service

```bash
cp backend/.env.example backend/.env
```

Set these values in `backend/.env`:

```dotenv
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_KEY=<server-only-service-role-key>
DEEPSEEK_API_KEY=<server-only-deepseek-key>
DEEPSEEK_MODEL=deepseek-v4-flash
FRONTEND_ORIGIN=http://localhost:3000
```

Without `DEEPSEEK_API_KEY`, the service uses a safe development mentor
fallback. It can answer planning prompts, but it will not make AI file edits.

### 4. Link and migrate Supabase

Run this once per checkout, replacing the ref with the project you are using:

```bash
supabase link --project-ref <project-ref>
supabase db push --linked --yes
supabase db lint --linked
```

The migrations create profiles, projects, project files, agent sessions,
messages, usage records, snapshots, restore RPCs, the storage bucket, and RLS
policies. When adding schema changes, create a migration with:

```bash
supabase migration new describe_your_change
```

Do not edit an already-applied migration. Apply new migrations with
`supabase db push --linked --yes` and include them in the same pull request.

### 5. Start the app

Use two terminals:

```bash
# Terminal 1: frontend
npm run dev
```

```bash
# Terminal 2: agent API
cd backend
uv run uvicorn app.main:app --reload
```

Open <http://localhost:3000>. The API health check is available at
<http://localhost:8000/health>.

If port 3000 or 8000 is already in use, inspect the process first:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
lsof -nP -iTCP:8000 -sTCP:LISTEN
```

You can start Uvicorn on another port with `--port 8001`, but then update
`NEXT_PUBLIC_API_URL` and `FRONTEND_ORIGIN` to match.

## Auth configuration

Enable **Email** under Supabase **Authentication → Providers**. For local
development, the required callback paths are:

- `http://localhost:3000/auth/callback`
- `http://localhost:3000/auth/confirm`
- `http://localhost:3000/reset-password`

If using the hosted email templates in `supabase/templates/`, configure custom
SMTP (or a plan that allows template customization). Then set
`NEXT_PUBLIC_EMAIL_OTP_ENABLED=true` after the confirmation template includes
the OTP token.

For a deployed domain, add the equivalent HTTPS callback URLs in Supabase Auth
and update `supabase/config.toml` before running `supabase config push`.

## Testing and quality checks

Run the frontend checks from the repository root:

```bash
npm run lint
npm test
```

Run the backend checks:

```bash
cd backend
uv run pytest
```

Before opening a pull request, also run `git diff --check` and verify that no
`.env*` or `.vercel/` files are staged.

## Educator/admin access

Roles are stored in `public.user_profiles` and cannot be changed by browser
clients. Promote a trusted account in the Supabase SQL Editor:

```sql
update public.user_profiles
set role = 'admin'
where email = 'your-login-email@example.com';
```

Refresh the app and open **Educator dashboard** in the sidebar. The `teacher`
role can access the same dashboard with the less privileged educator label.

## Production deployment

The live app is split into two Vercel projects:

- Frontend: <https://muse-ai-training.vercel.app>
- FastAPI service: <https://muse-ai-training-api.vercel.app>

The frontend is deployed from the repository root with `vercel.json`. The
FastAPI project is deployed from `backend/`; `backend/pyproject.toml` exposes
`app.main:app` as the Vercel ASGI entry point. Production secrets are stored in
Vercel project environment variables and must never be committed.

To deploy from a new machine:

```bash
npx vercel@latest login
npx vercel@latest link --yes --project muse-ai-training
npx vercel@latest deploy --prod --yes
```

Link the backend separately from `backend/` and add the variables from
`backend/.env.example` to the Vercel project before deploying. Set the
frontend's `NEXT_PUBLIC_API_URL` to the API deployment URL, and set the API's
`FRONTEND_ORIGIN` to the frontend URL.

The current deployments were created through the CLI. GitHub automatic deploys
are not connected, so a future `main` push does not deploy by itself until the
repository is connected under **Vercel Project Settings → Git**.

## Collaboration workflow

1. Create a branch from `main`.
2. Keep frontend, backend, and migration changes scoped to one reviewable task.
3. Add or update tests for behavior changes.
4. Run the checks above locally.
5. Open a pull request with a short summary, test output, migration notes, and
   any new environment variables.

Never commit `.env`, `.env.local`, service keys, database passwords, or
`.vercel` project metadata. If a secret is exposed, rotate it immediately in
Supabase, DeepSeek, or Vercel.

## Useful references

- [Supabase CLI and database migrations](https://supabase.com/docs/guides/cli)
- [Supabase Auth redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [FastAPI on Vercel](https://vercel.com/docs/frameworks/backend/fastapi)
