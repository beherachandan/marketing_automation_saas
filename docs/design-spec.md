# Marketing Automation SaaS — MVP Design Spec

Compressed outcome of the 6-phase persona debate (Phases 0–5).
Source engine: `../marketing_automation/` (OpenClaw-based).

---

## Phase 0 — Engine surface area

The engine consumes **10 tenant config files** + credentials in `~/.openclaw/openclaw.json`:

| # | File | Purpose |
|---|---|---|
| 1 | `IDENTITY.md` | Agent name, role, active streams |
| 2 | `USER.md` | Human contact, timezone |
| 3 | `TOOLS.md` | Local env map (Slack channel ID, CMS site ID) |
| 4 | `aeo/context/product-context.md` | Product + ICPs |
| 5 | `aeo/context/brand-voice-guide.md` | Tone, rules, forbidden words |
| 6 | `aeo/context/aeo-guidelines.md` | Content strategy, URL format |
| 7 | `aeo/context/aeo-scoring-rubric.md` | 9-dim weights (sum = 100) |
| 8 | `skills/trends-researcher/scripts/trend-seeds.json` | Seed keywords |
| 9 | `skills/F1-webflow-publisher/references/webflow-ids.md` | CMS collection IDs |
| 10 | `config/tenant.json` | `{ semrush_api_key, slack_channel }` |

Pipeline: `topic-researcher → strategist → writer → reviewer → C5 → E1 → E2 → F1`.
Gates: D1 ≥ 7.0, E1 brand, E2 ICP.
Crons (4): EOD memory, weekly discovery, monthly citation, monthly rubric.

---

## Phase 1 — Product Head: Core Value Loop

**JTBD:** "I want an autonomous AEO team that audits what we have and drafts what we need — using our brand voice and product context — without me rebuilding prompts every time."

**The loop**
Onboard → Slack install → `/audit <url>` or `/draft <topic>` → output is brand-aligned and ICP-targeted → user sees value in under 10 minutes from signup.

**Critical inputs** (no engine value without these)
- Product (name, one-liner, long desc, features, positioning)
- Brand voice (tone, attributes, hard rules, forbidden words, examples)
- ≥1 ICP (name, role, pain, goals, JTBD)
- Slack workspace + channel

**Comfort inputs** (stubbed or deferred in MVP)
- AEO rubric weights — ship with defaults, edit later
- Trend seeds — optional
- SEMrush/DFS/Tavily keys — accept, don't necessarily call
- CMS connection + field mapping — accept, no publish in demo

---

## Phase 2 — Market Critic (parallel research → `competitive-analysis.md`)

Working hypothesis until research agent returns:

| Competitor | What they do | Our wedge |
|---|---|---|
| AirOps | Broad AI workflow canvas | Opinionated AEO + Slack-native |
| Profound | AEO monitoring dashboards | We close the loop: monitor → create |
| Writer | Brand-voice AI writing | Rubric-first + evaluator baked in |
| Jasper | Generic AI marketing writer | AEO-optimised, not generic content |
| Letterdrop | Newsletter / content ops | AEO, not newsletter |

**Aha moment:** `/audit https://competitor.com/blog/x` in Slack → scored audit in 30s, already in *your* brand lens. No other tool does this in Slack natively.

---

## Phase 3 — Technical Architect

**Stack**
- Next.js 15 App Router + React 19 + TypeScript
- Tailwind v3.4 + shadcn/ui
- React Hook Form + Zod
- Supabase (Postgres + Auth + Vault)
- Vercel hosting (Edge + Node runtimes)
- Anthropic Claude for audit + draft agents
- Slack OAuth + Bolt SDK

**Data model**

```
users                  (Supabase auth)
workspaces             (id, name, owner_id, created_at)
tenant_configs         (workspace_id PK, step1_json..step8_json JSONB, updated_at)
integrations           (workspace_id, kind, encrypted_tokens, status, last_checked_at)
slack_installs         (workspace_id, team_id, bot_token_encrypted, channel_id, channel_name)
runs                   (id, workspace_id, kind ['audit'|'draft'], input, output_md, score, tokens_in, tokens_out, created_at)
```

