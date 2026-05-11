import { createClient } from "@supabase/supabase-js"

/**
 * Service-role client. Bypasses RLS.
 * Use only in server routes that handle Slack OAuth, cron jobs, and background runs.
 */
export function getSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Supabase service env missing")
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
