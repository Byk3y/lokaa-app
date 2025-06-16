import { useState, useEffect, useRef } from 'react';

interface UseStableSpaceIdOptions {
  contextSpaceData: any;
  currentSpaceData: any;
  subdomain: string | undefined;
  authLoading: boolean;
}

/**
 * Hook that provides a stable space ID that doesn't change during tab navigation
 * Prevents categories and other data from flickering during tab switches
 */
export function useStableSpaceId({
  contextSpaceData,
  currentSpaceData,
  subdomain,
  authLoading
}: UseStableSpaceIdOptions): string | undefined {
  const [stableSpaceId, setStableSpaceId] = useState<string | undefined>(undefined);
  const lastValidSpaceId = useRef<string | undefined>(undefined);
  const resolvedFor = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Don't resolve during auth loading
    if (authLoading) return;

    // Skip if we already resolved for this subdomain and have a stable ID
    if (resolvedFor.current === subdomain && stableSpaceId) {
      return;
    }

    // Resolve space ID from available sources
    let resolvedSpaceId: string | undefined;

    // PRIMARY: Use space data from SpaceContext if available
    const actualSpaceData = Array.isArray(contextSpaceData) ? contextSpaceData[0] : contextSpaceData;
    if (actualSpaceData?.id) {
      resolvedSpaceId = actualSpaceData.id;
    }
    // SECONDARY: Use space data from store if available  
    else if (currentSpaceData?.id) {
      resolvedSpaceId = currentSpaceData.id;
    }
    // TERTIARY: Check localStorage cache
    else if (subdomain) {
      try {
        const lastActiveSpace = localStorage.getItem('lastActiveSpace');
        if (lastActiveSpace) {
          const cached = JSON.parse(lastActiveSpace);
          if (cached?.subdomain === subdomain && cached?.id) {
            resolvedSpaceId = cached.id;
          }
        }
      } catch (e) {
        console.warn('[useStableSpaceId] Error reading lastActiveSpace cache:', e);
      }
    }

    // QUATERNARY: Hardcoded fallbacks for known spaces
    if (!resolvedSpaceId && subdomain) {
      switch (subdomain) {
        case 'nocode-architects':
          resolvedSpaceId = '235e68d1-89df-4d2d-8945-e7756d60de20';
          break;
        case 'music-business':
          resolvedSpaceId = '987e5232-68a8-4d1c-88be-e6f77a5e93fd';
          break;
        case 'nextpath-ai':
          resolvedSpaceId = 'cc18c511-9b54-4e14-8abc-75b8c800c39d';
          break;
      }
    }

    // Update stable space ID only if we have a new valid ID
    if (resolvedSpaceId && resolvedSpaceId !== stableSpaceId) {
      console.log(`🔒 [useStableSpaceId] Resolved stable space ID for ${subdomain}: ${resolvedSpaceId}`);
      setStableSpaceId(resolvedSpaceId);
      lastValidSpaceId.current = resolvedSpaceId;
      resolvedFor.current = subdomain;
    }
    // If we have a last valid space ID but no current resolution, keep the stable one
    else if (!resolvedSpaceId && lastValidSpaceId.current && resolvedFor.current === subdomain) {
      console.log(`🔒 [useStableSpaceId] Maintaining stable space ID for ${subdomain}: ${lastValidSpaceId.current}`);
      setStableSpaceId(lastValidSpaceId.current);
    }
  }, [contextSpaceData, currentSpaceData, subdomain, authLoading, stableSpaceId]);

  // Reset when subdomain changes
  useEffect(() => {
    if (resolvedFor.current !== subdomain) {
      console.log(`🔄 [useStableSpaceId] Subdomain changed from ${resolvedFor.current} to ${subdomain}, resetting`);
      setStableSpaceId(undefined);
      lastValidSpaceId.current = undefined;
      resolvedFor.current = undefined;
    }
  }, [subdomain]);

  return stableSpaceId;
} 