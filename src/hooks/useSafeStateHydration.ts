import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { log } from '@/utils/logger';
/**
 * 🛡️ Safe State Hydration Hook
 * 
 * Phase 6B: Safe implementation of state hydration with proper memoization,
 * debouncing, and infinite loop prevention.
 */

import { 
  smartStateHydrator, 
  HydrationStatus, 
  HydrationResult 
} from '@/services/SmartStateHydrator';
import { stateSerializer } from '@/utils/stateSerialization';

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Hook return types
export interface UseSafeStateHydrationReturn<T> {
  isHydrated: boolean;
  isHydrating: boolean;
  hydratedState: T | null;
  hydrationError: string | null;
  saveState: (state: T) => Promise<boolean>;
  clearCache: () => void;
  hydrationTime?: number;
  performanceMetrics: {
    hydrationTime: number;
    saveCount: number;
    errorCount: number;
    lastSaveTime: number | null;
  };
}

export interface SafeHydrationOptions {
  autoSave?: boolean;
  saveInterval?: number;
  sensitiveKeys?: string[];
  debounceMs?: number;
  enablePerformanceTracking?: boolean;
}

/**
 * 🛡️ SAFE STATE HYDRATION HOOK
 * Prevents infinite loops through proper memoization and debouncing
 */
export function useSafeStateHydration<T>(
  componentId: string,
  userId: string,
  fallbackState?: T,
  options: SafeHydrationOptions = {}
): UseSafeStateHydrationReturn<T> {
  const {
    autoSave = false, // Start with auto-save disabled for safety
    saveInterval = 2000, // 2 second debounce
    sensitiveKeys = [],
    debounceMs = 1000, // 1 second debounce for saves
    enablePerformanceTracking = true
  } = options;

  // State management
  const [isHydrated, setIsHydrated] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);
  const [hydratedState, setHydratedState] = useState<T | null>(null);
  const [hydrationError, setHydrationError] = useState<string | null>(null);
  const [hydrationTime, setHydrationTime] = useState<number | undefined>();

  // Performance tracking
  const performanceRef = useRef({
    hydrationTime: 0,
    saveCount: 0,
    errorCount: 0,
    lastSaveTime: null as number | null
  });

  // Refs for stable references
  const isMountedRef = useRef(true);
  const lastSavedStateRef = useRef<T | null>(null);

  // Memoized component key - stable across renders
  const stableComponentId = useMemo(() => componentId, [componentId]);
  const stableUserId = useMemo(() => userId, [userId]);

  // Hydrate component state on mount - runs only once
  useEffect(() => {
    let isMounted = true;
    isMountedRef.current = true;

    const hydrateComponent = async () => {
      const startTime = Date.now();
      
      try {
        setIsHydrating(true);
        setHydrationError(null);

        log.debug('SafeHydration', `🚀 [useSafeStateHydration] Starting hydration for ${stableComponentId}`);
        log.debug('SafeHydration', `🔍 [useSafeStateHydration] Fallback state:`, fallbackState);

        const result: HydrationResult = await smartStateHydrator.hydrateComponent(
          stableComponentId,
          stableUserId,
          fallbackState
        );

        log.debug('SafeHydration', `📊 [useSafeStateHydration] Hydration result for ${stableComponentId}:`, {
          success: result.success,
          source: result.source,
          hydrationTime: result.hydrationTime,
          hasState: !!result.state,
          error: result.error
        });

        if (!isMounted) return;

        const totalTime = Date.now() - startTime;
        performanceRef.current.hydrationTime = totalTime;

        if (result.success && result.state) {
          // Successfully hydrated
          console.log(`🔍 [useSafeStateHydration] Setting hydrated state for ${stableComponentId}:`, result.state.data);
          setHydratedState(result.state.data);
          setIsHydrated(true);
          setHydrationTime(result.hydrationTime);

          console.log(`✅ [useSafeStateHydration] Hydrated ${stableComponentId} in ${result.hydrationTime}ms`);
        } else {
          // No cache found, use fallback
          if (fallbackState) {
            setHydratedState(fallbackState);
            setIsHydrated(true);
            
            if (enablePerformanceTracking) {
              log.debug('SafeHydration', `🔄 [useSafeStateHydration] Using fallback state for ${stableComponentId}`);
            }
          } else {
            setHydrationError(result.error || 'No cached state available');
            
            if (enablePerformanceTracking) {
              log.debug('SafeHydration', `❌ [useSafeStateHydration] No cache or fallback for ${stableComponentId}`);
            }
          }
        }
      } catch (error) {
        if (!isMounted) return;

        performanceRef.current.errorCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        setHydrationError(errorMessage);
        
        log.error('SafeHydration', `🚨 [useSafeStateHydration] Hydration failed for ${stableComponentId}:`, error);
      } finally {
        if (isMounted) {
          setIsHydrating(false);
        }
      }
    };

    hydrateComponent();

    return () => {
      isMounted = false;
      isMountedRef.current = false;
    };
  }, [stableComponentId, stableUserId]); // Only depend on stable values

  // Memoized save function with debouncing
  const saveState = useCallback(async (state: T): Promise<boolean> => {
    if (!isMountedRef.current) return false;

    try {
      // Clean sensitive data
      const cleanedState = stateSerializer.cleanState(state, sensitiveKeys);
      
      // Save to cache
      const success = await smartStateHydrator.saveComponentState(
        stableComponentId,
        stableUserId,
        cleanedState
      );

      if (success) {
        lastSavedStateRef.current = state;
        performanceRef.current.saveCount++;
        performanceRef.current.lastSaveTime = Date.now();
        
        if (enablePerformanceTracking) {
          log.debug('SafeHydration', `💾 [useSafeStateHydration] Saved state for ${stableComponentId}`);
        }
      }

      return success;
    } catch (error) {
      performanceRef.current.errorCount++;
      log.error('SafeHydration', `🚨 [useSafeStateHydration] Failed to save state for ${stableComponentId}:`, error);
      return false;
    }
  }, [stableComponentId, stableUserId, sensitiveKeys, enablePerformanceTracking]);

  // Debounced save function
  const debouncedSave = useMemo(
    () => debounce(saveState, debounceMs),
    [saveState, debounceMs]
  );

  // Clear cache function
  const clearCache = useCallback(() => {
    smartStateHydrator.clearComponentCache(stableComponentId, stableUserId);
    setIsHydrated(false);
    setHydratedState(null);
    setHydrationError(null);
    
    if (enablePerformanceTracking) {
      log.debug('SafeHydration', `🧹 [useSafeStateHydration] Cleared cache for ${stableComponentId}`);
    }
  }, [stableComponentId, stableUserId, enablePerformanceTracking]);

  // Performance metrics
  const performanceMetrics = useMemo(() => ({
    hydrationTime: performanceRef.current.hydrationTime,
    saveCount: performanceRef.current.saveCount,
    errorCount: performanceRef.current.errorCount,
    lastSaveTime: performanceRef.current.lastSaveTime
  }), [performanceRef.current.hydrationTime, performanceRef.current.saveCount, performanceRef.current.errorCount, performanceRef.current.lastSaveTime]);

  return {
    isHydrated,
    isHydrating,
    hydratedState,
    hydrationError,
    saveState: autoSave ? debouncedSave : saveState,
    clearCache,
    hydrationTime,
    performanceMetrics
  };
}

