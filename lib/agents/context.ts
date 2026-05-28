import { getSupabaseServiceClient } from "@/lib/supabase/service"
import { generateAllFiles } from "@/lib/file-generators"
import type { OnboardingState } from "@/lib/schema"

/**
 * Load the tenant context bundle for a workspace.
 * Returns the merged OnboardingState + the pre-generated file snapshots
 * so agents don't have to regenerate on every run.
 */
export async function loadTenantContext(workspaceId: string): Promise<{
  state: OnboardingState
  files: Record<string, string>
}> {
  const supabase = getSupabaseServiceClient()
  const { data, error } = await supabase
    .from("tenant_configs")
    .select("step,data")
    .eq("workspace_id", workspaceId)
  if (error) throw error

  const merged: Partial<OnboardingState> = {}
  for (const row of data ?? []) {
    // @ts-expect-error dynamic key
    merged[`step${row.step}`] = row.data
  }

  if (!merged.step1 || !merged.step2 || !merged.step3 || !merged.step4 || !merged.step5 || !merged.step6 || !merged.step7) {
    throw new Error("Tenant configuration incomplete — finish onboarding first")
  }

  const state = merged as OnboardingState
  return { state, files: generateAllFiles(state) }
}

/**
 * Build the common system-prompt preamble every agent uses.
 * Packs IDENTITY + product context + brand voice + GEO guidelines + rubric.
 */
export function buildSystemPreamble(files: Record<string, string>): string {
  const parts = [
    `# Engine role`,
    files["IDENTITY.md"] ?? "",
    ``,
    `# Product context`,
    files["aeo/context/product-context.md"] ?? files["product-context.md"] ?? "",
    ``,
    `# Brand voice`,
    files["aeo/context/brand-voice-guide.md"] ?? files["brand-voice-guide.md"] ?? "",
    ``,
    `# GEO guidelines`,
    files["aeo/context/aeo-guidelines.md"] ?? files["aeo-guidelines.md"] ?? "",
    ``,
    `# Scoring rubric`,
    files["aeo/context/aeo-scoring-rubric.md"] ?? files["aeo-scoring-rubric.md"] ?? "",
  ]
  return parts.filter(Boolean).join("\n")
}
