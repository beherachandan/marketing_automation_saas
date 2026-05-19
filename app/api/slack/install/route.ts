import { NextResponse } from "next/server"
import { getInstaller } from "@/lib/slack/installer"
import { getActiveWorkspaceId } from "@/lib/persist"

/**
 * GET /api/slack/install
 * Kicks off the Slack OAuth flow. Encodes the active workspace_id into
 * the OAuth `metadata` so the callback can associate the install with
 * the right tenant.
 */
export async function GET() {
  const workspaceId = await getActiveWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: "No active workspace. Complete Step 1 first." }, { status: 400 })
  }

  const installer = getInstaller()
  const url = await installer.generateInstallUrl({
    scopes: [
      "chat:write",
      "chat:write.public",
      "commands",
      "channels:read",
      "groups:read",
      "im:history",
      "app_mentions:read",
    ],
    metadata: JSON.stringify({ workspaceId }),
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/slack/oauth_redirect`,
  })

  return NextResponse.redirect(url)
}
