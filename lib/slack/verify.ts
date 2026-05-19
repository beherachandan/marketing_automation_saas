import { createHmac, timingSafeEqual } from "node:crypto"

/**
 * Verify a Slack request signature per https://api.slack.com/authentication/verifying-requests-from-slack
 * Returns true if the signature is valid and timestamp is within 5 minutes.
 */
export function verifySlackSignature(opts: {
  signingSecret: string
  signature: string | null
  timestamp: string | null
  rawBody: string
}): boolean {
  const { signingSecret, signature, timestamp, rawBody } = opts
  if (!signature || !timestamp) return false

  const ts = Number(timestamp)
  if (!Number.isFinite(ts)) return false
  if (Math.abs(Date.now() / 1000 - ts) > 60 * 5) return false

  const base = `v0:${timestamp}:${rawBody}`
  const expected = "v0=" + createHmac("sha256", signingSecret).update(base).digest("hex")

  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
