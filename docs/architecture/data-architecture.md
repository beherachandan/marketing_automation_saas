# Data Architecture

> How data is structured, isolated, and protected across organisations.

---

## Tenant isolation model

Every piece of org data lives under a `workspace_id`. This is not an application-level convention — it is enforced at the Postgres driver level via Row Level Security (RLS). A bug in Next.js application code physically cannot read another org's data.

```
Request arrives (authenticated)
        │
        ▼
auth.uid() = the logged-in user's UUID (set by Supabase JWT)
        │
        ▼
Every query on a workspace-scoped table passes through:
  is_workspace_member(workspace_id)
  = EXISTS (
      SELECT 1 FROM workspace_members
      WHERE user_id = auth.uid()
        AND workspace_id = <row's workspace_id>
    )
        │
   ┌────┴────┐
   │         │
   ▼         ▼
 PASS       BLOCK
 (member)   (not member → row invisible, as if it doesn't exist)
```

The `service_role` key bypasses RLS and is used only for:
- Cron job fan-out queries (reading all launched workspaces)
- Encrypted credential writes (`pgp_sym_encrypt`)
- Admin backfill scripts (new agent provisioning)

Never expose `service_role` to the client or use it in browser-executed code.

---

## Storage layers

### Layer 1 — Identity (existing)

```
auth.users          Supabase-managed. Email, provider, session tokens.
profiles            1:1 with auth.users. Display name, avatar. App-owned.
workspace_members   Join table. user_id + workspace_id + role (owner/member).
workspaces          The org root. One per organisation. status: draft → launched.
```

### Layer 2 — Onboarding (existing)

```
tenant_configs
  One row per step (1–8) per workspace.
  data: jsonb  — the full step form submission.
  generated_files: jsonb  — preview snapshot of IDENTITY.md, SOUL.md, etc.
                           (UI preview only; runtime context is regenerated fresh)

scanned_hints
  One row per workspace.
  Populated when user submits their URL in step 1.
  hints: jsonb  — extracted product description, ICP signals, tone hints.
```

### Layer 3 — Integrations (existing)

```
slack_installs
  One row per Slack workspace install.
  team_id: text  — the unique key for Slack routing (team_id → workspace_id)
  bot_token: bytea  — encrypted with pgp_sym_encrypt using ENCRYPT_SECRET
  channel_id: text  — the channel the bot posts to
  uninstalled_at: timestamptz  — set on app_uninstalled Slack event; blocks routing

integrations
  One row per provider per workspace (cms, semrush, dataforseo, tavily, etc.)
  credentials: bytea  — encrypted
  status: active | paused
```

### Layer 4 — Agent capabilities (new)

```
agent_type_registry  (global, no workspace_id)
  Central catalog of all agent/skill types.
  applicable_streams: text[]  — which streams this agent applies to
  default_config: jsonb  — base config used at cold-start
  is_ga: bool  — false = beta, not auto-provisioned to new orgs

workspace_agent_capabilities
  PK: (workspace_id, agent_type)
  Which agents are active for this org.
  status lifecycle:
    pending  → provisioned but not yet activated (org sees "New capability" banner)
    active   → running in cron + available via Slack
    paused   → org paused it, cron skips it
    error    → provisioning failed, needs operator intervention
  config: jsonb  — org-specific overrides on top of agent_type_registry.default_config
```

### Layer 5 — Skill config (new)

```
workspace_skill_configs
  PK: (workspace_id, skill_id)
  The living config for one skill for one org.

  org_overrides: jsonb
    Structured calibration fields (defined in lib/schema.ts SKILL_OVERRIDE_SCHEMA)
    + raw_instruction: string (freeform verbatim context)
    Starts as {} at cold-start.
    Modified by: Slack commands, dashboard, cron calibration approvals.

  effective_config: jsonb
    Cached result of: render(base_template, org_overrides)
    Always treated as a cache — never the source of truth.
    Recomputed from org_overrides at runtime if stale.

  version: int
    Optimistic lock. Incremented on every write.
    Prevents last-write-wins on concurrent Slack edits.

workspace_skill_config_history
  Append-only audit log. INSERT only — no UPDATE, no DELETE.
  Every change to org_overrides is recorded here.
  Enables: /history keyword-research Slack command, full undo.
  source values: 'onboarding' | 'slack' | 'dashboard' | 'cron_calibration' | 'undo'

workspace_skill_calibrations
  PK: (workspace_id, skill_id)  — one active proposal at a time.
  Written by the cron after each workflow run.
  status: pending → applied | rejected | expired
  expires_at: 7 days from proposed_at.
  If org ignores it, it expires and the next cron cycle replaces it with a fresh proposal.
```

