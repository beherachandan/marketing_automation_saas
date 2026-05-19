import { loadTenantContext, buildSystemPreamble } from "./context"
import { complete, MODEL_OPUS } from "./anthropic"

type AuditResult = {
  summary: string
  blocks: unknown[]
  scores: Record<string, number>
  totalScore: number
  passed: boolean
  verdict: string
  raw: string
}

/**
 * /audit — fetch a URL, score it against the tenant's rubric, return Slack-ready payload.
 */
export async function runAudit(workspaceId: string, url: string): Promise<AuditResult> {
  const { state, files } = await loadTenantContext(workspaceId)
  const page = await fetchPage(url)

  const system = [
    buildSystemPreamble(files),
    ``,
    `You are the AEO evaluator. You score the page below against the rubric dimensions and their weights.`,
    `For each dimension, produce a 0–10 score (10 = rubric-perfect) and a one-line reason.`,
    `Compute the weighted total on a 0–10 scale using: sum(score_i * weight_i) / 100.`,
    `Reply with valid JSON matching this shape exactly — nothing before or after:`,
    `{`,
    `  "scores": { "<dimension>": <0-10>, ... },`,
    `  "reasons": { "<dimension>": "<one line>", ... },`,
    `  "total": <0-10>,`,
    `  "verdict": "<one-sentence verdict>",`,
    `  "top_fixes": ["<fix 1>", "<fix 2>", "<fix 3>"]`,
    `}`,
  ].join("\n")

  const user = [
    `URL: ${url}`,
    `Pass threshold: ${state.step5.passThreshold}`,
    ``,
    `--- PAGE CONTENT (truncated to ~8k chars) ---`,
    page.slice(0, 8000),
    `--- END ---`,
  ].join("\n")

  const raw = await complete({ system, user, model: MODEL_OPUS, maxTokens: 2000, temperature: 0.2 })
  const parsed = extractJson(raw)

  const scores = (parsed.scores ?? {}) as Record<string, number>
  const reasons = (parsed.reasons ?? {}) as Record<string, string>
  const total = typeof parsed.total === "number" ? parsed.total : 0
  const verdict = String(parsed.verdict ?? "")
  const topFixes = Array.isArray(parsed.top_fixes) ? parsed.top_fixes : []
  const passed = total >= state.step5.passThreshold

  const emoji = passed ? "✅" : "⚠️"
  const summary = `${emoji} Audit ${passed ? "PASSED" : "FAILED"} — ${total.toFixed(1)}/10 · ${verdict}`

  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: `${emoji} ${passed ? "PASS" : "REVISE"} — ${total.toFixed(1)}/10` },
    },
    { type: "section", text: { type: "mrkdwn", text: `*URL:* ${url}\n*Verdict:* ${verdict}` } },
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          "*Scores*\n" +
          Object.entries(scores)
            .map(([k, v]) => `• *${k}*: ${v}/10 — ${reasons[k] ?? ""}`)
            .join("\n"),
      },
    },
    ...(topFixes.length
      ? [
          { type: "divider" },
          {
            type: "section",
            text: { type: "mrkdwn", text: "*Top fixes*\n" + topFixes.map((f: string) => `• ${f}`).join("\n") },
          },
        ]
      : []),
  ]

  return { summary, blocks, scores, totalScore: total, passed, verdict, raw }
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": "ConductBot/1.0 (+https://conduct.app)" },
    redirect: "follow",
  })
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`)
  const html = await res.text()
  return stripHtml(html)
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function extractJson(raw: string): Record<string, unknown> {
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) return {}
  try {
    return JSON.parse(match[0])
  } catch {
    return {}
  }
}
