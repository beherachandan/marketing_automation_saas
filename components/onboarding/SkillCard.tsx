"use client"

import { useState, useRef } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/cn"
import type { SKILL_DEFS } from "@/lib/schema"

// ─── Per-skill distinct color identities ─────────────────────────────────────

type SkillColor = {
  bg: string; border: string; accent: string; iconBg: string
  dotFilled: string; bar: string; countText: string; ring: string
}

export const SKILL_COLORS: Record<string, SkillColor> = {
  "keyword-research": { bg: "bg-blue-50/70",     border: "border-blue-200/70",     accent: "border-l-blue-500",     iconBg: "bg-blue-100",     dotFilled: "bg-blue-500",     bar: "bg-blue-500",     countText: "text-blue-600",     ring: "ring-blue-300" },
  "trend-discovery":  { bg: "bg-emerald-50/70",  border: "border-emerald-200/70",  accent: "border-l-emerald-500",  iconBg: "bg-emerald-100",  dotFilled: "bg-emerald-500",  bar: "bg-emerald-500",  countText: "text-emerald-600",  ring: "ring-emerald-300" },
  "sitemap-audit":    { bg: "bg-violet-50/70",   border: "border-violet-200/70",   accent: "border-l-violet-500",   iconBg: "bg-violet-100",   dotFilled: "bg-violet-500",   bar: "bg-violet-500",   countText: "text-violet-600",   ring: "ring-violet-300" },
  "on-page-audit":    { bg: "bg-rose-50/70",     border: "border-rose-200/70",     accent: "border-l-rose-500",     iconBg: "bg-rose-100",     dotFilled: "bg-rose-500",     bar: "bg-rose-500",     countText: "text-rose-600",     ring: "ring-rose-300" },
  "citation-audit":   { bg: "bg-amber-50/70",    border: "border-amber-200/70",    accent: "border-l-amber-500",    iconBg: "bg-amber-100",    dotFilled: "bg-amber-500",    bar: "bg-amber-500",    countText: "text-amber-600",    ring: "ring-amber-300" },
  "content-rubric":   { bg: "bg-indigo-50/70",   border: "border-indigo-200/70",   accent: "border-l-indigo-500",   iconBg: "bg-indigo-100",   dotFilled: "bg-indigo-500",   bar: "bg-indigo-500",   countText: "text-indigo-600",   ring: "ring-indigo-300" },
  "ai-draft":         { bg: "bg-teal-50/70",     border: "border-teal-200/70",     accent: "border-l-teal-500",     iconBg: "bg-teal-100",     dotFilled: "bg-teal-500",     bar: "bg-teal-500",     countText: "text-teal-600",     ring: "ring-teal-300" },
  "brand-voice":      { bg: "bg-fuchsia-50/70",  border: "border-fuchsia-200/70",  accent: "border-l-fuchsia-500",  iconBg: "bg-fuchsia-100",  dotFilled: "bg-fuchsia-500",  bar: "bg-fuchsia-500",  countText: "text-fuchsia-600",  ring: "ring-fuchsia-300" },
  "ad-copy":          { bg: "bg-orange-50/70",   border: "border-orange-200/70",   accent: "border-l-orange-500",   iconBg: "bg-orange-100",   dotFilled: "bg-orange-500",   bar: "bg-orange-500",   countText: "text-orange-600",   ring: "ring-orange-300" },
  "lp-audit":         { bg: "bg-cyan-50/70",     border: "border-cyan-200/70",     accent: "border-l-cyan-500",     iconBg: "bg-cyan-100",     dotFilled: "bg-cyan-500",     bar: "bg-cyan-500",     countText: "text-cyan-600",     ring: "ring-cyan-300" },
}

const DEFAULT_COLOR: SkillColor = {
  bg: "bg-muted/30", border: "border-border", accent: "border-l-zinc-300",
  iconBg: "bg-secondary", dotFilled: "bg-zinc-400", bar: "bg-zinc-400",
  countText: "text-muted-foreground", ring: "ring-zinc-300",
}

// ─── Tooltip copy ─────────────────────────────────────────────────────────────

const SKILL_TOOLTIP: Record<string, string> = {
  "keyword-research": "Discovers high-intent keyword clusters to guide every piece of content you create.",
  "trend-discovery":  "Surfaces emerging topics and LLM citation patterns before they become crowded.",
  "sitemap-audit":    "Flags orphaned pages and crawl gaps so search engines index your best content.",
  "on-page-audit":    "Scores titles, schema, and internal links to maximise on-page ranking signals.",
  "citation-audit":   "Tracks how often AI models cite your site and benchmarks against competitors.",
  "content-rubric":   "Scores every draft against factuality, clarity, and brand alignment before publish.",
  "ai-draft":         "Generates on-brand draft content calibrated to your tone, length, and format rules.",
  "brand-voice":      "Enforces your tone axes and forbidden-word list across all generated outputs.",
  "ad-copy":          "Produces headline and description variants optimised for click-through and conversion.",
  "lp-audit":         "Measures message-match and CTA clarity to lift landing-page conversion rate.",
}

