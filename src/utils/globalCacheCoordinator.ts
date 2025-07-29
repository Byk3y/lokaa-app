/**
 * Updated stub for globalCacheCoordinator
 * 
 * The complex global cache coordinator was removed in Phase 3A.
 * This stub provides backward compatibility for existing imports.
 * 
 * PHASE 3A FIX: Added missing methods that hooks were trying to use.
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import { log } from '@/utils/logger';

// Simple in-memory cache for backward compatibility
const memoryCache = new Map<string, { data: any; timestamp: number; subscribers: Set<string> }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Enhanced cache stub with missing methods
export const globalCache = {
  warm: () => {},
  
  get: async (key: string, fetcher: () => Promise<any>, subscriberId?: string, options?: { maxAge?: number }) => {
    const cached = memoryCache.get(key);
    const now = Date.now();
    const maxAge = options?.maxAge || CACHE_TTL;
    
    // Return cached data if still valid
    if (cached && (now - cached.timestamp) < maxAge) {
      if (subscriberId) {
        cached.subscribers.add(subscriberId);
      }
      return cached.data;
    }
    
    // Fetch new data
    try {
      const data = await fetcher();
      const subscribers = new Set<string>();
      if (subscriberId) {
        subscribers.add(subscriberId);
      }
      
      memoryCache.set(key, {
        data,
        timestamp: now,
        subscribers
      });
      
      return data;
    } catch (error) {
      log.error('Cache', `Failed to fetch data for key ${key}:`, error);
      return cached?.data || null;
    }
  },
  
  set: (key: string, data: any) => {
    memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      subscribers: new Set()
    });
  },
  
  invalidate: (key: string) => {
    memoryCache.delete(key);
  },
  
  // PHASE 3A FIX: Add missing invalidatePattern method
  invalidatePattern: (pattern: string) => {
    const keysToDelete = Array.from(memoryCache.keys()).filter(key => key.includes(pattern));
    keysToDelete.forEach(key => memoryCache.delete(key));
    log.debug('Cache', `Invalidated ${keysToDelete.length} cache entries matching pattern: ${pattern}`);
  },
  
  // PHASE 3A FIX: Add missing getCachedData method
  getCachedData: <T>(key: string): T | null => {
    const cached = memoryCache.get(key);
    if (!cached) return null;
    
    const now = Date.now();
    if ((now - cached.timestamp) > CACHE_TTL) {
      memoryCache.delete(key);
      return null;
    }
    
    return cached.data as T;
  },
  
  // PHASE 3A FIX: Add missing unsubscribe method
  unsubscribe: (key: string, subscriberId: string) => {
    const cached = memoryCache.get(key);
    if (cached) {
      cached.subscribers.delete(subscriberId);
      // If no more subscribers, we could optionally clean up the cache entry
      // but for simplicity, we'll keep the data for potential reuse
    }
    log.debug('Cache', `Unsubscribed ${subscriberId} from cache key: ${key}`);
  },
  
  clear: () => {
    memoryCache.clear();
  }
};

// Enhanced query cache stub with actual implementations
export const cacheQueries = {
  // PHASE 3A FIX: Add missing categories method
  categories: async (spaceId: string, subscriberId: string): Promise<any[]> => {
    const key = `categories:${spaceId}`;
    
    return globalCache.get(
      key,
      async () => {
        const { data, error } = await getSupabaseClient()
          .from('space_categories')
          .select('id, name, icon, created_at, is_archived, space_id, created_by')
          .eq('space_id', spaceId)
          .eq('is_archived', false)
          .order('name');
          
        if (error) {
          log.error('Cache', `Failed to fetch categories for space ${spaceId}:`, error);
          throw error;
        }
        
        return data || [];
      },
      subscriberId
    );
  },
  
  // PHASE 3A FIX: Add missing posts method
  posts: async (spaceId: string, subscriberId: string, page: number = 1, limit: number = 25): Promise<any[]> => {
    const key = `posts:${spaceId}:${page}:${limit}`;
    
    return globalCache.get(
      key,
      async () => {
        const offset = (page - 1) * limit;
        
        const { data, error } = await getSupabaseClient()
          .from('posts')
          .select(`
            id, created_at, content, title, like_count, comment_count, 
            user_id, space_id, media_urls, category_id, is_pinned, 
            pinned_at, pin_position, pin_category, edited_at, poll_data, slug
          `)
          .eq('space_id', spaceId)
          .eq('is_pinned', false)
          .neq('post_type', 'course_page')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
          
        if (error) {
          log.error('Cache', `Failed to fetch posts for space ${spaceId}:`, error);
          throw error;
        }
        
        return data || [];
      },
      subscriberId
    );
  },
  
  post: () => null,
  comment: () => null,
  user: () => null
};

// No-op functions for backward compatibility
export const warmGlobalCache = () => {};
export const initializeGlobalCache = () => {};
export const cleanupGlobalCache = () => {};