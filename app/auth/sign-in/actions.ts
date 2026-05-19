"use server"

import { headers } from "next/headers"
import { isDevBypass } from "@/lib/persist-local"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function sendMagicLink(
  email: string,
  next: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isDevBypass()) return { ok: true }

  try {
    const supabase = await getSupabaseServerClient()
    const hdrs = await headers()
    const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000"
    const proto = hdrs.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")
    const origin = `${proto}://${host}`
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unable to send magic link" }
  }
}
