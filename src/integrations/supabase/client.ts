import { log } from '@/utils/logger';
// HMR-Safe Supabase Client - Prevents Multiple GoTrueClient Instances
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

let supabaseClient: ReturnType<typeof createClient<Database>> | null = null;

// Connection monitoring with exponential backoff
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 5;
const CONNECTION_RESET_INTERVAL = 5 * 60 * 1000; // 5 minutes
const BASE_BACKOFF_DELAY = 1000; // 1 second
const MAX_BACKOFF_DELAY = 30000; // 30 seconds

// Circuit breaker state
let circuitBreakerOpen = false;
let circuitBreakerResetTime = 0;
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute

const getSupabaseClient = () => {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Check your .env file.');
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true, // Enable automatic session detection from URL fragments for OAuth
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'lokaa-auth-token',
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
      // Enhanced realtime configuration for better connection stability
      heartbeatIntervalMs: 30000, // 30 seconds
      reconnectAfterMs: (tries: number) => Math.min(tries * 1000, 30000), // Exponential backoff, max 30s
      timeout: 20000, // 20 second timeout
    },
    global: {
      headers: {
        'X-Client-Info': 'lokaa-web-app',
      },
      // Add fetch configuration for better network handling with circuit breaker
      fetch: async (input: RequestInfo | URL, init: RequestInit = {}) => {
        // Check circuit breaker
        if (circuitBreakerOpen) {
          if (Date.now() < circuitBreakerResetTime) {
            throw new Error('Circuit breaker open - requests temporarily blocked');
          } else {
            // Reset circuit breaker after timeout
            circuitBreakerOpen = false;
            connectionAttempts = 0;
            log.info('Supabase', 'Circuit breaker reset - resuming requests');
          }
        }
        
        // Exponential backoff for failed requests
        const backoffDelay = connectionAttempts > 0 
          ? Math.min(BASE_BACKOFF_DELAY * Math.pow(2, connectionAttempts - 1), MAX_BACKOFF_DELAY)
          : 0;
          
        if (backoffDelay > 0) {
          log.debug('Supabase', `Applying backoff delay: ${backoffDelay}ms (attempt ${connectionAttempts})`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
        
        // Make the request with timeout
        const originalFetch = fetch(input, {
          ...init,
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });

        return originalFetch.then(response => {
          // Handle successful responses
          if (response.ok) {
            connectionAttempts = 0;
            return response;
          }
          
          // Handle resource exhaustion errors
          if (response.status === 429 || response.status === 503 || 
              response.status === 0 || (response.status >= 500 && response.status < 600)) {
            connectionAttempts++;
            log.warn('Supabase', `Resource/server error detected (${response.status}) - attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS}`);
            
            // Open circuit breaker if too many failures
            if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
              circuitBreakerOpen = true;
              circuitBreakerResetTime = Date.now() + CIRCUIT_BREAKER_TIMEOUT;
              log.error('Supabase', 'Circuit breaker opened - blocking requests for 1 minute');
              resetSupabaseClient();
            }
          }
          
          return response;
        }).catch(error => {
          // Handle network errors with exponential backoff
          connectionAttempts++;
          
          if (error.name === 'AbortError') {
            log.warn('Supabase', `Request timeout (attempt ${connectionAttempts}) - applying backoff`);
          } else if (error.message?.includes('insufficient') || error.message?.includes('resources')) {
            log.warn('Supabase', `Resource error detected (attempt ${connectionAttempts}) - applying backoff`);
          } else {
            log.warn('Supabase', `Network error (attempt ${connectionAttempts}):`, error.message);
          }
          
          // Open circuit breaker on repeated failures
          if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
            circuitBreakerOpen = true;
            circuitBreakerResetTime = Date.now() + CIRCUIT_BREAKER_TIMEOUT;
            log.error('Supabase', 'Circuit breaker opened due to repeated failures');
          }
          
          throw error;
        });
      },
    },
  });

  // Set up periodic connection reset to prevent resource buildup
  if (typeof window !== 'undefined') {
    setInterval(() => {
      if (connectionAttempts > 0) {
        log.debug('Supabase', 'Periodic connection reset check');
        connectionAttempts = 0;
      }
    }, CONNECTION_RESET_INTERVAL);
  }

  return supabaseClient;
};

// Function to reset the Supabase client
const resetSupabaseClient = () => {
  if (supabaseClient) {
    // Clean up any existing connections
    try {
      supabaseClient.removeAllChannels();
    } catch (error) {
      log.warn('Supabase', 'Error cleaning up channels during reset:', error);
    }
    
    supabaseClient = null;
    connectionAttempts = 0;
    
    log.info('Supabase', 'Client reset completed');
  }
};

// Singleton instance for the client
const supabase = getSupabaseClient();

// Named export for the client instance
export { supabase };

// Default export for convenience
export default supabase;

// Export reset function for manual client reset
export { resetSupabaseClient };

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