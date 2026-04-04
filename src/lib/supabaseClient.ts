import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

/** Returns null if VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing */
export function getSupabase(): SupabaseClient | null {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
  const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()
  if (!url || !key) return null
  if (!client) {
    client = createClient(url, key)
  }
  return client
}
