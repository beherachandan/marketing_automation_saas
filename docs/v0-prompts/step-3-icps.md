# v0.dev — Step 3: ICPs

Fills `app/onboarding/step-3/page.tsx`. Writes the ICP section of `product-context.md`.

---

Build **Step 3 — ICPs (Ideal Customer Profiles)**.

## Schema (`@/lib/schema`)

```ts
icpSchema = z.object({
  name: z.string().min(1).max(64),
  role: z.string().min(1).max(128),
  industry: z.string().min(1).max(128),
  pains: z.array(z.string().min(1).max(280)).min(1).max(10),
  goals: z.array(z.string().min(1).max(280)).min(1).max(10),
  jobsToBeDone: z.string().min(10).max(2000),
})

step3Schema = z.object({
  icps: z.array(icpSchema).min(1).max(10),
})
```

## Form layout

Render a vertical stack of **Accordion** items (one per ICP). Each item has:

**Trigger** (collapsed state)
- Left: `#N · {name || "Untitled ICP"} · {role || "—"}`
- Right: trash IconButton (disabled if only 1 ICP remains)

**Content** (expanded)

2-col grid (≥md):
- `name` — Input. Label "ICP name". Placeholder "Priya, the K-12 teacher".
- `role` — Input. Label "Role / title". Placeholder "Middle-school math teacher".

Full-width:
- `industry` — Input. Label "Industry".

**Pains** (full width)
- Label "Pain points" + helper "One per row. 1–10."
- List of Input rows, each with trash IconButton.
- "+ Add pain" ghost button below.

**Goals** (full width)
- Same pattern as pains. Label "Goals".

**Jobs to be done** (full width)
- Textarea `rows={4}`. Label "Jobs to be done". Helper "What this person is actually trying to accomplish. 10–2000 chars."

Below the accordion stack: **"+ Add ICP"** primary-ghost button. Disabled when `icps.length >= 10`.

**First-ICP default** should be expanded. Subsequent ICPs added collapsed.

## Preview pane

Single tab: `product-context.md`. Combines Step 2 + Step 3.

```ts
import { toProductContextMd } from "@/lib/file-generators"

const s2 = useFormContext().getValues("step2") // or whatever structure you chose
const s3 = useWatch({ control })
const preview = toProductContextMd(s2 ?? defaultStep2, s3)
```

Since the preview depends on Step 2's product section, read Step 2 from the shared FormProvider. If unavailable (e.g. user navigated straight here without Step 2), substitute a minimal valid step2 shape so the generator doesn't crash.

## Content copy

```
Ideal Customer Profiles
```

```
Add at least one. The engine uses these in every draft to decide what examples to use, what vocabulary to reach for, and which pain points to lead with. Thin ICPs produce thin content.
```

## Submission

Validate → `saveStep(3, data)` → `/onboarding/step-4`.

## Defaults

```ts
const defaultValues = {
  icps: [{
    name: "",
    role: "",
    industry: "",
    pains: [""],
    goals: [""],
    jobsToBeDone: "",
  }],
}
```
