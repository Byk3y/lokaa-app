import { log } from '@/utils/logger';
import { useMemo, useRef } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { getSpaceFallbackData } from '@/utils/spaceDataFallback';
import type { 
  UseClassroomAuthReturn, 
  ClassroomPermissions, 
  ClassroomTabProps 
} from '@/types/classroom';

export function useClassroomAuth(space: ClassroomTabProps['space']): UseClassroomAuthReturn {
  const { user, loading: authLoading } = useOptimizedAuth();

  // Determine effective owner ID with fallback support for better UX
  const effectiveOwnerId = useMemo(() => {
    // If space data is available, use it
    if (space?.owner_id) {
      return space.owner_id;
    }
    
    // If space data is not available but we have a subdomain, try fallback
    if (space?.subdomain) {
      const fallbackData = getSpaceFallbackData(space.subdomain);
      if (fallbackData?.owner_id) {
        log.debug('Hook', `🔄 [useClassroomAuth] Using fallback owner ID for ${space.subdomain}: ${fallbackData.owner_id}`);
        return fallbackData.owner_id;
      }
    }
    
    // Return undefined to wait for actual data
    return undefined;
  }, [space?.owner_id, space?.subdomain]);

  // Calculate permissions based on user and space data
  const permissions = useMemo((): ClassroomPermissions => {
    const isAuthenticated = !authLoading && !!user;
    const isOwner = isAuthenticated && !!effectiveOwnerId && user?.id === effectiveOwnerId;
    
    // TODO: Add admin role checking from space_members table
    // For now, only owner has admin privileges
    const isAdmin = isOwner;

    if (isAuthenticated && effectiveOwnerId) {
      log.debug('Hook', `🔐 [useClassroomAuth] Permission check: user=${user?.id}, owner=${effectiveOwnerId}, isOwner=${isOwner}`);
    }

    return {
      isOwner,
      isAdmin,
      canCreateCourse: isOwner || isAdmin,
      canEditCourse: isOwner || isAdmin,
      canDeleteCourse: isOwner || isAdmin,
      canManageModules: isOwner || isAdmin,
      canManageLessons: isOwner || isAdmin,
      canViewAnalytics: isOwner || isAdmin,
    };
  }, [user, authLoading, effectiveOwnerId]);

  // Create a stable reference for the auth return object
  const prevAuthRef = useRef<UseClassroomAuthReturn | null>(null);
  
  // Build the current auth state with fallback support
  const currentAuth = useMemo(() => {
    // Determine effective space ID with fallback support
    let effectiveSpaceId = space?.id;
    if (!effectiveSpaceId && space?.subdomain) {
      const fallbackData = getSpaceFallbackData(space.subdomain);
      if (fallbackData?.id) {
        effectiveSpaceId = fallbackData.id;
        log.debug('Hook', `🔄 [useClassroomAuth] Using fallback space ID for ${space.subdomain}: ${fallbackData.id}`);
      }
    }
    
    return {
      user,
      authLoading,
      isAuthenticated: !authLoading && !!user,
      permissions,
      stableSpaceId: effectiveSpaceId,
      stableOwnerId: effectiveOwnerId,
    };
  }, [user, authLoading, permissions, space?.id, space?.subdomain, effectiveOwnerId]);

  // Only return a new object if meaningful changes occurred
  const stableAuth = useMemo(() => {
    const prev = prevAuthRef.current;
    
    // If no previous auth or meaningful changes, return current
    if (!prev || 
        prev.authLoading !== currentAuth.authLoading ||
        prev.isAuthenticated !== currentAuth.isAuthenticated ||
        prev.user?.id !== currentAuth.user?.id ||
        prev.stableSpaceId !== currentAuth.stableSpaceId ||
        prev.stableOwnerId !== currentAuth.stableOwnerId ||
        // Deep compare permissions
        JSON.stringify(prev.permissions) !== JSON.stringify(currentAuth.permissions)
    ) {
      prevAuthRef.current = currentAuth;
      return currentAuth;
    }
    
    // Return previous reference to maintain stability
    return prev;
  }, [currentAuth]);

  return stableAuth;
}

// Utility hook for checking specific permissions
export function useClassroomPermissions(space: ClassroomTabProps['space']) {
  const { permissions } = useClassroomAuth(space);
  return permissions;
}

// Utility hook for checking if user can perform specific actions
export function useClassroomActions(space: ClassroomTabProps['space']) {
  const { permissions, isAuthenticated } = useClassroomAuth(space);
  
  return {
    canCreateCourse: isAuthenticated && permissions.canCreateCourse,
    canEditCourse: isAuthenticated && permissions.canEditCourse,
    canDeleteCourse: isAuthenticated && permissions.canDeleteCourse,
    canManageModules: isAuthenticated && permissions.canManageModules,
    canManageLessons: isAuthenticated && permissions.canManageLessons,
    canViewAnalytics: isAuthenticated && permissions.canViewAnalytics,
  };
} 