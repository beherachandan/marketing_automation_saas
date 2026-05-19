"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/cn"
import { SKILL_DEFS } from "@/lib/schema"
import type { Step1 } from "@/lib/schema"

const STREAM_META: Record<string, { color: string; border: string; bg: string; label: string; icon: string }> = {
  SEO:      { color: "text-blue-700",    border: "border-blue-200",   bg: "bg-blue-50",    label: "SEO",      icon: "🔍" },
  "AEO/GEO":{ color: "text-emerald-700", border: "border-emerald-200", bg: "bg-emerald-50", label: "AEO/GEO",  icon: "📡" },
  Paid:     { color: "text-amber-700",   border: "border-amber-200",  bg: "bg-amber-50",   label: "Paid",     icon: "💰" },
}

export function ZeroHero({
  streams,
  website,
}: {
  streams: Step1["agent"]["streams"]
  website: string
}) {
  const [tick, setTick] = useState(0)

  // Pulse the scan dots while website is typed
  useEffect(() => {
    if (!website) return
    const t = setInterval(() => setTick((n) => n + 1), 600)
    return () => clearInterval(t)
  }, [website])

  const activeSkills = SKILL_DEFS.filter((sk) =>
    sk.streams.some((s) => streams.includes(s as Step1["agent"]["streams"][number]))
  )

  return (
    <div className="flex flex-col gap-6 px-2">
      {/* Stream cards with skill chips */}
      {(["SEO", "AEO/GEO", "Paid"] as const).map((stream) => {
        const meta = STREAM_META[stream]
        const isActive = streams.includes(stream as Step1["agent"]["streams"][number])
        const skills = SKILL_DEFS.filter((sk) => sk.streams[0] === stream)

        return (
          <motion.div
            key={stream}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: isActive ? 1 : 0.35 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "rounded-xl border p-4 transition-colors",
              isActive ? cn(meta.bg, meta.border) : "bg-surface border-border",
            )}
          >
            {/* stream header */}
            <div className="flex items-center gap-2 mb-3">
              <span className={cn(
                "h-7 w-7 rounded-lg flex items-center justify-center text-sm",
                isActive ? "bg-white/70" : "bg-muted",
              )}>
                {meta.icon}
              </span>
              <span className={cn(
                "text-[13px] font-semibold",
                isActive ? meta.color : "text-muted-foreground",
              )}>
                {meta.label}
              </span>
              <span className="ml-auto text-[11px] text-muted-foreground">
                {skills.length} skills
              </span>
            </div>

            {/* skill chips */}
            <div className="flex flex-wrap gap-1.5">
              <AnimatePresence>
                {skills.map((sk, i) => (
                  <motion.span
                    key={sk.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: isActive ? 1 : 0.4, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ delay: isActive ? i * 0.05 : 0, duration: 0.2 }}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px]",
                      isActive
                        ? cn("bg-white/80", meta.border, meta.color)
                        : "bg-muted/60 border-border text-muted-foreground",
                    )}
                  >
                    <span className="text-[10px]">{sk.icon}</span>
                    {sk.label}
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )
      })}

      {/* Website scan indicator */}
      <AnimatePresence>
        {website && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="rounded-xl border border-border bg-surface p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[12px] font-medium text-foreground">Site scan preview</span>
              <span className="flex gap-0.5 ml-auto">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 w-1.5 rounded-full transition-opacity duration-300",
                      tick % 3 === i ? "bg-primary opacity-100" : "bg-border opacity-40",
                    )}
                  />
                ))}
              </span>
            </div>
            <p className="text-[11px] font-mono text-muted-foreground truncate">{website}</p>
            <div className="mt-2 grid grid-cols-2 gap-1">
              {["Product lines", "ICPs", "Brand voice", "Seed topics"].map((label, i) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    tick > i * 2 ? "bg-primary" : "bg-border",
                  )} />
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active skills summary */}
      {activeSkills.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[11px] text-muted-foreground text-center"
        >
          {activeSkills.length} skill{activeSkills.length === 1 ? "" : "s"} activated · your agent trains on these as you progress
        </motion.p>
      )}
    </div>
  )
}
