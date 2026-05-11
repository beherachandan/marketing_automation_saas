# v0.dev — Step 4: Brand Voice

Fills `app/onboarding/step-4/page.tsx`. Writes `brand-voice-guide.md`.

---

Build **Step 4 — Brand Voice**.

## Schema (`@/lib/schema`)

```ts
step4Schema = z.object({
  tone: z.object({
    formalCasual: z.number().min(0).max(100),
    authoritativeFriendly: z.number().min(0).max(100),
    technicalConversational: z.number().min(0).max(100),
    playfulSerious: z.number().min(0).max(100),
  }),
  attributes: z.array(z.string().min(1).max(32)).max(5),
  hardRules: z.array(z.string().min(1).max(280)).max(20),
  forbiddenWords: z.string().max(2000).default(""),
  examples: z.object({
    good: z.string().min(20).max(2000),
    bad: z.string().min(20).max(2000),
  }),
})
```

## Form layout

**Group 1 — Tone** (full-width)

Four sliders, stacked. Each slider row:
- Top: small label row with left pole (zinc-500) + slider label (centered, zinc-900) + right pole (zinc-500).
- shadcn `Slider` min=0 max=100 step=1, value is a single number.
- Example for `formalCasual`: left "Formal" / center "Formal ↔ Casual" / right "Casual". Value 50 = balanced.

Sliders:
1. Formal ↔ Casual (formalCasual)
2. Authoritative ↔ Friendly (authoritativeFriendly)
3. Technical ↔ Conversational (technicalConversational)
4. Playful ↔ Serious (playfulSerious)

Defaults: all 50.

**Group 2 — Voice attributes**

Label "Voice attributes" + helper "Select up to 5 or add your own."

Render a flex-wrap badge grid of preset attributes. Clicking toggles selection. Selected: `bg-primary text-primary-foreground`. Unselected: `border bg-transparent text-muted-foreground`.

Presets:
`Direct`, `Witty`, `Empathetic`, `Data-driven`, `Optimistic`, `Irreverent`, `Authoritative`, `Pragmatic`, `Warm`, `Sharp`, `Playful`, `Candid`, `Bold`, `Understated`.

Below badges, show a small `+ Add custom` Input inline — pressing Enter or Tab adds it as a new selected badge. Respect 5-max cap. Custom badges show a tiny × to remove.

**Group 3 — Hard rules**

Label "Hard rules" + helper "Things the engine must never violate. Examples: 'Never say 'synergy'', 'Always cite at least 2 sources'."

List of Input rows, each with trash IconButton. `+ Add rule` ghost button. Max 20.

**Group 4 — Forbidden words / phrases**

Single Textarea `rows={3}`. Label "Forbidden words". Helper "Comma-separated. Engine will flag any output containing these."

**Group 5 — Examples** (2-col ≥md)

- `examples.good` — Textarea `rows={6}`. Label "On-brand example". Helper "Paste a paragraph that feels right." Left border accent in emerald-600 (use `border-l-2 border-l-emerald-600 pl-3 -ml-3`).
- `examples.bad` — Textarea `rows={6}`. Label "Off-brand example". Helper "Paste a paragraph that feels wrong." Left border accent in red-600.

## Preview pane

Single tab: `brand-voice-guide.md`.

```ts
import { toBrandVoiceMd } from "@/lib/file-generators"
const values = useWatch({ control })
const preview = toBrandVoiceMd(values)
```

## Content copy

```
Brand Voice
```

```
The engine applies this on top of every draft and uses it to enforce E1 brand-review. Calibrate now and you'll rarely need to edit outputs later.
```

## Submission

Validate → `saveStep(4, data)` → `/onboarding/step-5`.

## Defaults

```ts
const defaultValues = {
  tone: {
    formalCasual: 50,
    authoritativeFriendly: 50,
    technicalConversational: 50,
    playfulSerious: 50,
  },
  attributes: [],
  hardRules: [""],
  forbiddenWords: "",
  examples: { good: "", bad: "" },
}
```