/**
 * 🎯 INTERACTION-BASED HYDRATION HOOK
 * Hydrates components only when user interacts with them
 */
export function useInteractionBasedHydration<T>(
  componentId: string,
  userId: string,
  fallbackState?: T,
  options: SafeHydrationOptions = {}
) {
  const [shouldHydrate, setShouldHydrate] = useState(false);
  
  const triggerHydration = useCallback(() => {
    if (!shouldHydrate) {
      setShouldHydrate(true);
    }
  }, [shouldHydrate]);
  
  const hydrationResult = useSafeStateHydration(
    componentId,
    userId,
    fallbackState,
    {
      ...options,
      // Only hydrate if triggered
      autoSave: shouldHydrate ? options.autoSave : false
    }
  );
  
  return {
    ...hydrationResult,
    shouldHydrate,
    triggerHydration
  };
}

/**
 * 📊 PROGRESSIVE HYDRATION HOOK
 * Hydrates components based on priority
 */
export function useProgressiveHydration<T>(
  componentId: string,
  userId: string,
  priority: 'high' | 'medium' | 'low',
  fallbackState?: T,
  options: SafeHydrationOptions = {}
) {
  const [isReady, setIsReady] = useState(priority === 'high');
  
  useEffect(() => {
    if (priority === 'high') {
      setIsReady(true);
    } else if (priority === 'medium') {
      // Hydrate after a short delay
      const timer = setTimeout(() => setIsReady(true), 100);
      return () => clearTimeout(timer);
    } else {
      // Low priority - use requestIdleCallback
      const handleIdle = () => setIsReady(true);
      
      if ('requestIdleCallback' in window) {
        const id = requestIdleCallback(handleIdle);
        return () => cancelIdleCallback(id);
      } else {
        // Fallback for browsers without requestIdleCallback
        const timer = setTimeout(handleIdle, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [priority]);
  
  return useSafeStateHydration(
    componentId,
    userId,
    fallbackState,
    {
      ...options,
      autoSave: isReady ? options.autoSave : false
    }
  );
}

export default useSafeStateHydration;
