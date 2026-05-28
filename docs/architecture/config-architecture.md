# Config Architecture

> How skill configuration is owned, modified, versioned, and calibrated per organisation.

---

## Two-layer model: system owns structure, org owns calibration

```
SYSTEM LAYER  (in code, ships with deploys)
─────────────────────────────────────────────────────────────────────
lib/schema.ts

SKILL_OVERRIDE_SCHEMA = {
  "keyword-research": {
    focus:          string,       // "long-tail question KWs"
    deprioritize:   string[],     // ["branded", "competitors"]
    weights:        { informational: number, commercial: number },
    output_format:  string,
    custom_context: string,       // "Enterprise B2B, VP-level buyers"
    raw_instruction?: string,     // ← universal escape hatch
  },
  "citation-audit": {
    competitor_list:  string[],
    probe_frequency:  "weekly" | "monthly",
    alert_threshold:  number,
    raw_instruction?: string,
  },
  ...one entry per skill in SKILL_DEFS
}

The operator defines what fields a skill has.
The org decides the values.
These two layers never overwrite each other.

─────────────────────────────────────────────────────────────────────
ORG LAYER  (in database, per workspace_id)
─────────────────────────────────────────────────────────────────────

workspace_skill_configs
  PK: (workspace_id, skill_id)

  org_overrides: jsonb     ← org's customisations ONLY
  effective_config: jsonb  ← cached merge of base template + org_overrides
  version: int             ← optimistic lock (see data-architecture.md)
```

### Merge at render time

```
System base template (from SKILL_OVERRIDE_SCHEMA)
        +
org_overrides (from workspace_skill_configs)
        ↓
effective_config  (cached result, always rebuildable)

OrgA after 3 months:             OrgB after 3 months:
  org_overrides: {                  org_overrides: {
    focus: "question KWs              focus: "brand KWs",
      for VP Engineering",            custom_context:
    weights: {                          "SMB e-commerce"
      informational: 0.7,           }
      commercial: 0.3
    }
  }

Both started from cold-start v0 (org_overrides = {}).
Each evolved independently. Neither lineage touches the other.
```

---

## SKILL_OVERRIDE_SCHEMA — full structure

```ts
// Every skill gets this field automatically (universal escape hatch)
type UniversalOverrides = {
  raw_instruction?: string
  // Verbatim freeform context, injected into the prompt as-is.
  // Used for one-off contextual instructions, e.g.:
  //   "Q3 campaign targeting CFOs in fintech"
  // Never used for systematic configuration — that lives in structured fields.
}

// Full schema (abbreviated — see lib/schema.ts for canonical definition)
export const SKILL_OVERRIDE_SCHEMA = {
  "keyword-research": {
    focus:            { type: "string",   label: "Focus intent" },
    deprioritize:     { type: "string[]", label: "Deprioritise terms" },
    weights:          { type: "object",   label: "Intent weights",
                        fields: { informational: "number", commercial: "number" } },
    output_format:    { type: "string",   label: "Output format" },
    custom_context:   { type: "string",   label: "Custom context" },
    raw_instruction:  { type: "string",   label: "Freeform instruction" },
  },
  "trend-discovery": {
    topics:           { type: "string[]", label: "Seed topics" },
    exclude_topics:   { type: "string[]", label: "Exclude topics" },
    raw_instruction:  { type: "string",   label: "Freeform instruction" },
  },
  "citation-audit": {
    competitor_list:  { type: "string[]", label: "Competitors to track" },
    probe_frequency:  { type: "enum",     values: ["weekly", "monthly"] },
    alert_threshold:  { type: "number",   label: "Alert below N citations" },
    raw_instruction:  { type: "string",   label: "Freeform instruction" },
  },
  // ...one entry per SKILL_DEFS skill
}
```

---

## Slack intent classification — three-way

Every Slack message that touches skill config goes through Claude intent classification before any write.

```
User Slack message
        │
        ▼
POST /api/slack/commands
  → ACK 200 immediately
  → enqueue: Inngest { name: "slack/command.skill-update", data: {...} }
        │
        ▼  Inngest: step 2 — extract-intent  (Claude call)
        │
        │  context: current org_overrides + SKILL_OVERRIDE_SCHEMA for this skill
        │  task:    "classify instruction and produce a delta"
        │
        ├── CLASS A: Fits an existing structured field
        │     "weight commercial higher"
        │     → delta: { weights: { commercial: 0.8, informational: 0.2 } }
        │     → write directly to org_overrides
        │
        ├── CLASS B: Novel systematic field
        │     "track audience seniority"
        │     → "This looks like a new setting. Should I add
        │         'audience_seniority' to your keyword research permanently?
        │         [Yes, add it] / [Just this once]"
        │
        │     If YES:  code deploy required (operator adds field to SKILL_OVERRIDE_SCHEMA)
        │               then write to new structured field
        │     If ONCE: store verbatim in raw_instruction
        │
        └── CLASS C: One-off contextual context
              "Q3 campaign targeting CFOs in fintech"
              → write verbatim to raw_instruction
              (overwrites previous raw_instruction — latest wins)
```

