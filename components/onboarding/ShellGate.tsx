"use client"

import { usePathname } from "next/navigation"
import { Shell } from "./Shell"
import type { FileEntry } from "./PreviewPane"
import type { Step1 } from "@/lib/schema"
import type { PipelineConfiguredData } from "./PipelineCanvas"

export function ShellGate({
  children,
  files,
  completedSteps,
  agentName,
  streamsSelected,
  configuredData,
}: {
  children: React.ReactNode
  files: FileEntry[]
  completedSteps: number[]
  agentName?: string
  streamsSelected?: Step1["agent"]["streams"]
  configuredData?: PipelineConfiguredData
}) {
  const pathname = usePathname()
  const isZeroScreen = pathname === "/onboarding"
  const isOrientation = pathname === "/onboarding/orientation"
  const m = pathname.match(/step-(\d+)/)
  const currentStep = m
    ? Number(m[1])
    : completedSteps.length
      ? Math.max(...completedSteps)
      : 1

  if (isZeroScreen || isOrientation) return <>{children}</>

  return (
    <Shell
      files={files}
      completedSteps={completedSteps}
      currentStep={currentStep}
      agentName={agentName}
      streamsSelected={streamsSelected}
      configuredData={configuredData}
    >
      {children}
    </Shell>
  )
}
