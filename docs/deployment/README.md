# Deployment

End-to-end setup for the Conduct marketing-automation SaaS: Vercel host, Supabase auth, Anthropic agents, Slack app, scheduled crons.

## 1. Environment variables

Copy `.env.example` to `.env.local` for dev; mirror the same keys into **Vercel → Project → Settings → Environment Variables** for preview + production.

| Key | Where to get it | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API | Server-only |
| `ANTHROPIC_API_KEY` | console.anthropic.com | Required for live `/audit` + `/draft`; missing key falls back to deterministic stub |
| `SLACK_CLIENT_ID` | api.slack.com/apps → Basic Information | |
| `SLACK_CLIENT_SECRET` | api.slack.com/apps → Basic Information | |
| `SLACK_SIGNING_SECRET` | api.slack.com/apps → Basic Information | Used to verify incoming requests |
| `SLACK_STATE_SECRET` | `openssl rand -base64 32` | OAuth state nonce |
| `NEXT_PUBLIC_APP_URL` | e.g. `https://conduct.yourdomain.com` | Must match Slack redirect URL |
| `CREDENTIAL_ENCRYPTION_KEY` | `openssl rand -base64 32` | Encrypts per-tenant API creds |
| `CRON_SECRET` | `openssl rand -base64 32` | Vercel Cron bearer; if unset locally, cron routes are open for dev |

Dev-bypass: leave the Supabase vars empty to run onboarding without auth — `/auth/sign-in` shows a yellow banner and state persists to `.onboarding-state/` on disk.

## 2. Supabase

1. Create a new Supabase project.
2. Enable **Email magic link** under Authentication → Providers.
3. Add `{NEXT_PUBLIC_APP_URL}/auth/callback` to Authentication → URL Configuration → Redirect URLs.
4. Run migrations in `supabase/migrations/` (workspaces, credentials, slack_installations, etc.).

## 3. Slack app

### Import the manifest
1. Go to https://api.slack.com/apps → **Create New App** → **From an app manifest**.
2. Pick your workspace, then paste `docs/deployment/slack-app-manifest.json`.
3. Before submitting, replace all `YOUR_DOMAIN` occurrences with your production host (e.g. `conduct.yourdomain.com`). Slack won't accept `localhost` as a request URL — use a tunnel (ngrok, Cloudflared) during dev.
4. After create, copy the generated **Client ID**, **Client Secret**, and **Signing Secret** into Vercel env vars.

### Verify endpoints
Slack will ping each URL during install/setup. The app routes that must return 200:

- `POST /api/slack/events` — Events API (signature verified via `SLACK_SIGNING_SECRET`)
- `POST /api/slack/commands` — `/audit` and `/draft` slash commands
- `POST /api/slack/interactivity` — button / modal callbacks
- `GET /api/slack/install` — starts OAuth
- `GET /api/slack/oauth_redirect` — stores tokens, redirects back into onboarding

### Install into a workspace
Open `{NEXT_PUBLIC_APP_URL}/api/slack/install` from a browser signed into the target workspace. Approve scopes. You'll be returned to onboarding step 7 with Slack marked connected.

### Smoke test
In any channel where the bot is invited:

```
/audit https://yourdomain.com/blog/some-article
```

You should see an ephemeral "working…" message followed by a score card. Same for `/draft <topic>`. The onboarding page also ships an in-browser Slack sandbox (`SlackSandbox`) that hits `/api/audit/demo` and renders the same block payload without needing a real workspace.

## 4. Vercel

1. **Import Git repo** into Vercel.
2. Framework preset: **Next.js** (autodetected).
3. Add all env vars from §1 for *Production* and *Preview*.
4. Deploy. First deploy registers the crons declared in `vercel.json`:
   - `/api/cron/eod-memory` — daily 04:00 UTC
   - `/api/cron/weekly-discovery` — Mondays 05:00 UTC
   - `/api/cron/monthly-citation` — 1st of month 06:00 UTC
   - `/api/cron/monthly-rubric` — 1st of month 06:30 UTC
5. Confirm them under **Project → Cron Jobs**. They 401 without `Authorization: Bearer $CRON_SECRET`, which Vercel supplies automatically when the env var is set.

Function `maxDuration` is bumped to 300s for cron routes and 60s for `/api/audit/demo` and `/api/slack/commands` (see `vercel.json`).

## 5. Post-deploy checklist

- [ ] Magic-link sign-in completes round-trip via `/auth/callback`
- [ ] Onboarding steps 1–7 persist to Supabase (check `workspaces` row)
- [ ] Slack install flow returns to step 7 with `slack.teamId` populated
- [ ] `/audit <url>` in Slack returns scored output within 60s
- [ ] Cron jobs appear in Vercel dashboard and first scheduled run succeeds (check logs for `runCron("…")`)
- [ ] `/api/audit/demo` responds 200 with stub when `ANTHROPIC_API_KEY` unset, live payload when set

## Local development

```bash
pnpm install
pnpm dev            # http://localhost:3000
pnpm typecheck
pnpm lint
```

For Slack work locally, expose port 3000 with ngrok or `cloudflared tunnel`, then paste the tunnel URL into the Slack app's request URLs (swap back before pushing manifest changes to production).
