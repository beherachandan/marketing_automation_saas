import { promises as fs } from "fs"
import path from "path"
import os from "os"
import { generateAllFiles } from "@/lib/file-generators"
import type {
  OnboardingState,
  ScannedHints,
  Step1,
  Step2,
  Step3,
  Step4,
  Step5,
  Step6,
  Step7,
  Step8,
} from "@/lib/schema"

const DEV_FILE = path.join(os.tmpdir(), "marketing-automation-saas-dev.json")
const DEV_WORKSPACE_ID = "dev-workspace"

type StepData =
  | { n: 1; data: Step1 }
  | { n: 2; data: Step2 }
  | { n: 3; data: Step3 }
  | { n: 4; data: Step4 }
  | { n: 5; data: Step5 }
  | { n: 6; data: Step6 }
  | { n: 7; data: Step7 }
  | { n: 8; data: Step8 }

export type DevState = {
  status: "draft" | "launched"
  onboarding_step: number
  completed_steps: number[]
  launched_at: string | null
  steps: Partial<OnboardingState>
  scanned_hints: ScannedHints | null
  generated_files: Record<string, string> | null
}

async function readState(): Promise<DevState> {
  try {
    const raw = await fs.readFile(DEV_FILE, "utf8")
    const s = JSON.parse(raw) as Partial<DevState>
    return {
      status: s.status ?? "draft",
      onboarding_step: s.onboarding_step ?? 0,
      completed_steps: s.completed_steps ?? [],
      launched_at: s.launched_at ?? null,
      steps: s.steps ?? {},
      scanned_hints: s.scanned_hints ?? null,
      generated_files: s.generated_files ?? null,
    }
  } catch {
    return {
      status: "draft",
      onboarding_step: 0,
      completed_steps: [],
      launched_at: null,
      steps: {},
      scanned_hints: null,
      generated_files: null,
    }
  }
}

async function writeState(s: DevState) {
  await fs.writeFile(DEV_FILE, JSON.stringify(s, null, 2), "utf8")
}

export async function localSaveStep<N extends 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8>(
  n: N,
  data: Extract<StepData, { n: N }>["data"],
): Promise<void> {
  const s = await readState()
  // @ts-expect-error dynamic step assignment
  s.steps[`step${n}`] = data
  s.onboarding_step = Math.max(n, s.onboarding_step)
  if (!s.completed_steps.includes(n)) {
    s.completed_steps = [...s.completed_steps, n].sort((a, b) => a - b)
  }
  if (
    s.steps.step1 &&
    s.steps.step2 &&
    s.steps.step3 &&
    s.steps.step4 &&
    s.steps.step5 &&
    s.steps.step6 &&
    s.steps.step7
  ) {
    s.generated_files = generateAllFiles(s.steps as OnboardingState)
  }
  await writeState(s)
}

export async function localSaveScannedHints(hints: ScannedHints): Promise<void> {
  const s = await readState()
  s.scanned_hints = hints
  await writeState(s)
}

export async function localLoadOnboardingState(): Promise<
  Partial<OnboardingState> & {
    workspaceId: string | null
    completedSteps: number[]
    scannedHints: ScannedHints | null
    status: "draft" | "launched"
  }
> {
  const s = await readState()
  return {
    ...s.steps,
    workspaceId: s.onboarding_step > 0 ? DEV_WORKSPACE_ID : null,
    completedSteps: s.completed_steps,
    scannedHints: s.scanned_hints,
    status: s.status,
  }
}

export async function localFinalize(): Promise<void> {
  const s = await readState()
  s.status = "launched"
  s.launched_at = new Date().toISOString()
  s.onboarding_step = 8
  if (!s.completed_steps.includes(8)) s.completed_steps.push(8)
  await writeState(s)
}

export function isDevBypass() {
  return process.env.DEV_BYPASS_AUTH === "1"
}
