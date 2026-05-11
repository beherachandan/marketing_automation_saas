# v0.dev — Step 2: Product Context

Fills `app/onboarding/step-2/page.tsx`. Writes the product section of `product-context.md` (ICPs come in Step 3).

---

Build **Step 2 — Product Context**.

## Schema (`@/lib/schema`)

```ts
step2Schema = z.object({
  product: z.object({
    name: z.string().min(1).max(64),
    category: z.string().min(1).max(64),
    oneLiner: z.string().min(10).max(160),
    longDescription: z.string().min(50).max(4000),
    features: z.array(z.object({
      title: z.string().min(1).max(80),
      description: z.string().min(1).max(400),
    })).min(1).max(20),
    positioning: z.string().min(20).max(2000),
  }),
})
```

## Form layout

**Group 1 — Basics** (2-col ≥md)
- `product.name` — Input. Label "Product name". Placeholder "Wayground".
- `product.category` — Input (consider Combobox later). Label "Category". Placeholder "K-12 education platform".

**Group 2 — The pitch**
- `product.oneLiner` — Input. Label "One-liner". Placeholder "The fastest way to run classroom quizzes at scale." Show live counter `{current}/160` in right of field container, turn red-600 at >150.
- `product.longDescription` — Textarea, `rows={6}`. Label "Long description". Helper: "Paste your About / marketing site intro. 50–4000 chars."

**Group 3 — Features** (full width)
- Label "Key features" + small note "Drag to reorder. 1–20 features."
- Render a **sortable list** of feature rows. Each row:
  - Drag handle (GripVertical icon) on left
  - `title` Input (placeholder "Live quizzes")
  - `description` Input (placeholder "Up to 500 concurrent students per session")
  - Trash icon on right
- "+ Add feature" ghost button below the list.
- For MVP, use simple up/down arrows instead of drag-drop — skip installing dnd libraries. Two IconButtons per row: ChevronUp and ChevronDown. Disabled at list edges.

**Group 4 — Positioning**
- `product.positioning` — Textarea, `rows={5}`. Label "Positioning". Helper: "Who this is for, who it's not for, and why it's different. 20–2000 chars."

## Preview pane

Single file tab: `product-context.md`.

```ts
import { toProductContextMd } from "@/lib/file-generators"

const values = useWatch({ control })
// Step 3 not filled yet — pass an empty icps array
const preview = toProductContextMd(values, { icps: [] })
```

`toProductContextMd` expects both step2 and step3 — pass a synthetic `{ icps: [] }` for step3 so the ICP section renders empty. Live updates.

## Content copy

```
Product Context
```

```
The engine uses this to keep every audit, draft, and evaluation grounded in what your product actually does. Be specific — vague positioning produces vague content.
```

## Submission

Same pattern as Step 1. Validate → `saveStep(2, data)` → push `/onboarding/step-3`.

## Defaults

```ts
const defaultValues = {
  product: {
    name: "",
    category: "",
    oneLiner: "",
    longDescription: "",
    features: [{ title: "", description: "" }],
    positioning: "",
  },
}
```
