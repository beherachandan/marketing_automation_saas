# v0.dev — Step 5: Content Strategy & AEO

Fills `app/onboarding/step-5/page.tsx`. Writes `aeo-guidelines.md` and `aeo-scoring-rubric.md`.

---

Build **Step 5 — Content Strategy & AEO**.

## Schema (`@/lib/schema`)

```ts
step5Schema = z.object({
  guidelines: z.object({
    articleStructure: z.string().min(10).max(2000),
    urlFormat: z.string().min(1).max(200),
    headingPolicy: z.string().min(10).max(800),
    citationPolicy: z.string().min(10).max(800),
  }),
  rubric: z.object({
    structure: z.number().int().min(0).max(100),
    factuality: z.number().int().min(0).max(100),
    citation: z.number().int().min(0).max(100),
    clarity: z.number().int().min(0).max(100),
    intent: z.number().int().min(0).max(100),
    brandAlignment: z.number().int().min(0).max(100),
    icpFit: z.number().int().min(0).max(100),
    freshness: z.number().int().min(0).max(100),
    uniqueness: z.number().int().min(0).max(100),
  }).refine((v) => Object.values(v).reduce((a, b) => a + b, 0) === 100, {
    message: "Rubric weights must sum to 100",
  }),
  passThreshold: z.number().min(5).max(10).default(7.0),
})
```

Import `rubricDefaults` from `@/lib/schema` for the default weights.

## Form layout

**Group 1 — Guidelines**

Four Textareas, stacked:

1. `guidelines.articleStructure` — `rows={5}`. Label "Article structure". Helper "How you want every article scaffolded. Cover hook, TL;DR, sections, CTA. 10–2000 chars." Placeholder:
   ```
   1. 50-word TL;DR box at top
   2. H2 sections only (no H3 unless listing 4+ items)
   3. One pull-quote per article
   4. Closing "What to do next" with 2 CTAs
   ```

2. `guidelines.urlFormat` — Input. Label "URL format". Helper "Slug pattern. Engine enforces this on publish." Placeholder `/blog/{slug}` or `/resources/{category}/{slug}`.

3. `guidelines.headingPolicy` — Textarea `rows={3}`. Label "Heading policy". Helper "Capitalization, length, question-style. 10–800 chars."

4. `guidelines.citationPolicy` — Textarea `rows={3}`. Label "Citation policy". Helper "Required sources, formatting, minimum count. 10–800 chars."

**Group 2 — Scoring rubric**

Label "AEO scoring rubric" + helper "Nine dimensions weighted out of 100. The engine scores every draft here."

Render a 2-column grid (≥md) of rows. Each row:
- Left: dimension label (11px uppercase zinc-700) + small description in zinc-500 12px
- Right: shadcn `Slider` min=0 max=30 step=1 + numeric display `{value}`

Nine dimensions with descriptions:
- `structure` — "Follows your article scaffold"
- `factuality` — "Claims are accurate and sourced"
- `citation` — "Links are present and credible"
- `clarity` — "Reads clean, no jargon dumps"
- `intent` — "Matches the search intent"
- `brandAlignment` — "Feels on-brand for your voice"
- `icpFit` — "Lands for your target ICP"
- `freshness` — "Reflects recent data/context"
- `uniqueness` — "Says something non-obvious"

Below the sliders, show a **sum indicator**:
- `<div className="flex justify-between text-xs">Total: <span className={total === 100 ? "text-emerald-600" : "text-red-600"}>{total}/100</span></div>`
- Disable Continue if total !== 100. Render red-600 error below if mismatched.

**Group 3 — Pass threshold**

Single slider: `passThreshold` min=5 max=10 step=0.1. Label "Pass threshold". Helper "D1 evaluator must score at or above this for a draft to advance past the quality gate. Default 7.0."

Display `{value.toFixed(1)}/10` next to slider.

## Preview pane

Tabs: `aeo-guidelines.md` (default) and `aeo-scoring-rubric.md`.

```ts
import { toAeoGuidelinesMd, toAeoScoringRubricMd } from "@/lib/file-generators"
const values = useWatch({ control })
const guidelines = toAeoGuidelinesMd(values)
const rubric = toAeoScoringRubricMd(values)
```

## Content copy

```
Content Strategy & AEO
```

```
Two files. Guidelines tell the writer how every article should feel. Rubric tells the evaluator how to score it. The engine uses both in every run — tight rubrics produce tight content.
```

## Submission

Validate (including rubric-sums-to-100 refinement) → `saveStep(5, data)` → `/onboarding/step-6`.

## Defaults

```ts
import { rubricDefaults } from "@/lib/schema"

const defaultValues = {
  guidelines: {
    articleStructure: "",
    urlFormat: "/blog/{slug}",
    headingPolicy: "",
    citationPolicy: "",
  },
  rubric: rubricDefaults,
  passThreshold: 7.0,
}
```
