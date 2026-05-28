import type { PipelineConfiguredData } from "@/components/onboarding/PipelineCanvas"

function fmt(v: string | undefined, fallback: string): string {
  return v?.trim() ? v.trim() : fallback
}

function fmtTone(formalCasual: number | undefined): string {
  if (formalCasual === undefined) return "{tone score}"
  const label = formalCasual > 60 ? "Casual" : formalCasual < 40 ? "Formal" : "Balanced"
  return `${label} (${formalCasual}/100)`
}

function configuredSection(lines: string[]): string {
  return [
    "",
    "## Configured context",
    ...lines.map((l) => `- ${l}`),
  ].join("\n")
}

export function buildSkillConfig(
  skillId: string,
  data: PipelineConfiguredData | undefined,
  isEnriched: boolean,
): string {
  const d = data ?? {}

  const agent = fmt(d.agentName, "{agent name}")
  const product = fmt(d.productName, "{product name}")
  const stream0 = d.streams?.[0] ?? "{primary stream}"
  const streams = d.streams?.join(", ") ?? "{streams}"
  const icpRole0 = d.icpRoles?.[0] ?? "{primary ICP role}"
  const icpRoles = d.icpRoles?.slice(0, 2).join(", ") ?? "{ICP roles}"
  const toneLabel = fmt(d.toneLabel, "{tone attribute}")
  const tone = fmtTone(d.formalCasual)
  const threshold = d.passThreshold !== undefined ? `QAPE ${d.passThreshold.toFixed(1)} / 10` : "{pass threshold}"
  const seed = fmt(d.seedLabel, "{primary seed topic}")
  const slack = fmt(d.slackChannel, "{slack channel}")
  const cms = fmt(d.cmsProvider, "{CMS provider}")

  const enrichedNote = isEnriched
    ? ""
    : "\n\n> **Pre-enrichment preview** — values in `{braces}` will populate as you complete the indicated steps.\n"

  switch (skillId) {
    case "keyword-research":
      return `# Keyword Research — live config

**Agent:** ${agent}  ·  **Streams:** ${streams}${enrichedNote}
${configuredSection([
  `Primary seed topic: **${seed}** — keyword clusters will expand from this`,
  `Target streams: **${streams}**`,
  `Cron owner agent: **${agent}**`,
  `Output destination: ${slack} (Slack) · ${cms} (CMS)`,
])}

## Runtime behaviour
Runs weekly from seed **"${seed}"**. Produces keyword clusters grouped by intent, then briefs the B3 Brief Generator with top-priority topics for **${product}** targeting **${icpRole0}**.`

    case "trend-discovery":
      return `# Trend Discovery — live config

**Agent:** ${agent}  ·  **Streams:** ${streams}${enrichedNote}
${configuredSection([
  `Primary seed topic: **${seed}**`,
  `Active streams: **${streams}**`,
  `Upstream input: Keyword Research cluster output`,
])}

## Runtime behaviour
Monitors AI-answer results and search trend APIs weekly, seeded with **"${seed}"**. Flags new trends intersecting with **${stream0}** and queues them for ${agent} pipeline review.`

    case "sitemap-audit":
      return `# Sitemap Audit — live config

**Agent:** ${agent}${enrichedNote}
${configuredSection([
  `Source: website scan (URL collected at onboarding start)`,
  `Crawl depth: full site index`,
  `Output: orphan page report + crawl priority list`,
])}

## Runtime behaviour
Crawls the sitemap and live URL structure monthly. Compares against previous state, surfaces newly orphaned pages, and generates an actionable internal linking fix list for ${agent}.`

    case "on-page-audit":
      return `# On-page SEO Audit — live config

**Agent:** ${agent}  ·  **Pass threshold:** ${threshold}${enrichedNote}
${configuredSection([
  `QAPE pass threshold: **${threshold}**`,
  `Keyword targets: derived from Keyword Research clusters`,
  `Output channel: ${slack}`,
])}

## Runtime behaviour
Runs weekly. Scores each page against on-page SEO signals. Pages scoring below **${threshold}** are returned with a prioritised fix list, delivered to ${slack}.`

    case "citation-audit":
      return `# Citation Audit — live config

**Agent:** ${agent}  ·  **Streams:** ${streams}${enrichedNote}
${configuredSection([
  `Active streams: **${streams}**`,
  `Source: Tavily AI-answer probing`,
  `Competitor context: from Step 5 · Strategy`,
  `Report channel: ${slack}`,
])}

## Runtime behaviour
Probes AI models with representative ${stream0} queries weekly. Logs citation frequency for **${product}** vs competitors. Alerts ${agent} when a competitor's citation rate significantly outpaces ours in a target cluster.`

    case "content-rubric":
      return `# Content Rubric — live config

**Agent:** ${agent}  ·  **Pass threshold:** ${threshold}${enrichedNote}
${configuredSection([
  `QAPE pass threshold: **${threshold}**`,
  `Primary tone attribute: **${toneLabel}**`,
  `Formal↔Casual axis: **${tone}**`,
  `ICP alignment target: **${icpRole0}**`,
])}

## Runtime behaviour
Every AI Draft is automatically scored on this rubric. Drafts below **${threshold}** are returned with specific edit notes rather than entering the publish queue. Tone violations are flagged against the **${toneLabel}** voice rules.`

    case "ai-draft":
      return `# AI Draft Generation — live config

**Agent:** ${agent}${enrichedNote}
${configuredSection([
  `Target voice: **${toneLabel}** · ${tone}`,
  `Product context: **${product}**`,
  `Primary ICP: **${icpRole0}**`,
  `Delivery: ${slack} notification + ${cms} draft queue`,
])}

## Runtime behaviour
Triggered by content calendar or manual request. Pulls the keyword brief, applies **${toneLabel}** brand voice rules, generates the draft, runs it through Content Rubric automatically. If it passes **${threshold}**, delivers a Slack summary to ${slack} with the ${cms} draft link.`

    case "brand-voice":
      return `# Brand Voice Enforcement — live config

**Agent:** ${agent}${enrichedNote}
${configuredSection([
  `Primary tone attribute: **${toneLabel}**`,
  `Formal↔Casual axis: **${tone}**`,
  `Rules source: Step 4 · Brand Voice (tone axes + word lists + examples)`,
])}

## Runtime behaviour
Applied as a post-processing pass on every AI Draft. Rewrites or flags voice violations. Detects tone axis drift — if the model starts skewing away from **${toneLabel}** calibration, surfaces an alert for ${agent}.`

    case "ad-copy":
      return `# Ad Copy Generation — live config

**Agent:** ${agent}${enrichedNote}
${configuredSection([
  `Target ICPs: **${icpRoles}**`,
  `Product: **${product}**`,
  `Value prop source: website scan + Step 2 · Product`,
])}

## Runtime behaviour
Generates headline and description variants for Google Ads, Meta, and LinkedIn. Uses **${icpRoles}** pain points and **${product}** positioning. Reports weekly on which angles are winning across active campaigns.`

    case "lp-audit":
      return `# Landing Page Audit — live config

**Agent:** ${agent}${enrichedNote}
${configuredSection([
  `Primary ICP: **${icpRole0}**`,
  `Source: website scan (landing page URLs)`,
  `Message-match validation: against Ad Copy variants`,
])}

## Runtime behaviour
Runs monthly or on-demand. For each active campaign, checks that the landing page message still matches the ad copy running against it. Alerts when a page scores below threshold or copy has drifted from the page content.`

    default:
      return `# Skill config\n\nNo configured context available for this skill.\n`
  }
}
