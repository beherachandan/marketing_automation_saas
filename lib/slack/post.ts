import { WebClient } from "@slack/web-api"
import { getSupabaseServiceClient } from "@/lib/supabase/service"
import { decrypt } from "@/lib/crypto"

/**
 * Resolve a WebClient + workspace_id for a given Slack team_id.
 * Used by slash-command handlers and background agents to post results.
 */
export async function getSlackClient(teamId: string): Promise<{ client: WebClient; workspaceId: string }> {
  const supabase = getSupabaseServiceClient()
  const { data, error } = await supabase
    .from("slack_installs")
    .select("workspace_id,bot_token_encrypted")
    .eq("team_id", teamId)
    .is("uninstalled_at", null)
    .maybeSingle()
  if (error || !data) throw new Error(`No Slack install for team ${teamId}`)

  const token = decrypt(Buffer.from(data.bot_token_encrypted).toString("base64"))
  return { client: new WebClient(token), workspaceId: data.workspace_id }
}

export async function postToSlack(opts: {
  teamId: string
  channelId: string
  threadTs?: string
  text: string
  blocks?: unknown[]
}) {
  const { client } = await getSlackClient(opts.teamId)
  return client.chat.postMessage({
    channel: opts.channelId,
    thread_ts: opts.threadTs,
    text: opts.text,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    blocks: opts.blocks as any,
    unfurl_links: false,
    unfurl_media: false,
  })
}
