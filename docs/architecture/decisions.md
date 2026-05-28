# Architectural Decision Log

> Every significant design decision, the options considered, the choice made, and the rationale.
> Ordered by domain, not chronology.

---

## Skill versioning

**Question:** When a skill improves, how does the system manage the upgrade across multiple orgs with different configs?

**Options considered:**
1. Version registry — track `v1`, `v2`, per skill; per-org version pins; three-way merge algorithm
2. New skill model — treat improvements as new agent types (`keyword-research-v2`); per-org `org_overrides` as the only differentiator

**Decision:** Option 2 — new skill model. Skills are stable. When a skill improves meaningfully, it ships as a new agent type, not a version bump.

**Rationale:** Version registries introduce enormous complexity: three-way merge conflicts (base vs org-overrides vs new-version template), per-org migration state machines, and rollback semantics. The core insight is that `org_overrides` already IS the differentiator between orgs — the system doesn't need to track version state at all. Each org's skill evolves independently from cold-start v0 via Slack edits and cron calibrations. When a fundamentally better approach ships, it's a new agent. Orgs opt in. No migration required.

**Scrapped:** `agent_skill_versions` table, `workspace_skill_pins` table, three-way merge algorithm, `agent_version_policy` column on `workspaces`.

---

## Skill ownership model

**Question:** Does each org own its own skill config, or does a shared system template govern all orgs?

**Options considered:**
1. Shared template — all orgs run against a central "keyword-research v5" config; org can only modify a narrow set of parameters
2. Per-org ownership — each org's skill evolves independently from cold-start v0; system owns field names, org owns values

**Decision:** Option 2 — per-org ownership. `kw_research_OrgA` and `kw_research_OrgB` are independent entities that happen to share a cold-start v0.

**Rationale:** Shared templates create implicit coupling. A system-level template change could break orgs that have calibrated their configs over months. Per-org ownership means an org's 3-month calibration history is never at risk from a system deploy. The system layer defines *what fields exist* (in `SKILL_OVERRIDE_SCHEMA` in code). The org decides *what those fields contain* (in `org_overrides` in the database). These two layers have clear ownership and never overwrite each other.

---

## Override schema location

**Question:** Where does `SKILL_OVERRIDE_SCHEMA` live?

**Options considered:**
1. Database table (`skill_schema_registry`) — dynamic, runtime-editable
2. `lib/schema.ts` alongside `SKILL_DEFS` — co-located, deploy-gated

**Decision:** Option 2 — `lib/schema.ts`. Schema is code, not data.

**Rationale:** The schema defines what fields are valid. Changing the schema is a developer action that requires review and testing — not something that should happen via a database edit at runtime. Co-locating it with `SKILL_DEFS` means adding a new skill (SKILL_DEFS entry) and its configurable fields (SKILL_OVERRIDE_SCHEMA entry) happen in the same PR. Deploy-gated changes are safer and reviewable.

---

## Cron calibration — propose vs auto-apply

**Question:** When the cron identifies that an org's skill config should change based on performance data, does it apply automatically or propose for approval?

**Options considered:**
1. Auto-apply — cron writes directly to `org_overrides` if confidence > threshold
2. Propose + approve — cron writes to `workspace_skill_calibrations` (pending); org approves via Slack before it applies
3. Dashboard-only review — proposals only visible in dashboard, no Slack

**Decision:** Option 2 — propose + approve via Slack.

**Rationale:** Auto-apply erodes org trust. An org that wakes up to find their keyword research suddenly prioritises different intent has no agency. The propose + approve model keeps the human in the loop for config changes while still surfacing data-driven suggestions. Slack is where orgs already interact with the system, so the approval flow is frictionless. Dashboard-only review would be ignored.

---

## Calibration staleness — how to handle old unreviewed proposals

**Question:** What happens when a cron cycle runs and the previous calibration proposal was never reviewed?

**Options considered:**
1. Stack proposals — accumulate all proposals; org reviews a queue
2. Replace — new proposal replaces the old one (UPSERT); one active proposal per (workspace, skill) at a time
3. Block — don't generate a new proposal until the old one is reviewed

**Decision:** Option 2 — replace. One active proposal at a time. Previous proposal is overwritten.

**Rationale:** Stacking creates a review backlog that orgs will never clear. Blocking means data-driven suggestions stop flowing if an org ignores one. Replacing ensures the proposal always reflects the latest 4 weeks of data (stale proposals are less relevant anyway). The expiry window (7 days) is the safety valve: if an org ignores 4 consecutive weekly proposals, none of them auto-apply.

**Expiry behaviour:** After 7 days, status → `expired`. The next cron cycle generates a fresh proposal. Auto-apply never happens.

---

## Version history UX

**Question:** How does an org access their skill config change history?

**Options considered:**
1. Dashboard page — full timeline UI with diff viewer
2. Slack command only — `/history keyword-research` shows last 5 changes inline
3. Both

**Decision:** Option 2 — Slack command only (v1).

**Rationale:** Orgs primarily interact with the system through Slack. A dashboard history page is valuable future scope but not required for launch. The Slack command covers the core use case (undo investigation, audit trail) with minimal build cost. The append-only `workspace_skill_config_history` table supports both now and future dashboard UI without schema changes.

---

## Atomic context read

**Question:** `loadTenantContext()` reads from 5 tables. If a step-save happens mid-read, the returned bundle is inconsistent. How do we fix this?

