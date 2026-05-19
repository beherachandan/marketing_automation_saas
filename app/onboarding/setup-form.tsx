"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { saveStep1 } from "@/lib/persist-actions"
import { saveSelectedProductLines } from "@/lib/persist-actions"
import { SKILL_DEFS, streamEnum, type Step1 } from "@/lib/schema"
import type { ScannedHints } from "@/lib/schema"
import { Input, Label, FieldError } from "@/components/ui/input"
import { cn } from "@/lib/cn"
import { useStreamContext } from "@/components/onboarding/Shell"
import { SkillCard } from "@/components/onboarding/SkillCard"

const ALL_STREAMS = streamEnum.options

// URL path hints → destination labels
const PATH_LABELS: Array<{ pattern: RegExp; icon: string; dest: string }> = [
  { pattern: /pricing|plans|buy/i,         icon: "📦", dest: "Product" },
  { pattern: /for-|use-case|industry|segment/i, icon: "👥", dest: "ICPs" },
  { pattern: /about|team|company|mission/i, icon: "🎨", dest: "Brand voice" },
  { pattern: /blog|resource|guide|learn/i, icon: "🌱", dest: "Seeds" },
  { pattern: /feature|how-it-works|product/i, icon: "📦", dest: "Product" },
]

function pathLabel(url: string): { icon: string; dest: string } | null {
  try {
    const { pathname } = new URL(url)
    for (const { pattern, icon, dest } of PATH_LABELS) {
      if (pattern.test(pathname)) return { icon, dest }
    }
  } catch { /* noop */ }
  return null
}

type StreamEvent =
  | { phase: "fetch_start"; url: string }
  | { phase: "fetch_done"; ok: boolean; title?: string; error?: string }
  | { phase: "crawl_page"; url: string; fetched: number; max: number; ok: boolean }
  | { phase: "extract_start"; pages: number }
  | { phase: "extract_done"; productLines: number; source: "llm" | "stub" }
  | { phase: "done"; hints: ScannedHints }
  | { phase: "error"; error: string }

type ScanLine = {
  url?: string
  icon?: string
  dest?: string
  text: string
  ok?: boolean
}

// Map each destination to which path patterns trigger it
const DEST_TRIGGERS: Record<string, RegExp[]> = {
  Product:      [/pricing|plans|buy|feature|how-it-works|product/i],
  ICPs:         [/for-|use-case|industry|segment|customer/i],
  "Brand voice":[/about|team|company|mission|story/i],
  Seeds:        [/blog|resource|guide|learn|article/i],
}

interface SetupFormProps {
  initial: {
    workspace: string
    website: string
    streams: Step1["agent"]["streams"]
  }
  scannedHints?: ScannedHints | null
  onStreamsChange?: (s: Step1["agent"]["streams"]) => void
  onWebsiteChange?: (url: string) => void
}

