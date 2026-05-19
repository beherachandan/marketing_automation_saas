import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { isDevBypass } from "@/lib/persist-local"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  if (!isDevBypass()) {
    try {
      const supabase = await getSupabaseServerClient()
      await supabase.auth.signOut()
    } catch {
      // ignore — we're redirecting regardless
    }
  }
  return NextResponse.redirect(new URL("/auth/sign-in", req.url))
}

export async function GET(req: NextRequest) {
  return POST(req)
}
