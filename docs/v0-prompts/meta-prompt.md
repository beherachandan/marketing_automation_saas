# v0.dev — Meta-prompt for the onboarding shell

Paste this as your first prompt in v0.dev. It builds the app shell: routing, stepper, three-column layout, live preview pane, and form context. Individual step contents are delivered as separate prompts after.

---

Build a Next.js 15 App Router onboarding wizard called **Conduct**. TypeScript throughout.

## Stack

- Next.js 15 App Router
- Tailwind CSS v3.4
- shadcn/ui (all primitives)
- React Hook Form + Zod (resolver from `@hookform/resolvers/zod`)
- `geist` package for Geist Sans + Geist Mono
- Supabase (`@supabase/ssr`) — client can be a stub for now

## Layout

Three-column + top bar + footer:

- **Top bar** — 56px, sticky top. Left: "Conduct" wordmark in Geist Mono, 14px semibold. Right: workspace switcher (Select primitive) + user avatar + dark-mode toggle.
- **Left stepper** — 240px wide, sticky, lists 8 steps with icons (use `lucide-react`). Active step: zinc-900 left border 3px + zinc-50 background. Completed: emerald-600 check icon. Upcoming: zinc-400 text. Step label 13px, sub-label ("IDENTITY.md + USER.md") 11px zinc-500.
- **Center form** — `max-w-[640px]` centered, 48px top padding, scrollable, bottom padding 96px.
- **Right preview** — 360px wide, sticky. Zinc-50 background. Top tab bar shows the file path(s) this step writes (use Tabs primitive when multiple files). Body: Geist Mono 12px, zinc-500 text, pre-wrap whitespace. Read-only. If no content yet, show muted placeholder "Fill in the form to preview output".
- **Footer** — 64px, sticky bottom, border-top. Left: ghost "← Back". Center: "Step N of 8 · <title>" muted. Right: primary "Continue →" button.

## Routes

- `/` — landing page (already stubbed, don't rebuild)
- `/onboarding` → redirect to `/onboarding/step-1`
- `/onboarding/step-1` through `/onboarding/step-8`
- `/dashboard` — stub (post-onboarding home), just a heading for now

Each `/onboarding/step-N` uses the shared layout from `app/onboarding/layout.tsx`.

## Design system

- **Palette**: zinc-only. Success = emerald-600. Destructive = red-600. No brand accent. Already wired via CSS vars in `app/globals.css` — just use Tailwind `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, etc.
- **Typography**: Geist Sans UI / Geist Mono for previews + code. Body 13px (already set on `body`). Labels: use `.label-uppercase` utility class (already defined: 11px uppercase tracking-wide muted). Headings: H1 24px semibold, H2 18px semibold, H3 15px medium.
- **Spacing**: 8px grid. 12px between fields, 16px between groups, 32px between sections.
- **Components**: shadcn/ui primitives only. `shadow-sm` maximum. No gradients. Radius `md` (0.375rem) everywhere.

## Form state

- Shared `FormProvider` at `app/onboarding/layout.tsx` level so the preview pane reads live values via `useWatch`.
- Import Zod schemas from `@/lib/schema` — the per-step schemas are named `step1Schema` through `step8Schema`.
- Import generators from `@/lib/file-generators` — `toIdentityMd`, `toUserMd`, `toProductContextMd`, `toBrandVoiceMd`, `toAeoGuidelinesMd`, `toAeoScoringRubricMd`, `toTrendSeedsJson`, `toWebflowIdsMd`, `toTenantJson`, `toToolsMd`. Use them to render the live preview pane.
- Debounce preview render 200ms.
- Persist each step on valid submit (call a stub `saveStep(n, data)` in `@/lib/persist` — create that file returning a resolved promise for now).

## Stepper data

```ts
const STEPS = [
  { n: 1, title: "Workspace & Identity", files: ["IDENTITY.md", "USER.md"] },
  { n: 2, title: "Product Context", files: ["product-context.md"] },
  { n: 3, title: "ICPs", files: ["product-context.md"] },
  { n: 4, title: "Brand Voice", files: ["brand-voice-guide.md"] },
  { n: 5, title: "Content Strategy & AEO", files: ["aeo-guidelines.md", "aeo-scoring-rubric.md"] },
  { n: 6, title: "Demand Seeds", files: ["trend-seeds.json"] },
  { n: 7, title: "Integrations", files: ["tenant.json", "TOOLS.md"] },
  { n: 8, title: "Launch", files: [] },
]
```

## Preview pane tabs

When a step writes multiple files (steps 1, 5, 7), show a Tabs primitive at top of the preview pane to switch between file outputs. Single-file steps have no tabs, just the file path as header.

## Dark mode

- Toggle switches `.dark` class on `<html>` via `next-themes` (add it).

## Accessibility

- Every form field has a `Label` + description.
- Zod errors render below the field in red-600 11px.
- Stepper is a `<nav aria-label="Onboarding steps">` with `aria-current="step"` on active.

## Don't build step contents yet

Steps 1–8 each render `<div>Step N content placeholder</div>`. I will deliver each step's content in a follow-up prompt.

## Deliverable

1. `app/onboarding/layout.tsx` — three-column shell with FormProvider and preview-pane component.
2. `app/onboarding/step-[1..8]/page.tsx` — 8 placeholder pages.
3. `components/onboarding/Stepper.tsx` — left-column stepper.
4. `components/onboarding/PreviewPane.tsx` — right-column preview, reads from `useWatch`.
5. `components/onboarding/Footer.tsx` — bottom nav.
6. `lib/persist.ts` — stub `saveStep(n, data)`.
7. Install & register shadcn/ui: button, input, textarea, label, tabs, select, checkbox, radio-group, slider, switch, accordion, badge, card, progress, tooltip, toast.

Ship clean, production code. No TODOs. No placeholder lorem text in components that aren't step content.
