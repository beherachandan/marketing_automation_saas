import { complete, MODEL_SONNET } from "./anthropic"

export interface DesignResearchResult {
  colorSystem: string
  typography: string
  nodeAnatomy: string
  edgeStyle: string
  spacing: string
  inspirationUrls: string[]
  fullBrief: string
}

const SEARCH_QUERIES = [
  "SaaS pipeline architecture diagram dark nodes light background UI design 2024",
  "node graph visualization design system dark pill chips white canvas CSS",
  "workflow diagram agentic system beautiful design Dribbble Figma",
]

interface TavilyResult {
  title: string
  url: string
  content: string
  score: number
}

async function tavilySearch(query: string): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) return []

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        max_results: 3,
        include_answer: false,
      }),
    })
    if (!res.ok) return []
    const data = await res.json() as { results?: TavilyResult[] }
    return data.results ?? []
  } catch {
    return []
  }
}

export async function runDesignResearch(task?: string): Promise<DesignResearchResult> {
  const taskDesc = task ?? "Improve the PipelineCanvas node-graph diagram for a marketing automation SaaS onboarding flow"

  // Gather search results in parallel
  const searchResults = await Promise.all(SEARCH_QUERIES.map(tavilySearch))
  const allResults = searchResults.flat().sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

  const topUrls = [...new Set(allResults.map((r) => r.url))].slice(0, 5)

  const searchContext = allResults
    .slice(0, 8)
    .map((r) => `## ${r.title}\nURL: ${r.url}\n${r.content.slice(0, 400)}`)
    .join("\n\n---\n\n")

  const system = `You are a senior product designer specialising in SaaS dashboards and data visualisation.
You research and synthesise design patterns from references to produce concrete, actionable design briefs.
Always respond with a valid JSON object matching the specified schema. No markdown fences around the JSON.`

  const user = `Task: ${taskDesc}

Current implementation context:
- React component using plain div layout + absolute SVG overlay for edges
- Tailwind CSS v3 with shadcn/ui design tokens
- Dark pill chips (bg-gray-900, text-white, rounded-xl) on white canvas
- Framer Motion for node entry spring + edge draw-in
- Canvas: 348px wide, nodes: 100x46px, 3-column layout
- "Active Pipeline" zone + "Horizon" locked zone below separator

Design research references found:
${searchContext || "(no web results available — synthesise from your design knowledge)"}

Return a JSON object with this exact shape:
{
  "colorSystem": "string — recommended hex values for: canvas bg, node fill, node border, active edge, locked edge, accent, text-primary, text-secondary",
  "typography": "string — font sizes and weights for: node code label, node name, node sub-label, edge label, zone header, horizon label",
  "nodeAnatomy": "string — recommended shape (border-radius), icon placement, padding, shadow/glow for active vs locked states",
  "edgeStyle": "string — line weight, stroke-dasharray for locked, edge label pill bg/border/font, bezier vs straight",
  "spacing": "string — gap between nodes (COL_GAP, ROW_GAP), canvas padding, zone header margin",
  "inspirationUrls": ["array of 3 URLs from the research that are most relevant — use empty strings if none found"],
  "fullBrief": "string — full 400-600 word design brief with specific Tailwind class recommendations for each element"
}`

  const raw = await complete({ system, user, model: MODEL_SONNET, maxTokens: 2000, temperature: 0.4 })

  try {
    // Strip any markdown fences if the model wrapped it
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
    const parsed = JSON.parse(cleaned) as DesignResearchResult
    // Ensure inspirationUrls falls back gracefully
    if (!Array.isArray(parsed.inspirationUrls) || parsed.inspirationUrls.length === 0) {
      parsed.inspirationUrls = topUrls.slice(0, 3)
    }
    return parsed
  } catch {
    // If JSON parse fails, return raw as fullBrief with empty structured fields
    return {
      colorSystem: "Parse error — see fullBrief",
      typography: "Parse error — see fullBrief",
      nodeAnatomy: "Parse error — see fullBrief",
      edgeStyle: "Parse error — see fullBrief",
      spacing: "Parse error — see fullBrief",
      inspirationUrls: topUrls.slice(0, 3),
      fullBrief: raw,
    }
  }
}
