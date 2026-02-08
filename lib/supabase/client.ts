import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
let authListenerInitialized = false;

export const createClient = () => {
  if (client) {
    return client;
  }

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  if (typeof window !== 'undefined') {
    console.debug('[Supabase] Browser client initialized (singleton)');

    if (!authListenerInitialized) {
      authListenerInitialized = true;
      client.auth.onAuthStateChange((event, session) => {
        console.debug('[Supabase Auth]', event, session ? 'session present' : 'no session');
      });
    }
  }

  return client;
};
