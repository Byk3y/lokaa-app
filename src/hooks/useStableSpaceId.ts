import { log } from '@/utils/logger';
import { useMemo, useRef } from 'react';

interface UseStableSpaceIdOptions {
  contextSpaceData: any;
  currentSpaceData: any;
  subdomain: string | undefined;
  authLoading: boolean;
}

/**
 * Hook that provides a stable space ID that doesn't change during tab navigation
 * Prevents categories and other data from flickering during tab switches
 * 
 * Uses direct computation to eliminate React state batching delays
 */
export function useStableSpaceId({
  contextSpaceData,
  currentSpaceData,
  subdomain,
  authLoading
}: UseStableSpaceIdOptions): string | undefined {
  const lastResolvedRef = useRef<{ subdomain: string | undefined; spaceId: string | undefined }>({
    subdomain: undefined,
    spaceId: undefined
  });

  // Direct computation approach - resolves space ID immediately without React state delays
  const stableSpaceId = useMemo(() => {
    // Early return if auth is still loading
    if (authLoading) {
      log.debug('Hook', '🔒 [useStableSpaceId] Auth loading, waiting...');
      return undefined;
    }

    // Early return if no subdomain
    if (!subdomain) {
      log.debug('Hook', '🔒 [useStableSpaceId] No subdomain provided');
      return undefined;
    }

    // Check if subdomain changed
    const subdomainChanged = lastResolvedRef.current.subdomain !== subdomain;
    
    if (subdomainChanged) {
      log.debug('Hook', `🔄 [useStableSpaceId] Resolving space ID for ${subdomain} (previous: ${lastResolvedRef.current.subdomain})`);
    }

    let resolvedSpaceId: string | undefined;

    // Priority 1: Context space data
    if (contextSpaceData?.id) {
      resolvedSpaceId = contextSpaceData.id;
      if (subdomainChanged) {
        log.debug('Hook', `🔒 [useStableSpaceId] Using context data for ${subdomain}: ${resolvedSpaceId}`);
      }
    }
    // Priority 2: Current space data
    else if (currentSpaceData?.id) {
      resolvedSpaceId = currentSpaceData.id;
      if (subdomainChanged) {
        log.debug('Hook', `🔒 [useStableSpaceId] Using current data for ${subdomain}: ${resolvedSpaceId}`);
      }
    }
    // Priority 3: localStorage cache
    else {
      try {
        const cached = localStorage.getItem(`space_fallback_${subdomain}`);
        if (cached) {
          const parsedCache = JSON.parse(cached);
          if (parsedCache?.id) {
            resolvedSpaceId = parsedCache.id;
            if (subdomainChanged) {
              log.debug('Hook', `🔒 [useStableSpaceId] Using localStorage cache for ${subdomain}: ${resolvedSpaceId}`);
            }
          }
        }
      } catch (error) {
        log.warn('Hook', '🔒 [useStableSpaceId] Failed to read localStorage cache:', error);
      }
    }

    // Update ref if we successfully resolved for this subdomain
    if (resolvedSpaceId) {
      if (subdomainChanged || lastResolvedRef.current.spaceId !== resolvedSpaceId) {
        lastResolvedRef.current = { subdomain, spaceId: resolvedSpaceId };
        log.debug('Hook', `🔒 [useStableSpaceId] Successfully resolved stable space ID for ${subdomain}: ${resolvedSpaceId}`);
      }
      return resolvedSpaceId;
    }

    // IMPORTANT: If subdomain changed but we couldn't resolve the new ID yet,
    // do NOT fall back to the previous space ID — return undefined to avoid
    // loading posts from the previous space.
    if (subdomainChanged) {
      return undefined;
    }

    // If subdomain hasn't changed, keep using the last resolved ID
    return lastResolvedRef.current.spaceId;
  }, [contextSpaceData, currentSpaceData, subdomain, authLoading]);

  return stableSpaceId;
} 