import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

/** Browser client; null when URL/key are not configured (e.g. local dev without .env) */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null

export function isSupabaseAvailable(): boolean {
  return supabase !== null
}
