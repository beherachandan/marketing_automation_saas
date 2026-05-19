import type { Installation, InstallationStore } from "@slack/oauth"
import { getSupabaseServiceClient } from "@/lib/supabase/service"
import { encrypt, decrypt } from "@/lib/crypto"

/**
 * Supabase-backed InstallationStore for @slack/bolt OAuth.
 *
 * Keys each install by team_id. Stores the bot token encrypted.
 * Workspace association happens at install-time via the OAuth state payload
 * (see /api/slack/oauth_redirect — it reads the workspaceId from state and
 * upserts slack_installs + integrations accordingly).
 */
export const installStore: InstallationStore = {
  async storeInstallation(installation) {
    const supabase = getSupabaseServiceClient()
    const teamId = installation.team?.id
    if (!teamId) throw new Error("Slack installation missing team.id")

    const botToken = installation.bot?.token
    if (!botToken) throw new Error("Slack installation missing bot token")

    const payload = {
      team_id: teamId,
      team_name: installation.team?.name ?? null,
      bot_user_id: installation.bot?.userId ?? null,
      bot_token_encrypted: Buffer.from(encrypt(botToken), "base64"),
      user_id: installation.user?.id ?? null,
      app_id: installation.appId ?? null,
      scope: installation.bot?.scopes?.join(",") ?? null,
      installed_at: new Date().toISOString(),
      uninstalled_at: null,
    }

    // Resolve workspace_id from metadata JSON (threaded through OAuth `state` at redirect time)
    const metadataRaw = (installation as unknown as { metadata?: string }).metadata
    const workspaceId = metadataRaw ? (JSON.parse(metadataRaw) as { workspaceId?: string }).workspaceId : undefined
    if (!workspaceId) throw new Error("Slack install missing workspace metadata")

    const { error } = await supabase
      .from("slack_installs")
      .upsert({ workspace_id: workspaceId, ...payload }, { onConflict: "workspace_id,team_id" })
    if (error) throw error
  },

  async fetchInstallation(query) {
    const supabase = getSupabaseServiceClient()
    const { data, error } = await supabase
      .from("slack_installs")
      .select("*")
      .eq("team_id", query.teamId ?? "")
      .is("uninstalled_at", null)
      .maybeSingle()
    if (error || !data) throw new Error("Install not found")

    const botToken = decrypt(Buffer.from(data.bot_token_encrypted).toString("base64"))
    return {
      team: { id: data.team_id, name: data.team_name ?? undefined },
      bot: {
        token: botToken,
        userId: data.bot_user_id ?? "",
        id: data.bot_user_id ?? "",
        scopes: (data.scope ?? "").split(",").filter(Boolean),
      },
      user: { id: data.user_id ?? "" },
      appId: data.app_id ?? undefined,
      tokenType: "bot",
      isEnterpriseInstall: false,
      authVersion: "v2",
    } as unknown as Installation
  },

  async deleteInstallation(query) {
    const supabase = getSupabaseServiceClient()
    await supabase
      .from("slack_installs")
      .update({ uninstalled_at: new Date().toISOString() })
      .eq("team_id", query.teamId ?? "")
  },
}
