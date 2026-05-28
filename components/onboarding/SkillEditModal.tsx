"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import ReactMarkdown from "react-markdown"
import { Paperclip, X, Search, TrendingUp, Map, FileSearch, Link2, BarChart2, PenTool, Mic2, Megaphone, MousePointerClick, CheckCircle2, Circle } from "lucide-react"
import { cn } from "@/lib/cn"
import { SKILL_DEFS } from "@/lib/schema"
import type { ScannedHints } from "@/lib/schema"
import { SKILL_PREVIEW, STEP_SHORT, SKILL_COLORS } from "./SkillCard"
import { buildSkillConfig } from "@/lib/skill-config-builder"
import type { PipelineConfiguredData } from "./PipelineCanvas"

const SKILL_ICONS: Record<string, React.ReactNode> = {
  "keyword-research": <Search className="h-4 w-4" />,
  "trend-discovery":  <TrendingUp className="h-4 w-4" />,
  "sitemap-audit":    <Map className="h-4 w-4" />,
  "on-page-audit":    <FileSearch className="h-4 w-4" />,
  "citation-audit":   <Link2 className="h-4 w-4" />,
  "content-rubric":   <BarChart2 className="h-4 w-4" />,
  "ai-draft":         <PenTool className="h-4 w-4" />,
  "brand-voice":      <Mic2 className="h-4 w-4" />,
  "ad-copy":          <Megaphone className="h-4 w-4" />,
  "lp-audit":         <MousePointerClick className="h-4 w-4" />,
}

type SkillDef = typeof SKILL_DEFS[number]

const TONE_LABELS: Record<string, [string, string]> = {
  formalCasual:             ["Formal", "Casual"],
  authoritativeFriendly:    ["Authoritative", "Friendly"],
  technicalConversational:  ["Technical", "Conversational"],
  playfulSerious:           ["Playful", "Serious"],
}

