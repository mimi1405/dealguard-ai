import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

const isPreview =
  typeof window !== 'undefined' &&
  window.location.hostname.includes('webcontainer')

export const createClient = () => {
  if (client) return client

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: !isPreview, // 🔥 KEY LINE
        persistSession: true,
        detectSessionInUrl: true,
      },
    }
  )

  console.debug('[Supabase] client init', { isPreview })

  return client
}
