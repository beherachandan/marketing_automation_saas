# System Architecture

> Full topology, Inngest execution model, Slack routing, cron fan-out, and new agent provisioning.

---

## Full topology

```
┌────────────────────────────────────────────────────────────────────────┐
│  CLIENTS                                                                │
│                                                                         │
│  OrgA Slack ──────────────────────────────────────────────────────┐   │
│  OrgB Slack ──────────────────────────────────────────────────┐   │   │
│  Browser (dashboard, onboarding) ─────────────────────────┐   │   │   │
└───────────────────────────────────────────────────────────┼───┼───┼───┘
                                                            │   │   │
┌───────────────────────────────────────────────────────────▼───▼───▼───┐
│  NEXT.JS APP  (Vercel)                                                  │
│                                                                         │
│  /api/slack/commands    → ACK 200 immediately + enqueue to Inngest     │
│  /api/slack/events      → revocation handler (sets uninstalled_at)     │
│  /api/slack/install     → OAuth flow (team_id + bot_token storage)     │
│  /api/slack/oauth       → OAuth callback                               │
│  /api/cron/*            → thin fan-out triggers ONLY (no logic here)   │
│  /api/inngest           → Inngest serve handler                        │
│  /onboarding/*          → 8-step UI + server actions                   │
│  /dashboard/*           → health, run history, config review           │
│                                                                         │
│  Rule: NO business logic in route handlers.                            │
│         All logic lives in Inngest functions.                          │
└────────────────────────────────────────────────────────────────────────┘
                          │  inngest.send() / inngest.serve()
                          ▼
┌────────────────────────────────────────────────────────────────────────┐
│  INNGEST  (durable execution, step-level checkpointing)                 │
│                                                                         │
│  ─── Slack flows ──────────────────────────────────────────────────── │
│                                                                         │
│  slack/command.received                                                 │
│    step 1: load-tenant-context   rpc('get_tenant_context', workspaceId)│
│    step 2: load-effective-config  org's merged skill config            │
│    step 3: execute-skill          Claude via Portkey                   │
│    step 4: post-to-slack          OrgA's channel only                  │
│                                                                         │
│  slack/command.skill-update                                             │
│    step 1: load-current-config                                          │
│    step 2: extract-intent         Claude classification (A/B/C)        │
│    step 3: write + history        optimistic lock, history INSERT      │
│    step 4: queue-coherence-check  non-blocking enqueue                 │
│    step 5: post-to-slack                                                │
│                                                                         │
│  slack/calibration.respond  (approve / reject buttons)                 │
│    step 1: load-calibration                                             │
│    step 2: apply-or-reject                                              │
│    step 3: post-to-slack                                                │
│                                                                         │
│  ─── Cron flows ───────────────────────────────────────────────────── │
│                                                                         │
│  cron/weekly-discovery.trigger   (fired by Vercel cron, Monday 8am)   │
│    SELECT workspace_id FROM workspace_agent_capabilities               │
│      WHERE agent_type='keyword-research' AND status='active'          │
│    → fan-out: one event per launched org                               │
│              │                                                          │
│      ┌───────┴────────┬────────────┐                                   │
│      ▼                ▼            ▼                                   │
│    OrgA run         OrgB run     OrgC run   ← fully isolated           │
│    step 1: load-ctx step 1: ...  step 1: ...                           │
│    step 2: load-cfg step 2: ...  step 2: ...                           │
│    step 3: run-skill             ← each gets their own effective_config │
│    step 4: write-db + propose-calibration                              │
│    step 5: post-to-slack                                                │
│                                                                         │
│  cron/monthly-citation.trigger   (first Monday of month)              │
│  cron/monthly-rubric.trigger     (first Monday of month)              │
│  cron/eod-memory.trigger         (daily 11pm)                         │
│    → same fan-out pattern as weekly-discovery                         │
│                                                                         │
│  ─── Async flows ──────────────────────────────────────────────────── │
│                                                                         │
│  workflow/coherence-check                                               │
│    step 1: load modified skill configs since last check                │
│    step 2: Claude coherence review per skill                           │
│    step 3: flag issues in DB + Slack if found                         │
│    Runs before each cron cycle, not on every Slack edit               │
│                                                                         │
│  workflow/onboarding-finalise                                           │
│    step 1: seed workspace_skill_configs (one per active skill)        │
│    step 2: seed workspace_agent_capabilities (status='active')        │
│    step 3: generate cold-start effective_configs                      │
│    step 4: set workspaces.status = 'launched'                         │
└────────────────────────────────────────────────────────────────────────┘
                          │  all DB reads/writes
                          ▼
┌────────────────────────────────────────────────────────────────────────┐
│  SUPABASE                                                               │
│                                                                         │
│  Postgres (RLS enforced — workspace_id on every table)                 │
│  Auth (magic link + password sign-in)                                  │
│                                                                         │
│  OrgA data ── workspace_id = aaa ────────────────────────────┐        │
│  OrgB data ── workspace_id = bbb ────────────────────┐        │        │
│                                                       │        │        │
│  RLS: is_workspace_member(workspace_id) ─────────────┘────────┘        │
│       ← enforced at Postgres driver level                              │
│       ← cannot be bypassed by application-layer bug                   │
│                                                                         │
│  service_role key bypasses RLS — used ONLY for:                       │
│    - Cron fan-out queries (read all launched orgs)                    │
│    - Encrypted credential writes (pgp_sym_encrypt)                    │
│    - Admin backfill scripts                                            │
│    NEVER exposed to browser or client-side code                       │
└────────────────────────────────────────────────────────────────────────┘
                          │  all LLM calls
                          ▼
┌────────────────────────────────────────────────────────────────────────┐
│  PORTKEY  (LLM gateway)                                                 │
│  ANTHROPIC_BASE_URL = https://api.portkey.ai                           │
│  → Per-org cost tracking (workspace_id passed as metadata)            │
│  → Rate limiting per org                                               │
│  → Fallback routing if Claude is unavailable                           │
│  → Unified logs for all LLM calls across the system                   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Slack routing chain

```
Slack sends event to POST /api/slack/commands
        │
        ▼
