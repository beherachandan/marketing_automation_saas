const UA =
  "Mozilla/5.0 (compatible; MarketingAutomationSaaS/0.1; +https://marketing-automation.example.com)"

export type CrawledPage = {
  url: string
  ok: boolean
  status?: number
  depth: number
  title?: string
  description?: string
  h1?: string
  h2s: string[]
  text: string
  internalLinks: string[]
}

export type CrawlResult = {
  rootUrl: string
  origin: string
  pages: CrawledPage[]
  fetchedAt: string
  errors: string[]
}

export type CrawlProgress =
  | { phase: "crawl_page"; url: string; fetched: number; max: number; ok: boolean }

function firstMatch(html: string, re: RegExp): string | undefined {
  const m = html.match(re)
  return m?.[1]?.trim()
}

function stripTags(s: string) {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function extractTitle(html: string) {
  return firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i)?.replace(/\s+/g, " ")
}

function extractMeta(html: string, name: string) {
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

function extractH(html: string, level: 1 | 2): string[] {
  const re = new RegExp(`<h${level}[^>]*>([\\s\\S]*?)<\\/h${level}>`, "gi")
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) && out.length < 20) {
    const t = stripTags(m[1])
    if (t && t.length >= 2 && t.length <= 180) out.push(t)
  }
  return out
}

function extractTextBlocks(html: string, limit = 1600): string {
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "")
  const chunks: string[] = []
  let total = 0
  const re = /<(p|li|h[1-3])[^>]*>([\s\S]*?)<\/\1>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(body))) {
    const t = stripTags(m[2])
    if (!t || t.length < 20) continue
    chunks.push(t)
    total += t.length
    if (total > limit) break
  }
  return chunks.join("\n").slice(0, limit)
}

function extractLinks(html: string, base: URL): string[] {
  const out = new Set<string>()
  const re = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const raw = m[1]
    if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:")) continue
    try {
      const abs = new URL(raw, base)
      if (abs.origin !== base.origin) continue
      abs.hash = ""
      abs.search = ""
      const p = abs.pathname
      if (/\.(jpg|jpeg|png|gif|svg|webp|ico|css|js|pdf|zip|xml|mp4)$/i.test(p)) continue
      out.add(abs.toString())
    } catch {
      /* ignore */
    }
  }
  return Array.from(out)
}

async function fetchPage(url: string, depth: number): Promise<CrawledPage> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,*/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(7000),
    })
    if (!res.ok) {
      return { url, ok: false, status: res.status, depth, h2s: [], text: "", internalLinks: [] }
    }
    const html = await res.text()
    const base = new URL(res.url)
    return {
      url: res.url,
      ok: true,
      status: res.status,
      depth,
      title: extractTitle(html),
      description: extractMeta(html, "description") ?? extractMeta(html, "og:description"),
      h1: extractH(html, 1)[0],
      h2s: extractH(html, 2).slice(0, 10),
      text: extractTextBlocks(html),
      internalLinks: extractLinks(html, base),
    }
  } catch (e) {
    return {
      url,
      ok: false,
      depth,
      h2s: [],
      text: "",
      internalLinks: [],
      status: 0,
      // @ts-expect-error decorate
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

const PRODUCTY_HINTS = [
  /\/(products?|solutions?|platform|features?|use-cases?|use_cases|offerings?|modules?)\b/i,
  /\/(for-|for_)/i,
]

function scoreCandidate(urlStr: string, rootOrigin: string): number {
  try {
    const u = new URL(urlStr)
    if (u.origin !== rootOrigin) return -1
    const p = u.pathname
    const segs = p.split("/").filter(Boolean)
    if (segs.length === 0) return -10 // skip root
    let score = 10 - Math.min(segs.length, 4) * 2
    for (const re of PRODUCTY_HINTS) if (re.test(p)) score += 8
    if (/\b(blog|news|press|careers|legal|privacy|terms|login|signin|signup|pricing|contact)\b/i.test(p)) score -= 5
    return score
  } catch {
    return -1
  }
}

/**
 * BFS crawl up to maxPages (incl. the root). Depth 1 = direct children.
 * Selects links using lightweight "product-y" heuristics so we don't burn on blog/legal pages.
 */
export async function crawlSite(
  rootUrl: string,
  opts?: { maxPages?: number; maxDepth?: number; onProgress?: (e: CrawlProgress) => void },
): Promise<CrawlResult> {
  const maxPages = opts?.maxPages ?? 8
  const maxDepth = opts?.maxDepth ?? 2
  const onProgress = opts?.onProgress
  const errors: string[] = []
  let origin = ""
  try {
    origin = new URL(rootUrl).origin
  } catch (e) {
    errors.push(`invalid url: ${rootUrl}`)
    return { rootUrl, origin, pages: [], fetchedAt: new Date().toISOString(), errors }
  }

  const seen = new Set<string>()
  const pages: CrawledPage[] = []
  const root = await fetchPage(rootUrl, 0)
  seen.add(normalize(rootUrl))
  if (root.ok) pages.push(root)
  else errors.push(`root fetch failed: ${root.status ?? "err"}`)
  onProgress?.({ phase: "crawl_page", url: rootUrl, fetched: pages.length, max: maxPages, ok: root.ok })

  const queue: Array<{ url: string; depth: number; score: number }> = []
  for (const link of root.internalLinks ?? []) {
    const n = normalize(link)
    if (seen.has(n)) continue
    queue.push({ url: link, depth: 1, score: scoreCandidate(link, origin) })
  }
  queue.sort((a, b) => b.score - a.score)

  while (pages.length < maxPages && queue.length > 0) {
    const next = queue.shift()!
    if (next.depth > maxDepth) continue
    const n = normalize(next.url)
    if (seen.has(n)) continue
    seen.add(n)
    const page = await fetchPage(next.url, next.depth)
    if (page.ok) pages.push(page)
    onProgress?.({ phase: "crawl_page", url: next.url, fetched: pages.length, max: maxPages, ok: page.ok })
    if (page.ok && next.depth < maxDepth) {
      for (const link of page.internalLinks) {
        const ln = normalize(link)
        if (seen.has(ln)) continue
        queue.push({ url: link, depth: next.depth + 1, score: scoreCandidate(link, origin) })
      }
      queue.sort((a, b) => b.score - a.score)
    }
  }

  return {
    rootUrl,
    origin,
    pages,
    fetchedAt: new Date().toISOString(),
    errors,
  }
}

function normalize(u: string) {
  try {
    const url = new URL(u)
    url.hash = ""
    url.search = ""
    let p = url.pathname
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1)
    return `${url.origin}${p}`
  } catch {
    return u
  }
}
