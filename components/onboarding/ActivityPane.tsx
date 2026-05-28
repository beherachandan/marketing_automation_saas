"use client"

import { useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/cn"
import { SKILL_DEFS } from "@/lib/schema"
import type { FileEntry } from "./PreviewPane"
import type { Step1 } from "@/lib/schema"
import { SkillEditModal } from "./SkillEditModal"
import { AgentEditModal } from "./AgentEditModal"
import { PipelineCanvas } from "./PipelineCanvas"
import type { PipelineConfiguredData } from "./PipelineCanvas"
import { useStreamContext } from "./Shell"
import { ChevronUp, ChevronDown, Search, TrendingUp, Map, FileSearch, Link2, BarChart2, PenTool, Mic2, Megaphone, MousePointerClick, Sparkles } from "lucide-react"
import { AnnotationCard } from "./AnnotationCard"

type SkillDef = typeof SKILL_DEFS[number]

// ─── skill icons ──────────────────────────────────────────────────────────────

const SKILL_ICONS_SM: Record<string, React.ReactNode> = {
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

const STREAM_LABEL: Record<string, string> = {
  SEO: "SEO",
  "AEO/GEO": "GEO",
  Paid: "Paid",
}

function streamBorderColor(stream: string): string {
  if (stream === "SEO") return "border-l-emerald-500"
  if (stream === "AEO/GEO") return "border-l-violet-500"
  return "border-l-amber-500"
}

// ─── skills panel ─────────────────────────────────────────────────────────────

function SkillsPanel({
  activeSkills,
  completedSteps,
  onOpen,
}: {
  activeSkills: SkillDef[]
  completedSteps: number[]
  onOpen: (id: string) => void
}) {
  const byStream = useMemo(() => {
    const groups: Record<string, SkillDef[]> = {}
    for (const skill of activeSkills) {
      const stream = skill.streams[0] as string
      if (!groups[stream]) groups[stream] = []
      groups[stream].push(skill)
    }
    return groups
  }, [activeSkills])

  return (
    <div className="flex flex-col gap-0 px-2 pb-3 pt-1">
      {Object.entries(byStream).map(([stream, skills], index) => (
        <div
          key={stream}
          className={cn(
            "rounded-md px-2 pb-2",
            index > 0 && "mt-1.5",
            index % 2 === 0 ? "bg-muted/25" : "bg-background",
          )}
        >
          <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50 pt-2 mb-1.5 px-0.5">
            {STREAM_LABEL[stream] ?? stream}
          </p>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
            className="flex flex-col gap-1"
          >
            {skills.map((skill) => {
              const isEnriched = completedSteps.includes(skill.enrichedByStep)
              const borderColor = streamBorderColor(skill.streams[0] as string)
              return (
                <motion.button
                  key={skill.id}
                  type="button"
                  onClick={() => onOpen(skill.id)}
                  variants={{ hidden: { opacity: 0, y: 4 }, visible: { opacity: 1, y: 0 } }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left",
                    "bg-muted/40 hover:bg-muted/70 transition-colors duration-150",
                    "border-l-4",
                    borderColor,
                  )}
                >
                  <span className="shrink-0 text-muted-foreground/60">
                    {SKILL_ICONS_SM[skill.id]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-foreground truncate">{skill.label}</p>
                    <p className="text-[10px] text-muted-foreground">{STREAM_LABEL[skill.streams[0] as string]}</p>
                  </div>
                  {isEnriched ? (
                    <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 shrink-0">
                      enriched
                    </span>
                  ) : (
                    <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground/50 shrink-0">
                      locked
                    </span>
                  )}
                </motion.button>
              )
            })}
          </motion.div>
        </div>
      ))}
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export function ActivityPane({
  files: _files,
  completedSteps,
  currentStep,
  agentName,
  streamsSelected,
  configuredData,
}: {
  files: FileEntry[]
  completedSteps: number[]
  currentStep: number
  agentName?: string
  streamsSelected?: Step1["agent"]["streams"]
  configuredData?: PipelineConfiguredData
}) {
  const pathname = usePathname()
  const isZeroScreen = pathname === "/onboarding"
  const { selectedSkillId: _selectedSkillId, activeAnnotation, activeFieldLabel } = useStreamContext()

  const [editingSkillId, setEditingSkillId] = useState<string | null>(null)
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null)
  const [skillsOpen, setSkillsOpen] = useState(false)

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

  const diagramCollapsed = currentStep >= 2 && !isZeroScreen

  // Which skill IDs are actively being configured at the current onboarding step
  const STEP_SKILL_MAP: Record<number, string[]> = {
    2: ["content-rubric"],
    3: ["content-rubric"],
    4: ["ai-draft", "brand-voice"],
    5: ["content-rubric"],
    6: ["keyword-research", "trend-discovery"],
  }
  const activeStepSkillIds = STEP_SKILL_MAP[currentStep] ?? []

  return (
    <aside className="w-[360px] shrink-0 border-l border-border bg-slate-50/70 flex flex-col overflow-hidden">
      {/* Agent header */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate text-foreground">
              {agentName || "Your agent"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {trainingPct < 100 ? `Training · ${trainingPct}%` : "Fully trained · ready"}
            </p>
          </div>
          {trainingPct === 100 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-mono shrink-0">
              live
            </span>
          )}
        </div>
        <div className="h-0.5 w-full rounded-full overflow-hidden bg-muted mt-2.5">
          <motion.div
            className="h-full rounded-full bg-violet-500"
            animate={{ width: `${trainingPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Pipeline canvas */}
      <div
        className={cn(
          "border-b border-border transition-all duration-500 overflow-hidden",
          diagramCollapsed
            ? skillsOpen ? "shrink-0 h-[200px]" : "flex-1 min-h-0"
            : "flex-1 min-h-0",
        )}
      >
        <PipelineCanvas
          completedSteps={completedSteps}
          currentStep={currentStep}
          configuredData={configuredData}
          activeStepSkillIds={activeStepSkillIds}
          onChipClick={setEditingSkillId}
        />
      </div>

      {/* Annotation overlay */}
      {activeAnnotation && (
        <div className="shrink-0 border-b border-border bg-white">
          <div className="px-4 pt-3 pb-1">
            <p className="text-[9px] font-semibold tracking-wider uppercase text-muted-foreground/40">
              {activeFieldLabel ?? "Field info"}
            </p>
          </div>
          <AnnotationCard annotation={activeAnnotation} className="pt-0" />
        </div>
      )}

      {/* Skills panel */}
      {!activeAnnotation && (
        <div className={cn("flex flex-col overflow-hidden", diagramCollapsed && skillsOpen ? "flex-1 min-h-0" : "shrink-0")}>
          <button
            type="button"
            onClick={() => setSkillsOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors border-b border-border shrink-0"
          >
            <span className="text-[11px] font-medium text-muted-foreground/70">Skills</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono text-muted-foreground/40">
                {completedSteps.length > 0
                  ? `${activeSkills.filter((s) => completedSteps.includes(s.enrichedByStep)).length}/${activeSkills.length} enriched`
                  : `${activeSkills.length} cold-start`}
              </span>
              {skillsOpen ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/50" />
              )}
            </div>
          </button>

          <AnimatePresence>
            {skillsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={cn("overflow-auto", diagramCollapsed ? "flex-1" : "max-h-52")}
              >
                <SkillsPanel
                  activeSkills={activeSkills}
                  completedSteps={completedSteps}
                  onOpen={setEditingSkillId}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Footer rail */}
      <div className="shrink-0 border-t border-border px-4 h-11 flex items-center justify-between bg-background mt-auto">
        <span className="text-[10px] text-muted-foreground">
          {currentStep > 0 ? `Step ${currentStep} of 8` : "Setup"}
        </span>
        <svg viewBox="0 0 20 20" className="w-5 h-5 -rotate-90">
          <circle cx="10" cy="10" r="8" fill="none" strokeWidth="2" className="stroke-muted" />
          <circle
            cx="10" cy="10" r="8" fill="none" strokeWidth="2"
            className={trainingPct === 100 ? "stroke-emerald-500" : "stroke-violet-500"}
            strokeDasharray={`${(trainingPct / 100) * 50.27} 50.27`}
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Modals */}
      <SkillEditModal
        skill={editingSkillId ? (SKILL_DEFS.find((s) => s.id === editingSkillId) ?? null) : null}
        onClose={() => setEditingSkillId(null)}
        isEnriched={
          editingSkillId
            ? completedSteps.includes(SKILL_DEFS.find((s) => s.id === editingSkillId)?.enrichedByStep ?? 99)
            : false
        }
        configuredData={configuredData}
      />
      <AgentEditModal
        agentId={editingAgentId}
        soulContent=""
        onSaveSoul={() => { setEditingAgentId(null) }}
        onClose={() => setEditingAgentId(null)}
      />
    </aside>
  )
}
