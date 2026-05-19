"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { saveSelectedProductLines } from "@/lib/persist-actions"
import type { ScannedHints, ProductLine } from "@/lib/schema"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/cn"

type Stage = "fetch" | "crawl" | "extract" | "done"

const STAGES: Array<{ key: Stage; label: string }> = [
  { key: "fetch", label: "Fetching homepage" },
  { key: "crawl", label: "Crawling internal links" },
  { key: "extract", label: "Identifying product lines" },
  { key: "done", label: "Ready" },
]

type StreamEvent =
  | { phase: "fetch_start"; url: string }
  | { phase: "fetch_done"; ok: boolean; title?: string; error?: string }
  | { phase: "crawl_page"; url: string; fetched: number; max: number; ok: boolean }
  | { phase: "extract_start"; pages: number }
  | { phase: "extract_done"; productLines: number; source: "llm" | "stub" }
  | { phase: "done"; hints: ScannedHints }
  | { phase: "error"; error: string }

export function DiscoverClient({
  website,
  initialHints,
}: {
  website: string
  initialHints: ScannedHints | null
}) {
  const router = useRouter()
  const [hints, setHints] = useState<ScannedHints | null>(initialHints)
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialHints?.selectedProductSlugs ?? []),
  )
  const [stage, setStage] = useState<Stage>(initialHints ? "done" : "fetch")
  const [crawlFeed, setCrawlFeed] = useState<Array<{ url: string; ok: boolean }>>([])
  const [crawlMax, setCrawlMax] = useState(8)
  const [extractSource, setExtractSource] = useState<"llm" | "stub" | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(initialHints ? null : Date.now())
  const [now, setNow] = useState<number>(Date.now())
  const [isSaving, setIsSaving] = useState(false)
  const [, start] = useTransition()
  const started = useRef(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!startedAt || stage === "done") return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [startedAt, stage])

  const run = useMemo(
    () => async () => {
      setErr(null)
      setStage("fetch")
      setCrawlFeed([])
      setExtractSource(null)
      setHints(null)
      setStartedAt(Date.now())
      const ctrl = new AbortController()
      abortRef.current = ctrl
      try {
        const res = await fetch("/api/discover/stream", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: website }),
          signal: ctrl.signal,
        })
        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => "")
          throw new Error(text || `HTTP ${res.status}`)
        }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ""
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const lines = buf.split("\n")
          buf = lines.pop() ?? ""
          for (const line of lines) {
            if (!line.trim()) continue
            let ev: StreamEvent
            try {
              ev = JSON.parse(line) as StreamEvent
            } catch {
              continue
            }
            handleEvent(ev)
          }
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") return
        setErr(e instanceof Error ? e.message : "Scan failed")
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [website],
  )

  const handleEvent = (ev: StreamEvent) => {
    switch (ev.phase) {
      case "fetch_start":
        setStage("fetch")
        break
      case "fetch_done":
        if (!ev.ok) {
          setErr(ev.error ?? "Failed to fetch homepage")
        } else {
          setStage("crawl")
        }
        break
      case "crawl_page":
        setStage("crawl")
        setCrawlMax(ev.max)
        setCrawlFeed((prev) => [...prev, { url: ev.url, ok: ev.ok }].slice(-8))
        break
      case "extract_start":
        setStage("extract")
        break
      case "extract_done":
        setExtractSource(ev.source)
        break
      case "done":
        setHints(ev.hints)
        setStage("done")
        {
          const pre = new Set<string>(ev.hints.selectedProductSlugs ?? [])
          if (ev.hints.productLines && ev.hints.productLines.length > 0 && pre.size === 0) {
            pre.add(ev.hints.productLines[0].slug)
          }
          setSelected(pre)
        }
        break
      case "error":
        setErr(ev.error)
        break
    }
  }

  useEffect(() => {
    if (started.current || initialHints || !website) return
    started.current = true
    run()
    return () => {
      abortRef.current?.abort()
    }
  }, [website, initialHints, run])

  const toggle = (slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  const confirm = () => {
    setErr(null)
    setIsSaving(true)
    start(async () => {
      try {
        await saveSelectedProductLines(Array.from(selected))
        router.push("/onboarding/step-2")
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Save failed")
      } finally {
        setIsSaving(false)
      }
    })
  }

  const skip = () => {
    setErr(null)
    start(async () => {
      try {
        await saveSelectedProductLines([])
        router.push("/onboarding/step-2")
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Save failed")
      }
    })
  }

  const retry = () => {
    started.current = true
    setErr(null)
    run()
  }

  const isDone = stage === "done" && !!hints
  const lines = hints?.productLines ?? []
  const elapsed = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0
  const slow = elapsed >= 20 && !isDone && !err
  const stageIndex = STAGES.findIndex((s) => s.key === stage)

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-baseline justify-between">
            <div>
              <CardTitle className="text-[15px]">Scan</CardTitle>
              <CardDescription className="font-mono text-[11px]">{website}</CardDescription>
            </div>
            {startedAt && (
              <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
                {elapsed}s elapsed
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {STAGES.filter((s) => s.key !== "done").map((s, i) => {
            const active = i === stageIndex && !isDone && !err
            const complete = isDone || i < stageIndex
            return (
              <div key={s.key} className="flex items-center gap-3 text-[13px]">
                <span
                  className={cn(
                    "inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-mono shrink-0",
                    complete && "bg-success text-success-foreground border-success",
                    active && "bg-background border-primary text-primary",
                    !complete && !active && "bg-background border-zinc-300 text-muted-foreground",
                  )}
                >
                  {complete ? "✓" : active ? "…" : i + 1}
                </span>
                <span
                  className={cn(
                    active && "text-foreground font-medium",
                    complete && "text-foreground/80",
                    !complete && !active && "text-muted-foreground",
                  )}
                >
                  {s.label}
                  {s.key === "crawl" && (active || complete) && crawlFeed.length > 0 && (
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      · {crawlFeed[crawlFeed.length - 1].ok ? "" : "✗ "}
                      {crawlFeed.length}/{crawlMax}
                    </span>
                  )}
                  {s.key === "extract" && complete && extractSource && (
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      · {extractSource === "llm" ? "AI classified" : "heuristic"}
                    </span>
                  )}
                </span>
                {active && <LoadingDots />}
              </div>
            )
          })}

          {stage === "crawl" && crawlFeed.length > 0 && (
            <div className="mt-3 border rounded-md bg-muted/40 p-2 max-h-32 overflow-auto">
              <ul className="text-[11px] font-mono text-muted-foreground space-y-0.5">
                {crawlFeed.map((p, i) => (
                  <li key={`${p.url}-${i}`} className="flex gap-2 truncate">
                    <span className={p.ok ? "text-success" : "text-destructive"}>
                      {p.ok ? "✓" : "✗"}
                    </span>
                    <span className="truncate">{shortPath(p.url)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {slow && (
            <p className="mt-2 text-[11px] text-muted-foreground italic">
              Still working — deep scans can take 30–60s when the AI classifier runs.
            </p>
          )}

          {err && (
            <div className="mt-2 flex items-center gap-2">
              <p className="text-destructive text-[12px]">Scan failed: {err}</p>
              <Button type="button" size="sm" variant="outline" onClick={retry}>
                Retry
              </Button>
            </div>
          )}

          {hints?.crawledUrls && hints.crawledUrls.length > 0 && isDone && (
            <div className="mt-2 text-[11px] font-mono text-muted-foreground">
              Read {hints.crawledUrls.length} page{hints.crawledUrls.length === 1 ? "" : "s"}
              {extractSource === "llm" ? " · LLM classified" : extractSource === "stub" ? " · heuristic classified" : ""}
              {" · "}
              {elapsed}s total
            </div>
          )}
        </CardContent>
      </Card>

      {isDone && lines.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">No product lines found</CardTitle>
            <CardDescription>
              We couldn&apos;t read enough from the site. You can fill product details manually in the next step.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {isDone && lines.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[15px] font-semibold">
              Found {lines.length} product line{lines.length === 1 ? "" : "s"}
            </h2>
            <span className="text-[11px] font-mono text-muted-foreground">
              Selected {selected.size}/{lines.length}
            </span>
          </div>
          <p className="text-[13px] text-muted-foreground">
            We&apos;ll pre-fill step 2 from the ones you pick. Uncheck anything that isn&apos;t a real offering.
          </p>
          <div className="grid grid-cols-1 gap-3">
            {lines.map((line) => (
              <ProductLineCard
                key={line.slug}
                line={line}
                checked={selected.has(line.slug)}
                onToggle={() => toggle(line.slug)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={skip} disabled={isSaving}>
          Skip — fill manually
        </Button>
        <Button
          type="button"
          onClick={confirm}
          disabled={!isDone || lines.length === 0 || selected.size === 0 || isSaving}
        >
          {isSaving ? "Saving…" : "Continue →"}
        </Button>
      </div>
    </div>
  )
}

function shortPath(u: string): string {
  try {
    const { pathname, hostname } = new URL(u)
    return `${hostname}${pathname}` || u
  } catch {
    return u
  }
}

function ProductLineCard({
  line,
  checked,
  onToggle,
}: {
  line: ProductLine
  checked: boolean
  onToggle: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className={cn(
        "border rounded-lg transition-colors",
        checked ? "border-primary bg-primary/5" : "border-border bg-card",
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={checked}
          className={cn(
            "mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors",
            checked ? "bg-primary border-primary text-primary-foreground" : "border-input bg-background",
          )}
        >
          {checked && (
            <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2.5 6.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-[14px] font-semibold text-foreground">{line.name}</h3>
            {line.category && (
              <span className="text-[10px] font-mono text-muted-foreground bg-secondary rounded px-1.5 py-0.5">
                {line.category}
              </span>
            )}
          </div>
          {line.summary && <p className="text-[13px] text-muted-foreground mt-1">{line.summary}</p>}
          <p className="text-[11px] font-mono text-muted-foreground mt-2 truncate">{line.url}</p>
          {(line.features.length > 0 || line.evidence.length > 0) && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="mt-2 text-[11px] text-primary hover:underline"
            >
              {open ? "Hide details" : `Show ${line.features.length} feature${line.features.length === 1 ? "" : "s"} + evidence`}
            </button>
          )}
          {open && (
            <div className="mt-3 flex flex-col gap-3">
              {line.features.length > 0 && (
                <div>
                  <p className="label-uppercase mb-1">Features</p>
                  <ul className="text-[12px] text-foreground/80 list-disc pl-5 space-y-1">
                    {line.features.map((f, i) => (
                      <li key={i}>
                        <span className="font-medium">{f.title}</span>
                        {f.description && f.description !== f.title ? ` — ${f.description}` : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {line.evidence.length > 0 && (
                <div>
                  <p className="label-uppercase mb-1">Evidence</p>
                  <ul className="text-[11px] font-mono text-muted-foreground space-y-0.5">
                    {line.evidence.map((ev, i) => (
                      <li key={i} className="truncate">
                        {ev}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {line.suggestedIcps.length > 0 && (
                <div>
                  <p className="label-uppercase mb-1">Suggested ICPs</p>
                  <ul className="text-[12px] text-foreground/80 space-y-0.5">
                    {line.suggestedIcps.map((i, idx) => (
                      <li key={idx}>
                        <span className="font-medium">{i.name}</span> · {i.role} · {i.industry}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function LoadingDots() {
  return (
    <span className="inline-flex gap-0.5 ml-1">
      <span className="h-1 w-1 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0ms" }} />
      <span className="h-1 w-1 rounded-full bg-primary animate-pulse" style={{ animationDelay: "200ms" }} />
      <span className="h-1 w-1 rounded-full bg-primary animate-pulse" style={{ animationDelay: "400ms" }} />
    </span>
  )
}
