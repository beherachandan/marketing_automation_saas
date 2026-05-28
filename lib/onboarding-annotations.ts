// Annotation map: for each step, maps form field names to agent annotation cards.
// Consumed by step pages to drive the right-panel AnnotationCard on field focus.

export interface AnnotationCardData {
  agentLabel: string        // canonical agent label from CLAUDE.md
  agentRole: string         // one-phrase role description
  actionCopy: string        // what THIS agent does with THIS field specifically
  secondaryAgents?: string[] // other agents that also consume this field
}

export type AnnotationMap = Record<string, AnnotationCardData>

// ─── Step 1 — Workspace ─────────────────────────────────────────────────────

export const step1Annotations: AnnotationMap = {
  workspace: {
    agentLabel: "B3 · Brief Generator",
    agentRole: "Builds content briefs from demand signals",
    actionCopy: "Signs every brief it produces with your workspace name — creating your content identity across all outputs.",
    secondaryAgents: ["O1 · Pipeline Manager (names your Slack channel #waymark-{workspace})"],
  },
  website: {
    agentLabel: "A1 · SERP Scout",
    agentRole: "Finds keyword gaps and AI citation opportunities",
    actionCopy: "Scans your site to pre-fill product context, ICP signals, and seed keywords — skipping manual entry for most of steps 2–6.",
    secondaryAgents: ["A2 · Citation Gap (checks your existing pages for AI citation status)"],
  },
  "agent.name": {
    agentLabel: "O1 · Pipeline Manager",
    agentRole: "Orchestrates every phase handoff in Slack",
    actionCopy: "Signs every Slack message with this name — operators see it on every approval request, digest, and alert.",
  },
  "agent.role": {
    agentLabel: "E1 · Gate Prep",
    agentRole: "Prepares your Slack approval with full context",
    actionCopy: "Used in the Slack approval header to describe the agent's function to any operator reviewing the content.",
  },
  "agent.streams": {
    agentLabel: "O1 · Pipeline Manager",
    agentRole: "Orchestrates every phase handoff in Slack",
    actionCopy: "Activates only the agents relevant to your selected streams — unused agents stay dormant and don't run.",
    secondaryAgents: ["A1 · SERP Scout (SEO stream)", "A2 · Citation Gap (AEO/GEO stream)"],
  },
}

// ─── Step 2 — Product Context ────────────────────────────────────────────────

export const step2Annotations: AnnotationMap = {
  "product.name": {
    agentLabel: "C3 · Long-form Writer",
    agentRole: "Drafts full articles in your brand voice",
    actionCopy: "Opens every draft with your product name as the primary entity — search engines and AI models extract it from every paragraph.",
  },
  "product.category": {
    agentLabel: "A1 · SERP Scout",
    agentRole: "Finds keyword gaps and AI citation opportunities",
    actionCopy: "Filters keyword gap analysis to your category — prevents surfacing irrelevant competitor topics.",
  },
  "product.oneLiner": {
    agentLabel: "C3 · Long-form Writer",
    agentRole: "Drafts full articles in your brand voice",
    actionCopy: "Used verbatim as the positioning anchor in every introduction. Write it as you want it cited in AI answers.",
    secondaryAgents: ["B3 · Brief Generator (seeds brief context)"],
  },
  "product.longDescription": {
    agentLabel: "B3 · Brief Generator",
    agentRole: "Builds content briefs from demand signals",
    actionCopy: "Source material for every brief B3 generates — briefs stay grounded in what your product actually does.",
  },
  features: {
    agentLabel: "D4 · Brand Fit",
    agentRole: "Scores every draft against your brand and ICP",
    actionCopy: "Checks every draft for feature accuracy — a draft claiming a feature you haven't listed here fails Brand Fit and returns for revision.",
  },
  "product.positioning": {
    agentLabel: "D4 · Brand Fit",
    agentRole: "Scores every draft against your brand and ICP",
    actionCopy: "Your competitive moat. D4 rejects any draft that contradicts this statement before it reaches you.",
  },
}

// ─── Step 3 — ICP Profiles ───────────────────────────────────────────────────

