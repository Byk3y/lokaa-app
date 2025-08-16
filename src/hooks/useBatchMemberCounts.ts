import { log } from '@/utils/logger';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';

interface SpaceMemberCounts {
  [spaceId: string]: {
    totalMembers: number;
    onlineMembers: number;
    adminMembers: number;
  }
}

interface UseBatchMemberCountsResult {
  counts: SpaceMemberCounts;
  loading: boolean;
  refreshCounts: () => Promise<void>;
}

// Constants for batching
const BATCH_SIZE = 8; // Increased from 5 to reduce request count
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Request deduplication and batching cache
const requestCache = new Map<string, Promise<SpaceMemberCounts>>();
const pendingBatchRequests = new Map<string, string[]>();
const batchTimer = new Map<string, NodeJS.Timeout>();
const REQUEST_CACHE_TTL = 60000; // Increased to 60 seconds
const BATCH_COALESCE_DELAY = 150; // 150ms to collect multiple requests

// Clear stale cache entries periodically
setInterval(() => {
  requestCache.clear();
  pendingBatchRequests.clear();
  batchTimer.forEach(timer => clearTimeout(timer));
  batchTimer.clear();
}, REQUEST_CACHE_TTL);

/**
 * A hook to efficiently fetch member counts for multiple spaces at once
 * Uses request coalescing and chunked queries to prevent resource exhaustion
 */
