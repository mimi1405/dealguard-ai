// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

declare global {
  // eslint-disable-next-line no-var
  var __supabaseBrowserClient: SupabaseClient | undefined
  // eslint-disable-next-line no-var
  var __supabaseAuthListenerInitialized: boolean | undefined
}

export function createClient() {
  if (typeof window === 'undefined') {
    throw new Error('createClient() must be called in the browser')
  }

  if (!globalThis.__supabaseBrowserClient) {
    globalThis.__supabaseBrowserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    console.debug('[Supabase] Browser client initialized (global singleton)')
  }

  const client = globalThis.__supabaseBrowserClient

  if (!globalThis.__supabaseAuthListenerInitialized) {
    globalThis.__supabaseAuthListenerInitialized = true
    client.auth.onAuthStateChange((event, session) => {
      console.debug('[Supabase Auth]', event, session ? 'session present' : 'no session')
    })
  }

  return client
}