export const step3Annotations: AnnotationMap = {
  "icps[].name": {
    agentLabel: "B3 · Brief Generator",
    agentRole: "Builds content briefs from demand signals",
    actionCopy: "Names the audience every brief is written for — B3 opens each brief with 'Target ICP: [name]'.",
  },
  "icps[].role": {
    agentLabel: "D4 · Brand Fit",
    agentRole: "Scores every draft against your brand and ICP",
    actionCopy: "D4 checks that every draft speaks to this role's level of technical understanding — no talking down to engineers, no jargon for execs.",
  },
  "icps[].industry": {
    agentLabel: "A1 · SERP Scout",
    agentRole: "Finds keyword gaps and AI citation opportunities",
    actionCopy: "Narrows keyword gap analysis to your ICP's industry — prevents surfacing enterprise keywords for a SMB audience.",
  },
  "icps[].painPoints": {
    agentLabel: "B3 · Brief Generator",
    agentRole: "Builds content briefs from demand signals",
    actionCopy: "B3 builds content angles directly from these pains — every topic it recommends maps to at least one pain point listed here.",
  },
  "icps[].goals": {
    agentLabel: "D4 · Brand Fit",
    agentRole: "Scores every draft against your brand and ICP",
    actionCopy: "D4 checks that every draft connects your product to at least one of these goals before scoring Brand Fit.",
  },
  "icps[].jtbd": {
    agentLabel: "C3 · Long-form Writer",
    agentRole: "Drafts full articles in your brand voice",
    actionCopy: "The job-to-be-done your reader is hiring this content to do. C3 structures every article around it — not the feature, the job.",
  },
}

// ─── Step 4 — Brand Voice ────────────────────────────────────────────────────

export const step4Annotations: AnnotationMap = {
  "tone.formalCasual": {
    agentLabel: "C3 · Long-form Writer",
    agentRole: "Drafts full articles in your brand voice",
    actionCopy: "C3 injects this tone value into every generation prompt. Your sliders are the voice calibration — not guidelines, directives.",
  },
  "tone.authoritativeFriendly": {
    agentLabel: "C3 · Long-form Writer",
    agentRole: "Drafts full articles in your brand voice",
    actionCopy: "Controls how C3 balances confidence with warmth. High authority = assertive claims. High friendly = conversational hedges.",
  },
  "tone.technicalConversational": {
    agentLabel: "C3 · Long-form Writer",
    agentRole: "Drafts full articles in your brand voice",
    actionCopy: "Sets the assumed reader knowledge level. Technical = assumes domain expertise. Conversational = explains from first principles.",
  },
  "tone.playfulSerious": {
    agentLabel: "C3 · Long-form Writer",
    agentRole: "Drafts full articles in your brand voice",
    actionCopy: "Controls humour and levity in transitions, intros, and closings. High serious = no asides, no wit.",
  },
  attributes: {
    agentLabel: "C3 · Long-form Writer",
    agentRole: "Drafts full articles in your brand voice",
    actionCopy: "Positive attributes C3 actively optimises for. If an attribute isn't listed here, C3 won't target it.",
  },
  hardRules: {
    agentLabel: "D4 · Brand Fit",
    agentRole: "Scores every draft against your brand and ICP",
    actionCopy: "Hard rules are rejection criteria — any draft violating even one is flagged REVISE before it reaches you for approval.",
    secondaryAgents: ["C3 · Long-form Writer (avoids generating violations)"],
  },
  forbiddenWords: {
    agentLabel: "D4 · Brand Fit",
    agentRole: "Scores every draft against your brand and ICP",
    actionCopy: "D4 scans every draft for these words. C3 avoids generating them. Both layers enforce this — it's a two-gate system.",
    secondaryAgents: ["C3 · Long-form Writer"],
  },
  goodExamples: {
    agentLabel: "C3 · Long-form Writer",
    agentRole: "Drafts full articles in your brand voice",
    actionCopy: "Few-shot context injected before every generation. The more approved examples you add, the sharper C3 writes in your voice.",
  },
  badExamples: {
    agentLabel: "D4 · Brand Fit",
    agentRole: "Scores every draft against your brand and ICP",
    actionCopy: "Negative references used when scoring Brand Fit. Bad examples are as valuable as good ones — they define the edges.",
  },
}

// ─── Step 5 — GEO Rubric ─────────────────────────────────────────────────────

