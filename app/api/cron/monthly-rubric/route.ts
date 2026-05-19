import { NextRequest } from "next/server"
import { runCron, verifyCron } from "../_shared"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Monthly rubric re-score: re-run `runAudit()` against every live article so
 * drift (new SERP winners, freshness decay) surfaces as revise tickets.
 *
 * MVP stub.
 */
export async function GET(req: NextRequest) {
  const guard = verifyCron(req)
  if (guard) return guard
  return runCron("monthly-rubric", async () => {
    return { processed: 0, note: "stub — re-score live articles once publish pipeline lands" }
  })
}
