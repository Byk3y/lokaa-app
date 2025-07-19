import { log } from '@/utils/logger';
/**
 * Query Optimization Utility
 * Handles timeouts, retries, and fallback strategies for Supabase queries
 */

import { getSupabaseClient } from '@/integrations/supabase/client';

export interface QueryOptions {
  timeout?: number;
  retries?: number;
  fallbackValue?: any;
  cacheKey?: string;
}

/**
 * Enhanced query wrapper with timeout, retry, and fallback support
 */
export async function optimizedQuery<T>(
  queryFn: () => Promise<T>,
  options: QueryOptions = {}
): Promise<T> {
  const {
    timeout = 5000, // 5 second default timeout
    retries = 2,
    fallbackValue,
    cacheKey
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Query timeout after ${timeout}ms (attempt ${attempt + 1})`));
        }, timeout);
      });

      // Race between query and timeout
      const result = await Promise.race([queryFn(), timeoutPromise]);
      
      // Success - log if this was a retry
      if (attempt > 0 && import.meta.env.DEV) {
        log.debug('Utils', `✅ Query succeeded on attempt ${attempt + 1}${cacheKey ? ` for ${cacheKey}` : ''}`);
      }
      
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (import.meta.env.DEV) {
        log.warn('Utils', `⚠️ Query attempt ${attempt + 1} failed${cacheKey ? ` for ${cacheKey}` : ''}:`, lastError.message);
      }
      
      // If this is the last attempt, break
      if (attempt === retries) break;
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  // All attempts failed
  if (fallbackValue !== undefined) {
    if (import.meta.env.DEV) {
      log.warn('Utils', `🔄 Using fallback value${cacheKey ? ` for ${cacheKey}` : ''} after ${retries + 1} attempts`);
    }
    return fallbackValue;
  }

  // No fallback, throw the last error
  throw lastError || new Error('Query failed with unknown error');
}

/**
 * Optimized query for critical data with intelligent fallbacks
 */
export async function queryCriticalData<T>(
  queryFn: () => Promise<T>,
  fallbackValue: T,
  cacheKey?: string
): Promise<T> {
  return optimizedQuery(queryFn, {
    timeout: 3000, // Faster timeout for critical data
    retries: 1,    // Fewer retries for critical data
    fallbackValue,
    cacheKey
  });
}

/**
 * Optimized query for non-critical data with longer timeouts
 */
export async function queryNonCriticalData<T>(
  queryFn: () => Promise<T>,
  fallbackValue?: T,
  cacheKey?: string
): Promise<T> {
  return optimizedQuery(queryFn, {
    timeout: 8000, // Longer timeout for non-critical data
    retries: 3,    // More retries for non-critical data
    fallbackValue,
    cacheKey
  });
}

/**
 * Health check utility to test database connectivity
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const { error } = await getSupabaseClient()
      .from('users')
      .select('id')
      .limit(1)
      .maybeSingle();
    
    return !error;
  } catch {
    return false;
  }
}

/**
 * Connection recovery utility
 */
export async function recoverConnection(): Promise<boolean> {
  try {
    // Force a new session check
    await getSupabaseClient().auth.getSession();
    
    // Test with a simple query
    return await checkDatabaseHealth();
  } catch {
    return false;
  }
} 