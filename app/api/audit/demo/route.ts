import { NextRequest, NextResponse } from "next/server"
import { loadOnboardingState } from "@/lib/persist"
import { isDevBypass } from "@/lib/persist-local"
import { runAudit } from "@/lib/agents/audit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  let url: string
  try {
    const body = (await req.json()) as { url?: unknown }
    if (typeof body.url !== "string" || !/^https?:\/\//.test(body.url)) {
      return NextResponse.json(
        { ok: false, error: "Provide a URL starting with http:// or https://" },
        { status: 400 }
      )
    }
    url = body.url
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const state = await loadOnboardingState()
  const workspaceId = state.workspaceId ?? "dev-workspace"

  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY
  const hasTenantContext = !!(state.step2 && state.step4 && state.step5)

  if (!hasAnthropicKey || !hasTenantContext) {
    return NextResponse.json(stubAuditResponse(url, state.step5?.passThreshold ?? 7))
  }

  try {
    const result = await runAudit(workspaceId, url)
    return NextResponse.json({
      ok: true,
      source: "live",
      summary: result.summary,
      blocks: result.blocks,
      scores: result.scores,
      totalScore: result.totalScore,
      passed: result.passed,
      verdict: result.verdict,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Audit failed"
    if (isDevBypass()) {
      return NextResponse.json({
        ...stubAuditResponse(url, state.step5?.passThreshold ?? 7),
        error: msg,
      })
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

function stubAuditResponse(url: string, passThreshold: number) {
  const scores = {
    structure: 8.2,
    factuality: 7.5,
    citation: 6.8,
    clarity: 8.8,
    intent: 7.9,
    brandAlignment: 7.2,
    icpFit: 7.1,
    freshness: 6.5,
    uniqueness: 7.6,
  }
  const total =
    Object.values(scores).reduce((s, v) => s + v, 0) / Object.keys(scores).length
  const passed = total >= passThreshold
  const verdict = passed
    ? "Solid structure and clarity; minor gaps in citations and freshness."
    : "Decent draft — improve citation density and add recent sources before publish."
  const emoji = passed ? "✅" : "⚠️"
  const summary = `${emoji} Audit ${passed ? "PASSED" : "FAILED"} — ${total.toFixed(1)}/10 · ${verdict}`
  return {
    ok: true,
    source: "stub" as const,
    summary,
    totalScore: Number(total.toFixed(2)),
    passed,
    verdict,
    scores,
    blocks: [
      { type: "header", text: { type: "plain_text", text: `${emoji} ${passed ? "PASS" : "REVISE"} — ${total.toFixed(1)}/10` } },
      { type: "section", text: { type: "mrkdwn", text: `*URL:* ${url}\n*Verdict:* ${verdict}` } },
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "*Scores*\n" +
            Object.entries(scores)
              .map(([k, v]) => `• *${k}*: ${v.toFixed(1)}/10`)
              .join("\n"),
        },
      },
    ],
  }
}
