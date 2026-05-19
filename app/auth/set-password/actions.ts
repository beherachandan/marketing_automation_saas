"use server"

import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function setPassword(
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await getSupabaseServerClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to set password" }
  }
}
