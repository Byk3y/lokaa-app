import { log } from '@/utils/logger';
// HMR-Safe Supabase Client - Prevents Multiple GoTrueClient Instances
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

let supabaseClient: ReturnType<typeof createClient<Database>> | null = null;

const getSupabaseClient = () => {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Check your .env file.');
  }

  supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Recommended to be false for security reasons, handle manually if needed
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'lokaa-auth-token',
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
      // Ensure WebSocket uses secure connection
      transport: 'websocket',
      timeout: 30000,
    },
    global: {
      headers: {
        'X-Client-Info': 'lokaa-web-app',
      },
    },
  });

  return supabaseClient;
};

// Singleton instance for the client
const supabase = getSupabaseClient();

// Named export for the client instance
export { supabase };

// Default export for convenience
export default supabase;

// The initializeSupabase function from the original App.tsx can now live here
let isInitialized = false;
export const initializeSupabase = () => {
  if (isInitialized) {
    if (import.meta.env.DEV) {
      log.debug('App', 'Supabase client already initialized.');
    }
    return;
  }
  
  if (import.meta.env.DEV) {
    log.debug('App', 'Initializing Supabase client...');
  }
  
  getSupabaseClient();
  isInitialized = true;
};

// A re-export of the getter function in case it's needed for specific scenarios,
// though direct import of the `supabase` instance is preferred.
export { getSupabaseClient };

// Make Supabase client available globally for testing (development only)
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).supabase = supabase;
  (window as any)._supabaseClient = supabase;
}