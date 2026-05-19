"use server"

import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function verifyOtp(
  email: string,
  token: string,
  _next: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await getSupabaseServerClient()
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Verification failed" }
  }
}
