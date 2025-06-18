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
 * FIXED: Proper space switching and ID resolution
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

  // CRITICAL FIX: Reset immediately when subdomain changes
  useEffect(() => {
    if (resolvedFor.current !== subdomain) {
      console.log(`🔄 [useStableSpaceId] Subdomain changed from ${resolvedFor.current} to ${subdomain}, resetting immediately`);
      setStableSpaceId(undefined);
      lastValidSpaceId.current = undefined;
      resolvedFor.current = undefined;
    }
  }, [subdomain]);

  useEffect(() => {
    // Don't resolve during auth loading
    if (authLoading) return;
    
    // Don't resolve if we don't have a subdomain
    if (!subdomain) return;

    // CRITICAL FIX: Always re-resolve when subdomain changes, even if we think we have a stable ID
    const needsResolution = !stableSpaceId || resolvedFor.current !== subdomain;
    
    if (!needsResolution) {
      return;
    }

    // Resolve space ID from available sources
    let resolvedSpaceId: string | undefined;

    // PRIMARY: Use space data from SpaceContext if available and matches subdomain
    const actualSpaceData = Array.isArray(contextSpaceData) ? contextSpaceData[0] : contextSpaceData;
    if (actualSpaceData?.id && actualSpaceData?.subdomain === subdomain) {
      resolvedSpaceId = actualSpaceData.id;
      console.log(`🔒 [useStableSpaceId] Using context data for ${subdomain}: ${resolvedSpaceId}`);
    }
    // SECONDARY: Use space data from store if available and matches subdomain
    else if (currentSpaceData?.id && currentSpaceData?.subdomain === subdomain) {
      resolvedSpaceId = currentSpaceData.id;
      console.log(`🔒 [useStableSpaceId] Using store data for ${subdomain}: ${resolvedSpaceId}`);
    }
    // TERTIARY: Check localStorage cache (but verify subdomain match)
    else if (subdomain) {
      try {
        const lastActiveSpace = localStorage.getItem('lastActiveSpace');
        if (lastActiveSpace) {
          const cached = JSON.parse(lastActiveSpace);
          if (cached?.subdomain === subdomain && cached?.id) {
            resolvedSpaceId = cached.id;
            console.log(`🔒 [useStableSpaceId] Using localStorage cache for ${subdomain}: ${resolvedSpaceId}`);
          }
        }
      } catch (e) {
        console.warn('[useStableSpaceId] Error reading lastActiveSpace cache:', e);
      }
    }

    // QUATERNARY: Hardcoded fallbacks for known spaces (VERIFIED CORRECT)
    if (!resolvedSpaceId && subdomain) {
      switch (subdomain) {
        case 'nocode-architects':
          resolvedSpaceId = '235e68d1-89df-4d2d-8945-e7756d60de20';
          console.log(`🔒 [useStableSpaceId] Using hardcoded fallback for ${subdomain}: ${resolvedSpaceId}`);
          break;
        case 'music-business':
          resolvedSpaceId = '987e5232-68a8-4d1c-88be-e6f77a5e93fd';
          console.log(`🔒 [useStableSpaceId] Using hardcoded fallback for ${subdomain}: ${resolvedSpaceId}`);
          break;
        case 'nextpath-ai':
          resolvedSpaceId = 'cc18c511-9b54-4e14-8abc-75b8c800c39d';
          console.log(`🔒 [useStableSpaceId] Using hardcoded fallback for ${subdomain}: ${resolvedSpaceId}`);
          break;
        default:
          console.warn(`🔒 [useStableSpaceId] Unknown subdomain: ${subdomain}`);
      }
    }

    // CRITICAL FIX: Always update when we have a valid resolution for the current subdomain
    if (resolvedSpaceId) {
      console.log(`🔒 [useStableSpaceId] Resolved stable space ID for ${subdomain}: ${resolvedSpaceId}`);
      setStableSpaceId(resolvedSpaceId);
      lastValidSpaceId.current = resolvedSpaceId;
      resolvedFor.current = subdomain;
    } else {
      console.warn(`🔒 [useStableSpaceId] Could not resolve space ID for ${subdomain}`);
      // Clear state if we can't resolve
      setStableSpaceId(undefined);
      lastValidSpaceId.current = undefined;
      resolvedFor.current = undefined;
    }
  }, [contextSpaceData, currentSpaceData, subdomain, authLoading, stableSpaceId]);

  return stableSpaceId;
} 