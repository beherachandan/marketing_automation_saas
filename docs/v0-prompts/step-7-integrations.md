# v0.dev — Step 7: Integrations

Fills `app/onboarding/step-7/page.tsx`. Writes `tenant.json` and `TOOLS.md`.

---

Build **Step 7 — Integrations**.

## Schema (`@/lib/schema`)

```ts
connectionStatus = z.enum(["connected", "stub", "none"]).default("none")

step7Schema = z.object({
  slack: z.object({
    installed: z.boolean().default(false),
    teamId: z.string().optional(),
    channelId: z.string().optional(),
    channelName: z.string().optional(),
  }),
  semrush: z.object({ apiKey: z.string().optional(), status: connectionStatus }),
  dataforseo: z.object({ username: z.string().optional(), password: z.string().optional(), status: connectionStatus }),
  tavily: z.object({ apiKey: z.string().optional(), status: connectionStatus }),
  cms: z.object({
    provider: z.enum(["webflow", "wordpress", "contentful", "sanity", "none"]).default("none"),
    siteId: z.string().optional(),
    token: z.string().optional(),
    collectionMap: z.record(z.string(), z.string()).default({}),
    status: connectionStatus,
  }),
  gemini: z.object({ apiKey: z.string().optional() }).optional(),
})
```

## Form layout

Render as a stack of **connection cards** — each card is a `Card` primitive with `p-4` and a left-accent stripe colored by connection status (emerald-600 connected, zinc-400 stub, zinc-300 none).

Each card header:
- Left: service name (15px medium) + subtitle (12px zinc-500 — e.g. "Chat + slash commands")
- Right: `Badge` showing status pill:
  - "Connected" → `bg-emerald-600 text-white`
  - "Demo" → `bg-zinc-200 text-zinc-700`
  - "Not connected" → `bg-zinc-100 text-zinc-500`

Cards, in order:

### 1. Slack — **REQUIRED, REAL OAUTH**

Body:
- If `slack.installed === false`: show single button "Install to Slack" → `<a href="/api/slack/install" className="...primary">` with Slack logo on left.
- If `slack.installed === true`: show `teamId`, `channelName` in a small readonly 2-col grid + `Reinstall` ghost button (re-runs install flow) + `Disconnect` destructive-ghost button.

Helper: "The engine posts `/audit` and `/draft` output back into this channel. Required for MVP."

Note under the card: `This is the only integration that fully wires up in the MVP. Others are stubbed and can be upgraded post-launch.`

### 2. Semrush — stub

Card body:
- `apiKey` Input type="password". Label "Semrush API key". Helper "Used for organic keyword + backlink data. Leave empty to run with demo data."
- Status select shadcn `RadioGroup` with 2 options: "Use demo data" (stub) / "Connect for real" (connected). Default "stub".
- If "connected", validate `apiKey` is non-empty; show inline error if empty and user attempts Continue.

### 3. DataForSEO — stub

Same pattern, two fields:
- `username` Input
- `password` Input type="password"
- RadioGroup demo vs real.

### 4. Tavily — stub

- `apiKey` Input type="password"
- RadioGroup demo vs real

### 5. CMS — stub (Webflow shown, rest disabled)

Card body:
- `provider` shadcn `Select`. Options: "Webflow", "WordPress (coming soon)" disabled, "Contentful (coming soon)" disabled, "Sanity (coming soon)" disabled, "None (skip publishing)".
- If `provider === "webflow"`:
  - `siteId` Input. Label "Site ID". Placeholder "65abc123…"
  - `token` Input type="password". Label "Site API token".
  - Collection mapping — label "Collection IDs" + helper "Map your article/author collections."
    - 2-col grid: `articles` Input + `authors` Input. Values written to `collectionMap`.
- If `provider === "none"`: show muted "Publishing disabled. Engine will post drafts back to Slack only."

All CMS statuses default to `"stub"` in MVP — publishing doesn't actually fire from this UI.

### 6. Gemini (optional)

Card body, collapsed by default in an `Accordion`:
- `apiKey` Input type="password". Label "Gemini API key". Helper "Optional secondary model for deep-research tasks. Skip for MVP — engine uses Claude by default."

## Security note banner

At the top of the page, render a muted `Alert` (info variant):

```
Credentials are encrypted at rest and never exposed in previews. For demo accounts, leave keys blank — the engine will use stub data.
```

## Preview pane

Tabs: `tenant.json` (default) and `TOOLS.md`.

```ts
import { toTenantJson, toToolsMd } from "@/lib/file-generators"
const values = useWatch({ control })
const tenant = toTenantJson(values)
const tools = toToolsMd(values)
```

**Redact sensitive values in preview** — replace any `apiKey` / `token` / `password` field with `"[REDACTED]"` before passing to the generators. Keep this redaction only in the preview call; the real saved value must still flow through `saveStep`.

```ts
const redacted = {
  ...values,
  semrush: values.semrush && { ...values.semrush, apiKey: values.semrush.apiKey ? "[REDACTED]" : "" },
  dataforseo: values.dataforseo && { ...values.dataforseo, password: values.dataforseo.password ? "[REDACTED]" : "" },
  tavily: values.tavily && { ...values.tavily, apiKey: values.tavily.apiKey ? "[REDACTED]" : "" },
  cms: values.cms && { ...values.cms, token: values.cms.token ? "[REDACTED]" : "" },
  gemini: values.gemini && { ...values.gemini, apiKey: values.gemini.apiKey ? "[REDACTED]" : "" },
}
```

## Content copy

```
Integrations
```

```
Connect Slack so the engine can talk to you. Everything else can run on demo data for now — upgrade to real keys whenever you're ready.
```

## Submission

Validate → `saveStep(7, data)` → `/onboarding/step-8`.

Block Continue if `slack.installed === false`. Show an inline Alert: "Slack is required. Install the app above to continue."

## Defaults

```ts
const defaultValues = {
  slack: { installed: false },
  semrush: { status: "stub" },
  dataforseo: { status: "stub" },
  tavily: { status: "stub" },
  cms: { provider: "none", collectionMap: {}, status: "none" },
}
```