// ─── Skill preview data ───────────────────────────────────────────────────────

export const SKILL_PREVIEW: Record<string, { label: string; items: string[] }> = {
  "keyword-research": { label: "Keyword clusters",  items: ["AI search intent themes", "GEO ranking factor groups", "Content freshness signals"] },
  "trend-discovery":  { label: "Trend feed",        items: ["LLM citation patterns", "Emerging query topics", "Velocity & seasonality"] },
  "sitemap-audit":    { label: "Site health",        items: ["Orphaned page detection", "Index coverage depth", "Crawl prioritisation"] },
  "on-page-audit":    { label: "SEO signals",        items: ["Title & meta optimisation", "Schema markup audit", "Internal link graph"] },
  "citation-audit":   { label: "Citation health",    items: ["AI source mention tracking", "Citation velocity score", "Authority benchmarks"] },
  "content-rubric":   { label: "Scoring weights",    items: ["Factuality · 15%", "Clarity · 10%", "Brand alignment · 12%"] },
  "ai-draft":         { label: "Draft parameters",   items: ["Tone & voice calibration", "Length & heading structure", "Output format templates"] },
  "brand-voice":      { label: "Voice rules",        items: ["Tone axis values", "Forbidden word list", "Style examples & anti-patterns"] },
  "ad-copy":          { label: "Copy variants",      items: ["Headline formulas", "Description patterns", "CTA options"] },
  "lp-audit":         { label: "Conversion signals", items: ["Message-match score", "CTA clarity & contrast", "Page load benchmarks"] },
}

export const STEP_SHORT: Record<number, string> = {
  3: "Step 3 · ICPs",
  4: "Step 4 · Brand voice",
  5: "Step 5 · Strategy",
  6: "Step 6 · Seeds",
}

// ─── Portal tooltip — escapes all overflow contexts ───────────────────────────

