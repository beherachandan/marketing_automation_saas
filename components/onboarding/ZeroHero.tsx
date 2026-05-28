"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, TrendingUp, Map, FileSearch, Link2, BarChart2,
  PenTool, Mic2, Megaphone, MousePointerClick, ChevronRight, CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/cn"
import { SKILL_DEFS } from "@/lib/schema"
import { SKILL_COLORS } from "./SkillCard"
import { SkillEditModal } from "./SkillEditModal"
import type { Step1, ScannedHints } from "@/lib/schema"

// ─── Lucide icon map (replaces emoji) ────────────────────────────────────────

const SKILL_ICONS: Record<string, React.ReactNode> = {
  "keyword-research": <Search className="h-3.5 w-3.5" />,
  "trend-discovery":  <TrendingUp className="h-3.5 w-3.5" />,
  "sitemap-audit":    <Map className="h-3.5 w-3.5" />,
  "on-page-audit":    <FileSearch className="h-3.5 w-3.5" />,
  "citation-audit":   <Link2 className="h-3.5 w-3.5" />,
  "content-rubric":   <BarChart2 className="h-3.5 w-3.5" />,
  "ai-draft":         <PenTool className="h-3.5 w-3.5" />,
  "brand-voice":      <Mic2 className="h-3.5 w-3.5" />,
  "ad-copy":          <Megaphone className="h-3.5 w-3.5" />,
  "lp-audit":         <MousePointerClick className="h-3.5 w-3.5" />,
}

const STREAM_META = {
  SEO:       { color: "text-blue-700",    border: "border-blue-200",    bg: "bg-blue-50",    label: "SEO",      iconColor: "text-blue-500"    },
  "AEO/GEO": { color: "text-emerald-700", border: "border-emerald-200", bg: "bg-emerald-50", label: "AEO / GEO",iconColor: "text-emerald-500" },
  Paid:      { color: "text-amber-700",   border: "border-amber-200",   bg: "bg-amber-50",   label: "Paid",     iconColor: "text-amber-500"   },
} as const

// ─── Scan log line type (mirrors setup-form.tsx) ──────────────────────────────
export type ScanLine = {
  url?: string; icon?: string; dest?: string; text: string; ok?: boolean
}

export type ScanState =
  | { phase: "idle" }
  | { phase: "scanning"; lines: ScanLine[]; website: string }
  | { phase: "done"; lines: ScanLine[]; hints: ScannedHints; website: string }
  | { phase: "error"; lines: ScanLine[]; error: string; website: string }

// ─── Component ────────────────────────────────────────────────────────────────

