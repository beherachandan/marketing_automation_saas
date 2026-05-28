# Conduct — Architecture Documentation

> Multi-tenant marketing automation SaaS. Each organisation gets a fully isolated AI agent pipeline that evolves independently through onboarding, Slack interactions, and cron-driven self-calibration.

---

## Documents in this folder

| File | What it covers |
|---|---|
| [ERD.md](./ERD.md) | Full entity-relationship diagram — every table, every FK, cardinalities |
| [data-architecture.md](./data-architecture.md) | Tables in depth, RLS policies, tenant isolation model |
| [config-architecture.md](./config-architecture.md) | Skill config ownership, org_overrides, calibration loop, Slack update flow |
| [system-architecture.md](./system-architecture.md) | Full system topology, Inngest execution model, Slack routing, upgrade flow |
| [decisions.md](./decisions.md) | Design decision log — every architectural decision, rationale, and trade-offs considered |

---

## Core principles

1. **Each org is a silo.** Data, execution, and config are fully isolated per `workspace_id`. A bug in one org's workflow cannot affect another.

2. **Each org owns its skills.** `kw_research_OrgA` and `kw_research_OrgB` start from the same cold-start v0 but evolve independently via Slack edits and cron calibrations. No shared mutable state.

3. **System ships structure. Orgs own calibration.** The operator defines what fields a skill has. The org decides the values. These two layers never overwrite each other.

4. **Execution is durable.** All async work runs through Inngest with step-level checkpointing. A transient Claude API failure retries the step, not the whole workflow. OrgA's failure never blocks OrgB.

5. **Config changes are always reversible.** Every Slack edit, cron calibration, and onboarding write is append-logged. Full undo is always possible.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend + API | Next.js 15 App Router (Vercel) |
| Database + Auth | Supabase (Postgres + RLS + magic link) |
| Async execution | Inngest (durable functions, fan-out) |
| LLM calls | Claude (Anthropic) via Portkey gateway |
| Slack | Slack Bolt / OAuth — one install per org |

---

## Quick orientation: what happens when an org uses the product

```
1. ONBOARDING (steps 1–8)
   Org configures agent name, product, ICPs, brand voice,
   strategy, seeds, integrations → system generates
   cold-start skill configs (v0) for each active skill

2. LIVE (post-launch)
   Weekly cron → keyword discovery, citation audit, content scoring
   Monthly cron → citation audit, rubric review
   Each cron run is scoped to one org, isolated from all others

3. SLACK INTERACTIONS
   User talks to bot → bot resolves team_id → workspace_id →
   loads org's effective_config → executes skill → responds in context

4. SELF-CALIBRATION
   After each cron run, system proposes config improvements
   Org approves/rejects via Slack
   Approved calibrations update org's skill config (logged, undoable)
```
