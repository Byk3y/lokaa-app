import { create } from 'zustand';
import { getSupabaseClient } from '@/integrations/supabase/client';

// Types for cached posts
interface GoodCategoryType {
  id: string;
  name: string;
  icon?: string | null;
}

export interface CachedPostType {
  id: string;
  created_at: string | null;
  content: string;
  title: string | null;
  like_count: number | null;
  comment_count: number | null;
  user_id: string;
  space_id: string;
  media_urls?: string[] | null;
  category: GoodCategoryType | null;
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    profile_url: string | null;
    activity_score?: number | null;
  } | null; 
  is_pinned?: boolean;
  pinned_at?: string | null;
  pin_position?: number | null;
  pin_category?: string | null;
  edited_at?: string | null;
  poll_data?: string[] | null;
  slug?: string | null;
}

interface CacheEntry {
  posts: CachedPostType[];
  pinnedPosts: CachedPostType[];
  lastFetched: number;
  loading: boolean;
  error: string | null;
  // Pagination metadata
  totalCount: number;
  currentPage: number;
  hasNextPage: boolean;
  postsPerPage: number;
}

interface PostsCacheState {
  cache: Map<string, CacheEntry>;
  
  // Actions
  fetchPosts: (spaceId: string, forceRefresh?: boolean, page?: number, limit?: number) => Promise<void>;
  updatePost: (spaceId: string, postId: string, updates: Partial<CachedPostType>) => void;
  deletePost: (spaceId: string, postId: string) => void;
  addPost: (spaceId: string, post: CachedPostType) => void;
  updateLikeCount: (spaceId: string, postId: string, newLikeCount: number) => void;
  updateCommentCount: (spaceId: string, postId: string, newCommentCount: number) => void;
  togglePin: (spaceId: string, postId: string, isPinned: boolean, pinPosition?: number) => void;
  clearCache: (spaceId?: string) => void;
  
  // Getters
  getPosts: (spaceId: string) => CachedPostType[];
  getPinnedPosts: (spaceId: string) => CachedPostType[];
  isLoading: (spaceId: string) => boolean;
  getError: (spaceId: string) => string | null;
  isStale: (spaceId: string, maxAgeMs?: number) => boolean;
  // Pagination getters
  getTotalCount: (spaceId: string) => number;
  getCurrentPage: (spaceId: string) => number;
  getHasNextPage: (spaceId: string) => boolean;
  getTotalPages: (spaceId: string) => number;
}

const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_ENTRIES = 10; // Limit cache size

// Declare global mobile connection manager
declare global {
  interface Window {
    mobileConnectionManager?: any;
  }
}

