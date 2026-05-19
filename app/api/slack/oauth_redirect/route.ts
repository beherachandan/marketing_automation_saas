import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getInstaller } from "@/lib/slack/installer"

/**
 * GET /api/slack/oauth_redirect
 * Slack redirects here with ?code=...&state=... after user approves.
 * @slack/oauth validates state, exchanges code, and calls installStore.storeInstallation,
 * which writes slack_installs (bot token encrypted) scoped to the workspace_id it pulls
 * from the state's metadata.
 */
export async function GET(req: NextRequest) {
  const installer = getInstaller()

  // InstallProvider.handleCallback expects a Node http req/res — we wrap manually.
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  if (!code || !state) {
    return NextResponse.redirect(new URL("/onboarding/step-7?slack=error", req.url))
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodeReqLike: any = {
      url: `/api/slack/oauth_redirect${url.search}`,
      method: "GET",
      headers: {},
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodeResLike: any = {
      writeHead: () => {},
      end: () => {},
      statusCode: 200,
    }

    await installer.handleCallback(nodeReqLike, nodeResLike, {
      success: () => {
        // no-op; we handle the redirect ourselves below
      },
      failure: () => {
        // no-op; error handled via thrown exception path
      },
    })

    return NextResponse.redirect(new URL("/onboarding/step-7?slack=ok", req.url))
  } catch (err) {
    console.error("Slack OAuth callback failed", err)
    return NextResponse.redirect(new URL("/onboarding/step-7?slack=error", req.url))
  }
}
