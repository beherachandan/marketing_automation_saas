import { NextRequest } from "next/server"
import { runCron, verifyCron } from "../_shared"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Daily EOD memory: snapshot each tenant's `memory.md` with today's activity —
 * drafts created, audits run, articles published, rubric changes.
 *
 * MVP stub: no tenants yet → returns processed=0. Wired up so Vercel cron can hit it
 * starting day one; swap in the real DB iteration once multi-tenant state lands.
 */
export async function GET(req: NextRequest) {
  const guard = verifyCron(req)
  if (guard) return guard
  return runCron("eod-memory", async () => {
    return { processed: 0, note: "stub — no tenants to snapshot yet" }
  })
}