**Options considered:**
1. Application-level locking — prevent concurrent reads + writes
2. Wrap in a Postgres function — single `CALL` returns all tables in one transaction snapshot
3. Accept eventual consistency — tolerate the race condition

**Decision:** Option 2 — Postgres function `get_tenant_context(workspace_id)`, wrapped in a single `SQL` transaction. Fix before launch.

**Rationale:** Application-level locking is complex and fragile across Inngest functions. Eventual consistency creates hard-to-reproduce bugs (e.g., effective_config reflects step 5 data but skill list reflects step 6 data). The Postgres function is a single `stable` SQL function — one RPC call from the app layer, guaranteed single-transaction snapshot. It's a small implementation cost with a large correctness benefit.

---

## Freeform Slack instruction handling

**Question:** A user sends "track audience seniority" to the bot. This doesn't map to any existing field in `SKILL_OVERRIDE_SCHEMA["keyword-research"]`. What happens?

**Options considered:**
1. Add it dynamically — bot adds a new field to `org_overrides` on the fly
2. Ask, then persist — bot confirms with user ("Add as a new permanent setting?"), triggers code deploy if yes
3. Store as raw_instruction — write verbatim to `raw_instruction: string` escape hatch

**Decision:** Three-way classification:
- CLASS A: Fits existing structured field → write directly
- CLASS B: Novel systematic field → ask user ("Should I add this permanently? [Yes/Just this once]"); if Yes → code deploy adds to schema; if Just this once → store as `raw_instruction`
- CLASS C: One-off contextual context → store as `raw_instruction` verbatim

**Rationale:** Dynamic schema modification (Option 1) produces unvalidated fields that break type safety and make cron calibration math unreliable. Always adding to `raw_instruction` (Option 3 only) loses the power of structured fields for calibration. The three-way classification gives orgs the flexibility of freeform input while preserving schema integrity for systematic configuration.

---

## Large job timeout handling

**Question:** Some skill runs (e.g. seed batch processing for 500 keywords) can exceed Vercel's function timeout. How do we handle this?

**Options considered:**
1. Increase Vercel timeout — hit limits at 800s on Pro plan, not suitable for longer runs
2. Break into sub-jobs — Inngest `waitForEvent` + fan-out across sub-events

**Decision:** Option 2 — Inngest `waitForEvent` with fan-out. Seed batches split across multiple sub-events with step-level checkpointing.

**Rationale:** Inngest functions have no timeout ceiling (they can run for hours via step checkpointing). Each step's output is persisted — a transient failure retries only the failed step, not the entire workflow. Fan-out across sub-events also enables per-org isolation naturally: each seed batch event is its own invocation.

---

## Coherence check timing

**Question:** When should the system check whether an org's `org_overrides` contain contradictions?

**Options considered:**
1. On every Slack write — immediate check after each config update
2. Async + pre-cron — run once before each cron cycle, covering all edits since last check
3. Manual only — operator triggers checks on demand

**Decision:** Option 2 — async, non-blocking, runs before each cron cycle.

**Rationale:** Per-edit LLM calls (Option 1) add ~200ms and a Claude API cost to every Slack config update. Most individual edits are coherent — the contradiction risk emerges from the combination of multiple edits over time. Batching the check to pre-cron amortises the cost across multiple changes and catches contradictions at the moment they matter most (before a run). The check is non-blocking: if a contradiction is found, the org is warned via Slack but the workflow still runs.

---

## New capability notification channels

**Question:** When a new agent/skill is shipped and eligible orgs are backfilled to status=`pending`, how are orgs notified?

**Options considered:**
1. Email only
2. Slack only
3. Email + dashboard badge + Slack (three channels)
4. Email + dashboard badge + Slack — but dual Slack channels (execution channel + ops channel) for v2

**Decision:** Option 3 for v1. Option 4 is explicitly scoped to a future phase.

**Rationale:** Email covers async notification (org may not be in Slack at deployment time). Dashboard badge creates in-product visibility. Slack reinforces the notification where orgs already interact with the system. Dual Slack channels (execution outputs vs ops/config alerts) is the right long-term architecture but adds per-org configuration complexity — deferred to Phase 4.

---

## Mid-run skill deploy

**Question:** What happens if the operator deploys a new version of a skill's prompt template while a cron run is in progress?

**Options considered:**
1. Deploy lock — block deploys while runs are in progress
2. Versioned prompt templates — runs pin to a snapshot
3. Non-issue — each org's skill is fully their own

**Decision:** Option 3 — non-issue. No action required.

**Rationale:** Since each org owns their skill from cold-start v0 (no system-level template that governs running orgs), a code deploy that changes the base template only affects orgs that cold-start after the deploy. Running orgs' `effective_config` is their own cached merge — it doesn't change mid-run unless the org's Slack edit triggers a recompute. A deploy during a run has no effect on that run.

---

## Concurrent Slack write conflicts

**Question:** Two members of OrgA send conflicting skill updates simultaneously. Both Inngest functions read `version=5`. The second write would silently overwrite the first.

**Options considered:**
1. Last-write-wins — simpler, accept occasional silent overwrites
2. Optimistic locking — `version` column; `UPDATE ... WHERE version = $read_version`; retry on conflict

**Decision:** Option 2 — optimistic locking.

**Rationale:** Silent overwrites erode trust: a user's update appears to succeed but their change is lost. Optimistic locking is simple to implement (one extra column, one WHERE clause), has zero contention overhead when writes don't conflict (the common case), and lets Inngest's built-in retry mechanism handle the conflict resolution — the second function re-reads the updated version and recomputes its delta on top of the latest state.