1. Verify SLACK_SIGNING_SECRET
   → if invalid: return 403

2. Extract team_id from payload

3. SELECT workspace_id FROM slack_installs
     WHERE team_id = $team_id
       AND uninstalled_at IS NULL
   → if not found: return 200, "not registered"
   → if found: workspace_id = OrgA

4. ACK 200 immediately
   (Slack requires response within 3 seconds)

5. Determine command type:
   /audit, /draft → enqueue slack/command.received
   /config, /set  → enqueue slack/command.skill-update
   /history       → enqueue slack/command.history
   /undo          → enqueue slack/command.undo
   /activate      → enqueue slack/command.activate-skill
   /help          → inline response (no Inngest)

6. Inngest function resolves team_id → workspace_id again
   (always re-resolved, never trusted from event payload)
   → loads tenant context for this workspace only
   → all downstream steps scoped to OrgA
```

---

## Cron fan-out execution model

```
Vercel cron: GET /api/cron/weekly-discovery
        │
        ▼
Route handler (thin trigger only):
  SELECT workspace_id FROM workspace_agent_capabilities
    WHERE agent_type = 'keyword-research' AND status = 'active'
  → returns [orgA, orgB, orgC, orgD, ...]

  await inngest.send(orgs.map(id => ({
    name: "cron/weekly-discovery.run",
    data: { workspaceId: id }
  })))

  return { dispatched: orgs.length }

─────── PER-ORG INNGEST FUNCTION ──────────────────────────────────