function BrandVoiceScanPanel({ hints }: { hints: ScannedHints }) {
  const bv = hints.suggestedBrandVoice
  if (!bv) return null
  const tone = bv.tone
  const attrs = bv.attributes ?? []
  const example = bv.goodExample

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-3 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
        <p className="text-[10px] font-semibold tracking-wider uppercase text-emerald-700">
          Detected from scan · {hints.crawledUrls?.length ?? 0} URLs
        </p>
      </div>

      {tone && (
        <div className="flex flex-col gap-2">
          {(Object.entries(tone) as [string, number][]).map(([key, val]) => {
            const labels = TONE_LABELS[key]
            if (!labels) return null
            const pct = val
            return (
              <div key={key} className="flex flex-col gap-0.5">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{labels[0]}</span>
                  <span>{labels[1]}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-emerald-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {attrs.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {attrs.map((a) => (
            <span key={a} className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
              {a}
            </span>
          ))}
        </div>
      )}

      {example && (
        <div className="rounded-md bg-white border border-emerald-200 px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-emerald-600 mb-1">Example voice</p>
          <p className="text-[11px] text-foreground/80 leading-relaxed italic">&ldquo;{example}&rdquo;</p>
        </div>
      )}
    </div>
  )
}

const SKILL_COLD_DOC: Record<string, string> = {
  "keyword-research": `## What this skill does
Discovers and clusters high-intent keywords relevant to your product and audience. Groups them by topic, search volume tier, and content type — so every piece of content you create is anchored to a validated demand signal.

## Inputs it needs
- Your target audience segments (added in Step 3 · ICPs)
- Seed topics and content themes (added in Step 6 · Seeds)
- Product positioning and category (scanned from your website)

## What it produces
- Keyword clusters grouped by intent (informational, commercial, navigational)
- GEO-specific ranking factor groups for AI-answer targeting
- Content freshness signals — which topics are trending vs stable
- Prioritised keyword brief per cluster

## Enrichment timeline
This skill is initialised with website-scan data. It becomes fully operational after Step 6 (Seeds) when topic seeds and ICP context are both available.

## How it works post-enrichment
Runs on a configurable cron (default: weekly). For each cluster, the agent checks current SERP position, AI citation frequency, and trend velocity — then updates the brief and flags any clusters that need a refresh.`,

  "trend-discovery": `## What this skill does
Surfaces emerging topics and LLM citation patterns before they become competitive. Monitors what AI assistants are currently citing in your category, identifies velocity — topics accelerating faster than the market expects.

## Inputs it needs
- Keyword clusters from Keyword Research skill
- Your product category and competitor set (from website scan)
- Target audience context (Step 3 · ICPs)

## What it produces
- Trend feed: emerging topics with velocity scores
- LLM citation patterns — which sources AI models prefer in your category
- Seasonality signals — topics with predictable demand cycles
- Opportunity index: high-trend + low-competition intersection

## Enrichment timeline
Becomes fully operational after Step 6 (Seeds). Requires keyword clusters as input.

## How it works post-enrichment
Monitors AI-answer results, Reddit threads, and search trend APIs weekly. Flags new trends that intersect with your ICP pain points and suggests content formats most likely to earn AI citations.`,

  "sitemap-audit": `## What this skill does
Audits your site's crawlability and index coverage. Identifies orphaned pages, duplicate content clusters, and crawl depth issues that prevent search engines from indexing your most valuable content.

## Inputs it needs
- Your website URL (already scanned)
- Target page types and URL patterns (inferred from site structure)

## What it produces
- Orphaned page report — pages with no inbound internal links
- Index coverage depth — how many pages are discoverable vs buried
- Crawl prioritisation recommendations — which paths to surface
- Internal link gap analysis

## Enrichment timeline
Becomes fully operational after Step 5 (Strategy) when content hierarchy and priority pages are defined.

## How it works post-enrichment
Crawls your sitemap and live URL structure monthly (or on-demand). Compares against previous state, surfaces newly orphaned pages, and generates an actionable internal linking fix list.`,

  "on-page-audit": `## What this skill does
Scores individual pages against on-page SEO and GEO signals. Evaluates title tags, meta descriptions, heading structure, schema markup, and internal link distribution — then generates a prioritised fix list.

## Inputs it needs
- Target URLs or page groups (inferred from sitemap)
- Keyword targets per page (from Keyword Research skill)

## What it produces
- Title and meta optimisation recommendations
- Schema markup gaps (FAQ, HowTo, Article — depending on page type)
- Internal link graph — which pages lack inbound equity
- Per-page score with fix priority ranking

## Enrichment timeline
Becomes fully operational after Step 5 (Strategy) when keyword targets are mapped to pages.

## How it works post-enrichment
Runs on-demand or weekly. Scores each page, diffs against previous audit, and generates a Slack-ready fix digest ranked by estimated traffic impact.`,

  "citation-audit": `## What this skill does
Tracks how often and how accurately AI assistants cite your site. Measures citation velocity over time, benchmarks against competitor citation rates, and identifies which of your pages are being referenced vs ignored.

## Inputs it needs
- Your website URL (already scanned)
- Competitor domains (added in Step 5 · Strategy)
- Target topic clusters (from Keyword Research)

## What it produces
- Citation frequency score — how often AI mentions your site per topic
- Citation velocity — rate of change over time
- Competitor citation benchmarks
- Cited page inventory — which of your pages AI models prefer
- Gap list — topics where competitors are cited but you are not

## Enrichment timeline
Becomes fully operational after Step 5 (Strategy) when competitor context is added.

## How it works post-enrichment
Probes AI models with representative queries weekly. Logs citation results, tracks trends, and alerts when a competitor's citation rate significantly outpaces yours in a target topic cluster.`,

  "content-rubric": `## What this skill does
Evaluates draft content against a configurable scoring rubric before it gets published. Checks factuality, brand alignment, clarity, and GEO-specific signals like answer completeness and citation-worthiness.

## Inputs it needs
- Your brand voice guidelines (Step 4 · Brand Voice)
- Target ICP and tone requirements (Step 3 · ICPs)
- Content format rules (Step 4)

## What it produces
- Per-draft rubric score with dimension breakdown
- Specific edit recommendations per failing dimension
- GEO readiness score — how likely the content is to earn AI citations
- Brand alignment score against your voice rules

## Enrichment timeline
Becomes fully operational after Step 4 (Brand Voice) when tone rules and scoring weights are defined.

## How it works post-enrichment
Every AI Draft passes through this rubric automatically. Drafts below threshold are returned with edits instead of proceeding to the publish queue. You can adjust dimension weights in Step 4.`,

  "ai-draft": `## What this skill does
Generates on-brand draft content calibrated to your tone, length, and format rules. Uses your keyword targets, ICP context, and brand voice to produce drafts that pass the Content Rubric without manual cleanup.

## Inputs it needs
- Brand Voice rules (Step 4)
- ICP and audience context (Step 3)
- Keyword brief for the target topic (Keyword Research skill)
- Content format template (Step 4)

## What it produces
- Full draft in your specified format (blog post, FAQ, landing copy, etc.)
- Heading structure and internal link placeholder suggestions
- Metadata draft (title tag, meta description, OG copy)
- Rubric pre-score — estimates pass/fail before you review

## Enrichment timeline
Becomes fully operational after Step 4 (Brand Voice). Requires ICP context from Step 3.

## How it works post-enrichment
Triggered manually or via content calendar cron. Pulls the keyword brief, applies brand voice rules, generates the draft, runs it through Content Rubric automatically, and delivers a Slack summary with the draft link.`,

  "brand-voice": `## What this skill does
Enforces your tone, style, and language rules across all generated outputs. Acts as a style layer on top of every AI Draft — rewriting or flagging violations before content reaches review.

## Inputs it needs
- Tone axis values — e.g. formal↔conversational, authoritative↔approachable (Step 4)
- Forbidden and preferred word lists (Step 4)
- Style examples and anti-patterns (Step 4)

## What it produces
- Voice compliance score per draft
- In-line edits with explanations for each violation
- Updated forbidden/preferred word lists as the model learns from your corrections
- Tone axis drift alerts — if the model starts skewing away from your calibration

## Enrichment timeline
Becomes fully operational after Step 4 (Brand Voice) when your tone axes and examples are defined.

## How it works post-enrichment
Applied automatically to every AI Draft as a post-processing pass. You can also run it against existing content to get a "voice consistency audit" across your published library.`,

  "ad-copy": `## What this skill does
Generates headline and description variants for paid channels — Google Ads, Meta, LinkedIn — optimised for click-through and conversion. Uses your ICP pain points, product positioning, and landing page context to produce copy that aligns with the post-click experience.

## Inputs it needs
- ICP context and pain points (Step 3)
- Product positioning and value props (from website scan + Step 2)
- Landing page URL for message-match alignment
- Campaign objective (awareness / consideration / conversion)

## What it produces
- Headline variants (15, 30, and 90-character tiers)
- Description variants per ad type
- A/B test matrix — pairs of headlines targeting different angles
- Message-match score vs target landing page

## Enrichment timeline
Becomes fully operational after Step 3 (ICPs) when audience pain points are defined.

## How it works post-enrichment
Generates a copy batch for each campaign brief. Integrates with your ad platform via webhook to push approved variants directly. Reports on which angles are winning across active campaigns weekly.`,

  "lp-audit": `## What this skill does
Evaluates landing pages for conversion readiness. Measures message-match between ad copy and landing content, CTA clarity, page load performance, and trust signals — then generates a prioritised optimisation list.

## Inputs it needs
- Landing page URLs (inferred from website scan)
- Campaign objectives per page (from Ad Copy skill or manual input)
- ICP context for message-match validation (Step 3)

## What it produces
- Message-match score — how well the page copy aligns with inbound ad angles
- CTA clarity rating — is the primary action obvious and friction-free
- Page load benchmark vs category average
- Trust signal checklist — social proof, security indicators, testimonials
- Prioritised fix list ranked by estimated conversion impact

## Enrichment timeline
Becomes fully operational after Step 3 (ICPs) when audience expectations are defined.

## How it works post-enrichment
Runs on-demand or monthly. For each active campaign, checks that the landing page message still matches the ad copy variants running against it. Alerts when a page scores below threshold or when copy has drifted from the page content.`,
}

// ─── tools data ──────────────────────────────────────────────────────────────

interface ToolEntry {
  name: string
  purpose: string
  configuredAt: string   // e.g. "Step 7 · Integrations" or "Website scan"
  required: boolean
}

const SKILL_TOOLS: Record<string, ToolEntry[]> = {
  "keyword-research": [
    { name: "SEMrush API",           purpose: "Keyword volume + difficulty data",      configuredAt: "Step 7 · Integrations", required: false },
    { name: "DataForSEO API",        purpose: "SERP result fetching",                  configuredAt: "Step 7 · Integrations", required: false },
    { name: "Tavily Search",         purpose: "Live web context + trend signals",       configuredAt: "Step 7 · Integrations", required: false },
  ],
  "trend-discovery": [
    { name: "Tavily Search",         purpose: "Real-time trend monitoring",             configuredAt: "Step 7 · Integrations", required: true  },
    { name: "SEMrush API",           purpose: "Keyword velocity benchmarking",          configuredAt: "Step 7 · Integrations", required: false },
  ],
  "sitemap-audit": [
    { name: "Website URL",           purpose: "Sitemap crawl and index audit",          configuredAt: "Website scan",          required: true  },
    { name: "DataForSEO API",        purpose: "Crawl depth + orphan page analysis",     configuredAt: "Step 7 · Integrations", required: false },
  ],
  "on-page-audit": [
    { name: "Website URL",           purpose: "Live page content and schema audit",     configuredAt: "Website scan",          required: true  },
    { name: "SEMrush API",           purpose: "Keyword-to-page mapping validation",     configuredAt: "Step 7 · Integrations", required: false },
  ],
  "citation-audit": [
    { name: "Tavily Search",         purpose: "AI citation probing and tracking",       configuredAt: "Step 7 · Integrations", required: true  },
    { name: "Website URL",           purpose: "Your pages to monitor for citations",    configuredAt: "Website scan",          required: true  },
  ],
  "content-rubric": [
    { name: "Brand Voice config",    purpose: "Tone axis and forbidden word rules",     configuredAt: "Step 4 · Brand Voice",  required: true  },
    { name: "ICP profiles",          purpose: "Audience alignment scoring",             configuredAt: "Step 3 · ICPs",         required: true  },
  ],
  "ai-draft": [
    { name: "Brand Voice config",    purpose: "Tone and style rules for generation",    configuredAt: "Step 4 · Brand Voice",  required: true  },
    { name: "CMS integration",       purpose: "Draft delivery and publish queue",       configuredAt: "Step 7 · Integrations", required: false },
    { name: "Tavily Search",         purpose: "Factual grounding during generation",    configuredAt: "Step 7 · Integrations", required: false },
  ],
  "brand-voice": [
    { name: "Brand Voice config",    purpose: "Tone axes, word lists, examples",        configuredAt: "Step 4 · Brand Voice",  required: true  },
  ],
  "ad-copy": [
    { name: "ICP profiles",          purpose: "Pain point and audience context",        configuredAt: "Step 3 · ICPs",         required: true  },
    { name: "Product context",       purpose: "Value props and positioning copy",       configuredAt: "Step 2 · Product",      required: true  },
  ],
  "lp-audit": [
    { name: "Website URL",           purpose: "Landing page content fetch",             configuredAt: "Website scan",          required: true  },
    { name: "ICP profiles",          purpose: "Message-match validation",               configuredAt: "Step 3 · ICPs",         required: true  },
  ],
}

function ToolsTab({ skillId }: { skillId: string }) {
  const tools = SKILL_TOOLS[skillId] ?? []
  if (tools.length === 0) {
    return (
      <p className="text-[12px] text-muted-foreground/60 px-1 py-4">No external tools required for this skill.</p>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] text-muted-foreground/50 mb-1">
        These inputs are read automatically once configured — no manual steps needed.
      </p>
      {tools.map((tool) => (
        <div key={tool.name} className="flex items-start gap-3 rounded-lg border border-border bg-white px-3 py-2.5">
          <div className="shrink-0 mt-0.5">
            {tool.required
              ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              : <Circle className="h-3.5 w-3.5 text-muted-foreground/30" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-foreground">{tool.name}</p>
            <p className="text-[11px] text-muted-foreground/70 leading-snug">{tool.purpose}</p>
          </div>
          <div className="shrink-0 text-right">
            <span className="text-[9px] font-mono text-muted-foreground/40 whitespace-nowrap">{tool.configuredAt}</span>
          </div>
        </div>
      ))}
      <p className="text-[9px] text-muted-foreground/40 pt-1">
        <CheckCircle2 className="h-2.5 w-2.5 inline mr-1 text-emerald-400" />required
        <span className="ml-3"><Circle className="h-2.5 w-2.5 inline mr-1 text-muted-foreground/30" />optional</span>
      </p>
    </div>
  )
}

function buildSkillDoc(skill: SkillDef, isEnriched: boolean): string {
  const preview = SKILL_PREVIEW[skill.id]
  const stepLabel = STEP_SHORT[skill.enrichedByStep]

  if (!isEnriched) {
    const coldDoc = SKILL_COLD_DOC[skill.id]
    if (coldDoc) {
      return [
        `# ${skill.label}`,
        "",
        `**Streams:** ${(skill.streams as readonly string[]).join(", ")}  ·  **Enriched at:** ${stepLabel ?? `Step ${skill.enrichedByStep}`}`,
        "",
        coldDoc,
      ].join("\n")
    }
  }

  return [
    `# ${skill.icon} ${skill.label}`,
    "",
    `**Streams:** ${(skill.streams as readonly string[]).join(", ")}`,
    `**Enriched at:** ${stepLabel ?? `Step ${skill.enrichedByStep}`}`,
    "",
    `## ${preview?.label ?? "Skill data"}`,
    ...(preview?.items ?? []).map((item) => `- ${item}`),
  ].join("\n")
}

// Skills where config tab is more immediately useful than overview
const SKILL_DEFAULT_TAB: Record<string, "overview" | "config" | "tools"> = {
  "brand-voice":      "config",
  "content-rubric":   "config",
  "keyword-research": "tools",
  "trend-discovery":  "tools",
  "citation-audit":   "tools",
}

export function SkillEditModal({
  skill,
  onClose,
  isEnriched,
  scanHints,
  configuredData,
  defaultTab,
}: {
  skill: SkillDef | null
  onClose: () => void
  isEnriched: boolean
  scanHints?: ScannedHints | null
  configuredData?: PipelineConfiguredData
  defaultTab?: "overview" | "config" | "tools"
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "config" | "tools">("overview")
  const [chatMessages, setChatMessages] = useState<string[]>([])
  const [chatInput, setChatInput] = useState("")
  const [fileName, setFileName] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Reset state when skill changes — use per-skill default tab or caller-supplied override
  useEffect(() => {
    const tab = defaultTab ?? (skill?.id ? (SKILL_DEFAULT_TAB[skill.id] ?? "overview") : "overview")
    setActiveTab(tab)
    setChatMessages([])
    setChatInput("")
    setFileName(null)
    setSaved(false)
  }, [skill?.id, defaultTab])

  // Escape key closes modal
  useEffect(() => {
    if (!skill) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [skill, onClose])

  const handleSend = () => {
    const msg = chatInput.trim()
    if (!msg) return
    setChatMessages((prev) => [...prev, msg])
    setChatInput("")
    inputRef.current?.focus()
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!skill || typeof document === "undefined") return null

  const color = SKILL_COLORS[skill.id] ?? SKILL_COLORS["keyword-research"]
  const stepLabel = STEP_SHORT[skill.enrichedByStep]
  const doc = buildSkillDoc(skill, isEnriched)

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg mx-4 bg-white rounded-xl shadow-2xl border border-border flex flex-col max-h-[82vh] overflow-hidden">
        {/* Header */}
        <div className={cn(
          "flex items-center gap-3 px-4 py-3 border-b border-border",
          color.bg,
        )}>
          <span className={cn(
            "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
            color.iconBg, color.countText,
          )}>
            {SKILL_ICONS[skill.id] ?? <Search className="h-4 w-4" />}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-foreground truncate">{skill.label}</p>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {(skill.streams as readonly string[]).map((s) => (
                <span key={s} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {s}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Tab nav */}
        <div className="flex border-b border-border shrink-0">
          {(["overview", "config", "tools"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 text-[11px] font-medium transition-colors capitalize border-b-2 -mb-px",
                activeTab === tab
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
          {activeTab === "overview" && (
            <>
              {/* Scan findings — brand voice only */}
              {skill.id === "brand-voice" && scanHints && (
                <BrandVoiceScanPanel hints={scanHints} />
              )}

              {/* Skill doc block */}
              <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                <p className="text-[9px] font-semibold tracking-widest uppercase text-muted-foreground/50 mb-2">
                  skill.md · {isEnriched ? "enriched" : "pre-enrichment preview"}
                </p>
                <div className={cn(
                  "prose prose-sm max-w-none text-[12px]",
                  "[&_h1]:text-[14px] [&_h1]:font-semibold [&_h1]:mb-1 [&_h1]:mt-0",
                  "[&_h2]:text-[11px] [&_h2]:font-semibold [&_h2]:uppercase [&_h2]:tracking-wider [&_h2]:text-muted-foreground/60 [&_h2]:mb-1.5 [&_h2]:mt-3",
                  "[&_p]:text-[12px] [&_p]:text-foreground/70 [&_p]:my-1",
                  "[&_ul]:my-1 [&_li]:text-[12px] [&_li]:text-foreground/70 [&_li]:my-0.5",
                  "[&_strong]:font-semibold [&_strong]:text-foreground/80",
                  !isEnriched && "opacity-70",
                )}>
                  <ReactMarkdown>{doc}</ReactMarkdown>
                </div>
                {!isEnriched && stepLabel && (
                  <p className="text-[10px] text-muted-foreground/50 mt-2 pt-2 border-t border-border/40">
                    ↑ Fully enriched after completing {stepLabel}
                  </p>
                )}
              </div>

              {/* Chat / context section */}
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground/60">
                  Add context or instructions
                </p>

                {chatMessages.length > 0 && (
                  <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-slate-50/60 px-3 py-2">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className="flex items-start gap-2 group">
                        <span className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center text-[9px] text-primary font-semibold shrink-0 mt-0.5">
                          You
                        </span>
                        <p className="text-[12px] text-foreground/80 leading-relaxed flex-1">{msg}</p>
                        <button
                          type="button"
                          onClick={() => setChatMessages((prev) => prev.filter((_, j) => j !== i))}
                          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 h-4 w-4 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <textarea
                    ref={inputRef}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
                    }}
                    placeholder="e.g. Focus on long-tail keywords for the K12 segment…"
                    rows={3}
                    className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-[12px] text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!chatInput.trim()}
                    className="h-8 px-3 mt-auto rounded-md bg-primary text-primary-foreground text-[11px] font-medium disabled:opacity-40 transition-opacity self-end"
                  >
                    Add
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground/40">Enter · send  ·  Shift+Enter · newline</p>
              </div>

              {/* File attachment */}
              <div>
                <p className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground/60 mb-1.5">
                  Attach reference file
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const input = document.createElement("input")
                    input.type = "file"
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0]
                      if (file) setFileName(file.name)
                    }
                    input.click()
                  }}
                  className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-[11px] text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors w-full cursor-pointer"
                >
                  <Paperclip className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{fileName ?? "Attach a file…"}</span>
                </button>
              </div>
            </>
          )}

          {activeTab === "config" && (
            <div className="flex flex-col gap-3">
              {configuredData ? (
                <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                  <p className="text-[9px] font-semibold tracking-widest uppercase text-muted-foreground/50 mb-2">
                    skill.md · live config
                  </p>
                  <div className={cn(
                    "prose prose-sm max-w-none text-[12px]",
                    "[&_h1]:text-[14px] [&_h1]:font-semibold [&_h1]:mb-1 [&_h1]:mt-0",
                    "[&_h2]:text-[11px] [&_h2]:font-semibold [&_h2]:uppercase [&_h2]:tracking-wider [&_h2]:text-muted-foreground/60 [&_h2]:mb-1.5 [&_h2]:mt-3",
                    "[&_p]:text-[12px] [&_p]:text-foreground/70 [&_p]:my-1",
                    "[&_ul]:my-1 [&_li]:text-[12px] [&_li]:text-foreground/70 [&_li]:my-0.5",
                    "[&_strong]:font-semibold [&_strong]:text-foreground/80",
                    "[&_blockquote]:border-l-2 [&_blockquote]:border-amber-300 [&_blockquote]:pl-3 [&_blockquote]:text-amber-700/70 [&_blockquote]:text-[11px] [&_blockquote]:my-2",
                  )}>
                    <ReactMarkdown>
                      {buildSkillConfig(skill.id, configuredData, isEnriched)}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center">
                  <p className="text-[12px] text-muted-foreground/50">
                    Config populates as you complete onboarding steps.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "tools" && (
            <ToolsTab skillId={skill.id} />
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-3 bg-white/80 flex items-center justify-between gap-2">
          <p className="text-[10px] text-muted-foreground/50">
            Context improves skill output quality
          </p>
          <button
            type="button"
            onClick={handleSave}
            disabled={chatMessages.length === 0 && !fileName}
            className="h-7 px-3 rounded-md bg-primary text-primary-foreground text-[11px] font-medium disabled:opacity-40 transition-opacity"
          >
            {saved ? "✓ Saved" : "Save"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