---

## Slack config update — full Inngest flow

```
OrgA Slack: "weight commercial intent higher, we're bottom-funnel"
        │
        ▼
POST /api/slack/commands
  → verify SLACK_SIGNING_SECRET
  → team_id → workspace_id (OrgA)
  → ACK 200 immediately
  → inngest.send({ name: "slack/command.skill-update",
                   data: { workspaceId, text, skillHint } })
        │
        ▼  Inngest function: skill-config-updater
        │
  step 1: load-current-config
    SELECT * FROM workspace_skill_configs
    WHERE workspace_id = OrgA AND skill_id = 'keyword-research'
    → { org_overrides, effective_config, version: 5 }

  step 2: extract-intent  (Claude call, ~200ms)
    INPUT:
      current_overrides: { focus: "question KWs for VP Engineering" }
      schema: SKILL_OVERRIDE_SCHEMA["keyword-research"]
      instruction: "weight commercial intent higher, we're bottom-funnel"
    OUTPUT:
      { delta: { weights: { commercial: 0.8, informational: 0.2 } },
        class: "A",
        explanation: "Shifted to 80/20 commercial/informational" }

  step 3: write
    new_overrides = merge(current_overrides, delta)
    new_effective = render(base_template, new_overrides)
    UPDATE workspace_skill_configs
      SET org_overrides = new_overrides,
          effective_config = new_effective,
          version = version + 1,
          last_modified_at = now(),
          last_modified_via = 'slack'
      WHERE workspace_id = OrgA AND skill_id = 'keyword-research'
        AND version = 5          ← optimistic lock
    → if 0 rows affected: conflict → Inngest retries step with fresh read

    INSERT workspace_skill_config_history
      (workspace_id, skill_id, changed_at, changed_by,
       source, delta, previous_value, new_value)

  step 4: queue-coherence-check  (non-blocking)
    inngest.send({ name: "workflow/coherence-check",
                   data: { workspaceId, skillId } })

  step 5: post-to-slack
    "Updated ✓ — keyword research now 80% commercial intent.
     Previous: 50/50 split.
     Say 'undo keyword research change' to revert."
```

---

## Undo flow

```
User: "undo keyword research change"
        │
        ▼
  SELECT * FROM workspace_skill_config_history
  WHERE workspace_id = OrgA AND skill_id = 'keyword-research'
  ORDER BY changed_at DESC LIMIT 1

  → previous_value = { focus: "question KWs for VP Engineering" }

  UPDATE workspace_skill_configs
    SET org_overrides = previous_value,
        effective_config = render(base_template, previous_value),
        version = version + 1,
        last_modified_via = 'slack'
    WHERE workspace_id = OrgA AND skill_id = 'keyword-research'
      AND version = $current_version

  INSERT workspace_skill_config_history
    (source = 'undo', delta = ...)

  Slack reply: "Reverted. Keyword research is back to
                question-intent focus, 50/50 weights."
```

---

## Cron calibration loop

```
WEEKLY CRON completes for OrgA
        │
        ▼
  Analyse run output:
    - keyword performance data
    - citation rates
    - content scoring trends
        │
        ▼
  Generate proposed calibration delta:
    { weights: { commercial: 0.7, informational: 0.3 } }
    rationale: "Commercial KWs drove 3x qualified traffic last 4 weeks"
        │
        ▼
  UPSERT workspace_skill_calibrations
    ON CONFLICT (workspace_id, skill_id)
    DO UPDATE SET
      proposed_delta = ...,
      rationale = ...,
      status = 'pending',
      proposed_at = now(),
      expires_at = now() + interval '7 days'
  → Previous unreviewed proposal is REPLACED (not stacked)
        │
        ▼
  Post to OrgA Slack channel:
    "Weekly calibration suggestion for Keyword Research:
     Shift weights to 70% commercial (was 50%) — commercial KWs
     drove 3× more qualified traffic last 4 weeks.
     [Approve] [Reject] [See details]"

─────── APPROVAL PATH ──────────────────────────────────────────────
ON [Approve] button click:
  → apply proposed_delta to org_overrides (via skill-config-updater flow)
  → INSERT history row (source = 'cron_calibration')
  → UPDATE workspace_skill_calibrations SET status = 'applied', resolved_at = now()
  → Slack reply: "Applied ✓ — calibration is now active."

─────── REJECTION PATH ─────────────────────────────────────────────
ON [Reject] button click:
  → UPDATE workspace_skill_calibrations SET status = 'rejected', resolved_at = now()
  → Slack reply: "Got it. No change made."

─────── EXPIRY PATH ────────────────────────────────────────────────
ON expires_at REACHED (no response in 7 days):
  → UPDATE workspace_skill_calibrations SET status = 'expired'
  → Next cron cycle generates a FRESH proposal from latest 4-week data
  → Old proposal never auto-applies
```

