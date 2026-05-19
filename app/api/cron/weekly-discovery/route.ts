import { NextRequest } from "next/server"
import { runCron, verifyCron } from "../_shared"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Weekly demand discovery: expand each tenant's Step 6 seeds into a keyword pipeline
 * (volume, intent, SERP) using Semrush/DataForSEO per their integration status.
 *
 * MVP stub: writes nothing, returns processed=0.
 */
export async function GET(req: NextRequest) {
  const guard = verifyCron(req)
  if (guard) return guard
  return runCron("weekly-discovery", async () => {
    return { processed: 0, note: "stub — plug in Semrush/DataForSEO fan-out" }
  })
}
