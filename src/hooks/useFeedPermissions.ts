import { useMemo, useRef } from 'react';
import useSpaceSettingsStore from "@/hooks/useSpaceSettingsStore";
import type { EffectivePermissions } from "@/types/feedTypes";
import { log } from '@/utils/logger';

/**
 * Hook for managing feed permissions
 * Extracted from useFeedLogic to isolate permission logic and prevent unnecessary re-renders
 */
export function useFeedPermissions(
  userProp?: any,
  isOwnerProp?: boolean,
  isAdminProp?: boolean,
  stableSpaceId?: string
) {
  const { permissions: storePermissions } = useSpaceSettingsStore();
  
  // Add ref to track permission changes and prevent excessive logging
  const lastPermissionLog = useRef<string | null>(null);

  // ============================================================================
  // PERMISSION RESOLUTION (OPTIMIZED)
  // ============================================================================
  
  // Split complex permission logic into separate useMemo hooks for better performance
  const effectiveIsOwner = useMemo(() => {
    const isStoreLoaded = storePermissions !== null && storePermissions !== undefined;
    const hasValidProps = isOwnerProp !== undefined && isOwnerProp !== null;
    
    return isStoreLoaded 
      ? (storePermissions.isOwner ?? false)
      : hasValidProps 
        ? (isOwnerProp ?? false)
        : false;
  }, [storePermissions?.isOwner, isOwnerProp]);

  const effectiveIsAdmin = useMemo(() => {
    const isStoreLoaded = storePermissions !== null && storePermissions !== undefined;
    const hasValidProps = isAdminProp !== undefined && isAdminProp !== null;
    
    return isStoreLoaded 
      ? (storePermissions.isAdmin ?? false) 
      : hasValidProps 
        ? (isAdminProp ?? false)
        : false;
  }, [storePermissions?.isAdmin, isAdminProp]);

  const canAccessSettings = useMemo(() => {
    const isStoreLoaded = storePermissions !== null && storePermissions !== undefined;
    
    const resolved = isStoreLoaded 
      ? (storePermissions.canAccessSettings ?? false)
      : (effectiveIsOwner || effectiveIsAdmin);

    // SECURITY AUDIT: Ensure canAccessSettings is only true for owners or admins
    if (resolved && !effectiveIsOwner && !effectiveIsAdmin) {
      log.warn('Hook', "⚠️ SECURITY AUDIT: canAccessSettings granted to regular member", {
        canAccessSettings: resolved,
        effectiveIsOwner,
        effectiveIsAdmin,
        storePermissions,
        isOwnerProp,
        isAdminProp,
        timestamp: new Date().toISOString()
      });
      return false; // SECURITY FIX: Override canAccessSettings if user is not owner or admin
    }

    return resolved;
  }, [storePermissions?.canAccessSettings, effectiveIsOwner, effectiveIsAdmin]);

  // ============================================================================
  // COMBINED PERMISSIONS OBJECT
  // ============================================================================
  
  const effectivePermissions: EffectivePermissions = useMemo(() => {
    const permissions = {
      effectiveIsOwner,
      effectiveIsAdmin,
      canAccessSettings,
    };

    // Debug logging only when permissions actually change
    const permKey = `${permissions.effectiveIsOwner}-${permissions.effectiveIsAdmin}-${permissions.canAccessSettings}`;
    if (!lastPermissionLog.current || lastPermissionLog.current !== permKey) {
      log.debug('Hook', `🔧 [EffectivePermissions] Updated for ${stableSpaceId || 'unknown'}:`, {
        effectiveIsOwner: permissions.effectiveIsOwner,
        effectiveIsAdmin: permissions.effectiveIsAdmin,
        canAccessSettings: permissions.canAccessSettings,
        source: storePermissions !== null ? 'store' : 'props',
      });
      lastPermissionLog.current = permKey;
    }

    return permissions;
  }, [effectiveIsOwner, effectiveIsAdmin, canAccessSettings, stableSpaceId]);

  // ============================================================================
  // RETURN INTERFACE
  // ============================================================================
  
  return {
    effectivePermissions,
    effectiveIsOwner,
    effectiveIsAdmin,
    canAccessSettings,
  };
}
