import { createClient } from '@supabase/supabase-js'

/**
 * Shared Supabase browser client (Auth: e.g. update password).
 *
 * Invoice lists and dashboard data use REST via `src/lib/api.ts`, not this client.
 *
 * Set your Project URL and anon (public) key from Supabase → Project Settings → API.
 * The anon key is safe to ship in frontend code; keep the service role key server-only.
 */
const SUPABASE_URL = ''
const SUPABASE_ANON_KEY = ''

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
