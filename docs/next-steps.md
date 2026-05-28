# Conduct — Next Steps

> Last updated: 2026-05-26
> Branch: `redesign` (active work) · `main` (stable)
> Dev server: `npm run dev` → `localhost:3000` (main) / `localhost:3001` (redesign)

---

## Current state

All 8 onboarding steps are functional. Redesign branch has a new shell, progress rail, zero screen, and right panel. Architecture is fully documented in `docs/architecture/`. No Inngest yet — crons are still Vercel fire-and-forget stubs returning `processed: 0`.

---

## Build queue (ordered by unblock value)

### 1 — DataForSEO client  `~0.5 day`
**What:** Thin API wrapper in `lib/keyword-research.ts`. Credentials already captured in Step 7.  
**Unblocks:** `weekly-discovery` cron (currently stubbed).  
**Files to create/touch:**
- `lib/keyword-research.ts` — new, DataForSEO client
- `app/api/cron/weekly-discovery/route.ts` — replace stub with real fan-out call

---

### 2 — Webflow publish pipeline  `~1 day`
**What:** Webflow Collection Items CRUD client. Site ID + token + collection map already captured in Step 7.  
**Unblocks:** `monthly-citation` and `monthly-rubric` crons (both currently stubbed).  
**Files to create/touch:**
- `lib/webflow.ts` — new, Collection items create/update/publish
- `app/api/cron/monthly-citation/route.ts` — replace stub
- `app/api/cron/monthly-rubric/route.ts` — replace stub

---

### 3 — Run history dashboard  `~0.5 day`
**What:** Read-only list of `runs` rows on `/dashboard`. The table already has writes; there's no reader yet.  
**Unblocks:** Makes all Slack command runs (audit, draft) visible to the org.  
**Files to create/touch:**
- `app/dashboard/page.tsx` — replace placeholder
- `components/run-list.tsx` — new

---

### 4 — EOD memory snapshot worker  `~0.5 day`
**What:** Implement the `eod-memory` cron body. Reads tenant context, writes a daily memory snapshot per org.  
**Unblocks:** 4th cron.  
**Files to create/touch:**
- `lib/memory-snapshot.ts` — new
- `app/api/cron/eod-memory/route.ts` — replace stub

---

### 5 — Inngest migration  `~1.5 days`
**What:** Replace all Vercel fire-and-forget cron routes with durable Inngest fan-out. Each org gets an isolated invocation with step-level checkpointing. Required before production scale.  
**Architecture:** Fully designed in `docs/architecture/system-architecture.md`.  
**Files to create/touch:**
- `lib/inngest/client.ts` — new
- `app/api/inngest/route.ts` — new Inngest serve handler
- `app/api/cron/*.ts` — convert to thin fan-out triggers
- All business logic moves into Inngest functions under `lib/inngest/functions/`

---

### 6 — New DB tables  `~0.5 day`
**What:** Add 6 new tables to `schema.sql` + run migrations. All designed in `docs/architecture/ERD.md`.  
**Tables:**
- `workspace_skill_configs`
- `workspace_skill_config_history`
- `workspace_skill_calibrations`
- `workspace_agent_capabilities`
- `agent_type_registry`
- `workflow_runs`
**Also:** Add `scanned_hints jsonb` column to `workspaces` (currently missing).  
**Also:** Add `get_tenant_context(workspace_id)` Postgres function (atomic read — full SQL in `docs/architecture/ERD.md`).

---

### 7 — Skill config layer  `~2 days`
**What:** Per-org `org_overrides`, `SKILL_OVERRIDE_SCHEMA` in `lib/schema.ts`, Slack config update flow, cron calibration propose + approve loop, history + undo.  
**Depends on:** Step 5 (Inngest) + Step 6 (new tables).  
**Architecture:** Fully designed in `docs/architecture/config-architecture.md`.  
**Files to create/touch:**
- `lib/schema.ts` — add `SKILL_OVERRIDE_SCHEMA`
- Inngest functions: `skill-config-updater`, `calibration-responder`, `undo-handler`, `coherence-checker`
- `app/api/slack/commands` — route new command types to Inngest

---

## Parked / future scope

| Item | Note |
|---|---|
| Multi-user workspace invite flow | Schema supports `workspace_members`; no UX built |
| Dashboard config review panel | Skill config viewer + pending calibration approvals UI |
| Semrush client | Alternative to DataForSEO; lower priority if DFS ships first |
| Dual Slack channels | Execution outputs vs ops/config alerts — Phase 4 in system architecture |
| Per-org rate limiting + Inngest concurrency limits | After Inngest migration |
| Portkey per-org cost dashboards | After Portkey routing is wired to workspace_id metadata |
| WordPress / Contentful / Sanity CMS | Step 7 has "soon" radio options; no implementation planned |

---

## Before going to production

- [ ] Raise Supabase email rate limit: Dashboard → Authentication → Rate Limits → 10+/hr (currently bypassed with `DEV_BYPASS_AUTH=1`)
- [ ] Remove `DEV_BYPASS_AUTH=1` from `.env.local` after rate limit is raised
- [ ] Replace `YOUR_DOMAIN` in `docs/deployment/slack-app-manifest.json`
- [ ] Verify `CREDENTIAL_ENCRYPTION_KEY` is set in Vercel env (not just local)
- [ ] Run full typecheck: `npx tsc --noEmit`

---

## Key reference docs

| Doc | What it covers |
|---|---|
| `docs/architecture/README.md` | System overview + core principles |
| `docs/architecture/ERD.md` | All tables, FKs, RLS, indexes, `get_tenant_context()` SQL |
| `docs/architecture/data-architecture.md` | 6 storage layers, tenant isolation, optimistic locking |
| `docs/architecture/config-architecture.md` | Skill config two-layer model, Slack update flow, calibration loop |
| `docs/architecture/system-architecture.md` | Full topology, Inngest functions, cron fan-out, new agent provisioning |
| `docs/architecture/decisions.md` | All 12 architectural decisions with rationale |
| `docs/deployment/README.md` | Env vars, Supabase setup, Slack manifest, Vercel config |
