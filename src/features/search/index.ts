import { getSupabaseClient } from '@/integrations/supabase/client';
import { searchPerformanceMonitor } from '@/features/search/utils/searchPerformance';
import { devLogger } from '@/utils/developmentLogger';
import type { SearchResult, SearchFilters } from '@/features/search/types';

// Core search functionality - Vercel deployment fix
export { usePostSearch } from '@/features/search/hooks/usePostSearch';
export { useSearchIntegration } from '@/features/search/hooks/useSearchIntegration';
export { useSearchURLSync } from '@/features/search/hooks/useSearchURLSync';

// Search utilities
export { searchPerformanceMonitor } from '@/features/search/utils/searchPerformance';

// Components
export { SearchPerformanceDashboard } from '@/features/search/components/SearchPerformanceDashboard';
export { SearchFilters as SearchFiltersComponent } from '@/features/search/components/SearchFilters';
export { MobileSearchOverlay } from '@/features/search/components/MobileSearchOverlay';

// Types
export type {
  SearchResult,
  SearchFilters,
  SearchState,
  SearchSuggestion,
  SearchType
} from '@/features/search/types';

// SearchAPI class - moved inline to fix Vercel deployment issues
export class SearchAPI {
  private supabase = getSupabaseClient();
  private cache = new Map<string, { data: SearchResult[]; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  // Advanced caching with TTL and invalidation
  private advancedCache = new Map<string, {
    data: SearchResult[];
    timestamp: number;
    ttl: number;
    accessCount: number;
    lastAccessed: number;
  }>();
  
  // Request deduplication
  private pendingRequests = new Map<string, Promise<SearchResult[]>>();
  
  // AbortController for cancelling stale requests
  private currentAbortController: AbortController | null = null;

  // Performance monitoring
  private performanceMetrics = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageResponseTime: 0,
    totalResponseTime: 0,
  };

  async searchPostsInSpace(
    spaceId: string,
    query: string,
    filters?: SearchFilters
  ): Promise<SearchResult[]> {
    const cacheKey = `posts:${spaceId}:${query}:${JSON.stringify(filters)}`;
    
    // Start performance monitoring
    const searchId = searchPerformanceMonitor.startSearch(query, spaceId);
    const startTime = performance.now();
    
    // Check for pending request with same parameters
    if (this.pendingRequests.has(cacheKey)) {
      devLogger.log('SearchAPI', 'Returning pending request for:', cacheKey);
      // Complete monitoring for cached request
      searchPerformanceMonitor.completeSearch(searchId, 0, true);
      this.performanceMetrics.cacheHits++;
      return this.pendingRequests.get(cacheKey)!;
    }

    // Check advanced cache first
    const cachedResult = this.getFromAdvancedCache(cacheKey);
    if (cachedResult) {
      devLogger.log('SearchAPI', 'Cache hit for:', cacheKey);
      searchPerformanceMonitor.completeSearch(searchId, cachedResult.length, true);
      this.performanceMetrics.cacheHits++;
      return cachedResult;
    }

    // Cancel any existing request
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }

    // Create new AbortController for this request
    this.currentAbortController = new AbortController();

    // Create the request promise
    const requestPromise = this.performOptimizedSearch(spaceId, query, filters, cacheKey, searchId, startTime);
    
