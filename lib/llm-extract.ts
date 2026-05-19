import Anthropic from "@anthropic-ai/sdk"
import type { CrawlResult, CrawledPage } from "@/lib/website-crawler"
import type { ProductLine } from "@/lib/schema"

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "product"
  )
}

function pickCategory(pool: string): string | undefined {
  const low = pool.toLowerCase()
  const rules: Array<[RegExp, string]> = [
    [/\b(k-?12|teacher|classroom|student|curriculum|assessment|gamified|quiz)\b/, "K-12 education"],
    [/\b(ecommerce|shopify|checkout|cart)\b/, "E-commerce"],
    [/\b(fintech|banking|payments?|wallet)\b/, "Fintech"],
    [/\b(crm|lead|sales pipeline)\b/, "Sales/CRM"],
    [/\b(seo|aeo|content marketing|marketing automation)\b/, "Marketing technology"],
    [/\b(ai|llm|agent|automation|copilot)\b/, "AI platform"],
    [/\b(health|clinical|patient|ehr)\b/, "Healthcare"],
    [/\b(devtool|developer|api|sdk)\b/, "Developer tools"],
    [/\b(saas|b2b|platform)\b/, "B2B SaaS"],
  ]
  for (const [re, label] of rules) if (re.test(low)) return label
  return undefined
}

// --- Stub extractor: clusters crawled pages by first URL path segment. -------

export function stubExtract(crawl: CrawlResult): ProductLine[] {
  const buckets = new Map<string, CrawledPage[]>()
  for (const p of crawl.pages) {
    try {
      const u = new URL(p.url)
      const segs = u.pathname.split("/").filter(Boolean)
      const key = segs[0] ?? "_root"
      if (/^(blog|news|press|legal|privacy|terms|contact|careers|pricing|login|signin|signup|docs)$/i.test(key))
        continue
      const list = buckets.get(key) ?? []
      list.push(p)
      buckets.set(key, list)
    } catch {
      /* skip */
    }
  }

  // If no sub-paths usable, fall back to a single product from the root page.
  const out: ProductLine[] = []
  if (buckets.size === 0 && crawl.pages.length > 0) {
    const root = crawl.pages[0]
    const name = root.title?.split(/[|—–:·•\-]+/)[0]?.trim() || "Main product"
    const summary = root.description ?? root.h1 ?? root.h2s[0] ?? ""
    out.push({
      slug: slugify(name),
      name,
      summary: summary.slice(0, 240),
      url: root.url,
      category: pickCategory([name, summary, ...(root.h2s ?? [])].join(" ")),
      evidence: [root.url, ...(root.h2s ?? []).slice(0, 3)],
      features: (root.h2s ?? []).slice(0, 4).map((h) => ({ title: h.slice(0, 72), description: h.slice(0, 240) })),
      suggestedIcps: [],
      source: "stub",
    })
    return out
  }

  for (const [key, list] of buckets) {
    const primary = list[0]
    if (!primary) continue
    const name =
      primary.h1?.trim() ||
      primary.title?.split(/[|—–:·•\-]+/)[0]?.trim() ||
      key.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    const summary = (primary.description ?? primary.h2s.join(". ") ?? "").slice(0, 240)
    const evidence = list.slice(0, 4).map((p) => p.url)
    const features = (primary.h2s ?? []).slice(0, 5).map((h) => ({
      title: h.slice(0, 72),
      description: h.slice(0, 240),
    }))
    out.push({
      slug: slugify(`${name}-${key}`),
      name: name.slice(0, 64),
      summary,
      url: primary.url,
      category: pickCategory([name, summary, ...(primary.h2s ?? [])].join(" ")),
      evidence,
      features,
      suggestedIcps: [],
      source: "stub",
    })
  }
  // Stable order: richest first
  out.sort((a, b) => (b.features?.length ?? 0) - (a.features?.length ?? 0))
  return out.slice(0, 6)
}