export function useBatchMemberCounts(spaceIds: string[]): UseBatchMemberCountsResult {
  const [counts, setCounts] = useState<SpaceMemberCounts>({});
  const [loading, setLoading] = useState(true);
  
  // Track if component is mounted
  const isMounted = useRef(true);
  
  // Helper function to chunk array into smaller pieces
  const chunkArray = (array: string[], size: number): string[][] => {
    const chunks: string[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  };

  // Helper function to coalesce and batch multiple requests
  const coalesceBatchRequest = (requestSpaceIds: string[]): Promise<SpaceMemberCounts> => {
    const batchKey = 'global_batch_request';
    
    // Add spaces to pending batch
    const existingSpaces = pendingBatchRequests.get(batchKey) || [];
    const allSpaces = [...new Set([...existingSpaces, ...requestSpaceIds])];
    pendingBatchRequests.set(batchKey, allSpaces);
    
    // Clear existing timer
    if (batchTimer.has(batchKey)) {
      clearTimeout(batchTimer.get(batchKey)!);
    }
    
    // Create cache key for this specific request
    const requestKey = requestSpaceIds.sort().join(',');
    
    // If we already have a promise for this exact set, return it
    if (requestCache.has(requestKey)) {
      log.debug('Hook', `Deduplicating request for ${requestSpaceIds.length} spaces`);
      return requestCache.get(requestKey)!;
    }
    
    // Create promise that will be resolved when batch executes
    const promise = new Promise<SpaceMemberCounts>((resolve, reject) => {
      const timer = setTimeout(async () => {
        try {
          const spacesToFetch = pendingBatchRequests.get(batchKey) || [];
          pendingBatchRequests.delete(batchKey);
          batchTimer.delete(batchKey);
          
          if (spacesToFetch.length === 0) {
            resolve({});
            return;
          }
          
          log.debug('Hook', `Executing coalesced batch request for ${spacesToFetch.length} spaces (${requestSpaceIds.length} requested)`);
          
          // Execute the actual batch request
          const result = await executeBatchRequest(spacesToFetch);
          
          // Filter result to only include spaces requested by this specific call
          const filteredResult: SpaceMemberCounts = {};
          requestSpaceIds.forEach(id => {
            if (result[id]) {
              filteredResult[id] = result[id];
            } else {
              filteredResult[id] = { totalMembers: 0, onlineMembers: 0, adminMembers: 0 };
            }
          });
          
          resolve(filteredResult);
        } catch (error) {
          reject(error);
        }
      }, BATCH_COALESCE_DELAY);
      
      batchTimer.set(batchKey, timer);
    });
    
    requestCache.set(requestKey, promise);
    
    // Auto-cleanup cache entry after resolution
    promise.finally(() => {
      setTimeout(() => {
        requestCache.delete(requestKey);
      }, 5000); // 5 second cleanup delay
    });
    
    return promise;
  };
  
  // Helper function to execute the actual batch request
  const executeBatchRequest = async (spaceIds: string[], retryCount = 0): Promise<SpaceMemberCounts> => {
    try {
      // Process spaces in chunks to prevent resource exhaustion
      const chunks = chunkArray(spaceIds, BATCH_SIZE);
      const allResults: SpaceMemberCounts = {};
      
      // Initialize all results with zeros first
      spaceIds.forEach(id => {
        allResults[id] = {
          totalMembers: 0,
          onlineMembers: 0,
          adminMembers: 0
        };
      });
      
      for (const chunk of chunks) {
        // Check if request was cancelled
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Request cancelled');
        }
        
        const { data, error } = await getSupabaseClient()
          .from('space_members')
          .select('space_id, status, is_online, role')
          .in('space_id', chunk)
          .eq('status', 'active');

        if (error) {
          // Check if it's a resource exhaustion error
          if (error.message?.includes('insufficient') || error.message?.includes('resources')) {
            log.warn('Hook', `Resource exhaustion detected for batch of ${spaceIds.length} spaces, reducing batch size`);
            // If we have more than 1 space, try with smaller chunks
            if (spaceIds.length > 1) {
              const smallerChunks = chunkArray(spaceIds, Math.max(1, Math.floor(spaceIds.length / 2)));
              const results: SpaceMemberCounts = {};
              for (const smallerChunk of smallerChunks) {
                const chunkResult = await executeBatchRequest(smallerChunk, retryCount);
                Object.assign(results, chunkResult);
              }
              return results;
            }
          }
          throw error;
        }
        
        // Count members for each space in this chunk
        data?.forEach(member => {
          const spaceId = member.space_id;
          if (allResults[spaceId]) {
            allResults[spaceId].totalMembers++;
            
            if (member.is_online) {
              allResults[spaceId].onlineMembers++;
            }
            
            if (member.role === 'admin') {
              allResults[spaceId].adminMembers++;
            }
          }
        });
        
        // Small delay between chunks to be gentle on the database
        if (chunks.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 75)); // Reduced from 100ms
        }
      }
      
      return allResults;
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        const backoffDelay = RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
        log.warn('Hook', `Retrying batch member counts (attempt ${retryCount + 1}) after ${backoffDelay}ms:`, error);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        return executeBatchRequest(spaceIds, retryCount + 1);
      }
      
      log.error('Hook', 'Failed to fetch batch member counts after retries:', error);
      // Return empty counts on failure
      const emptyResult: SpaceMemberCounts = {};
      spaceIds.forEach(id => {
        emptyResult[id] = {
          totalMembers: 0,
          onlineMembers: 0,
          adminMembers: 0
        };
      });
      return emptyResult;
    }
  };
  
  // Create a stable fetch function with request coalescing
  const fetchCounts = useCallback(async () => {
    if (!spaceIds.length) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    try {
      // Use coalesced batching instead of direct fetching
      const result = await coalesceBatchRequest(spaceIds);
      
      if (isMounted.current) {
        setCounts(result);
        setLoading(false);
      }
    } catch (error) {
      log.error('Hook', 'Error in batch member counts fetch:', error);
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [spaceIds.join(',')]); // Use join for stable dependency
  
  // AbortController for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Fetch counts when spaceIds change
  useEffect(() => {
    isMounted.current = true;
    
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    
    fetchCounts();
    
    return () => {
      isMounted.current = false;
      // Cancel request on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchCounts]);
  
  return {
    counts,
    loading,
    refreshCounts: fetchCounts
  };
}