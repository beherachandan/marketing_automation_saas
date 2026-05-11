# Marketing Automation SaaS — Conduct

Demo-grade MVP wrapping the [`marketing_automation`](https://github.com/beherachandan/marketing_automation) engine in a Vercel-hosted onboarding wizard + Slack bot.

## What's inside

- `docs/design-spec.md` — consolidated output of the 6-phase persona debate (read this first).
- `docs/competitive-analysis.md` — Market Critic research (produced by background agent).
- `docs/v0-prompts/` — copy-paste prompts for v0.dev to scaffold each onboarding step.
- `lib/schema.ts` — Zod shapes for all 8 onboarding steps.
- `lib/file-generators.ts` — pure functions that turn onboarding state into the 10 tenant files.
- `app/` — Next.js 15 App Router, Tailwind, shadcn/ui.

## Quick start

```bash
pnpm install        # or npm / yarn
cp .env.example .env.local
# fill in Supabase + Anthropic + Slack keys
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) → Start onboarding.

## MVP scope

**Real**: onboarding UI, Supabase persistence, Slack OAuth + bot, `/audit <url>`, `/draft <topic>`.

**Stubbed**: SEMrush / DFS / Tavily / CMS connections (accept keys, no real calls), host provisioning (fake green), crons (toggles only), E-gate review, publish.

## Ship target

3–4 weeks solo from 2026-05-11. See `docs/design-spec.md` Phase 6 for week-by-week breakdown.
