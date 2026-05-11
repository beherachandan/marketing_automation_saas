# v0.dev — Step 1: Workspace & Identity

Paste as a follow-up prompt after the meta-prompt has built the shell. This fills in `app/onboarding/step-1/page.tsx`.

---

Fill in **Step 1 — Workspace & Identity** of the onboarding wizard. This step writes two files: `IDENTITY.md` and `USER.md`.

## Schema (already exists at `@/lib/schema`)

```ts
step1Schema = z.object({
  workspace: z.string().min(2).max(64),
  agent: z.object({
    name: z.string().min(1).max(64),
    role: z.string().min(1).max(128),
    streams: z.array(z.enum(["SEO", "AEO", "GEO", "Paid"])).min(1),
  }),
  user: z.object({
    name: z.string().min(1).max(128),
    email: z.string().email(),
    timezone: z.string().min(1),
  }),
})
```

## Form layout

One section, three groups. All fields 13px, labels 11px uppercase. Use shadcn/ui primitives.

**Group 1 — Workspace**
- `workspace` — single Input. Label "Workspace name". Placeholder "acme-growth". Helper text: "Used internally. 2–64 chars."

**Group 2 — Agent identity** (side-by-side on ≥md, stacked on mobile)
- `agent.name` — Input. Label "Agent name". Placeholder "Helix". Helper text: "How the engine refers to itself in Slack."
- `agent.role` — Input. Label "Role". Placeholder "Head of Content Marketing".

Then below, full-width:
- `agent.streams` — **CheckboxGroup** of 4 options: SEO, AEO, GEO, Paid. Rendered as a 4-column grid of Card-like toggles (`border border-border rounded-md p-3 cursor-pointer`). Selected state: `border-primary bg-secondary`. At least one required. Label "Active work streams". Helper: "The engine only runs automations for enabled streams."

**Group 3 — Primary user**
- `user.name` — Input. Label "Your name". Placeholder "Chandan Behera".
- Side-by-side (2 cols ≥md):
  - `user.email` — Input type=email. Label "Work email". Placeholder "chandan@company.com".
  - `user.timezone` — Select. Label "Timezone". Options: seed with `Intl.supportedValuesOf("timeZone")` if available, otherwise hardcode top 30. Default to browser timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.

## Preview pane (tabs)

This step writes 2 files. Preview pane shows Tabs: **IDENTITY.md** (default) and **USER.md**.

```ts
import { toIdentityMd, toUserMd } from "@/lib/file-generators"

const values = useWatch({ control })
const identity = values && toIdentityMd(values)
const user = values && toUserMd(values)
```

If validation incomplete, still render with whatever partial values are there — fall back to empty strings for missing fields so the preview updates live.

## Submission

On Continue:
1. Validate with `step1Schema.safeParse(data)`. If fail, stay on page, show errors inline.
2. Call `saveStep(1, data)`.
3. `router.push("/onboarding/step-2")`.

## Content copy (H1 + intro)

```
Workspace & Identity
```

```
Tell us who you are and what this instance is for. This becomes the engine's self-identity across every agent prompt.
```

## Empty defaults

```ts
const defaultValues = {
  workspace: "",
  agent: { name: "", role: "", streams: ["AEO"] },
  user: {
    name: "",
    email: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
}
```

No TODOs. Ship clean.
