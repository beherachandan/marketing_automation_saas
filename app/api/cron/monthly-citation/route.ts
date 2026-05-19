import { NextRequest } from "next/server"
import { runCron, verifyCron } from "../_shared"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Monthly citation sweep: re-check each published article's outbound citations —
 * flag 404s, redirects, and domain changes into a fix queue.
 *
 * MVP stub.
 */
export async function GET(req: NextRequest) {
  const guard = verifyCron(req)
  if (guard) return guard
  return runCron("monthly-citation", async () => {
    return { processed: 0, note: "stub — iterate published articles once publish pipeline lands" }
  })
}