### Layer 6 — Execution records (new)

```
workflow_runs
  One row per org per cron execution.
  kind: weekly_discovery | monthly_citation | monthly_rubric | eod_memory
  inngest_run_id: text  — links to Inngest execution dashboard for debugging
  status: queued → running → succeeded | failed | cancelled

runs  (existing)
  On-demand Slack command executions (audit, draft).
  Not cron — these are triggered by users.
```

---

## Skill config ownership model

```
COLD START (onboarding complete)
  operator defines:  SKILL_OVERRIDE_SCHEMA['keyword-research'] in lib/schema.ts
                     base prompt template (also in lib/schema.ts or agents/)
  org gets:          workspace_skill_configs row with org_overrides = {}
                     effective_config = render(base_template, step_1-7_data, {})

WEEK 1 — Slack edit
  user says:         "focus on question-intent keywords for VP Engineering"
  bot classifies:    fits 'focus' structured field
  writes:            org_overrides = { focus: "question-intent KWs for VP Engineering" }
  logs:              history row (source='slack')
  effective_config:  recomputed → "...focus: question-intent KWs for VP Engineering..."

WEEK 4 — Cron calibration
  cron observes:     commercial KWs drove 3x qualified traffic
  proposes:          { weights: { commercial: 0.7, informational: 0.3 } }
  writes:            workspace_skill_calibrations (status='pending')
  slacks:            "Calibration suggestion: shift weights to 70% commercial. [Approve]"

  if APPROVED:
    org_overrides = { focus: "...", weights: { commercial: 0.7, informational: 0.3 } }
    history row (source='cron_calibration')
    calibration status = 'applied'

  if IGNORED 7 days:
    calibration status = 'expired'
    next cron generates fresh proposal from latest 4-week data

OrgA's kw_skill config after 3 months: their own lineage
OrgB's kw_skill config after 3 months: completely independent lineage
Both started from the same cold-start v0.
```

---

## Optimistic locking — preventing concurrent write conflicts

Multiple Slack users in OrgA can send config updates simultaneously. Without locking, the second write overwrites the first silently.

```
Slack user A sends: "weight commercial higher"
Slack user B sends: "deprioritize branded terms"
  (both at the same time)

Both Inngest functions:
  1. Read workspace_skill_configs WHERE workspace_id=OrgA AND skill_id='kw'
     → both read version=5

  2. Compute delta

  3. UPDATE workspace_skill_configs
     SET org_overrides=..., version=version+1
     WHERE workspace_id=OrgA AND skill_id='kw' AND version=5

  First write wins:  version 5→6, returns 1 row affected ✓
  Second write:      version is now 6, not 5 → returns 0 rows affected

  Second write detects conflict → Inngest retries step with fresh read
  → reads version=6 → recomputes delta on top of latest → writes version 6→7
```

---

## Context assembly — atomic read

`loadTenantContext(workspaceId)` must never return a mixed-state bundle (some tables read before a step-save, some after). All tables are read in a single Postgres transaction via the `get_tenant_context(workspace_id)` function.

See [ERD.md](./ERD.md) for the full function definition.

The returned bundle:
```ts
{
  workspace:    { id, name, status }
  config:       { step1: {...}, step2: {...}, ..., step8: {...} }
  skill_configs:{ 'keyword-research': { org_overrides, effective_config, version }, ... }
  integrations: { slack: {...}, cms: {...}, ... }
  capabilities: [ { agent_type, status, config }, ... ]
  slack:        { team_id, channel_id, bot_token }
}
```

---

## Schema migration checklist (what needs to be added)

```sql
-- Fix existing gap
alter table public.workspaces
  add column if not exists scanned_hints jsonb;

-- New tables (see ERD.md for full column definitions)
create table public.agent_type_registry (...);
create table public.workspace_agent_capabilities (...);
create table public.workspace_skill_configs (...);
create table public.workspace_skill_config_history (...);
create table public.workspace_skill_calibrations (...);
create table public.workflow_runs (...);

-- Postgres function
create or replace function public.get_tenant_context(...) ...;

-- RLS on all new tables
-- Indexes (see ERD.md)
```
