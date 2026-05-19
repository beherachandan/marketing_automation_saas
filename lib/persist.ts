import { getSupabaseServerClient } from "@/lib/supabase/server"
import { generateAllFiles } from "@/lib/file-generators"
import {
  isDevBypass,
  localSaveStep,
  localLoadOnboardingState,
  localFinalize,
  localSaveScannedHints,
} from "@/lib/persist-local"
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

type StepData =
  | { n: 1; data: Step1 }
  | { n: 2; data: Step2 }
  | { n: 3; data: Step3 }
  | { n: 4; data: Step4 }
  | { n: 5; data: Step5 }
  | { n: 6; data: Step6 }
  | { n: 7; data: Step7 }
  | { n: 8; data: Step8 }

/**
 * Resolve the current user's active workspace (owner-first lookup).
 * For MVP, a user has at most one draft workspace.
 */
export async function getActiveWorkspaceId(): Promise<string | null> {
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.id ?? null
}

/**
 * Create or return the user's working workspace from step1 data.
 */
export async function ensureWorkspace(step1: Step1): Promise<string> {
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const existing = await getActiveWorkspaceId()
  if (existing) {
    await supabase.from("workspaces").update({ name: step1.workspace, slug: slugify(step1.workspace) }).eq("id", existing)
    return existing
  }

  const slug = slugify(step1.workspace)
  const { data, error } = await supabase
    .from("workspaces")
    .insert({ slug, name: step1.workspace, owner_id: user.id, status: "draft", onboarding_step: 1 })
    .select("id")
    .single()
  if (error) throw error
  return data.id
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || `ws-${Date.now().toString(36)}`
}

/**
 * Persist a single onboarding step. Regenerates all affected files
 * and snapshots them onto the tenant_configs row for preview/audit.
 */
export async function saveStep<N extends 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8>(
  n: N,
  data: Extract<StepData, { n: N }>["data"],
): Promise<void> {
  if (isDevBypass()) return localSaveStep(n, data as never)
  const supabase = await getSupabaseServerClient()

  // Step 1 creates the workspace if it doesn't yet exist.
  let workspaceId: string | null
  if (n === 1) {
    workspaceId = await ensureWorkspace(data as Step1)
  } else {
    workspaceId = await getActiveWorkspaceId()
    if (!workspaceId) throw new Error("No active workspace — complete Step 1 first")
  }

  const files = await buildFileSnapshot(workspaceId, n, data)

  const { error } = await supabase.from("tenant_configs").upsert(
    {
      workspace_id: workspaceId,
      step: n,
      data: data as unknown as Record<string, unknown>,
      generated_files: files,
    },
    { onConflict: "workspace_id,step" },
  )
  if (error) throw error

  await supabase
    .from("workspaces")
    .update({ onboarding_step: Math.max(n, 1) })
    .eq("id", workspaceId)
}

/**
 * Load the full OnboardingState for the current workspace — fills missing steps with empty shells.
 */
export async function loadOnboardingState(): Promise<
  Partial<OnboardingState> & {
    workspaceId: string | null
    completedSteps: number[]
    scannedHints: ScannedHints | null
    status: "draft" | "launched"
  }
> {
  if (isDevBypass()) return localLoadOnboardingState()
  const supabase = await getSupabaseServerClient()
  const workspaceId = await getActiveWorkspaceId()
  if (!workspaceId)
    return { workspaceId: null, completedSteps: [], scannedHints: null, status: "draft" }

  const { data } = await supabase.from("tenant_configs").select("step,data").eq("workspace_id", workspaceId)
  const state: Partial<OnboardingState> & {
    workspaceId: string
    completedSteps: number[]
    scannedHints: ScannedHints | null
    status: "draft" | "launched"
  } = { workspaceId, completedSteps: [], scannedHints: null, status: "draft" }
  for (const row of data ?? []) {
    // @ts-expect-error dynamic step assignment
    state[`step${row.step}`] = row.data
    state.completedSteps.push(row.step)
  }
  state.completedSteps.sort((a, b) => a - b)
  return state
}

/**
 * Persist the website scan output so downstream steps can pre-fill defaults from it.
 */
export async function saveScannedHints(hints: ScannedHints): Promise<void> {
  if (isDevBypass()) return localSaveScannedHints(hints)
  const supabase = await getSupabaseServerClient()
  const workspaceId = await getActiveWorkspaceId()
  if (!workspaceId) return
  await supabase.from("workspaces").update({ scanned_hints: hints }).eq("id", workspaceId)
}

/**
 * Build the snapshot of all files after applying `data` to step `n`.
 * Reads previously-saved steps and merges the new one.
 */
async function buildFileSnapshot(
  workspaceId: string,
  n: number,
  data: unknown,
): Promise<Record<string, string> | null> {
  const supabase = await getSupabaseServerClient()
  const { data: rows } = await supabase
    .from("tenant_configs")
    .select("step,data")
    .eq("workspace_id", workspaceId)

  const merged: Partial<OnboardingState> = {}
  for (const row of rows ?? []) {
    // @ts-expect-error dynamic step assignment
    merged[`step${row.step}`] = row.data
  }
  // @ts-expect-error dynamic step assignment
  merged[`step${n}`] = data

  if (!merged.step1 || !merged.step2 || !merged.step3 || !merged.step4 || !merged.step5 || !merged.step6 || !merged.step7) {
    return null
  }
  return generateAllFiles(merged as OnboardingState)
}

/**
 * Final step. Flips workspace to `launched` and records the timestamp.
 * The cron scheduler reads `status='launched'` to enable runs.
 */
export async function finalizeOnboarding(): Promise<void> {
  if (isDevBypass()) return localFinalize()
  const supabase = await getSupabaseServerClient()
  const workspaceId = await getActiveWorkspaceId()
  if (!workspaceId) throw new Error("No active workspace")

  const { error } = await supabase
    .from("workspaces")
    .update({ status: "launched", launched_at: new Date().toISOString(), onboarding_step: 8 })
    .eq("id", workspaceId)
  if (error) throw error
}
