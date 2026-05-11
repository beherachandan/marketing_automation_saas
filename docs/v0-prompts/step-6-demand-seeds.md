# v0.dev — Step 6: Demand Seeds

Fills `app/onboarding/step-6/page.tsx`. Writes `trend-seeds.json`.

---

Build **Step 6 — Demand Seeds**.

## Schema (`@/lib/schema`)

```ts
step6Schema = z.object({
  seeds: z.array(z.string().min(2).max(120)).min(5).max(50),
})
```

## Form layout

**Group 1 — Seeds**

Label "Demand seeds" + helper "5–50 topics or queries the engine monitors weekly to spot emerging demand. Think keywords, prompts, pain points, or competitor moves."

Render a **tag-input grid**:
- shadcn `Input` with placeholder "Type a seed and press Enter".
- Pressing Enter / Tab / comma commits the text as a new seed badge.
- Below the input, render each seed as a `Badge` with a small × to remove.
- Show a live counter next to the label: `{seeds.length}/50` (red-600 if <5 or >50, zinc-500 otherwise).
- Disable input when at 50.

Layout the badges in a flex-wrap with 6px gap. Badge style: `variant="secondary"` with `pr-1` to fit the × button.

**Group 2 — Bulk import** (collapsible `Accordion`, default collapsed)

- Textarea `rows={8}`. Label "Paste one per line". Helper "One seed per line. Commits on blur. Replaces existing seeds — use with intent."
- "Replace seeds" button (destructive-ghost) — confirms via shadcn `AlertDialog` before overwriting.

**Group 3 — Starter suggestions**

Label "Not sure where to start?" + helper "Click to add. These are generic examples — swap for your own."

Render a flex-wrap of preset badges (outlined, clickable — add on click, disable if already in list or at 50):

```
"how to <category> for <ICP>", "<product> vs <competitor>", "best practices <category>",
"<ICP> workflow 2026", "case study <product>", "AI <category> trends",
"<category> ROI", "<ICP> pain points", "compliance in <category>",
"alternatives to <competitor>"
```

Clicking a preset appends it as a literal string (user edits inline via double-click → Input swap).

## Preview pane

Single tab: `trend-seeds.json`.

```ts
import { toTrendSeedsJson } from "@/lib/file-generators"
const values = useWatch({ control })
const preview = toTrendSeedsJson(values)
```

Render inside the preview with `language="json"` styling (mono 12px zinc-600).

## Content copy

```
Demand Seeds
```

```
The engine's weekly trend-researcher uses these to surface rising demand you should jump on. Mix broad category queries with specific competitor comparisons and ICP-pain phrases — the spread matters more than the cleverness.
```

## Submission

Validate → `saveStep(6, data)` → `/onboarding/step-7`.

Disable Continue if `seeds.length < 5`.

## Defaults

```ts
const defaultValues = {
  seeds: [],
}
```
