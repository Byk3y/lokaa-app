import { log } from '@/utils/logger';
import { useEffect, useRef, useCallback } from 'react';

interface CleanupItem {
  unsubscribe: () => void;
  id?: string;
}

interface CleanupTracker {
  addInterval: (id: number) => void;
  addTimeout: (id: number) => void;
  addSubscription: (subscription: CleanupItem) => void;
  addEventListener: (element: Element | Window | Document, event: string, handler: EventListener) => void;
  cleanup: () => void;
}

/**
 * FIXED: Simplified cleanup tracker with reduced overhead
 * Provides essential cleanup functionality without excessive monitoring
 */
export function useCleanupTracker(componentName: string): CleanupTracker {
  const intervalsRef = useRef<Set<number>>(new Set());
  const timeoutsRef = useRef<Set<number>>(new Set());
  const subscriptionsRef = useRef<Set<CleanupItem>>(new Set());
  const eventListenersRef = useRef<Array<{
    element: Element | Window | Document;
    event: string;
    handler: EventListener;
  }>>([]);

  // FIXED: Simplified logging - only in development and reduced noise
  const logMessage = useCallback((message: string) => {
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
      log.debug('Hook', `[CleanupTracker:${componentName}] ${message}`);
    }
  }, [componentName]);

  const addInterval = useCallback((id: number) => {
    intervalsRef.current.add(id);
    logMessage(`Added interval ${id}`);
  }, [logMessage]);

  const addTimeout = useCallback((id: number) => {
    timeoutsRef.current.add(id);
    logMessage(`Added timeout ${id}`);
  }, [logMessage]);

  const addSubscription = useCallback((subscription: CleanupItem) => {
    subscriptionsRef.current.add(subscription);
    logMessage(`Added subscription`);
  }, [logMessage]);

  const addEventListener = useCallback((
    element: Element | Window | Document,
    event: string,
    handler: EventListener
  ) => {
    element.addEventListener(event, handler);
    eventListenersRef.current.push({ element, event, handler });
    logMessage(`Added ${event} listener`);
  }, [logMessage]);

  const cleanup = useCallback(() => {
    // FIXED: Simplified cleanup without excessive logging
    let cleanedCount = 0;

    // Clear intervals
    intervalsRef.current.forEach((id) => {
      clearInterval(id);
      cleanedCount++;
    });
    intervalsRef.current.clear();

    // Clear timeouts
    timeoutsRef.current.forEach((id) => {
      clearTimeout(id);
      cleanedCount++;
    });
    timeoutsRef.current.clear();

    // Clean subscriptions
    subscriptionsRef.current.forEach((subscription) => {
      try {
        subscription.unsubscribe();
        cleanedCount++;
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          log.warn('Hook', `[CleanupTracker:${componentName}] Subscription cleanup error:`, error);
        }
      }
    });
    subscriptionsRef.current.clear();

    // Remove event listeners
    eventListenersRef.current.forEach(({ element, event, handler }) => {
      try {
        element.removeEventListener(event, handler);
        cleanedCount++;
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          log.warn('Hook', `[CleanupTracker:${componentName}] Event listener cleanup error:`, error);
        }
      }
    });
    eventListenersRef.current = [];

    // FIXED: Only log significant cleanup operations
    if (process.env.NODE_ENV === 'development' && cleanedCount > 5) {
      log.debug('Hook', `[CleanupTracker:${componentName}] Cleaned up ${cleanedCount} resources`);
    }
  }, [componentName]);

  // FIXED: Simplified cleanup on unmount
  useEffect(() => {
    logMessage('Initialized');
    
    return () => {
      cleanup();
    };
  }, [cleanup, logMessage]);

  return {
    addInterval,
    addTimeout,
    addSubscription,
    addEventListener,
    cleanup
  };
}

/**
 * Specialized hook for Supabase subscriptions
 */
export function useSupabaseCleanup(componentName: string) {
  const cleanup = useCleanupTracker(componentName);
  
  const addSupabaseSubscription = useCallback((subscription: any) => {
    return cleanup.addSubscription({
      unsubscribe: () => {
        try {
          subscription.unsubscribe();
        } catch (err) {
          log.warn('Hook', `[${componentName}] Error unsubscribing from Supabase:`, err);
        }
      }
    });
  }, [cleanup, componentName]);
  
  return {
    ...cleanup,
    addSupabaseSubscription
  };
}

/**
 * Hook for React Query cleanup
 */
export function useQueryCleanup(componentName: string) {
  const cleanup = useCleanupTracker(componentName);
  
  const addQuerySubscription = useCallback((queryClient: any, queryKey: any[]) => {
    return cleanup.addSubscription({
      unsubscribe: () => {
        try {
          queryClient.removeQueries(queryKey);
        } catch (err) {
          log.warn('Hook', `[${componentName}] Error removing queries:`, err);
        }
      }
    });
  }, [cleanup, componentName]);
  
  return {
    ...cleanup,
    addQuerySubscription
  };
} 