export const usePostsCache = create<PostsCacheState>((set, get) => ({
  cache: new Map(),

  fetchPosts: async (spaceId: string, forceRefresh = false, page = 1, limit = 25) => {
    // CRITICAL FIX: Don't attempt to fetch with invalid space IDs
    if (!spaceId || spaceId.startsWith('fallback-') || spaceId === 'fallback-id') {
      console.warn(`⚠️ [PostsCache] Invalid space ID provided: ${spaceId} - skipping fetch to prevent database errors`);
      return;
    }
    
    const { cache } = get();
    const entry = cache.get(spaceId);
    
    // Check if we should use cached data (only for page 1)
    if (!forceRefresh && page === 1 && entry && !get().isStale(spaceId)) {
      console.log('📦 Using cached posts for space:', spaceId);
      return; // Use cached data
    }

    // MOBILE SAFARI HARD REFRESH FIX: Simple deduplication
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     window.innerWidth <= 768;
    
    // ENHANCED: More precise hard refresh detection - only trigger on actual page refreshes
    // Check multiple indicators to ensure this is a real hard refresh, not just navigation
    const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const isActualHardRefresh = isMobile && (
      (performance.navigation?.type === 1) || // Old API: reload type
      (navigationTiming && navigationTiming.type === 'reload') // New API: reload type
    );
    
    // CRITICAL: Always apply query deduplication to prevent duplicate database calls
    // This prevents multiple components from triggering the same query simultaneously
    const shouldApplyQueryDeduplication = true; // ENABLED: Prevents duplicate queries and timeouts
    
        // Apply query deduplication to prevent duplicate database calls
    const lockKey = `posts_${spaceId}_${page}_${limit}`;
    if ((window as any).__postsLocks?.[lockKey]) {
      console.log('🔒 [PostsCache] Query already in progress, skipping duplicate');
      return;
    }
    
    (window as any).__postsLocks = (window as any).__postsLocks || {};
    (window as any).__postsLocks[lockKey] = true;
    
    try {
      await executeActualFetch();
    } finally {
      delete (window as any).__postsLocks[lockKey];
    }
    
    async function executeActualFetch() {
    // Set loading state
    const newCache = new Map(cache);
    newCache.set(spaceId, {
      ...entry,
      loading: true,
      error: null,
      posts: entry?.posts || [],
      pinnedPosts: entry?.pinnedPosts || [],
      lastFetched: entry?.lastFetched || 0,
      totalCount: entry?.totalCount || 0,
      currentPage: page,
      hasNextPage: entry?.hasNextPage || false,
      postsPerPage: limit,
    });
    set({ cache: newCache });

    try {
      console.log('🔄 Fetching posts from Supabase for space:', spaceId, `(page ${page}, limit ${limit})`);
      
        // POST-OUTAGE FIX: Realistic timeout for complex post queries
        const QUERY_TIMEOUT = 15000; // Increased to 15 seconds for complex post queries with joins
        
        console.log('🔍 [PostsCache] DEBUG:', {
          userAgent: navigator.userAgent,
          windowWidth: window.innerWidth,
          finalTimeout: QUERY_TIMEOUT
        });
      
      const createTimeoutPromise = (operation: string) => new Promise<never>((_, reject) => {
          const startTime = Date.now();
        setTimeout(() => {
            const elapsedTime = Date.now() - startTime;
            console.error(`❌ [PostsCache] ${operation} timeout for space: ${spaceId} after ${elapsedTime}ms`);
          reject(new Error(`${operation} timeout`));
        }, QUERY_TIMEOUT);
      });
      
      let totalCount = 0;
      let postsData: any[] | null = null;
      
        // Use optimized query with shorter timeout for count
        // CRITICAL FIX: Only count non-pinned posts for pagination since pinned posts don't paginate
        const countQuery = () => getSupabaseClient()
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('space_id', spaceId)
          .eq('is_pinned', false); // Only count regular posts for pagination
          
        const { count, error: countError } = await Promise.race([
          countQuery(),
          createTimeoutPromise('Count query')
        ]);
          
        if (countError) throw countError;
        totalCount = count || 0;
        console.log(`📊 Total paginatable posts count for space ${spaceId}:`, totalCount);
        
        const offset = (page - 1) * limit;
        const postsQuery = getSupabaseClient()
          .from('posts')
          .select('id, created_at, content, title, like_count, comment_count, user_id, space_id, media_urls, category_id, is_pinned, pinned_at, pin_position, pin_category, edited_at, poll_data, slug')
          .eq('space_id', spaceId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
          
        const { data, error: postsFetchError } = await Promise.race([
          postsQuery,
          createTimeoutPromise('Posts query')
        ]);
          
        if (postsFetchError) throw postsFetchError;
        postsData = data as any[] | null;

        // Process posts
        if (!postsData) {
          postsData = [];
        }

        // Get categories for categorization
        const { data: categoriesData } = await getSupabaseClient()
          .from('space_categories')
          .select('id, name')
          .eq('space_id', spaceId);

        const categoriesMap = new Map<string, any>();
        if (categoriesData) {
          categoriesData.forEach(cat => {
            categoriesMap.set(cat.id, cat);
          });
        }

        // Get authors info
        const userIds = [...new Set(postsData.map(post => post.user_id))];
        const { data: authorsData } = await getSupabaseClient()
          .from('users')
          .select('id, full_name, avatar_url, profile_url, activity_score')
          .in('id', userIds);
          
        const authorsMap = new Map<string, any>();
        if (authorsData) {
            authorsData.forEach(author => {
            authorsMap.set(author.id, author);
          });
        }

        // Process posts and separate pinned from regular
        const processedPosts: CachedPostType[] = [];
        const processedPinnedPosts: CachedPostType[] = [];

        postsData.forEach(post => {
          const processedPost: CachedPostType = {
          id: post.id,
          created_at: post.created_at,
          content: post.content,
          title: post.title,
            like_count: post.like_count || 0,
            comment_count: post.comment_count || 0,
          user_id: post.user_id,
          space_id: post.space_id,
            media_urls: post.media_urls,
            category: post.category_id ? categoriesMap.get(post.category_id) || null : null,
            author: authorsMap.get(post.user_id) || null,
          is_pinned: post.is_pinned || false,
          pinned_at: post.pinned_at,
          pin_position: post.pin_position,
          pin_category: post.pin_category,
          edited_at: post.edited_at,
          poll_data: post.poll_data,
          slug: post.slug,
          };

          if (processedPost.is_pinned) {
            processedPinnedPosts.push(processedPost);
          } else {
            processedPosts.push(processedPost);
          }
        });

      // Calculate pagination metadata
        const hasNextPage = page * limit < totalCount;

        // CRITICAL FIX: Preserve pinned posts across all pages
        // Pinned posts should always be visible regardless of pagination
        const finalCache = new Map(get().cache);
        const existingEntry = finalCache.get(spaceId);
        
        // If this is page 1, use the newly fetched pinned posts
        // If this is page 2+, preserve existing pinned posts from page 1
        const finalPinnedPosts = page === 1 ? processedPinnedPosts : (existingEntry?.pinnedPosts || processedPinnedPosts);
        
        finalCache.set(spaceId, {
          posts: processedPosts, // Only regular posts for current page
          pinnedPosts: finalPinnedPosts, // Always preserve pinned posts
        loading: false,
        error: null,
        lastFetched: Date.now(),
          totalCount,
        currentPage: page,
          hasNextPage,
        postsPerPage: limit,
      });
        set({ cache: finalCache });

        console.log(`✅ Posts loaded for space ${spaceId}:`, processedPosts.length, 'regular,', processedPinnedPosts.length, 'pinned');
        
        // MOBILE TIMEOUT RECOVERY: Save successful data to persistent cache for fallback
        try {
          const fallbackData = {
            posts: processedPosts,
            pinnedPosts: processedPinnedPosts,
            totalCount,
            hasNextPage,
            timestamp: Date.now()
          };
          const persistentCacheKey = `posts_fallback_${spaceId}`;
          localStorage.setItem(persistentCacheKey, JSON.stringify({ data: fallbackData, timestamp: Date.now() }));
          console.log('💾 [PostsCache] Saved fallback cache for future timeouts');
        } catch (cacheError) {
          console.warn('⚠️ [PostsCache] Failed to save fallback cache:', cacheError);
        }

      } catch (error) {
        console.error('❌ Error fetching posts:', error);
        
        // MOBILE TIMEOUT RECOVERY: Try to load from persistent cache
        const isTimeoutError = error?.message?.includes('timeout');
        let fallbackData = null;
        
        if (isTimeoutError) {
          console.log('🔄 [PostsCache] Timeout detected, attempting fallback cache recovery...');
          try {
            const persistentCacheKey = `posts_fallback_${spaceId}`;
            const cachedData = localStorage.getItem(persistentCacheKey);
            if (cachedData) {
              const parsed = JSON.parse(cachedData);
              const cacheAge = Date.now() - parsed.timestamp;
              const maxFallbackAge = 24 * 60 * 60 * 1000; // 24 hours
              
              if (cacheAge < maxFallbackAge) {
                fallbackData = parsed.data;
                console.log(`✅ [PostsCache] Using fallback cache data (${Math.round(cacheAge / 60000)} minutes old)`);
              }
            }
          } catch (cacheError) {
            console.warn('⚠️ [PostsCache] Fallback cache read failed:', cacheError);
          }
        }
        
        let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        // If we have fallback data, use it and soften the error message
        if (fallbackData) {
          const finalFallbackCache = new Map(get().cache);
          const existingFallbackEntry = finalFallbackCache.get(spaceId);
          
          // CRITICAL FIX: Also preserve pinned posts in fallback recovery
          const fallbackPinnedPosts = page === 1 ? (fallbackData.pinnedPosts || []) : (existingFallbackEntry?.pinnedPosts || fallbackData.pinnedPosts || []);
          
          finalFallbackCache.set(spaceId, {
            posts: fallbackData.posts || [],
            pinnedPosts: fallbackPinnedPosts, // Preserve pinned posts in fallback too
            loading: false,
            error: null, // Clear error since we have fallback data
            lastFetched: Date.now(),
            totalCount: fallbackData.totalCount || 0,
            currentPage: page,
            hasNextPage: fallbackData.hasNextPage || false,
            postsPerPage: limit,
          });
          set({ cache: finalFallbackCache });
          
          console.log('📦 [PostsCache] Successfully recovered from fallback cache');
          return; // Exit early with fallback data
        }
        
        // No fallback available, show error
        const finalErrorCache = new Map(get().cache);
        finalErrorCache.set(spaceId, {
          ...entry,
        loading: false,
        error: errorMessage,
          posts: entry?.posts || [],
          pinnedPosts: entry?.pinnedPosts || [],
          lastFetched: entry?.lastFetched || 0,
          totalCount: entry?.totalCount || 0,
        currentPage: page,
          hasNextPage: entry?.hasNextPage || false,
        postsPerPage: limit,
      });
        set({ cache: finalErrorCache });
      }
    }
  },

  updatePost: (spaceId: string, postId: string, updates: Partial<CachedPostType>) => {
    const { cache } = get();
    const entry = cache.get(spaceId);
    if (!entry) return;

    const updatePostInArray = (posts: CachedPostType[]) => 
      posts.map(post => post.id === postId ? { ...post, ...updates } : post);

    const newCache = new Map(cache);
    newCache.set(spaceId, {
      ...entry,
      posts: updatePostInArray(entry.posts),
      pinnedPosts: updatePostInArray(entry.pinnedPosts),
    });
    set({ cache: newCache });
  },

  deletePost: (spaceId: string, postId: string) => {
    const { cache } = get();
    const entry = cache.get(spaceId);
    if (!entry) return;

    const newCache = new Map(cache);
    newCache.set(spaceId, {
      ...entry,
      posts: entry.posts.filter(post => post.id !== postId),
      pinnedPosts: entry.pinnedPosts.filter(post => post.id !== postId),
    });
    set({ cache: newCache });
  },

  addPost: (spaceId: string, post: CachedPostType) => {
    const { cache } = get();
    const entry = cache.get(spaceId);
    
    if (!entry) {
      // If no cache entry exists, create one with this post
      const newCache = new Map(cache);
      newCache.set(spaceId, {
        posts: post.is_pinned ? [] : [post],
        pinnedPosts: post.is_pinned ? [post] : [],
        loading: false,
        error: null,
        lastFetched: Date.now(),
        totalCount: 1,
        currentPage: 1,
        hasNextPage: false,
        postsPerPage: 25,
      });
      set({ cache: newCache });
      return;
    }

    const newCache = new Map(cache);
    if (post.is_pinned) {
      newCache.set(spaceId, {
        ...entry,
        pinnedPosts: [post, ...entry.pinnedPosts],
      });
    } else {
      newCache.set(spaceId, {
        ...entry,
        posts: [post, ...entry.posts],
      });
    }
    set({ cache: newCache });
  },

  updateLikeCount: (spaceId: string, postId: string, newLikeCount: number) => {
    get().updatePost(spaceId, postId, { like_count: newLikeCount });
  },

  updateCommentCount: (spaceId: string, postId: string, newCommentCount: number) => {
    get().updatePost(spaceId, postId, { comment_count: newCommentCount });
  },

  togglePin: (spaceId: string, postId: string, isPinned: boolean, pinPosition?: number) => {
    const { cache } = get();
    const entry = cache.get(spaceId);
    if (!entry) return;

    let post = entry.posts.find(p => p.id === postId) || entry.pinnedPosts.find(p => p.id === postId);
    if (!post) return;

    const updatedPost = {
      ...post,
      is_pinned: isPinned,
      pin_position: pinPosition || null,
      pinned_at: isPinned ? new Date().toISOString() : null,
    };

    const newCache = new Map(cache);
    if (isPinned) {
      newCache.set(spaceId, {
        ...entry,
        posts: entry.posts.filter(p => p.id !== postId),
        pinnedPosts: [...entry.pinnedPosts.filter(p => p.id !== postId), updatedPost]
          .sort((a, b) => (a.pin_position || 0) - (b.pin_position || 0)),
      });
    } else {
      newCache.set(spaceId, {
        ...entry,
        posts: [updatedPost, ...entry.posts.filter(p => p.id !== postId)],
        pinnedPosts: entry.pinnedPosts.filter(p => p.id !== postId),
      });
    }
    set({ cache: newCache });
  },

  clearCache: (spaceId?: string) => {
    const { cache } = get();
    if (spaceId) {
      const newCache = new Map(cache);
      newCache.delete(spaceId);
      set({ cache: newCache });
    } else {
      set({ cache: new Map() });
    }
  },

  // Getters
  getPosts: (spaceId: string) => {
    const entry = get().cache.get(spaceId);
    return entry?.posts || [];
  },

  getPinnedPosts: (spaceId: string) => {
    const entry = get().cache.get(spaceId);
    return entry?.pinnedPosts || [];
  },

  isLoading: (spaceId: string) => {
    const entry = get().cache.get(spaceId);
    return entry?.loading || false;
  },

  getError: (spaceId: string) => {
    const entry = get().cache.get(spaceId);
    return entry?.error || null;
  },

  isStale: (spaceId: string, maxAgeMs = CACHE_MAX_AGE) => {
    const entry = get().cache.get(spaceId);
    if (!entry) return true;
    return Date.now() - entry.lastFetched > maxAgeMs;
  },

  // Pagination getters
  getTotalCount: (spaceId: string) => {
    const entry = get().cache.get(spaceId);
    return entry?.totalCount || 0;
  },

  getCurrentPage: (spaceId: string) => {
    const entry = get().cache.get(spaceId);
    return entry?.currentPage || 1;
  },

  getHasNextPage: (spaceId: string) => {
    const entry = get().cache.get(spaceId);
    return entry?.hasNextPage || false;
  },

  getTotalPages: (spaceId: string) => {
    const entry = get().cache.get(spaceId);
    return Math.ceil(entry?.totalCount / entry?.postsPerPage) || 1;
  },
}));