export function ZeroHero({
  streams,
  website,
  scanState,
  onContinue,
}: {
  streams: Step1["agent"]["streams"]
  website: string
  scanState: ScanState
  onContinue?: () => void
}) {
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (scanState.phase !== "scanning") return
    const t = setInterval(() => setTick((n) => n + 1), 500)
    return () => clearInterval(t)
  }, [scanState.phase])

  const activeSkills = SKILL_DEFS.filter((sk) =>
    sk.streams.some((s) => streams.includes(s as Step1["agent"]["streams"][number]))
  )

  const editingSkill = editingSkillId
    ? SKILL_DEFS.find((s) => s.id === editingSkillId) ?? null
    : null

  // ── Scan view ───────────────────────────────────────────────────────────────
  if (scanState.phase === "scanning" || scanState.phase === "error") {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-border bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-surface">
            <span className="text-[12px] font-medium text-foreground">Reading your site</span>
            <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[180px]">
              {scanState.website}
            </span>
          </div>
          <div className="p-4 max-h-64 overflow-auto font-mono text-[11px] space-y-1.5">
            {scanState.lines.map((line, i) => (
              <div key={i} className={cn("flex items-start gap-2", line.ok === false && "text-destructive/80")}>
                {line.icon && <span className="shrink-0 w-4 text-center text-muted-foreground">{line.icon}</span>}
                <span className={cn("flex-1", !line.icon && "pl-6")}>
                  {line.url ? (
                    <>
                      <span className="text-muted-foreground">{line.text}</span>
                      {line.dest && (
                        <span className="ml-2 text-[9px] bg-primary/10 text-primary px-1.5 py-px rounded">
                          → {line.dest}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className={line.ok ? "text-foreground/80" : ""}>{line.text}</span>
                  )}
                </span>
              </div>
            ))}
            {scanState.phase === "scanning" && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="w-4 text-center">
                  <span className="inline-flex gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className={cn(
                        "h-1 w-1 rounded-full transition-opacity",
                        tick % 3 === i ? "bg-primary opacity-100" : "bg-border opacity-40",
                      )} />
                    ))}
                  </span>
                </span>
                <span>Scanning…</span>
              </div>
            )}
          </div>
        </div>

        {scanState.phase === "error" && (
          <p className="text-[12px] text-destructive px-1">Scan failed: {scanState.error}</p>
        )}
      </div>
    )
  }

  // ── Post-scan summary ───────────────────────────────────────────────────────
  if (scanState.phase === "done") {
    const hints = scanState.hints
    const crawled = hints.crawledUrls ?? []
    const hasBrandVoice = !!hints.suggestedBrandVoice
    const prefilled = [
      "Brand voice",
      "ICP signals",
      crawled.length > 0 && "Seed topics",
    ].filter(Boolean) as string[]

    return (
      <>
      <div className="flex flex-col gap-4">
        {/* Summary card */}
        <div className="rounded-xl border border-border bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-surface flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="text-[12px] font-medium text-foreground">Scan complete</span>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">
              {crawled.length} URL{crawled.length !== 1 ? "s" : ""} visited
            </span>
          </div>

          <div className="p-4 flex flex-col gap-3">
            {/* Pre-filled steps */}
            <div>
              <p className="text-[10px] uppercase tracking-widest font-medium text-muted-foreground mb-2">
                Pre-filled for you
              </p>
              <div className="flex flex-wrap gap-1.5">
                {prefilled.map((label) => (
                  <span key={label} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* URLs visited — max 3 */}
            {crawled.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest font-medium text-muted-foreground mb-1.5">
                  Pages scanned
                </p>
                <div className="space-y-0.5">
                  {crawled.slice(0, 3).map((url) => (
                    <p key={url} className="font-mono text-[10px] text-muted-foreground truncate">{url}</p>
                  ))}
                  {crawled.length > 3 && (
                    <p className="text-[10px] text-muted-foreground/60">+{crawled.length - 3} more</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Agent preview — non-editable, brand voice shows scan data signal */}
        <div>
          <p className="text-[10px] uppercase tracking-widest font-medium text-muted-foreground mb-2">
            Agent preview
          </p>
          <div className="flex flex-col gap-2">
            {(["SEO", "AEO/GEO", "Paid"] as const).map((stream) => {
              const meta = STREAM_META[stream]
              const isActive = streams.includes(stream as Step1["agent"]["streams"][number])
              const skills = SKILL_DEFS.filter((sk) => sk.streams[0] === stream)
              return (
                <motion.div
                  key={stream}
                  animate={{ opacity: isActive ? 1 : 0.3 }}
                  transition={{ duration: 0.25 }}
                  className={cn(
                    "rounded-xl border p-3 transition-colors",
                    isActive ? cn(meta.bg, meta.border) : "bg-surface border-border",
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn("text-[11px] font-semibold", isActive ? meta.color : "text-muted-foreground")}>
                      {meta.label}
                    </span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{skills.length} skills</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((sk, i) => {
                      const color = SKILL_COLORS[sk.id]
                      const isBrandVoice = sk.id === "brand-voice"
                      const isClickable = isBrandVoice && isActive
                      const hasDataDot = isBrandVoice && hasBrandVoice
                      return isClickable ? (
                        <motion.button
                          key={sk.id}
                          type="button"
                          onClick={() => setEditingSkillId(sk.id)}
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.04, duration: 0.18 }}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-medium transition-shadow cursor-pointer hover:shadow-sm",
                            "bg-white/80",
                            color?.border ?? "border-border",
                            color?.countText ?? "text-foreground",
                            hasDataDot && "ring-1 ring-emerald-300 ring-offset-1",
                          )}
                        >
                          <span className={cn("shrink-0", color?.countText ?? "text-foreground")}>
                            {SKILL_ICONS[sk.id]}
                          </span>
                          {sk.label}
                          {hasDataDot && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />}
                        </motion.button>
                      ) : (
                        <motion.div
                          key={sk.id}
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: isActive ? 1 : 0.4, scale: 1 }}
                          transition={{ delay: isActive ? i * 0.04 : 0, duration: 0.18 }}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-medium",
                            isActive
                              ? cn("bg-white/80", color?.border ?? "border-border", color?.countText ?? "text-foreground")
                              : "bg-muted/40 border-border text-muted-foreground",
                          )}
                        >
                          <span className={cn("shrink-0", isActive ? (color?.countText ?? "text-foreground") : "text-muted-foreground/50")}>
                            {SKILL_ICONS[sk.id]}
                          </span>
                          {sk.label}
                        </motion.div>
                      )
                    })}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* CTA */}
        {onContinue && (
          <button
            type="button"
            onClick={onContinue}
            className="flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            Continue setup <ChevronRight className="h-4 w-4" />
          </button>
        )}

        <p className="text-[11px] text-muted-foreground text-center">
          You can refine everything in the next steps
        </p>
      </div>
      <SkillEditModal
        skill={editingSkillId ? (SKILL_DEFS.find((s) => s.id === editingSkillId) ?? null) : null}
        onClose={() => setEditingSkillId(null)}
        isEnriched={false}
        scanHints={hints}
      />
      </>
    )
  }

  // ── Default: stream cards + skill chips ─────────────────────────────────────
  return (
    <>
      <div className="flex flex-col gap-3">
        {(["SEO", "AEO/GEO", "Paid"] as const).map((stream) => {
          const meta = STREAM_META[stream]
          const isActive = streams.includes(stream as Step1["agent"]["streams"][number])
          const skills = SKILL_DEFS.filter((sk) => sk.streams[0] === stream)

          return (
            <motion.div
              key={stream}
              animate={{ opacity: isActive ? 1 : 0.35 }}
              transition={{ duration: 0.25 }}
              className={cn(
                "rounded-xl border p-4 transition-colors",
                isActive ? cn(meta.bg, meta.border) : "bg-surface border-border",
              )}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className={cn("text-[12px] font-semibold", isActive ? meta.color : "text-muted-foreground")}>
                  {meta.label}
                </span>
                <span className="ml-auto text-[10px] text-muted-foreground">{skills.length} skills</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <AnimatePresence>
                  {skills.map((sk, i) => {
                    const color = SKILL_COLORS[sk.id]
                    return (
                      <motion.button
                        key={sk.id}
                        type="button"
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: isActive ? 1 : 0.5, scale: 1 }}
                        transition={{ delay: isActive ? i * 0.04 : 0, duration: 0.18 }}
                        onClick={() => isActive && setEditingSkillId(sk.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-shadow",
                          isActive
                            ? cn("bg-white/80 hover:shadow-sm cursor-pointer", color?.border ?? "border-border", color?.countText ?? "text-foreground")
                            : "bg-muted/40 border-border text-muted-foreground cursor-default",
                        )}
                      >
                        <span className={cn("shrink-0", isActive ? (color?.countText ?? "text-foreground") : "text-muted-foreground/50")}>
                          {SKILL_ICONS[sk.id]}
                        </span>
                        {sk.label}
                      </motion.button>
                    )
                  })}
                </AnimatePresence>
              </div>
            </motion.div>
          )
        })}

        {/* Idle website indicator */}
        <AnimatePresence>
          {website && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-border bg-surface p-3 flex items-center gap-3"
            >
              <span className="h-6 w-6 rounded-md bg-muted flex items-center justify-center shrink-0">
                <Search className="h-3 w-3 text-muted-foreground" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground">Ready to scan</p>
                <p className="text-[11px] font-mono text-foreground truncate">{website}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {activeSkills.length > 0 && (
          <p className="text-[11px] text-muted-foreground text-center pt-1">
            {activeSkills.length} skill{activeSkills.length === 1 ? "" : "s"} active · click any skill to preview its doc
          </p>
        )}
      </div>

      <SkillEditModal
        skill={editingSkill}
        onClose={() => setEditingSkillId(null)}
        isEnriched={false}
      />
    </>
  )
}