export function SetupForm({ initial, scannedHints, onStreamsChange, onWebsiteChange }: SetupFormProps) {
  const router = useRouter()
  const { setLiveStreams, setSelectedSkillId } = useStreamContext()
  const [workspace, setWorkspace] = useState(initial.workspace)
  const [website, setWebsite] = useState(initial.website)
  const [streams, setStreams] = useState<Step1["agent"]["streams"]>(() => {
    const s = initial.streams.length > 0 ? initial.streams : (["AEO/GEO"] as Step1["agent"]["streams"])
    return s
  })
  const [errors, setErrors] = useState<{ workspace?: string; website?: string; streams?: string }>({})
  // Track newly-activated skill IDs for the brief "activated" flash
  const [justActivated, setJustActivated] = useState<Set<string>>(new Set())

  // Scan state
  const [scanning, setScanning] = useState(false)
  const [scanLines, setScanLines] = useState<ScanLine[]>([])
  const [scanDone, setScanDone] = useState(false)
  const [scanErr, setScanErr] = useState<string | null>(null)
  const [activeDestinations, setActiveDestinations] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()
  const abortRef = useRef<AbortController | null>(null)
  const scanEndRef = useRef<HTMLDivElement>(null)

  // Detect if site was previously scanned (item 7)
  const alreadyScanned = scannedHints?.url === website.trim() && scannedHints?.ok === true

  // Auto-scroll scan feed
  useEffect(() => {
    scanEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [scanLines])

  // Compute active skills from selected streams (deduped)
  const activeSkills = useMemo(() => {
    const seen = new Set<string>()
    const result: typeof SKILL_DEFS[number][] = []
    for (const skill of SKILL_DEFS) {
      if (seen.has(skill.id)) continue
      const active = skill.streams.some((s) => streams.includes(s as Step1["agent"]["streams"][number]))
      if (active) {
        seen.add(skill.id)
        result.push(skill)
      }
    }
    return result
  }, [streams])

  const toggleStream = (s: Step1["agent"]["streams"][number]) => {
    const isRemoving = streams.includes(s)
    const next = (isRemoving
      ? streams.filter((v) => v !== s)
      : [...streams, s]) as Step1["agent"]["streams"]

    setStreams(next)
    setLiveStreams(next)
    onStreamsChange?.(next)

    if (!isRemoving) {
      const prevActiveIds = new Set(
        SKILL_DEFS
          .filter((sk) => sk.streams.some((st) => streams.includes(st as Step1["agent"]["streams"][number])))
          .map((sk) => sk.id),
      )
      const newlyActive = SKILL_DEFS
        .filter((sk) => (sk.streams as readonly string[]).includes(s) && !prevActiveIds.has(sk.id))
        .map((sk) => sk.id)
      if (newlyActive.length > 0) {
        setJustActivated(new Set(newlyActive))
        setTimeout(() => setJustActivated(new Set()), 1200)
      }
    }
  }

  const validate = () => {
    const errs: typeof errors = {}
    if (!workspace.trim() || workspace.trim().length < 2) errs.workspace = "Workspace name must be at least 2 characters"
    if (website.trim() && !/^https?:\/\/.+\..+/.test(website.trim())) errs.website = "Enter a full URL like https://example.com"
    if (streams.length === 0) errs.streams = "Select at least one work stream"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const addLine = (line: ScanLine) =>
    setScanLines((prev) => [...prev, line].slice(-20))

  const runScan = useMemo(() => async (url: string) => {
    setScanLines([])
    setScanDone(false)
    setScanErr(null)
    setActiveDestinations(new Set())
    const ctrl = new AbortController()
    abortRef.current = ctrl
    addLine({ text: `Scanning ${url}…`, icon: "🔭" })

    try {
      const res = await fetch("/api/discover/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
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
        for (const raw of lines) {
          if (!raw.trim()) continue
          let ev: StreamEvent
          try { ev = JSON.parse(raw) as StreamEvent } catch { continue }
          handleStreamEvent(ev)
        }
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return
      const msg = e instanceof Error ? e.message : "Scan failed"
      setScanErr(msg)
      addLine({ text: `Error: ${msg}`, ok: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleStreamEvent = (ev: StreamEvent) => {
    switch (ev.phase) {
      case "fetch_start":
        addLine({ text: "Fetching homepage…", icon: "🌐" })
        break
      case "fetch_done":
        if (!ev.ok) {
          setScanErr(ev.error ?? "Failed to fetch")
          addLine({ text: ev.error ?? "Failed to fetch homepage", ok: false })
        } else {
          addLine({ text: ev.title ? `Homepage: "${ev.title}"` : "Homepage fetched", icon: "✓", ok: true })
        }
        break
      case "crawl_page": {
        const label = pathLabel(ev.url)
        addLine({
          url: ev.url,
          icon: label?.icon ?? (ev.ok ? "·" : "✗"),
          dest: label?.dest,
          text: shortPath(ev.url),
          ok: ev.ok,
        })
        // Activate matching destinations for live card animation (item 6)
        if (ev.ok && label?.dest) {
          setActiveDestinations((prev) => {
            const next = new Set(prev)
            next.add(label.dest!)
            return next
          })
        }
        break
      }
      case "extract_start":
        addLine({ text: `Analysing ${ev.pages} page${ev.pages === 1 ? "" : "s"}…`, icon: "🧠" })
        break
      case "extract_done":
        addLine({
          text: `Extracted ${ev.productLines} product line${ev.productLines === 1 ? "" : "s"} via ${ev.source === "llm" ? "AI" : "heuristic"}`,
          icon: "📦",
          ok: true,
        })
        addLine({ text: "→ Product, ICPs, Brand voice, Seeds pre-filled", icon: "✦", ok: true })
        // All destinations filled on extract_done
        setActiveDestinations(new Set(["Product", "ICPs", "Brand voice", "Seeds"]))
        break
      case "done":
        setScanDone(true)
        addLine({ text: "Done — navigating to step 1…", icon: "✓", ok: true })
        // Save selected product lines as empty (take-all)
        startTransition(async () => {
          try {
            await saveSelectedProductLines([])
            router.push("/onboarding/step-1")
          } catch (e) {
            setScanErr(e instanceof Error ? e.message : "Save failed")
          }
        })
        break
      case "error":
        setScanErr(ev.error)
        addLine({ text: `Error: ${ev.error}`, ok: false })
        break
    }
  }

  const saveAndScan = async (skipScan = false) => {
    const partialStep1: Step1 = {
      workspace: workspace.trim(),
      website: website.trim(),
      agent: { name: "Conduct", role: "Head of AEO Content", streams },
      user: { name: "", email: "placeholder@setup.local", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    }
    try {
      await saveStep1(partialStep1)
    } catch (e) {
      setErrors({ workspace: e instanceof Error ? e.message : "Save failed" })
      return
    }
    if (skipScan) {
      router.push("/onboarding/step-1")
      return
    }
    const hasWebsite = !!website.trim()
    if (hasWebsite) {
      setScanning(true)
      runScan(website.trim())
    } else {
      router.push("/onboarding/step-1")
    }
  }

  const handleContinue = async () => {
    if (!validate()) return
    await saveAndScan()
  }

  if (scanning) {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-[13px] font-medium">Reading your site</span>
            <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[200px]">{website}</span>
          </div>
          <div className="p-4 max-h-72 overflow-auto font-mono text-[11px] space-y-1.5">
            {scanLines.map((line, i) => (
              <div key={i} className={cn("flex items-start gap-2", line.ok === false && "text-destructive")}>
                {line.icon && (
                  <span className="shrink-0 w-4 text-center text-muted-foreground">{line.icon}</span>
                )}
                <span className={cn("flex-1", !line.icon && "pl-6")}>
                  {line.url ? (
                    <>
                      <span className="text-muted-foreground">{line.text}</span>
                      {line.dest && (
                        <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-px rounded">
                          → {line.dest}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className={line.ok ? "text-foreground" : ""}>{line.text}</span>
                  )}
                </span>
              </div>
            ))}
            {!scanDone && !scanErr && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-4 text-center">…</span>
                <LoadingDots />
              </div>
            )}
            <div ref={scanEndRef} />
          </div>
        </div>

        {scanErr && (
          <div className="flex items-center gap-3">
            <p className="text-destructive text-[13px]">Scan failed: {scanErr}</p>
            <button
              type="button"
              onClick={() => { setScanErr(null); runScan(website.trim()) }}
              className="text-[12px] underline text-muted-foreground"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => router.push("/onboarding/step-1")}
              className="text-[12px] underline text-muted-foreground"
            >
              Skip scan
            </button>
          </div>
        )}

        {/* Destination summary cards — animate as scan populates them, cap at 65% */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: "📦", label: "Product", step: "Step 2" },
            { icon: "👥", label: "ICPs", step: "Step 3" },
            { icon: "🎨", label: "Brand voice", step: "Step 4" },
            { icon: "🌱", label: "Seeds", step: "Step 6" },
          ].map(({ icon, label, step }) => {
            const isActive = activeDestinations.has(label)
            const showFilled = scanDone || isActive
            const pct = showFilled ? 65 : 0
            return (
              <div
                key={label}
                className={cn(
                  "flex flex-col gap-1.5 rounded-md border px-3 py-2 transition-all duration-500",
                  showFilled ? "border-primary/30 bg-primary/5 shadow-sm" : "border-border bg-muted/30",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn("text-base transition-all duration-300", isActive && !scanDone && "animate-pulse")}>
                    {icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium truncate">{label}</p>
                    <p className="text-[10px] text-muted-foreground">{step}</p>
                  </div>
                  <span className={cn(
                    "text-[10px] font-mono tabular-nums shrink-0",
                    showFilled ? "text-primary font-medium" : "text-muted-foreground/50",
                  )}>
                    {pct}%
                  </span>
                </div>
                <div className="h-0.5 w-full rounded-full overflow-hidden bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {showFilled && (
                  <p className="text-[9px] text-muted-foreground/60">improves as you complete steps</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <p className="text-[11px] text-muted-foreground -mt-4">* required fields</p>

      <section className="flex flex-col gap-4">
        <div>
          <Label htmlFor="website">Website</Label>
          <p className="text-[12px] text-muted-foreground mb-1.5">
            Enter your URL and we&apos;ll scan it to pre-fill the next 5 steps automatically.
          </p>
          <Input
            id="website"
            autoFocus
            placeholder="https://acme.com"
            className="h-10 text-[14px]"
            value={website}
            onChange={(e) => { setWebsite(e.target.value); onWebsiteChange?.(e.target.value) }}
          />
          {errors.website && <FieldError message={errors.website} />}
        </div>
        <div>
          <Label htmlFor="workspace">Workspace name *</Label>
          <Input
            id="workspace"
            placeholder="Acme Marketing"
            value={workspace}
            onChange={(e) => setWorkspace(e.target.value)}
          />
          {errors.workspace && <FieldError message={errors.workspace} />}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-1">
          <Label>Work streams *</Label>
          {activeSkills.length > 0 && (
            <span className="text-[11px] font-mono text-muted-foreground">
              {activeSkills.length} skill{activeSkills.length === 1 ? "" : "s"} activated
            </span>
          )}
        </div>
        <p className="text-[12px] text-muted-foreground mb-3">
          Select the channels you&apos;re targeting. Skills are derived from your selection.
        </p>
        <div className="flex gap-2 flex-wrap">
          {ALL_STREAMS.map((s) => {
            const on = streams.includes(s)
            // Count skills that would be newly unlocked by this stream
            const newSkillCount = on
              ? 0
              : SKILL_DEFS.filter(
                  (sk) =>
                    (sk.streams as readonly string[]).includes(s) &&
                    !sk.streams.some((st) => streams.includes(st as Step1["agent"]["streams"][number])),
                ).length
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleStream(s)}
                className={cn(
                  "relative px-3 py-1.5 rounded-md text-[12px] border transition-all",
                  on
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-secondary",
                )}
              >
                {s}
                {!on && newSkillCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                    +{newSkillCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        {errors.streams && <FieldError message={errors.streams} />}

        {/* Skill agent cards — inline preview, same design as right panel */}
        {activeSkills.length > 0 && (
          <>
            <p className="mt-3 text-[11px] text-muted-foreground/50">
              Ghost lines fill with real data as you complete steps · mirrored in the panel →
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {activeSkills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  isEnriched={false}
                  isNew={justActivated.has(skill.id)}
                  variant="light"
                  size="full"
                  onClick={() => {
                    setSelectedSkillId(skill.id)
                    setTimeout(() => setSelectedSkillId(null), 1500)
                  }}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Already-scanned notice — item 7 */}
      {alreadyScanned && website.trim() && (
        <div className="rounded-md border border-success/30 bg-success/5 px-4 py-3 flex items-start gap-3">
          <span className="text-base mt-0.5">✓</span>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-foreground/90">
              This site was already scanned
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Pre-filled data is already saved. You can continue directly or run a fresh scan to pick up changes.
            </p>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => saveAndScan(true)}
                className="text-[11px] px-2.5 py-1 rounded-md bg-primary text-primary-foreground font-medium"
              >
                Continue →
              </button>
              <button
                type="button"
                onClick={() => { if (validate()) saveAndScan() }}
                className="text-[11px] px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground"
              >
                Rescan site
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2 border-t border-border">
        <button
          type="button"
          onClick={handleContinue}
          className="h-9 px-5 rounded-md bg-primary text-primary-foreground text-[13px] font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {alreadyScanned && website.trim() ? "Rescan & continue →" : website.trim() ? "Continue & scan →" : "Continue →"}
        </button>
      </div>
    </div>
  )
}

function shortPath(u: string): string {
  try {
    const { hostname, pathname } = new URL(u)
    return `${hostname}${pathname}` || u
  } catch {
    return u
  }
}

function LoadingDots() {
  return (
    <span className="inline-flex gap-0.5">
      <span className="h-1 w-1 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0ms" }} />
      <span className="h-1 w-1 rounded-full bg-primary animate-pulse" style={{ animationDelay: "200ms" }} />
      <span className="h-1 w-1 rounded-full bg-primary animate-pulse" style={{ animationDelay: "400ms" }} />
    </span>
  )
}
