import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { verifySlackSignature } from "@/lib/slack/verify"
import { getSlackClient, postToSlack } from "@/lib/slack/post"
import { getSupabaseServiceClient } from "@/lib/supabase/service"
import { runAudit } from "@/lib/agents/audit"
import { runDraft } from "@/lib/agents/draft"

/**
 * POST /api/slack/commands
 * Handles /audit and /draft slash commands.
 * ACK within 3s — all real work runs after the response ships.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig = req.headers.get("x-slack-signature")
  const ts = req.headers.get("x-slack-request-timestamp")

  if (
    !verifySlackSignature({
      signingSecret: process.env.SLACK_SIGNING_SECRET!,
      signature: sig,
      timestamp: ts,
      rawBody,
    })
  ) {
    return new NextResponse("invalid signature", { status: 401 })
  }

  const params = new URLSearchParams(rawBody)
  const command = params.get("command")
  const text = (params.get("text") ?? "").trim()
  const teamId = params.get("team_id")!
  const channelId = params.get("channel_id")!
  const userId = params.get("user_id")

  if (!command) return NextResponse.json({ text: "No command received." })

  // Fire-and-forget: kick the background worker, return ACK.
  handle(command, text, teamId, channelId, userId).catch((err) =>
    console.error(`Slack ${command} handler crashed:`, err),
  )

  const ack = command === "/audit" ? "🔍 Auditing..." : command === "/draft" ? "✍️ Drafting..." : `Running ${command}...`
  return NextResponse.json({ response_type: "in_channel", text: ack })
}

async function handle(command: string, text: string, teamId: string, channelId: string, userId: string | null) {
  const { workspaceId } = await getSlackClient(teamId)
  const supabase = getSupabaseServiceClient()

  if (command === "/audit") {
    const url = text || ""
    if (!/^https?:\/\//i.test(url)) {
      await postToSlack({ teamId, channelId, text: "Usage: `/audit https://example.com/your-page`" })
      return
    }

    const { data: run } = await supabase
      .from("runs")
      .insert({
        workspace_id: workspaceId,
        kind: "audit",
        status: "running",
        input: { url, user_id: userId },
        slack_channel_id: channelId,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    try {
      const result = await runAudit(workspaceId, url)
      await postToSlack({ teamId, channelId, text: result.summary, blocks: result.blocks })
      await supabase
        .from("runs")
        .update({ status: "succeeded", output: result, finished_at: new Date().toISOString() })
        .eq("id", run!.id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Audit failed"
      await postToSlack({ teamId, channelId, text: `⚠️ Audit failed: ${msg}` })
      await supabase
        .from("runs")
        .update({ status: "failed", error: msg, finished_at: new Date().toISOString() })
        .eq("id", run!.id)
    }
    return
  }

  if (command === "/draft") {
    const topic = text
    if (!topic) {
      await postToSlack({ teamId, channelId, text: "Usage: `/draft <topic or angle>`" })
      return
    }

    const { data: run } = await supabase
      .from("runs")
      .insert({
        workspace_id: workspaceId,
        kind: "draft",
        status: "running",
        input: { topic, user_id: userId },
        slack_channel_id: channelId,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    try {
      const result = await runDraft(workspaceId, topic)
      await postToSlack({ teamId, channelId, text: result.summary, blocks: result.blocks })
      await supabase
        .from("runs")
        .update({ status: "succeeded", output: result, finished_at: new Date().toISOString() })
        .eq("id", run!.id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Draft failed"
      await postToSlack({ teamId, channelId, text: `⚠️ Draft failed: ${msg}` })
      await supabase
        .from("runs")
        .update({ status: "failed", error: msg, finished_at: new Date().toISOString() })
        .eq("id", run!.id)
    }
    return
  }

  await postToSlack({ teamId, channelId, text: `Unknown command: ${command}` })
}
