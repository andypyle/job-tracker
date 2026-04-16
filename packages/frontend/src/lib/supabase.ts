import { createClient } from '@supabase/supabase-js'

declare global {
  interface Window { __env__?: Record<string, string> }
}

const supabaseUrl = window.__env__?.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = window.__env__?.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env',
  )
}

/**
 * Supabase client — used for auth state only.
 * All data fetching goes through the FastAPI backend via lib/api.ts.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