    // Store the pending request
    this.pendingRequests.set(cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Clean up pending request
      this.pendingRequests.delete(cacheKey);
    }
  }

  private async performOptimizedSearch(
    spaceId: string,
    query: string,
    filters?: SearchFilters,
    cacheKey?: string,
    searchId?: string,
    startTime?: number
  ): Promise<SearchResult[]> {
    const shouldCache = query.length >= 2 && !filters?.noCache;
    
    // Check cache first
    if (shouldCache && cacheKey) {
      const cached = this.getFromAdvancedCache(cacheKey);
      if (cached) {
        if (searchId) {
          searchPerformanceMonitor.completeSearch(searchId, cached.length, true);
        }
        this.performanceMetrics.cacheHits++;
        return cached;
      }
    }

    this.performanceMetrics.totalRequests++;
    this.performanceMetrics.cacheMisses++;

    return this.retryOperation(async () => {
      devLogger.log('SearchAPI', 'Calling optimized RPC function with params:', {
        space_id_param: spaceId,
        search_query: query,
        limit_param: filters?.limit || 20,
        offset_param: filters?.offset || 0,
        include_comments: filters?.includeComments !== false,
        category_filter: filters?.categoryId || null,
        date_filter: filters?.dateFilter || null
      });
      
      // Use the new optimized search function
      const { data, error } = await this.supabase.rpc('search_posts_in_space_optimized', {
        space_id_param: spaceId,
        search_query: query,
        limit_param: filters?.limit || 20,
        offset_param: filters?.offset || 0,
        include_comments: filters?.includeComments !== false,
        category_filter: filters?.categoryId || null,
        date_filter: filters?.dateFilter || null
      });

      devLogger.log('SearchAPI', 'Optimized RPC response:', { 
        dataLength: data?.length, 
        error: error?.message,
        firstResult: data?.[0] 
      });

      if (error) {
        // Complete monitoring for error
        if (searchId) {
          searchPerformanceMonitor.completeSearch(searchId, 0, false, error.message);
        }
        throw new Error(`Search failed: ${error.message || 'Unknown error'}`);
      }

      const results = data || [];
      
      // Calculate response time
      if (startTime) {
        const responseTime = performance.now() - startTime;
        this.updatePerformanceMetrics(responseTime);
      }
      
      // Only cache results for valid queries
      if (shouldCache && cacheKey) {
        this.setAdvancedCache(cacheKey, results);
      }
      
      // Track search analytics (don't await to avoid blocking)
      this.trackSearch(query, 'posts', spaceId, results.length).catch(console.warn);

      // Complete monitoring for success
      if (searchId) {
        searchPerformanceMonitor.completeSearch(searchId, results.length, false);
      }

      devLogger.log('SearchAPI', 'Returning optimized results:', results.length);
      return results;
    });
  }

  async searchSpaces(
    query: string,
    userId?: string,
    filters?: SearchFilters
  ): Promise<SearchResult[]> {
    const cacheKey = `spaces:${query}:${userId}:${JSON.stringify(filters)}`;
    
    // Start performance monitoring
    const searchId = searchPerformanceMonitor.startSearch(query, 'global');
    const startTime = performance.now();

    // Check advanced cache first
    const cachedResult = this.getFromAdvancedCache(cacheKey);
    if (cachedResult) {
      devLogger.log('SearchAPI', 'Cache hit for spaces search:', cacheKey);
      searchPerformanceMonitor.completeSearch(searchId, cachedResult.length, true);
      this.performanceMetrics.cacheHits++;
      return cachedResult;
    }

    return this.retryOperation(async () => {
      const { data, error } = await this.supabase.rpc('search_spaces', {
        search_query: query,
        user_id_param: userId,
        limit_param: filters?.limit || 20,
        offset_param: filters?.offset || 0
      });

      if (error) {
        if (searchId) {
          searchPerformanceMonitor.completeSearch(searchId, 0, false, error.message);
        }
        throw new Error(`Space search failed: ${error.message || 'Unknown error'}`);
      }

      const results = data || [];
      
      // Calculate response time
      if (startTime) {
        const responseTime = performance.now() - startTime;
        this.updatePerformanceMetrics(responseTime);
      }
      
      // Cache results
      this.setAdvancedCache(cacheKey, results);
      
      // Track search analytics
      this.trackSearch(query, 'spaces', undefined, results.length).catch(console.warn);

      // Complete monitoring
      if (searchId) {
        searchPerformanceMonitor.completeSearch(searchId, results.length, false);
      }

      return results;
    });
  }

  // New method for search suggestions/autocomplete
  async getSearchSuggestions(
    spaceId: string,
    partialQuery: string,
    limit = 10
  ): Promise<Array<{ suggestion: string; type: string; count: number }>> {
    const cacheKey = `suggestions:${spaceId}:${partialQuery}:${limit}`;
    
    // Check cache first
    const cached = this.getFromAdvancedCache(cacheKey);
    if (cached) {
      return cached as any;
    }

    try {
      const { data, error } = await this.supabase.rpc('get_search_suggestions', {
        space_id_param: spaceId,
        partial_query: partialQuery,
        limit_param: limit
      });

      if (error) {
        throw new Error(`Search suggestions failed: ${error.message}`);
      }

      const suggestions = data || [];
      
      // Cache suggestions with shorter TTL
      this.setAdvancedCache(cacheKey, suggestions, 2 * 60 * 1000); // 2 minutes
      
      return suggestions;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('🔍 [SearchAPI] Search suggestions error:', error);
      }
      return [];
    }
  }

  // New method for search performance statistics
  async getSearchPerformanceStats(
    spaceId?: string,
    daysBack = 7
  ): Promise<{
    totalSearches: number;
    avgResultsPerSearch: number;
    mostPopularQueries: Array<{ query: string; count: number }>;
    searchResponseTimeMs: number;
    cacheHitRate: number;
  }> {
    try {
      const { data, error } = await this.supabase.rpc('get_search_performance_stats', {
        space_id_param: spaceId,
        days_back: daysBack
      });

      if (error) {
        throw new Error(`Performance stats failed: ${error.message}`);
      }

      const stats = data?.[0] || {};
      
      return {
        totalSearches: stats.total_searches || 0,
        avgResultsPerSearch: parseFloat(stats.avg_results_per_search || '0'),
        mostPopularQueries: stats.most_popular_queries || [],
        searchResponseTimeMs: parseFloat(stats.search_response_time_ms || '0'),
        cacheHitRate: parseFloat(stats.cache_hit_rate || '0')
      };
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('🔍 [SearchAPI] Performance stats error:', error);
      }
      return {
        totalSearches: 0,
        avgResultsPerSearch: 0,
        mostPopularQueries: [],
        searchResponseTimeMs: 0,
        cacheHitRate: 0
      };
    }
  }

  async getPopularSearchTerms(
    type: 'posts' | 'spaces' = 'posts',
    limit = 5
  ): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('search_analytics')
        .select('search_query')
        .eq('search_type', type)
        .order('created_at', { ascending: false })
        .limit(Math.max(limit * 5, limit));

      if (error || !data) {
        return [];
      }

      const counts = new Map<string, number>();
      data.forEach((row: { search_query?: string | null }) => {
        const term = row.search_query?.trim();
        if (!term) return;
        counts.set(term, (counts.get(term) || 0) + 1);
      });

      return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([term]) => term);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('🔍 [SearchAPI] Failed to load popular search terms:', error);
      }
      return [];
    }
  }

  // Advanced caching methods
  private getFromAdvancedCache(key: string): SearchResult[] | null {
    const cached = this.advancedCache.get(key);
    if (!cached) return null;

    const now = Date.now();
    
    // Check if expired
    if (now - cached.timestamp > cached.ttl) {
      this.advancedCache.delete(key);
      return null;
    }

    // Update access metrics
    cached.accessCount++;
    cached.lastAccessed = now;
    
    return cached.data;
  }

  private setAdvancedCache(key: string, data: SearchResult[], ttl?: number): void {
    const now = Date.now();
    const cacheTTL = ttl || this.CACHE_DURATION;
    
    this.advancedCache.set(key, {
      data,
      timestamp: now,
      ttl: cacheTTL,
      accessCount: 1,
      lastAccessed: now
    });

    // Clean up old entries if cache gets too large
    if (this.advancedCache.size > 1000) {
      this.cleanupAdvancedCache();
    }
  }

  private cleanupAdvancedCache(): void {
    const now = Date.now();
    const entries = Array.from(this.advancedCache.entries());
    
    // Sort by last accessed time and remove oldest 20%
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    const toRemove = entries.slice(0, Math.floor(entries.length * 0.2));
    
    toRemove.forEach(([key]) => {
      this.advancedCache.delete(key);
    });
  }

  private updatePerformanceMetrics(responseTime: number): void {
    this.performanceMetrics.totalResponseTime += responseTime;
    this.performanceMetrics.averageResponseTime = 
      this.performanceMetrics.totalResponseTime / this.performanceMetrics.totalRequests;
  }

  // Enhanced cache management
  clearCache(): void {
    this.cache.clear();
    this.advancedCache.clear();
    devLogger.log('SearchAPI', 'All caches cleared');
  }

  clearCacheForSpace(spaceId: string): void {
    const keysToDelete: string[] = [];
    
    // Clear from basic cache
    for (const key of this.cache.keys()) {
      if (key.includes(`:${spaceId}:`)) {
        keysToDelete.push(key);
      }
    }
    
    // Clear from advanced cache
    for (const key of this.advancedCache.keys()) {
      if (key.includes(`:${spaceId}:`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.advancedCache.delete(key);
    });
    
    devLogger.log('SearchAPI', `Cleared cache for space: ${spaceId} (${keysToDelete.length} entries)`);
  }

  clearCacheForQuery(query: string): void {
    const keysToDelete: string[] = [];
    
    // Clear from basic cache
    for (const key of this.cache.keys()) {
      if (key.includes(query)) {
        keysToDelete.push(key);
      }
    }
    
    // Clear from advanced cache
    for (const key of this.advancedCache.keys()) {
      if (key.includes(query)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.advancedCache.delete(key);
    });
    
    devLogger.log('SearchAPI', `Cleared cache for query: ${query} (${keysToDelete.length} entries)`);
  }

  cancelAllRequests(): void {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
    this.pendingRequests.clear();
    devLogger.log('SearchAPI', 'All pending requests cancelled');
  }

  // Get performance metrics
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      cacheHitRate: this.performanceMetrics.totalRequests > 0 
        ? (this.performanceMetrics.cacheHits / this.performanceMetrics.totalRequests) * 100 
        : 0
    };
  }

  // Enhanced retry logic with exponential backoff
  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        // Don't retry on client errors (4xx)
        if (error instanceof Error && error.message.includes('4')) {
          break;
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        devLogger.log('SearchAPI', `Retry attempt ${attempt + 1}/${maxRetries + 1} in ${delay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  private async trackSearch(
    query: string,
    type: 'posts' | 'spaces',
    spaceId?: string,
    resultsCount = 0
  ): Promise<void> {
    // Skip analytics tracking if query is too short or empty
    if (!query || query.length < 2) {
      return;
    }

    try {
      await this.supabase.from('search_analytics').insert({
        search_query: query,
        search_type: type,
        space_id: spaceId,
        results_count: resultsCount,
        user_id: (await this.supabase.auth.getUser()).data.user?.id
      });
    } catch (error) {
      // Completely silent fail - analytics tracking is not critical
      // Only log in development if explicitly enabled
      if (import.meta.env.DEV && process.env.VITE_DEBUG_SEARCH_ANALYTICS === 'true') {
        console.warn('🔍 [SearchAPI] Failed to track search analytics:', error);
      }
    }
  }
}

// Export singleton instance
export const searchAPI = new SearchAPI();
