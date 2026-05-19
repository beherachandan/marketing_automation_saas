"use client"

import { useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/cn"
import { SKILL_DEFS } from "@/lib/schema"
import type { FileEntry } from "./PreviewPane"
import type { Step1 } from "@/lib/schema"
import { SkillCard } from "./SkillCard"
import { SkillEditModal } from "./SkillEditModal"
import { AgentEditModal } from "./AgentEditModal"
import { ArchitectureDiagram } from "./ArchitectureDiagram"
import { SOUL_MD_DEFAULT } from "@/lib/agent-defaults"
import { useStreamContext } from "./Shell"

// ─── use-case flows ───────────────────────────────────────────────────────────

type FlowNodeType = "trigger" | "ai" | "tool" | "human" | "condition"

type FlowNode = {
  id: string
  type: FlowNodeType
  label: string
  icon: string
  sublabel?: string
  requiredStep: number | null
}

type UseCase = {
  id: string
  title: string
  subtitle: string
  streams: string[]
  nodes: FlowNode[]
}

const USE_CASES: UseCase[] = [
  {
    id: "long-form",
    title: "Long-form Content",
    subtitle: "Organic · AEO/GEO",
    streams: ["SEO", "AEO/GEO"],
    nodes: [
      { id: "kw-cron",  type: "trigger",   label: "KW Cron",            icon: "⏰", sublabel: "Weekly discovery",    requiredStep: null },
      { id: "confirm",  type: "human",     label: "Human Confirm",       icon: "👤", sublabel: "Review keyword brief", requiredStep: 1 },
      { id: "aeo-pipe", type: "ai",        label: "AEO Content Pipeline", icon: "🤖", sublabel: "Draft · rubric · voice", requiredStep: 5 },
      { id: "cms-pub",  type: "tool",      label: "Publish to CMS",      icon: "📤", sublabel: "Webflow / headless",   requiredStep: 7 },
    ],
  },
  {
    id: "aeo-eval",
    title: "AEO Evaluator",
    subtitle: "URL → Score → Fix",
    streams: ["AEO/GEO"],
    nodes: [
      { id: "url-in",   type: "trigger",   label: "URL Input",           icon: "🔗", sublabel: "Manual or Slack",     requiredStep: null },
      { id: "scrape",   type: "tool",      label: "Scrape & Parse",       icon: "🌐", sublabel: "Firecrawl",            requiredStep: 2 },
      { id: "evaluate", type: "ai",        label: "AI Evaluate",          icon: "🤖", sublabel: "Rubric scoring",       requiredStep: 5 },
      { id: "suggest",  type: "condition", label: "Suggestions",          icon: "💡", sublabel: "Pass / Needs work",    requiredStep: 5 },
    ],
  },
  {
    id: "seo-eval",
    title: "SEO Evaluator",
    subtitle: "Sitemap → Gaps → Recs",
    streams: ["SEO"],
    nodes: [
      { id: "sitemap",  type: "trigger",   label: "URL / Sitemap",        icon: "🗺️", sublabel: "On-demand",           requiredStep: null },
      { id: "crawl",    type: "tool",      label: "Crawl & Analyse",      icon: "🔍", sublabel: "Get Pages from Sitemap", requiredStep: 6 },
      { id: "gaps",     type: "ai",        label: "Find Gaps",            icon: "🤖", sublabel: "Keyword + on-page",    requiredStep: 6 },
      { id: "recs",     type: "tool",      label: "Recommendations",      icon: "📋", sublabel: "Structured report",    requiredStep: 6 },
    ],
  },
  {
    id: "refresh",
    title: "Content Refresh",
    subtitle: "Cron or URL · Update",
    streams: ["SEO", "AEO/GEO"],
    nodes: [
      { id: "trig",     type: "trigger",   label: "Cron / URL",           icon: "🔄", sublabel: "Monthly or on-demand", requiredStep: null },
      { id: "fetch",    type: "tool",      label: "Fetch Existing",       icon: "📥", sublabel: "Web scrape",           requiredStep: 2 },
      { id: "enhance",  type: "ai",        label: "AI Enhance",           icon: "✨", sublabel: "Brand voice + AEO",   requiredStep: 4 },
      { id: "review",   type: "human",     label: "Review & Publish",     icon: "👤", sublabel: "Slack approval",       requiredStep: 1 },
    ],
  },
]

// AirOps-inspired color scheme per node type
const FLOW_NODE_COLORS: Record<FlowNodeType, { bg: string; border: string; icon: string; label: string; dot: string }> = {
  trigger:   { bg: "bg-amber-50",   border: "border-amber-200",   icon: "text-amber-600",   label: "text-amber-800",   dot: "bg-amber-400"   },
  ai:        { bg: "bg-blue-50",    border: "border-blue-200",    icon: "text-blue-600",    label: "text-blue-800",    dot: "bg-blue-400"    },
  tool:      { bg: "bg-emerald-50", border: "border-emerald-200", icon: "text-emerald-600", label: "text-emerald-800", dot: "bg-emerald-400" },
  human:     { bg: "bg-violet-50",  border: "border-violet-200",  icon: "text-violet-600",  label: "text-violet-800",  dot: "bg-violet-400"  },
  condition: { bg: "bg-rose-50",    border: "border-rose-200",    icon: "text-rose-600",    label: "text-rose-800",    dot: "bg-rose-400"    },
}

// ─── types ────────────────────────────────────────────────────────────────────

type Tab = "skills" | "usecases" | "system"
type SkillDef = typeof SKILL_DEFS[number]

// ─── sub-components ───────────────────────────────────────────────────────────

function FlowNodeRow({ node, active }: { node: FlowNode; active: boolean }) {
  const c = FLOW_NODE_COLORS[node.type]
  return (
    <div className={cn(
      "flex items-center gap-2.5 rounded-md border px-2.5 py-2 transition-all duration-300",
      active ? cn(c.bg, c.border) : "bg-muted/30 border-border/40 opacity-40 grayscale",
    )}>
      <span className={cn("text-base shrink-0", active ? c.icon : "text-muted-foreground/40")}>
        {node.icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className={cn("text-[11px] font-medium leading-tight truncate", active ? c.label : "text-muted-foreground/50")}>
          {node.label}
        </p>
        {node.sublabel && (
          <p className="text-[9px] text-muted-foreground/50 truncate leading-tight mt-0.5">
            {node.sublabel}
          </p>
        )}
      </div>
      <span className={cn(
        "text-[9px] font-mono px-1 py-0.5 rounded shrink-0",
        active
          ? cn(c.dot.replace("bg-", "bg-").replace("-400", "-100"), c.label.replace("text-", "text-").replace("-800", "-600"))
          : "bg-muted text-muted-foreground/40",
      )}>
        {node.type}
      </span>
    </div>
  )
}

function UseCaseCard({
  uc,
  completedSteps,
  streamsSelected,
}: {
  uc: UseCase
  completedSteps: number[]
  streamsSelected: string[]
}) {
  const [open, setOpen] = useState(false)
  const isUnlocked = uc.streams.some((s) => streamsSelected.includes(s))

  return (
    <div className={cn(
      "rounded-lg border overflow-hidden transition-all",
      isUnlocked ? "border-border" : "border-border/30 opacity-50",
    )}>
      <button
        type="button"
        onClick={() => isUnlocked && setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors",
          isUnlocked ? "hover:bg-muted/30 cursor-pointer" : "cursor-default",
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[12px] font-medium text-foreground truncate">{uc.title}</p>
            {!isUnlocked && (
              <span className="text-[9px] text-muted-foreground/50">🔒</span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground/60">{uc.subtitle}</p>
        </div>
        {isUnlocked && (
          <span className="text-[10px] text-muted-foreground/40 shrink-0">{open ? "▲" : "▼"}</span>
        )}
      </button>

      {open && isUnlocked && (
        <div className="px-3 pb-3 flex flex-col">
          {uc.nodes.map((node, i) => (
            <div key={node.id}>
              <FlowNodeRow
                node={node}
                active={node.requiredStep === null || completedSteps.includes(node.requiredStep)}
              />
              {i < uc.nodes.length - 1 && (
                <div className="flex justify-center py-1">
                  <div className="h-3 w-px bg-border/50" />
                </div>
              )}
            </div>
          ))}
          <p className="text-[9px] text-muted-foreground/40 mt-2.5 text-center">
            Nodes activate as you complete setup
          </p>
        </div>
      )}
    </div>
  )
}

function DocCard({
  title,
  content,
  readOnly,
  onSave,
}: {
  title: string
  content: string
  readOnly?: boolean
  onSave?: (v: string) => void
}) {
  const [draft, setDraft] = useState(content)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    onSave?.(draft)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20">
        <p className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground/60">
          {title}
        </p>
        {readOnly && (
          <span className="text-[9px] font-mono text-muted-foreground/40">auto-generated</span>
        )}
        {!readOnly && (
          <span className="text-[9px] font-mono text-violet-500">editable</span>
        )}
      </div>
      <div className="px-3 py-2">
        {readOnly ? (
          <pre className="text-[10px] font-mono text-foreground/60 whitespace-pre-wrap leading-relaxed max-h-24 overflow-auto">
            {content || "Complete Step 1 to generate this file"}
          </pre>
        ) : (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            className="w-full text-[11px] font-mono text-foreground resize-none focus:outline-none leading-relaxed"
          />
        )}
      </div>
      {!readOnly && (
        <div className="px-3 py-2 border-t border-border flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={draft === content}
            className="h-6 px-2.5 rounded bg-primary text-primary-foreground text-[10px] font-medium disabled:opacity-40 transition-opacity"
          >
            {saved ? "✓ Saved" : "Save"}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── infra diagram (System tab) ───────────────────────────────────────────────

function InfraDiagram({ agentName }: { agentName?: string }) {
  const name = agentName || "Your Agent"
  return (
    <div className="flex flex-col items-center gap-0 py-3">
      {/* Interface layer */}
      <div className="flex gap-2 justify-center">
        {[
          { icon: "💬", label: "Slack" },
          { icon: "🌐", label: "API" },
          { icon: "⏰", label: "Cron" },
        ].map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg border border-border bg-white text-center min-w-[56px]">
            <span className="text-base">{item.icon}</span>
            <p className="text-[9px] text-muted-foreground font-medium">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Connector */}
      <div className="h-4 w-px bg-border/60" />

      {/* Orchestrator */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-violet-300 bg-violet-50 shadow-sm w-full max-w-[220px]">
        <span className="text-lg">🤖</span>
        <div>
          <p className="text-[11px] font-semibold text-violet-800">{name}</p>
          <p className="text-[9px] text-violet-500 font-mono">orchestrator · SOUL.md</p>
        </div>
      </div>

      {/* Connector + split */}
      <div className="h-4 w-px bg-border/60" />
      <div className="flex items-center gap-1 w-full max-w-[260px]">
        <div className="h-px flex-1 bg-border/50" />
        <div className="h-px flex-1 bg-border/50" />
        <div className="h-px flex-1 bg-border/50" />
      </div>
      <div className="flex gap-2 justify-between w-full max-w-[260px]">
        {[
          { icon: "🔍", label: "SEO",      color: "border-blue-200 bg-blue-50 text-blue-700"     },
          { icon: "📡", label: "AEO/GEO",  color: "border-emerald-200 bg-emerald-50 text-emerald-700" },
          { icon: "💰", label: "Paid",     color: "border-amber-200 bg-amber-50 text-amber-700"   },
        ].map((ag) => (
          <div key={ag.label} className={cn(
            "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg border flex-1",
            ag.color,
          )}>
            <span className="text-sm">{ag.icon}</span>
            <p className="text-[9px] font-medium">{ag.label}</p>
          </div>
        ))}
      </div>

      {/* Connector */}
      <div className="h-4 w-px bg-border/60" />

      {/* Files */}
      <div className="flex gap-1.5 justify-center">
        {["IDENTITY.md", "SOUL.md", "USER.md"].map((f) => (
          <div key={f} className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-muted/40">
            <span className="text-[9px]">📄</span>
            <p className="text-[9px] font-mono text-muted-foreground/70">{f}</p>
          </div>
        ))}
      </div>

      <p className="text-[9px] text-muted-foreground/40 mt-3 text-center">
        Click any agent node in the diagram to edit
      </p>
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export function ActivityPane({
  files,
  completedSteps,
  currentStep: _currentStep,
  agentName,
  streamsSelected,
}: {
  files: FileEntry[]
  completedSteps: number[]
  currentStep: number
  agentName?: string
  streamsSelected?: Step1["agent"]["streams"]
}) {
  const pathname = usePathname()
  const isZeroScreen = pathname === "/onboarding"
  const { selectedSkillId } = useStreamContext()

  const [tab, setTab] = useState<Tab>("skills")
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null)
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null)
  const [soulContent, setSoulContent] = useState(SOUL_MD_DEFAULT)

  const identityContent = useMemo(
    () => files.find((f) => f.path === "IDENTITY.md")?.content ?? "",
    [files],
  )

  const initials = agentName
    ? agentName.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")
    : "AI"

  const trainingPct = Math.round((completedSteps.length / 8) * 100)

  const activeSkills = useMemo(() => {
    const streams = streamsSelected ?? []
    if (streams.length === 0) return [...SKILL_DEFS]
    const seen = new Set<string>()
    const result: SkillDef[] = []
    for (const skill of SKILL_DEFS) {
      if (seen.has(skill.id)) continue
      if (skill.streams.some((s) => streams.includes(s as Step1["agent"]["streams"][number]))) {
        seen.add(skill.id)
        result.push(skill)
      }
    }
    return result
  }, [streamsSelected])

  const effectiveStreams = (streamsSelected ?? []) as string[]

  return (
    <aside className="w-[340px] shrink-0 border-l border-border bg-slate-50/70 flex flex-col overflow-hidden">
      {/* Agent card */}
      <div className="px-4 pt-4 pb-3.5 border-b border-border">
        <div className="flex items-center gap-3 mb-2.5">
          <div className="h-9 w-9 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center text-[13px] font-semibold text-violet-600 shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate text-foreground">
              {agentName || "Your agent"}
            </p>
            <p className="text-[11px] text-muted-foreground/70">
              {trainingPct < 100 ? `Training · ${trainingPct}% complete` : "Fully trained · ready"}
            </p>
          </div>
          {trainingPct === 100 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-mono shrink-0">
              live
            </span>
          )}
        </div>
        <div className="h-1 w-full rounded-full overflow-hidden bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
            style={{ width: `${trainingPct}%` }}
          />
        </div>
      </div>

      {/* Tab bar — 3 tabs */}
      <div className="flex border-b border-border text-[11px] font-medium bg-white/60">
        {([
          ["skills",   "Skills"],
          ["usecases", "Use Cases"],
          ["system",   "System"],
        ] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-2 transition-colors",
              tab === t
                ? "text-foreground border-b-2 border-foreground/70"
                : "text-muted-foreground/60 hover:text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Skills tab */}
      {tab === "skills" && (
        <div className="flex-1 overflow-auto p-3">
          {activeSkills.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 mt-12 opacity-40">
              <span className="text-2xl">⚙️</span>
              <p className="text-[12px] text-center text-muted-foreground">
                Select work streams to<br />see your skills
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {activeSkills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  isEnriched={!isZeroScreen && completedSteps.includes(skill.enrichedByStep)}
                  size="compact"
                  isHighlighted={skill.id === selectedSkillId}
                  onEdit={() => setEditingSkillId(skill.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Use Cases tab */}
      {tab === "usecases" && (
        <div className="flex-1 overflow-auto p-3 flex flex-col gap-2">
          <p className="text-[10px] text-muted-foreground/50 mb-1">
            Flows activate as you complete setup steps
          </p>
          {USE_CASES.map((uc) => (
            <UseCaseCard
              key={uc.id}
              uc={uc}
              completedSteps={completedSteps}
              streamsSelected={effectiveStreams}
            />
          ))}
          {/* Node type legend */}
          <div className="mt-2 rounded-md border border-border/40 px-3 py-2 bg-white/60">
            <p className="text-[9px] font-semibold tracking-wider uppercase text-muted-foreground/40 mb-1.5">
              Legend
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {(Object.entries(FLOW_NODE_COLORS) as [FlowNodeType, typeof FLOW_NODE_COLORS[FlowNodeType]][]).map(([type, c]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full shrink-0", c.dot)} />
                  <span className="text-[9px] text-muted-foreground/60 capitalize">{type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* System tab */}
      {tab === "system" && (
        <div className="flex-1 overflow-auto flex flex-col">
          {/* Infra diagram */}
          <div className="p-3 border-b border-border">
            <p className="text-[9px] font-semibold tracking-widest uppercase text-muted-foreground/50 mb-2">
              Infrastructure
            </p>
            <InfraDiagram agentName={agentName} />
          </div>

          {/* Detailed agent diagram */}
          <div className="flex-1 min-h-[280px] border-b border-border">
            <p className="text-[9px] font-semibold tracking-widest uppercase text-muted-foreground/50 px-3 pt-3 pb-1">
              Agent graph
            </p>
            <div className="h-[260px]">
              <ArchitectureDiagram
                activeSkills={activeSkills}
                agentName={agentName}
                streamsSelected={streamsSelected}
                onEditSkill={(id) => setEditingSkillId(id)}
                onEditAgent={(id) => setEditingAgentId(id)}
              />
            </div>
          </div>

          {/* Key docs */}
          <div className="p-3 flex flex-col gap-3">
            <p className="text-[9px] font-semibold tracking-widest uppercase text-muted-foreground/50">
              Agent files
            </p>
            <DocCard
              title="IDENTITY.md"
              content={identityContent}
              readOnly
            />
            <DocCard
              title="SOUL.md"
              content={soulContent}
              onSave={setSoulContent}
            />
          </div>
        </div>
      )}

      {/* Modals (portal-rendered, always mounted) */}
      <SkillEditModal
        skill={editingSkillId ? (SKILL_DEFS.find((s) => s.id === editingSkillId) ?? null) : null}
        onClose={() => setEditingSkillId(null)}
        isEnriched={
          editingSkillId
            ? completedSteps.includes(SKILL_DEFS.find((s) => s.id === editingSkillId)?.enrichedByStep ?? 99)
            : false
        }
      />
      <AgentEditModal
        agentId={editingAgentId}
        soulContent={soulContent}
        onSaveSoul={(v) => { setSoulContent(v); setEditingAgentId(null) }}
        onClose={() => setEditingAgentId(null)}
      />
    </aside>
  )
}
