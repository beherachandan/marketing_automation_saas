"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import ReactMarkdown from "react-markdown"
import { cn } from "@/lib/cn"
import { SKILL_DEFS } from "@/lib/schema"
import { SKILL_PREVIEW, STEP_SHORT, SKILL_COLORS } from "./SkillCard"

type SkillDef = typeof SKILL_DEFS[number]

function buildSkillDoc(skill: SkillDef): string {
  const preview = SKILL_PREVIEW[skill.id]
  const stepLabel = STEP_SHORT[skill.enrichedByStep]
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

export function SkillEditModal({
  skill,
  onClose,
  isEnriched,
}: {
  skill: SkillDef | null
  onClose: () => void
  isEnriched: boolean
}) {
  const [chatMessages, setChatMessages] = useState<string[]>([])
  const [chatInput, setChatInput] = useState("")
  const [fileName, setFileName] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Reset state when skill changes
  useEffect(() => {
    setChatMessages([])
    setChatInput("")
    setFileName(null)
    setSaved(false)
  }, [skill?.id])

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
  const doc = buildSkillDoc(skill)

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
            "h-9 w-9 rounded-lg flex items-center justify-center text-xl shrink-0",
            color.iconBg,
          )}>
            {skill.icon}
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

        {/* Body */}
        <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
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

            {/* Previous messages */}
            {chatMessages.length > 0 && (
              <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-slate-50/60 px-3 py-2">
                {chatMessages.map((msg, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center text-[9px] text-primary font-semibold shrink-0 mt-0.5">
                      You
                    </span>
                    <p className="text-[12px] text-foreground/80 leading-relaxed">{msg}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Input */}
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
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-[11px] text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors w-full"
            >
              <span className="text-base">📎</span>
              <span className="truncate">{fileName ?? "Choose file…"}</span>
            </button>
          </div>
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