**Edges cases handled in MVP**
- Slack token revoked → reinstall CTA in dashboard
- LLM timeout → surface in Slack with retry
- `/audit` on unreachable URL → graceful Slack error
- Concurrent `/audit` calls → queued per workspace

**Edge cases stubbed in MVP**
- Non-Slack integrations (SEMrush, DFS, Tavily, CMS) show green without calling
- Host provisioning → fake-provisioned state
- Cron registration → toggles persist, no real scheduler

**Auth model**
- Supabase email magic link (MVP). Google OAuth in v2.

**LLM safety**
- All prompts server-side only.
- Tenant context injected at system level, never user-editable from Slack.

---

## Phase 4 — Design Head: 8-step UI spec

**Layout**
- Top bar (56px): "Conduct" wordmark (Geist Mono) left · workspace switcher + avatar right
- Left stepper (240px, sticky): 8 steps, zinc-900 left border on active, emerald checkmark on complete
- Center (max-w-640px): form, 48px top padding
- Right (360px, sticky): live Markdown preview in Geist Mono 12px zinc-500, tab bar shows target file path
- Footer (64px): Back / progress / Continue

**Design system**
- Palette: zinc-only. Success emerald-600. Destructive red-600. No brand accent.
- Typography: Geist Sans UI / Geist Mono preview. 13px body. 11px uppercase labels.
- Components: shadcn/ui primitives. `shadow-sm` max. No gradients. Radius md (6px).
- Spacing: 8px grid. 12px field gap, 16px group gap, 32px section gap.
- Dark mode toggle in top bar.

**Steps**

| # | Title | Writes | Real vs Stub |
|---|---|---|---|
| 1 | Workspace & Identity | `IDENTITY.md` + `USER.md` | Real |
| 2 | Product Context | `product-context.md` (product section) | Real |
| 3 | ICPs | `product-context.md` (ICP section) | Real |
| 4 | Brand Voice | `brand-voice-guide.md` | Real |
| 5 | Content Strategy & AEO | `aeo-guidelines.md` + `aeo-scoring-rubric.md` | UI real, defaults seeded, agents read from DB |
| 6 | Demand Seeds | `trend-seeds.json` | UI real, consumed only by weekly cron (stubbed) |
| 7 | Integrations | `tenant.json` + `TOOLS.md` + `webflow-ids.md` | Slack REAL · SEMrush/DFS/Tavily/CMS STUB |
| 8 | Launch | Host mode + cron toggles + setup check | STUB (fake green) + real Slack deep link |

**Per-step states**: idle · editing · validating · saved · error · partial.

---

## Phase 5 — Reconciled MVP surface

**What ships real** in the 3-week demo MVP:
1. Full 8-step onboarding UI, all validated, persisted to Supabase.
2. Markdown file generation for all 10 files (downloadable as zip at end).
3. Slack OAuth install + bot in the selected channel.
4. `/audit <url>` — fetches URL, runs Claude audit using tenant brand + product + rubric, posts score card to thread.
5. `/draft <topic>` — generates article draft using tenant context, posts to thread.

**What ships as stub** (visual parity, backend fake-success):
- Non-Slack integrations
- CMS field mapping
- Host provisioning
- Cron scheduler
- E-gate review UI
- F1 publish

---

## Phase 6 — Build order (3-week sprint from today 2026-05-11)

**Week 1 — Shell + forms**
- D1-2: Next.js scaffold, Supabase, shadcn, auth, stepper layout
- D3-4: Steps 1–4 (real)
- D5: Steps 5–8 (stubs visually identical to real)

**Week 2 — Slack + audit**
- D6-7: Slack OAuth + bot install
- D8-10: `/audit` agent end-to-end

**Week 3 — Draft + polish + ship**
- D11-12: `/draft` agent end-to-end
- D13-14: States, errors, microcopy, preview polish
- D15: Deploy + internal demo

**Human intervention checkpoints**
1. End of Phase 2 research — approve positioning
2. End of Week 1 — walk Steps 1–4 in live app
3. Before Slack app submission — confirm scopes
4. Pre-demo — you are first tenant
