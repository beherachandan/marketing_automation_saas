"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/cn"

export type FileEntry = {
  path: string
  content: string
  steps: number[]
}

type Group = {
  step: number
  label: string
  description: string
  files: FileEntry[]
}

const stepMeta: Record<number, { label: string; description: string }> = {
  1: { label: "Workspace", description: "IDENTITY & USER context" },
  2: { label: "Product", description: "Pairs with ICPs to form product context" },
  3: { label: "ICPs", description: "Finalizes product-context.md" },
  4: { label: "Brand voice", description: "Tone axes + voice guide" },
  5: { label: "Content strategy", description: "GEO guidelines + scoring rubric" },
  6: { label: "Demand seeds", description: "Trend-seeds.json for research skill" },
  7: { label: "Integrations", description: "Tools, CMS ids, tenant.json" },
  8: { label: "Launch", description: "Cron schedules + runtime host" },
}

export function PreviewPane({
  files,
  completedSteps,
  currentStep,
}: {
  files: FileEntry[]
  completedSteps: number[]
  currentStep: number
}) {
  const groups = useMemo<Group[]>(() => {
    const byStep = new Map<number, FileEntry[]>()
    for (const f of files) {
      const primary = f.steps[0] ?? 1
      if (!byStep.has(primary)) byStep.set(primary, [])
      byStep.get(primary)!.push(f)
    }
    const out: Group[] = []
    for (let n = 1; n <= 8; n++) {
      const list = byStep.get(n) ?? []
      if (list.length === 0) continue
      out.push({
        step: n,
        label: stepMeta[n]?.label ?? `Step ${n}`,
        description: stepMeta[n]?.description ?? "",
        files: list,
      })
    }
    return out
  }, [files])

  const [openGroups, setOpenGroups] = useState<Set<number>>(() => new Set([currentStep]))
  const [openFiles, setOpenFiles] = useState<Set<string>>(new Set())
  const activeRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setOpenGroups((prev) => new Set([...prev, currentStep]))
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [currentStep])

  const toggleGroup = (n: number) =>
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })

  const toggleFile = (path: string) =>
    setOpenFiles((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })

  const totalFiles = files.length
  const currentFiles = groups.find((g) => g.step === currentStep)?.files.length ?? 0

  return (
    <aside className="border-l border-border bg-card h-full flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-baseline justify-between">
          <p className="label-uppercase">Outputs</p>
          <span className="text-[11px] font-mono text-muted-foreground">
            {totalFiles} file{totalFiles === 1 ? "" : "s"}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          {currentFiles > 0
            ? `Step ${currentStep} is producing ${currentFiles} file${currentFiles === 1 ? "" : "s"}.`
            : totalFiles === 0
              ? "Your inputs will generate tenant files here."
              : `Continue step ${currentStep} to see new files here.`}
        </p>
      </div>

      {totalFiles === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="mx-auto mb-3 h-10 w-10 rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted-foreground">
              ✦
            </div>
            <p className="text-[12px] text-muted-foreground">
              Fill the first step to start<br />generating context files.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {groups.map((g) => {
            const isOpen = openGroups.has(g.step)
            const isDone = completedSteps.includes(g.step)
            const isActive = g.step === currentStep
            return (
              <div
                key={g.step}
                ref={isActive ? activeRef : null}
                className={cn(
                  "border-b border-border last:border-b-0 transition-colors",
                  isActive && "bg-primary/5",
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(g.step)}
                  className={cn(
                    "w-full px-4 py-3 flex items-center gap-3 text-left transition-colors hover:bg-secondary/60",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-mono",
                      isDone && "bg-success text-success-foreground border-success",
                      isActive && !isDone && "bg-background border-primary text-primary ring-2 ring-primary/25",
                      !isDone && !isActive && "bg-background border-zinc-300 text-muted-foreground",
                    )}
                  >
                    {isDone ? "✓" : g.step}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] font-medium text-foreground">{g.label}</p>
                      {isActive && (
                        <span className="inline-flex items-center rounded-sm bg-primary/10 text-primary px-1 py-px text-[9px] font-mono tracking-normal">
                          new
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{g.description}</p>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {g.files.length}
                  </span>
                  <svg
                    className={cn(
                      "h-3 w-3 shrink-0 text-muted-foreground transition-transform",
                      isOpen && "rotate-90",
                    )}
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="bg-background/40">
                    {g.files.map((f) => {
                      const open = openFiles.has(f.path)
                      const extraSteps = f.steps.slice(1)
                      return (
                        <div key={f.path} className="border-t border-border/60">
                          <button
                            type="button"
                            onClick={() => toggleFile(f.path)}
                            className="w-full px-4 py-2 flex items-center gap-2 text-left hover:bg-secondary/40"
                          >
                            <svg
                              className={cn(
                                "h-2.5 w-2.5 shrink-0 text-muted-foreground transition-transform",
                                open && "rotate-90",
                              )}
                              viewBox="0 0 12 12"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            >
                              <path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className="flex-1 min-w-0 text-[11px] font-mono text-foreground truncate">
                              {f.path}
                            </span>
                            {extraSteps.length > 0 && (
                              <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                                +{extraSteps.map((s) => `S${s}`).join(",")}
                              </span>
                            )}
                          </button>
                          {open && (
                            <pre className="px-4 pb-3 max-h-96 overflow-auto text-[11px] font-mono leading-relaxed whitespace-pre-wrap text-foreground/90">
                              {f.content}
                            </pre>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </aside>
  )
}
