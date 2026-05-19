import { NextRequest } from "next/server"
import { revalidatePath } from "next/cache"
import { scanWebsiteDeep, type ScanProgress } from "@/lib/website-scanner"
import { saveScannedHints } from "@/lib/persist"
import type { ScannedHints } from "@/lib/schema"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

type Event = ScanProgress | { phase: "done"; hints: ScannedHints } | { phase: "error"; error: string }

export async function POST(req: NextRequest) {
  let url = ""
  try {
    const body = (await req.json()) as { url?: string }
    url = (body.url ?? "").trim()
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), { status: 400 })
  }
  if (!/^https?:\/\//i.test(url)) {
    return new Response(JSON.stringify({ error: "url must start with http(s)://" }), { status: 400 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const push = (ev: Event) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(ev) + "\n"))
        } catch {
          // controller already closed
        }
      }
      try {
        const hints = await scanWebsiteDeep(url, push)
        await saveScannedHints(hints)
        revalidatePath("/onboarding", "layout")
        push({ phase: "done", hints })
      } catch (e) {
        push({ phase: "error", error: e instanceof Error ? e.message : "Scan failed" })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate",
      "x-accel-buffering": "no",
    },
  })
}
