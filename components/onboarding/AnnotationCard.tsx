"use client"

import { cn } from "@/lib/cn"
import type { AnnotationCardData } from "@/lib/onboarding-annotations"
import { motion, AnimatePresence } from "framer-motion"

interface AnnotationCardProps {
  annotation: AnnotationCardData | null
  /** Field label that is currently focused — shown above the card */
  fieldLabel?: string
  className?: string
}

export function AnnotationCard({ annotation, fieldLabel, className }: AnnotationCardProps) {
  return (
    <div className={cn("px-4 py-3", className)}>
      <AnimatePresence mode="wait">
        {annotation ? (
          <motion.div
            key={annotation.agentLabel}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {fieldLabel && (
              <p className="text-[9px] font-semibold tracking-wider uppercase text-muted-foreground/40 mb-2">
                {fieldLabel}
              </p>
            )}
            <div className="rounded-lg border border-border bg-white p-3.5 shadow-sm">
              {/* Agent identity */}
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="h-7 w-7 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-violet-600">
                    {annotation.agentLabel.split("·")[0]?.trim()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-foreground truncate">
                    {annotation.agentLabel}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 leading-tight">
                    {annotation.agentRole}
                  </p>
                </div>
              </div>

              {/* What this agent does with this field */}
              <p className="text-[12px] text-foreground/80 leading-relaxed border-t border-border pt-2.5">
                {annotation.actionCopy}
              </p>

              {/* Secondary agents */}
              {annotation.secondaryAgents && annotation.secondaryAgents.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-border">
                  <p className="text-[9px] font-semibold tracking-wider uppercase text-muted-foreground/40 mb-1.5">
                    Also used by
                  </p>
                  <div className="flex flex-col gap-1">
                    {annotation.secondaryAgents.map((agent) => (
                      <p key={agent} className="text-[10px] text-muted-foreground/60 leading-snug">
                        {agent}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
          >
            <div className="rounded-lg border border-dashed border-border bg-white/50 p-4 text-center">
              <p className="text-[11px] text-muted-foreground/40">
                Focus a field to see which agent uses it
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
