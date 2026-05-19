import { NextRequest, NextResponse } from "next/server"

/**
 * Vercel cron jobs hit these routes with an Authorization header:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * In dev/local we also allow an unauthenticated hit when the secret isn't set,
 * so you can curl the endpoint during onboarding testing.
 */
export function verifyCron(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret) return null // local/dev — allow through

  // Vercel cron adds "Authorization: Bearer <secret>" automatically when CRON_SECRET is defined.
  const header = req.headers.get("authorization")
  if (header !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }
  return null
}

export type CronResult = {
  ok: boolean
  job: string
  ranAt: string
  durationMs: number
  processed?: number
  skipped?: number
  error?: string
  note?: string
}

export async function runCron(
  job: string,
  fn: () => Promise<Omit<CronResult, "ok" | "job" | "ranAt" | "durationMs">>,
): Promise<NextResponse> {
  const start = Date.now()
  const ranAt = new Date().toISOString()
  try {
    const out = await fn()
    return NextResponse.json({
      ok: true,
      job,
      ranAt,
      durationMs: Date.now() - start,
      ...out,
    } satisfies CronResult)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      { ok: false, job, ranAt, durationMs: Date.now() - start, error: msg } satisfies CronResult,
      { status: 500 },
    )
  }
}