function: cron-weekly-discovery-run
  trigger: "cron/weekly-discovery.run"

  step 1 — load-context
    const ctx = await supabase.rpc('get_tenant_context',
      { p_workspace_id: workspaceId })
    // atomic single-transaction read — no mixed state possible

  step 2 — load-effective-config
    const skillConfig = ctx.skill_configs['keyword-research']
    // OrgA's own org_overrides → effective_config (their lineage)
    // OrgB's own org_overrides → effective_config (their lineage)

  step 3 — run-skill
    const result = await claude(
      buildPrompt(skillConfig.effective_config, ctx),
      { metadata: { workspace_id: workspaceId } }  // Portkey tracking
    )

  step 4 — write-results
    INSERT workflow_runs (workspace_id, kind, status='succeeded', output=result)
    UPSERT workspace_skill_calibrations (proposed_delta, status='pending')

  step 5 — post-to-slack
    post to ctx.slack.channel_id only
    (OrgA channel — OrgB never sees OrgA's results)

─────── ISOLATION PROPERTIES ──────────────────────────────────────

  OrgA run crashes at step 3:
    → OrgA's Inngest invocation retries step 3 only (not from step 1)
    → OrgB's invocation is unaffected — separate event
    → OrgA gets error notification on their Slack channel

  OrgA has slow Claude response (40s):
    → does not consume OrgB's Inngest concurrency
    → does not block OrgB's workflow

  Inngest concurrency limit (optional, future):
    max-concurrency: 5 per workspace_id
    → prevents one org from monopolising infra during burst
```

---

## New agent/skill provisioning — 5-step flow

```
OPERATOR wants to ship new skill: "keyword-research-v2"

Step 1 — Code (code deploy)
  ├── Add to SKILL_DEFS in lib/schema.ts
  ├── Add to SKILL_OVERRIDE_SCHEMA (defines what fields the new skill has)
  └── Write Inngest function handler

Step 2 — Registry entry (one INSERT, run in migration script)
  INSERT INTO agent_type_registry
    (agent_type, label, description,
     applicable_streams, default_config, is_ga, introduced_at)
  VALUES
    ('keyword-research-v2',
     'KW Research v2',
     'Enhanced intent clustering with semantic grouping',
     ARRAY['SEO','AEO/GEO'],
     '{}',
     false,       ← beta: not auto-provisioned to new orgs
     now())

Step 3 — Backfill existing orgs (run in migration script)
  INSERT INTO workspace_agent_capabilities
    (workspace_id, agent_type, status, provisioned_at)
  SELECT
    workspace_id, 'keyword-research-v2', 'pending', now()
  FROM workspace_agent_capabilities
  WHERE agent_type = 'keyword-research'
    AND status = 'active'
  ON CONFLICT DO NOTHING

  status = 'pending' means:
    - cron will NOT run this skill yet
    - org sees "New capability available" banner
    - org must opt in before it activates

Step 4 — Notification (3 channels, all async)
  Slack:     "New skill available: KW Research v2
              [enhanced intent clustering].
              Type /activate keyword-research-v2 to switch."
  Email:     product announcement (via Resend/Postmark)
  Dashboard: badge → "1 new capability available"

Step 5 — Org activates
  Org runs: /activate keyword-research-v2
  OR clicks Activate on dashboard

  → UPDATE workspace_agent_capabilities
      SET status = 'active', activated_at = now()
      WHERE workspace_id = OrgA AND agent_type = 'keyword-research-v2'

  → INSERT workspace_skill_configs
      (workspace_id, skill_id='keyword-research-v2',
       org_overrides = {},           ← cold start for new skill
       effective_config = render(base_template_v2, onboarding_data, {}),
       version = 0)

  → Old keyword-research remains status = 'active'
    (org can run both in parallel during transition)
    (org explicitly deactivates old skill when ready)

─────── is_ga = true (generally available) ────────────────────────
  When is_ga flips to true:
    → all new orgs completing onboarding automatically get this skill
    → no manual backfill needed for new orgs going forward
    → existing orgs still on pending/manual activation path
```

---

## Four isolation walls

```
┌─────────────────────────────────────────────────────────────────────┐
│  WALL 1 — DATA                                                       │
│                                                                      │
│  Supabase RLS on every workspace-scoped table.                      │
│  is_workspace_member(workspace_id) → bool                           │
│  Enforced at Postgres driver level — not application layer.         │
│  A Next.js bug cannot cross this wall.                              │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  WALL 2 — EXECUTION                                                  │
│                                                                      │
│  Each org's cron run = separate Inngest invocation.                 │
│  Own retry budget, own timeout, own failure domain.                 │
│  OrgA crash → OrgB unaffected.                                      │
│  OrgA Claude timeout → OrgB doesn't wait.                          │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  WALL 3 — CONFIG                                                     │
│                                                                      │
│  org_overrides is workspace-scoped (PK includes workspace_id).      │
│  effective_config is generated fresh per org per run.               │
│  OrgA's kw_skill calibrations never touch OrgB.                    │
│  System layer (SKILL_OVERRIDE_SCHEMA) defines field names only —   │
│  never writes org values.                                           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  WALL 4 — SLACK ROUTING                                              │
│                                                                      │
│  team_id → workspace_id resolved before any LLM call.              │
│  Bot always responds in org context, org channel only.             │
│  Revocation (app_uninstalled event) sets uninstalled_at             │
│    → immediately blocks all further routing for that install.       │
│  Re-install creates a new slack_installs row.                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Inngest function inventory

| Function name | Trigger | Description |
|---|---|---|
| `slack-command-receiver` | `slack/command.received` | Load context → run skill → post to Slack |
| `skill-config-updater` | `slack/command.skill-update` | Intent extraction → write → history → coherence enqueue |
| `calibration-responder` | `slack/calibration.respond` | Apply or reject a pending calibration proposal |
| `history-fetcher` | `slack/command.history` | Fetch last 5 history rows → format → post to Slack |
| `undo-handler` | `slack/command.undo` | Read history → revert org_overrides → log |
| `skill-activator` | `slack/command.activate-skill` | Set capability to active → seed skill config |
| `weekly-discovery-trigger` | `cron/weekly-discovery.trigger` | Fan-out one event per active org |
| `weekly-discovery-run` | `cron/weekly-discovery.run` | Per-org: load-ctx → run-skill → write → propose-calibration → post |
| `monthly-citation-trigger` | `cron/monthly-citation.trigger` | Fan-out per org |
| `monthly-citation-run` | `cron/monthly-citation.run` | Per-org citation audit |
| `monthly-rubric-trigger` | `cron/monthly-rubric.trigger` | Fan-out per org |
| `monthly-rubric-run` | `cron/monthly-rubric.run` | Per-org content rubric review |
| `eod-memory-trigger` | `cron/eod-memory.trigger` | Fan-out per org |
| `eod-memory-run` | `cron/eod-memory.run` | Per-org end-of-day memory consolidation |
| `coherence-checker` | `workflow/coherence-check` | Async skill config coherence review per org |
| `onboarding-finaliser` | `workflow/onboarding-finalise` | Seed skill configs + capabilities on launch |

---

## Key invariants

| Invariant | Mechanism |
|---|---|
| OrgA cannot read OrgB's data | Supabase RLS on `workspace_id` |
| OrgA workflow failure cannot block OrgB | Separate Inngest invocations per org |
| Slack bot always responds in org context | `team_id → workspace_id` resolved before any LLM call |
| Org customisation survives skill updates | `org_overrides` is org-owned; system layer never overwrites it |
| Any Slack config change is undoable | Append-only `workspace_skill_config_history` table |
| New agent adoption requires no re-onboarding | `loadTenantContext()` shared; only new agent-type config is seeded |
| Bad config is flagged before it runs silently | Async coherence check runs before each cron cycle |
| No mixed-state context reads | `get_tenant_context()` wraps all reads in a single Postgres transaction |
| Concurrent Slack writes don't lose data | Optimistic locking on `workspace_skill_configs.version` |
| `service_role` key never reaches the browser | Only used in server-side cron + admin scripts |
