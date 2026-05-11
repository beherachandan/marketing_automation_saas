import type {
  Step1,
  Step2,
  Step3,
  Step4,
  Step5,
  Step6,
  Step7,
  OnboardingState,
} from "./schema"

function esc(s: string): string {
  return s.replace(/\r\n/g, "\n").trim()
}

export function toIdentityMd(s: Step1): string {
  return `# IDENTITY

**Agent name:** ${esc(s.agent.name)}
**Role:** ${esc(s.agent.role)}
**Workspace:** ${esc(s.workspace)}
**Active work streams:** ${s.agent.streams.join(", ")}
`
}

export function toUserMd(s: Step1): string {
  return `# USER

**Name:** ${esc(s.user.name)}
**Email:** ${esc(s.user.email)}
**Timezone:** ${esc(s.user.timezone)}
`
}

export function toToolsMd(s7: Step7): string {
  return `# TOOLS

**Slack channel ID:** ${s7.slack.channelId ?? "not configured"}
**Slack channel name:** ${s7.slack.channelName ?? "not configured"}
**CMS provider:** ${s7.cms.provider}
**CMS site ID:** ${s7.cms.siteId ?? "n/a"}
`
}

export function toProductContextMd(s2: Step2, s3: Step3): string {
  const p = s2.product
  const features = p.features
    .map((f, i) => `${i + 1}. **${esc(f.title)}** — ${esc(f.description)}`)
    .join("\n")
  const icps = s3.icps
    .map((ic, idx) => {
      const pains = ic.pains.map((x) => `  - ${esc(x)}`).join("\n")
      const goals = ic.goals.map((x) => `  - ${esc(x)}`).join("\n")
      return `### ICP ${idx + 1}: ${esc(ic.name)}

- **Role:** ${esc(ic.role)}
- **Industry:** ${esc(ic.industry)}
- **Pain points:**
${pains}
- **Goals:**
${goals}
- **Jobs to be done:** ${esc(ic.jobsToBeDone)}`
    })
    .join("\n\n")
  return `# Product Context

## Product

**Name:** ${esc(p.name)}
**Category:** ${esc(p.category)}
**One-liner:** ${esc(p.oneLiner)}

### Description
${esc(p.longDescription)}

### Key features
${features}

### Positioning
${esc(p.positioning)}

## ICPs

${icps}
`
}

export function toBrandVoiceMd(s4: Step4): string {
  const attrs = s4.attributes.length
    ? s4.attributes.map((a) => `- ${esc(a)}`).join("\n")
    : "_none specified_"
  const rules = s4.hardRules.length
    ? s4.hardRules.map((r) => `- ${esc(r)}`).join("\n")
    : "_none specified_"
  const forbidden = s4.forbiddenWords.trim() || "_none_"
  const axis = (v: number, left: string, right: string) =>
    `- **${left} ↔ ${right}:** ${v} _(0 = ${left}, 100 = ${right})_`
  return `# Brand Voice Guide

## Tone
${axis(s4.tone.formalCasual, "Formal", "Casual")}
${axis(s4.tone.authoritativeFriendly, "Authoritative", "Friendly")}
${axis(s4.tone.technicalConversational, "Technical", "Conversational")}
${axis(s4.tone.playfulSerious, "Playful", "Serious")}

## Voice attributes
${attrs}

## Hard rules
${rules}

## Forbidden words / phrases
${forbidden}

## Good example
${esc(s4.examples.good)}

## Bad example
${esc(s4.examples.bad)}
`
}

export function toAeoGuidelinesMd(s5: Step5): string {
  return `# AEO Guidelines

## Article structure
${esc(s5.guidelines.articleStructure)}

## URL format
${esc(s5.guidelines.urlFormat)}

## Heading policy
${esc(s5.guidelines.headingPolicy)}

## Citation policy
${esc(s5.guidelines.citationPolicy)}
`
}

export function toAeoScoringRubricMd(s5: Step5): string {
  const r = s5.rubric
  const rows: Array<[string, number]> = [
    ["Structure", r.structure],
    ["Factuality", r.factuality],
    ["Citation", r.citation],
    ["Clarity", r.clarity],
    ["Intent match", r.intent],
    ["Brand alignment", r.brandAlignment],
    ["ICP fit", r.icpFit],
    ["Freshness", r.freshness],
    ["Uniqueness", r.uniqueness],
  ]
  const total = rows.reduce((sum, [, n]) => sum + n, 0)
  const body = rows.map(([k, v]) => `| ${k} | ${v}% |`).join("\n")
  return `# AEO Scoring Rubric

Pass threshold: **${s5.passThreshold.toFixed(1)} / 10**

| Dimension | Weight |
|---|---|
${body}
| **Total** | **${total}%** |
`
}

export function toTrendSeedsJson(s6: Step6): string {
  return JSON.stringify({ seeds: s6.seeds }, null, 2) + "\n"
}

export function toWebflowIdsMd(s7: Step7): string {
  const entries = Object.entries(s7.cms.collectionMap)
  const lines = entries.length
    ? entries.map(([k, v]) => `- **${k}:** \`${v}\``).join("\n")
    : "_no collections mapped yet_"
  return `# CMS Collection IDs

**Provider:** ${s7.cms.provider}
**Site ID:** ${s7.cms.siteId ?? "not configured"}

## Collections
${lines}
`
}

export function toTenantJson(s7: Step7): string {
  return (
    JSON.stringify(
      {
        semrush_api_key: s7.semrush.apiKey ?? "",
        slack_channel: s7.slack.channelId ?? "",
      },
      null,
      2
    ) + "\n"
  )
}

export function generateAllFiles(state: OnboardingState): Record<string, string> {
  return {
    "IDENTITY.md": toIdentityMd(state.step1),
    "USER.md": toUserMd(state.step1),
    "TOOLS.md": toToolsMd(state.step7),
    "aeo/context/product-context.md": toProductContextMd(state.step2, state.step3),
    "aeo/context/brand-voice-guide.md": toBrandVoiceMd(state.step4),
    "aeo/context/aeo-guidelines.md": toAeoGuidelinesMd(state.step5),
    "aeo/context/aeo-scoring-rubric.md": toAeoScoringRubricMd(state.step5),
    "skills/trends-researcher/scripts/trend-seeds.json": toTrendSeedsJson(state.step6),
    "skills/F1-webflow-publisher/references/webflow-ids.md": toWebflowIdsMd(state.step7),
    "config/tenant.json": toTenantJson(state.step7),
  }
}
