# v0.dev — Step 8: Launch

Fills `app/onboarding/step-8/page.tsx`. Writes no new files; finalizes the engine config and kicks the instance live.

---

Build **Step 8 — Launch**.

## Schema (`@/lib/schema`)

```ts
step8Schema = z.object({
  host: z.object({
    mode: z.enum(["managed", "byo"]).default("managed"),
    byoHost: z.string().optional(),
  }),
  crons: z.object({
    eodMemory: z.boolean().default(true),
    weeklyDiscovery: z.boolean().default(true),
    monthlyCitation: z.boolean().default(false),
    monthlyRubric: z.boolean().default(false),
  }),
})
```

## Form layout

### Group 1 — Host mode

Label "Where should the engine run?" (14px medium).

`host.mode` — 2-up `RadioGroup` cards:

- **Managed** (recommended badge) — "We host and run the engine. Zero-ops. Drafts land in your Slack channel within minutes of scheduled runs." Selected default.
- **Bring your own** — "Point us at your own Vercel/VM host. Advanced — disabled in MVP." Render this card with `opacity-60 cursor-not-allowed` and a small "Coming soon" muted tag. Clicking is a no-op.

If `mode === "byo"` (won't happen in MVP but keep the field wired):
- `byoHost` Input. Label "Host URL". Placeholder "https://engine.acme.com".

### Group 2 — Scheduled runs

Label "Recurring automations".

List of 4 `Switch` rows, each with:
- Switch on left (24px)
- Right: title (13px medium) + sub (12px zinc-500 — cron expression + what it does)

Rows:
1. **EOD memory refresh** — default **on**. `0 19 * * *`. "Summarizes the day's drafts into memory the engine uses tomorrow."
2. **Weekly demand discovery** — default **on**. `0 9 * * MON`. "Runs trend-researcher against your seeds and proposes 3–5 topics."
3. **Monthly citation audit** — default **off**. `0 10 1 * *`. "Checks where your brand appears across LLM answers. Beta."
4. **Monthly rubric recalibration** — default **off**. `0 11 1 * *`. "Suggests rubric weight shifts based on what's scoring well."

Helper under the list: "Toggle any time from Settings. All run in your workspace's timezone."

### Group 3 — Pre-flight check

Render a **readonly status panel** that reads from all prior steps via `useFormContext().getValues()`. Format as a bordered Card with rows:

Each row:
- Left: check icon (emerald-600 ✓ if ok, red-600 ✗ if missing)
- Middle: check name (13px)
- Right: small muted detail (e.g. count, or "Missing" in red-600)

Checks (all read from form state — no async calls in MVP):
1. **Identity set** — `step1.workspace && step1.agent.name && step1.user.email`
2. **Product context ≥ 50 chars** — `step2.product.longDescription.length >= 50`
3. **At least 1 ICP with pains + goals** — `step3.icps.length >= 1 && step3.icps[0].pains.length >= 1`
4. **Brand voice examples present** — `step4.examples.good.length >= 20 && step4.examples.bad.length >= 20`
5. **Rubric sums to 100** — `Object.values(step5.rubric).reduce((a,b)=>a+b,0) === 100`
6. **5+ demand seeds** — `step6.seeds.length >= 5`
7. **Slack installed** — `step7.slack.installed === true`

If any check fails, show a red-600 banner below the panel: "Fix the items above before launching." and disable the final button. Each failed row should include a muted "Go to Step N →" link that `router.push`es back.

### Group 4 — The launch button

Full-width primary button: **"Launch engine"** (not "Continue"). On click:
1. Validate all 8 steps via the master `onboardingSchema` from `@/lib/schema`.
2. Call `saveStep(8, data)`.
3. Call `finalizeOnboarding()` (stub — import from `@/lib/persist`. For MVP, write all 10 files to `tenant_configs` and mark workspace as `launched`).
4. `router.push("/dashboard")`.

During submit, show a small inline progress row below the button with 3 fake steps that tick green one by one (each ~400ms with `setTimeout`). This is cosmetic — gives the user a moment of "something is happening":
- ✓ Writing tenant configuration
- ✓ Registering Slack commands
- ✓ Scheduling automations

Don't block too long. Total < 1.5s. The actual work is the `saveStep` call.

## Preview pane

No file tabs. Single card titled **"Your instance"** (mono 12px zinc-500) listing:

```
workspace:   {step1.workspace || "—"}
agent:       {step1.agent.name || "—"} · {step1.agent.role || "—"}
streams:     {step1.agent.streams.join(", ") || "—"}
product:     {step2.product.name || "—"}
icps:        {step3.icps.length} profile(s)
seeds:       {step6.seeds.length} topics
crons:       {Object.values(step8.crons).filter(Boolean).length}/4 enabled
slack:       {step7.slack.installed ? "✓ installed" : "— not installed"}
```

Below, a muted "Files that will be written" list (just the file paths, no content):

```
IDENTITY.md
USER.md
product-context.md
brand-voice-guide.md
aeo-guidelines.md
aeo-scoring-rubric.md
trend-seeds.json
webflow-ids.md (if CMS = webflow)
tenant.json
TOOLS.md
```

## Content copy

```
Launch
```

```
Flip it on. The engine starts working from your Slack channel the moment you click launch — try `/audit https://example.com/blog/post` or `/draft <topic>` to see it in action.
```

## Submission

Final step. Redirect to `/dashboard` on success.

## Defaults

```ts
const defaultValues = {
  host: { mode: "managed" },
  crons: {
    eodMemory: true,
    weeklyDiscovery: true,
    monthlyCitation: false,
    monthlyRubric: false,
  },
}
```
