import { InstallProvider } from "@slack/oauth"
import { installStore } from "./install-store"

const BOT_SCOPES = [
  "chat:write",
  "chat:write.public",
  "commands",
  "channels:read",
  "groups:read",
  "im:history",
  "app_mentions:read",
]

let installer: InstallProvider | null = null

export function getInstaller() {
  if (installer) return installer
  installer = new InstallProvider({
    clientId: process.env.SLACK_CLIENT_ID!,
    clientSecret: process.env.SLACK_CLIENT_SECRET!,
    stateSecret: process.env.SLACK_STATE_SECRET!,
    installationStore: installStore,
    installUrlOptions: { scopes: BOT_SCOPES },
  })
  return installer
}