---

## Coherence check — async, non-blocking

```
TRIGGER: before each cron workflow run for an org
         NOT on every Slack edit (avoids per-edit LLM cost)

FOR EACH skill with org_overrides modified since last coherence check:
  Claude call:
    CONTEXT: full effective_config for this skill
    TASK: "Review this config. Identify contradictions or settings
           that would produce incoherent behaviour.
           Return: { coherent: bool, issues: string[] }"

  IF coherent = true:
    → proceed with cron run, no action

  IF coherent = false:
    → POST to OrgA Slack:
        "⚠ Config warning for Keyword Research:
         'deprioritize: commercial' conflicts with
         'weights: {commercial: 0.8}'.
         Run will proceed — update your settings to resolve."
    → Flag in dashboard (config health panel)
    → Workflow still runs (user warned, not blocked)
    → Log issues in workspace_skill_config_history
       (source = 'coherence_check')
```

---

## Skill config lifecycle — full arc

```
─── COLD START (onboarding complete) ───────────────────────────────

  operator defines:   SKILL_OVERRIDE_SCHEMA["keyword-research"]
                      base prompt template (lib/schema.ts or agents/)
  org gets:           workspace_skill_configs row
                        org_overrides    = {}
                        effective_config = render(base_template, step_1-7_data, {})
                        version          = 0

─── WEEK 1 — Slack edit ────────────────────────────────────────────

  user:               "focus on question-intent keywords for VP Engineering"
  bot classifies:     CLASS A → fits 'focus' structured field
  writes:             org_overrides = { focus: "question-intent KWs for VP Eng" }
  logs:               history row (source = 'slack')
  effective_config:   rebuilt → "...focus: question-intent KWs for VP Eng..."

─── WEEK 4 — Cron calibration ──────────────────────────────────────

  cron observes:      commercial KWs drove 3× qualified traffic
  proposes:           { weights: { commercial: 0.7, informational: 0.3 } }
  writes:             workspace_skill_calibrations (status = 'pending')
  slacks:             "Calibration suggestion: shift to 70% commercial. [Approve]"

  ON APPROVE:
    org_overrides = { focus: "...", weights: { commercial: 0.7, informational: 0.3 } }
    history row (source = 'cron_calibration')
    calibration status = 'applied'

─── MONTH 3 — OrgA vs OrgB ─────────────────────────────────────────

  OrgA's kw_skill config:            OrgB's kw_skill config:
    focus: question-intent              focus: brand KWs
    weights: 70/30 commercial           weights: 40/60 commercial
    (Slack + cron lineage)              (independent lineage)

  Same skill. Same cold-start v0. Completely independent evolution.

─── NEW SKILL SHIPS ────────────────────────────────────────────────

  e.g. keyword-research-v2 (enhanced intent clustering)
    → new entry in SKILL_DEFS + SKILL_OVERRIDE_SCHEMA (code deploy)
    → backfill: workspace_agent_capabilities for eligible orgs (status='pending')
    → notification via Slack + email + dashboard badge
    → org activates: /activate keyword-research-v2
    → new org_overrides starts fresh at {}  (cold start again)
    → old keyword-research remains active until org explicitly migrates
    → both can run in parallel during transition
```

---

## Dashboard config review panel

```
For each active skill:
  ┌────────────────────────────────────────────────────────────┐
  │ Keyword Research                          v7 · enriched    │
  │                                                            │
  │ focus         question-intent KWs for VP Engineering       │
  │ weights       commercial: 70%  informational: 30%          │
  │ deprioritize  branded, navigational                        │
  │ raw_instr     Q3 focus: CFO-level decision makers          │
  │                                                            │
  │ [Edit]  [View history]  [Undo last change]                 │
  └────────────────────────────────────────────────────────────┘

  Pending calibration banner:
  ┌────────────────────────────────────────────────────────────┐
  │ ⚡ Calibration suggested — 3 days left to review           │
  │ "Shift to 80% commercial — drove 3× traffic last 4 wks"   │
  │ [Approve]  [Reject]  [Details]                             │
  └────────────────────────────────────────────────────────────┘
```