function InfoTooltip({ skillId, enrichedByStep }: { skillId: string; enrichedByStep: number }) {
  const text = SKILL_TOOLTIP[skillId]
  const stepLabel = STEP_SHORT[enrichedByStep]
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const ref = useRef<HTMLSpanElement>(null)

  if (!text) return null

  const show = () => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    setPos({ top: r.top - 10, left: r.left + r.width / 2 })
    setVisible(true)
  }

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={show}
        onMouseLeave={() => setVisible(false)}
        className="inline-flex h-3.5 w-3.5 cursor-default select-none items-center justify-center rounded-full bg-muted/80 text-[9px] font-semibold text-muted-foreground/60 hover:bg-muted-foreground/20 transition-colors shrink-0"
      >
        i
      </span>
      {visible && typeof document !== "undefined" && createPortal(
        <div
          className="pointer-events-none fixed z-[9999] w-60 -translate-x-1/2 -translate-y-full rounded-xl border border-border/80 bg-white px-3.5 py-3 text-[11px] leading-relaxed text-foreground shadow-xl"
          style={{ top: pos.top, left: pos.left }}
        >
          <p>{text}</p>
          {stepLabel && (
            <p className="mt-2 pt-2 border-t border-border/40 text-[10px] text-muted-foreground flex items-center gap-1">
              <span>↑</span> Enriched at {stepLabel}
            </p>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SkillDef = typeof SKILL_DEFS[number]

// ─── Full card (mid-panel grid) ───────────────────────────────────────────────

export function SkillCard({
  skill,
  isEnriched,
  isNew = false,
  isHighlighted = false,
  size = "full",
  onEdit,
  onClick,
  variant: _variant,
}: {
  skill: SkillDef
  isEnriched: boolean
  isNew?: boolean
  isHighlighted?: boolean
  variant?: "light" | "dark"
  size?: "full" | "compact"
  onEdit?: () => void
  onClick?: () => void
}) {
  const preview = SKILL_PREVIEW[skill.id]
  const pct = isEnriched ? 100 : 0
  const color = SKILL_COLORS[skill.id] ?? DEFAULT_COLOR

  if (size === "compact") {
    return (
      <CompactSkillCard
        skill={skill}
        isEnriched={isEnriched}
        pct={pct}
        color={color}
        isHighlighted={isHighlighted}
        onEdit={onEdit}
      />
    )
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex flex-col rounded-lg border border-l-2 overflow-hidden transition-all duration-200",
        color.accent, color.border, color.bg,
        isNew && "shadow-sm",
        onClick && "cursor-pointer hover:shadow-md active:scale-[0.99]",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 pt-3 pb-2 border-b border-border/40">
        <span className={cn("inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sm", color.iconBg)}>
          {skill.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[12px] font-semibold truncate text-foreground">{skill.label}</span>
            <InfoTooltip skillId={skill.id} enrichedByStep={skill.enrichedByStep} />
            {isNew && (
              <span className="text-[9px] font-mono bg-primary/15 text-primary px-1.5 py-px rounded animate-pulse shrink-0">
                activated
              </span>
            )}
          </div>
          <p className="text-[10px] mt-0.5 text-muted-foreground/60">{preview?.label ?? "Skill data"}</p>
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-1.5 py-0.5 rounded bg-white/80 border border-border/50 text-muted-foreground hover:text-foreground"
          >
            Edit
          </button>
        )}
      </div>

      {/* Data preview */}
      <div className="px-3 py-2 flex flex-col gap-1.5 flex-1">
        {(preview?.items ?? ["", "", ""]).map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className={cn("h-1 w-1 rounded-full shrink-0", isEnriched ? color.dotFilled : "bg-muted-foreground/20")} />
            {isEnriched ? (
              <span className="text-[11px] text-foreground/80">{item}</span>
            ) : (
              <div className={cn("h-2 rounded animate-pulse bg-muted/80", i === 0 ? "w-[72%]" : i === 1 ? "w-[55%]" : "w-[65%]")} />
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 pb-2.5 pt-2 border-t border-border/40">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-muted-foreground/60">
            {isEnriched ? "Fully enriched" : `Fills at ${STEP_SHORT[skill.enrichedByStep] ?? `step ${skill.enrichedByStep}`}`}
          </span>
          <span className={cn("text-[10px] font-mono tabular-nums", isEnriched ? color.countText : "text-muted-foreground/40")}>
            {pct}%
          </span>
        </div>
        <div className="h-0.5 w-full rounded-full overflow-hidden bg-muted/60">
          <div
            className={cn("h-full rounded-full transition-all duration-700", isEnriched ? color.bar : "w-0")}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Compact card (right panel) ───────────────────────────────────────────────

function CompactSkillCard({
  skill, isEnriched, pct, color, isHighlighted, onEdit,
}: {
  skill: SkillDef
  isEnriched: boolean
  pct: number
  color: SkillColor
  isHighlighted: boolean
  onEdit?: () => void
}) {
  const preview = SKILL_PREVIEW[skill.id]

  return (
    <div
      data-skill-id={skill.id}
      className={cn(
        "group rounded-lg border border-l-2 px-3 py-2.5 transition-all duration-300",
        color.accent, color.border, color.bg,
        isHighlighted && `ring-2 ring-offset-2 ring-offset-slate-50 ${color.ring} shadow-md`,
      )}
    >
      {/* Top row */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-sm shrink-0">{skill.icon}</span>
        <span className="text-[12px] font-semibold flex-1 truncate text-foreground">{skill.label}</span>
        <InfoTooltip skillId={skill.id} enrichedByStep={skill.enrichedByStep} />
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-1.5 py-0.5 rounded bg-white/80 border border-border/50 text-muted-foreground hover:text-foreground ml-1"
          >
            Edit
          </button>
        )}
      </div>

      {/* Ghost / live preview rows */}
      <div className="flex flex-col gap-1 mb-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className={cn("h-1 w-1 rounded-full shrink-0", isEnriched ? color.dotFilled : "bg-muted-foreground/15")} />
            {isEnriched ? (
              <span className="text-[10px] truncate text-foreground/70">{preview?.items[i] ?? ""}</span>
            ) : (
              <div className={cn("h-1.5 rounded animate-pulse bg-muted/70", i === 0 ? "w-[68%]" : i === 1 ? "w-[50%]" : "w-[60%]")} />
            )}
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-0.5 rounded-full overflow-hidden bg-muted/60">
          <div
            className={cn("h-full rounded-full transition-all duration-700", isEnriched ? color.bar : "w-0")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={cn("text-[9px] font-mono tabular-nums shrink-0", isEnriched ? color.countText : "text-muted-foreground/40")}>
          {pct}%
        </span>
      </div>

      <p className="text-[9px] mt-1 text-muted-foreground/40">
        {isEnriched ? "Enriched" : `Fills at ${STEP_SHORT[skill.enrichedByStep] ?? `step ${skill.enrichedByStep}`}`}
      </p>
    </div>
  )
}
