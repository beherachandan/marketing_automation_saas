import type { ScannedHints, ProductLine } from "@/lib/schema"
import { crawlSite, type CrawlResult, type CrawlProgress } from "@/lib/website-crawler"
import { extractProductLines, stubExtract } from "@/lib/llm-extract"

export type ScanProgress =
  | { phase: "fetch_start"; url: string }
  | { phase: "fetch_done"; ok: boolean; title?: string; error?: string }
  | CrawlProgress
  | { phase: "extract_start"; pages: number }
  | { phase: "extract_done"; productLines: number; source: "llm" | "stub" }

const UA =
  "Mozilla/5.0 (compatible; MarketingAutomationSaaS/0.1; +https://marketing-automation.example.com)"

function firstMatch(html: string, re: RegExp): string | undefined {
  const m = html.match(re)
  return m?.[1]?.trim()
}

function extractTitle(html: string): string | undefined {
  return firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i)?.replace(/\s+/g, " ")
}

function extractMetaName(html: string, name: string): string | undefined {
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`,
    "i",
  )
  const alt = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`,
    "i",
  )
  return firstMatch(html, re) ?? firstMatch(html, alt)
}

function extractHeadings(html: string): string[] {
  const out: string[] = []
  const re = /<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) && out.length < 8) {
    const text = m[1]
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim()
    if (text && text.length >= 3 && text.length <= 140) out.push(text)
  }
  return out
}

function deriveProductName(title: string | undefined, url: string): string | undefined {
  if (!title) {
    try {
      const h = new URL(url).hostname.replace(/^www\./, "")
      return h.split(".")[0].replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    } catch {
      return undefined
    }
  }
  const parts = title.split(/[|—–:·•\-]+/).map((s) => s.trim()).filter(Boolean)
  return parts[0] || title
}

function deriveCategory(description: string | undefined, headings: string[]): string | undefined {
  const pool = [description ?? "", ...headings].join(" ").toLowerCase()
  const rules: Array<[RegExp, string]> = [
    [/\b(k-?12|teacher|classroom|student|curriculum|assessment|gamified)\b/, "K-12 education platform"],
    [/\b(ecommerce|shopify|checkout|cart)\b/, "E-commerce"],
    [/\b(fintech|banking|payments?|wallet)\b/, "Fintech"],
    [/\b(saas|b2b|enterprise|platform)\b/, "B2B SaaS"],
    [/\b(crm|lead|sales)\b/, "Sales/CRM"],
    [/\b(marketing|seo|content|aeo)\b/, "Marketing technology"],
    [/\b(ai|llm|agent|automation)\b/, "AI platform"],
    [/\b(health|clinical|patient)\b/, "Healthcare"],
    [/\b(devtool|developer|api)\b/, "Developer tools"],
  ]
  for (const [re, label] of rules) if (re.test(pool)) return label
  return undefined
}

function deriveSeeds(title: string | undefined, description: string | undefined, headings: string[]): string[] {
  const pool = [title ?? "", description ?? "", ...headings].join(" ")
  const phrases = pool
    .split(/[.!?\n—–|·•]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 10 && s.length <= 80)
    .slice(0, 6)
  return phrases
}

function tonePreset() {
  return {
    formalCasual: 40,
    authoritativeFriendly: 45,
    technicalConversational: 55,
    playfulSerious: 55,
  }
}

export async function scanWebsite(url: string): Promise<ScannedHints> {
  const scannedAt = new Date().toISOString()
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,*/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      return { url, scannedAt, ok: false, error: `HTTP ${res.status}` }
    }
    const html = await res.text()
    const title = extractTitle(html)
    const description =
      extractMetaName(html, "description") ?? extractMetaName(html, "og:description")
    const ogImage = extractMetaName(html, "og:image")
    const ogSiteName = extractMetaName(html, "og:site_name")
    const headings = extractHeadings(html)

    const productName = deriveProductName(ogSiteName ?? title, url)
    const category = deriveCategory(description, headings)
    const oneLiner = description?.slice(0, 160)
    const longDescription =
      description && description.length >= 50
        ? description
        : headings.length
          ? `${title ?? productName ?? "Product"} — ${headings.slice(0, 3).join(". ")}.`
          : undefined

    return {
      url,
      scannedAt,
      ok: true,
      title,
      description,
      ogImage,
      ogSiteName,
      headings,
      suggestedProduct: {
        name: productName,
        category,
        oneLiner,
        longDescription: longDescription && longDescription.length >= 50 ? longDescription : undefined,
      },
      suggestedSeeds: deriveSeeds(title, description, headings),
    }
  } catch (e) {
    return {
      url,
      scannedAt,
      ok: false,
      error: e instanceof Error ? e.message : "Fetch failed",
    }
  }
}

/**
 * Deep scan: crawls depth-2, groups into product-line candidates, and enriches
 * defaults for downstream steps (product, ICPs, brand voice, seeds).
 */
export async function scanWebsiteDeep(
  url: string,
  onProgress?: (e: ScanProgress) => void,
): Promise<ScannedHints> {
  const scannedAt = new Date().toISOString()
  onProgress?.({ phase: "fetch_start", url })
  const homepage = await scanWebsite(url)
  onProgress?.({ phase: "fetch_done", ok: homepage.ok, title: homepage.title, error: homepage.error })
  if (!homepage.ok) return homepage

  let crawl: CrawlResult
  try {
    crawl = await crawlSite(url, { maxPages: 8, maxDepth: 2, onProgress })
  } catch (e) {
    return {
      ...homepage,
      error: e instanceof Error ? e.message : "Crawl failed",
    }
  }

  let productLines: ProductLine[] = []
  let source: "llm" | "stub" = "llm"
  onProgress?.({ phase: "extract_start", pages: crawl.pages.length })
  try {
    productLines = await extractProductLines(crawl)
  } catch {
    productLines = stubExtract(crawl)
    source = "stub"
  }
  if (productLines.length && productLines[0].source !== "llm") source = "stub"
  onProgress?.({ phase: "extract_done", productLines: productLines.length, source })

  // Enrich seeds by mining h2s across crawled pages.
  const crawledHeadings: string[] = []
  for (const p of crawl.pages) crawledHeadings.push(...p.h2s)
  const seedPool = Array.from(
    new Set([...(homepage.suggestedSeeds ?? []), ...deriveSeeds(homepage.title, homepage.description, crawledHeadings)]),
  ).slice(0, 10)

  // Aggregate ICPs across product lines as starter suggestions.
  const icps: Array<{ name: string; role: string; industry: string }> = []
  for (const pl of productLines) for (const i of pl.suggestedIcps ?? []) icps.push(i)

  return {
    ...homepage,
    scannedAt,
    crawledUrls: crawl.pages.map((p) => p.url),
    productLines,
    selectedProductSlugs: productLines.slice(0, 1).map((p) => p.slug),
    suggestedSeeds: seedPool,
    suggestedIcps: icps.slice(0, 3),
    suggestedBrandVoice: {
      tone: tonePreset(),
      attributes: productLines[0]?.category ? [productLines[0].category.toLowerCase()] : [],
      goodExample: homepage.description ?? homepage.headings?.[0],
    },
  }
}