export const step5Annotations: AnnotationMap = {
  "rubric.qape_structure": {
    agentLabel: "D1 · GEO Scorer",
    agentRole: "Scores every draft against your rubric before you see it",
    actionCopy: "D1 multiplies the raw QAPE score by this weight. 25% is the default — raise it if AI extractability is your primary objective.",
  },
  "rubric.ear_coverage": {
    agentLabel: "D1 · GEO Scorer",
    agentRole: "Scores every draft against your rubric before you see it",
    actionCopy: "Controls how hard D1 penalises weak citation and authority signals. Critical for YMYL content categories.",
  },
  "rubric.extractability": {
    agentLabel: "D1 · GEO Scorer",
    agentRole: "Scores every draft against your rubric before you see it",
    actionCopy: "Drives D1's check for headers, bullets, tables, and schema markup — the signals AI models use to extract direct answers.",
  },
  "rubric.trust_signals": {
    agentLabel: "D1 · GEO Scorer",
    agentRole: "Scores every draft against your rubric before you see it",
    actionCopy: "D1's check for author credentials, publish date, and E-E-A-T signals. Google AIO citation lift: +30–40% with schema.",
  },
  "rubric.intent_match": {
    agentLabel: "D1 · GEO Scorer",
    agentRole: "Scores every draft against your rubric before you see it",
    actionCopy: "D1's check that content matches the query intent class of the target topic — informational vs. navigational vs. commercial.",
  },
  passThreshold: {
    agentLabel: "O1 · Pipeline Manager",
    agentRole: "Orchestrates every phase handoff in Slack",
    actionCopy: "O1 uses this to decide: PASS → E1 Slack review, REVISE → back to C3, ESCALATE → pause for human. 7.0 is the validated default.",
  },
  articleStructure: {
    agentLabel: "C3 · Long-form Writer",
    agentRole: "Drafts full articles in your brand voice",
    actionCopy: "The structural template C3 follows for every article — section order, heading hierarchy, intro/conclusion conventions.",
  },
  urlFormat: {
    agentLabel: "F1 · Metadata",
    agentRole: "Generates slugs, titles, and metadata for every article",
    actionCopy: "F1 generates URL slugs from this format rule — applied to every article before F2 publishes to your CMS.",
  },
}

// ─── Step 6 — Demand Seeds ───────────────────────────────────────────────────

export const step6Annotations: AnnotationMap = {
  seeds: {
    agentLabel: "A1 · SERP Scout",
    agentRole: "Finds keyword gaps and AI citation opportunities",
    actionCopy: "A1 runs weekly gap analysis against each seed — finding which competitors rank for these topics but you don't yet.",
    secondaryAgents: [
      "A2 · Citation Gap (checks seeds against ChatGPT, Perplexity, Google AI)",
      "B1 · Topic Selector (ranks candidates by demand signal strength against your seeds)",
    ],
  },
}

// ─── Step 7 — Integrations ───────────────────────────────────────────────────

export const step7Annotations: AnnotationMap = {
  "slack.workspace": {
    agentLabel: "O1 · Pipeline Manager",
    agentRole: "Orchestrates every phase handoff in Slack",
    actionCopy: "O1 routes every phase handoff, approval request, escalation, and weekly digest to this workspace.",
  },
  "slack.channelId": {
    agentLabel: "O1 · Pipeline Manager",
    agentRole: "Orchestrates every phase handoff in Slack",
    actionCopy: "Every agent output, approval request, and digest is delivered here — this is your team's working channel.",
    secondaryAgents: ["E1 · Gate Prep (addresses every approval message to this channel)"],
  },
  "slack.botName": {
    agentLabel: "E1 · Gate Prep",
    agentRole: "Prepares your Slack approval with full context",
    actionCopy: "The name operators see on every pipeline message. Make it recognisable — operators will act on its messages daily.",
  },
  "cms.siteId": {
    agentLabel: "F2 · Publisher",
    agentRole: "Publishes approved articles to your CMS after approval",
    actionCopy: "F2 publishes approved articles directly to this CMS collection — no copy-paste, F2 creates the item and triggers publish.",
  },
  semrushApiKey: {
    agentLabel: "A1 · SERP Scout",
    agentRole: "Finds keyword gaps and AI citation opportunities",
    actionCopy: "Unlocks live SERP gap data for A1 — without this key, A1 runs on cached snapshots only.",
  },
  dataforseoKey: {
    agentLabel: "A2 · Citation Gap",
    agentRole: "Scans AI platforms for citation gaps",
    actionCopy: "Unlocks live AI citation checks across ChatGPT, Perplexity, and Google AI for A2.",
  },
}

// ─── Master map — used by step pages ─────────────────────────────────────────

export const ONBOARDING_ANNOTATIONS: Record<number, AnnotationMap> = {
  1: step1Annotations,
  2: step2Annotations,
  3: step3Annotations,
  4: step4Annotations,
  5: step5Annotations,
  6: step6Annotations,
  7: step7Annotations,
}
