import { runDesignResearch } from "@/lib/agents/design-researcher"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as { task?: string }
    const result = await runDesignResearch(body.task)
    return Response.json(result)
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Research failed" },
      { status: 500 },
    )
  }
}