// --- LLM extractor: Anthropic, optional. Fallback to stub on any failure. ----

type LlmPayload = {
  root: string
  pages: Array<{ url: string; title?: string; h1?: string; h2s: string[]; description?: string; text: string }>
}

function buildLlmPayload(crawl: CrawlResult): LlmPayload {
  return {
    root: crawl.rootUrl,
    pages: crawl.pages.slice(0, 10).map((p) => ({
      url: p.url,
      title: p.title,
      h1: p.h1,
      h2s: p.h2s.slice(0, 8),
      description: p.description,
      text: p.text.slice(0, 900),
    })),
  }
}

const SYSTEM_PROMPT = `You identify distinct product lines from a crawled company website.

Return strictly valid JSON:
{
  "productLines": [
    {
      "slug": "kebab-case",
      "name": "Short product name, Title Case",
      "summary": "1-2 sentence description of what this product does.",
      "url": "most relevant page from crawl",
      "category": "Industry/category label, e.g. K-12 education",
      "evidence": ["url1", "url2"],
      "features": [{"title": "short", "description": "1 line"}],
      "suggestedIcps": [{"name": "Persona", "role": "Job title", "industry": "Industry"}]
    }
  ]
}

Rules:
- 1-5 product lines. Only include lines with meaningful distinct positioning.
- If the site is a single product, return exactly 1 line.
- Keep features and icps grounded in crawl content. No inventions.
- Never include markdown or prose outside the JSON.`

export async function llmExtract(crawl: CrawlResult): Promise<ProductLine[] | null> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  const client = new Anthropic({ apiKey: key })
  const payload = buildLlmPayload(crawl)
  try {
    const resp = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Crawl of ${crawl.rootUrl}:\n\n${JSON.stringify(payload, null, 2)}`,
        },
      ],
    })
    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
    const json = extractJson(text)
    if (!json || !Array.isArray(json.productLines)) return null
    const lines: ProductLine[] = []
    for (const rawItem of json.productLines) {
      const raw = rawItem as Record<string, unknown>
      if (!raw?.name) continue
      lines.push({
        slug: raw.slug ? String(raw.slug) : slugify(String(raw.name)),
        name: String(raw.name).slice(0, 64),
        summary: String(raw.summary ?? "").slice(0, 400),
        url: String(raw.url ?? crawl.rootUrl),
        category: raw.category ? String(raw.category) : undefined,
        evidence: Array.isArray(raw.evidence) ? raw.evidence.map(String).slice(0, 5) : [],
        features: Array.isArray(raw.features)
          ? raw.features
              .map((f: { title?: unknown; description?: unknown }) => ({
                title: String(f?.title ?? "").slice(0, 72),
                description: String(f?.description ?? "").slice(0, 240),
              }))
              .filter((f: { title: string; description: string }) => f.title && f.description)
              .slice(0, 6)
          : [],
        suggestedIcps: Array.isArray(raw.suggestedIcps)
          ? raw.suggestedIcps
              .map(
                (i: { name?: unknown; role?: unknown; industry?: unknown }) => ({
                  name: String(i?.name ?? ""),
                  role: String(i?.role ?? ""),
                  industry: String(i?.industry ?? ""),
                }),
              )
              .filter((i: { name: string; role: string; industry: string }) => i.name && i.role && i.industry)
              .slice(0, 3)
          : [],
        source: "llm",
      })
    }
    return lines.length > 0 ? lines : null
  } catch {
    return null
  }
}

function extractJson(text: string): { productLines?: unknown[] } | null {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    /* fall through */
  }
  const m = trimmed.match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    return JSON.parse(m[0])
  } catch {
    return null
  }
}

// --- High-level: run LLM (if key), else stub. --------------------------------

export async function extractProductLines(crawl: CrawlResult): Promise<ProductLine[]> {
  const viaLlm = await llmExtract(crawl)
  if (viaLlm && viaLlm.length > 0) return viaLlm
  return stubExtract(crawl)
}
