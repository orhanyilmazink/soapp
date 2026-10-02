import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const hasRealCredentials = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('example.supabase.co') &&
  !supabaseUrl.includes('your-project') &&
  !supabaseAnonKey.startsWith('demo-') &&
  !supabaseAnonKey.includes('your-anon-key')
)

export const supabase =
  hasRealCredentials && supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    : null
