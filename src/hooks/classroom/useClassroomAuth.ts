import { useMemo, useRef } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import type {
  UseClassroomAuthReturn,
  ClassroomPermissions,
  ClassroomTabProps
} from '@/types/classroom';

import { useUnifiedSpaceMembership } from '@/hooks/useUnifiedSpaceMembership';

export function useClassroomAuth(space: ClassroomTabProps['space']): UseClassroomAuthReturn {
  const {
    isOwner,
    isAdmin,
    isMember,
    loading: membershipLoading,
  } = useUnifiedSpaceMembership(space?.id, space?.subdomain);

  const { user, loading: authLoading } = useOptimizedAuth();

  // Map SpacePermissions to ClassroomPermissions
  const permissions = useMemo((): ClassroomPermissions => {
    return {
      isOwner,
      isAdmin,
      isMember,
      canCreateCourse: isAdmin,
      canEditCourse: isAdmin,
      canDeleteCourse: isAdmin,
      canManageModules: isAdmin,
      canManageLessons: isAdmin,
      canViewAnalytics: isAdmin,
    };
  }, [isOwner, isAdmin, isMember]);

  // Create a stable reference for the auth return object
  const prevAuthRef = useRef<UseClassroomAuthReturn | null>(null);

  const currentAuth = useMemo(() => {
    return {
      user,
      authLoading: authLoading || membershipLoading,
      isAuthenticated: !authLoading && !!user,
      permissions,
      stableSpaceId: space?.id,
      stableOwnerId: space?.owner_id,
    };
  }, [user, authLoading, membershipLoading, permissions, space?.id, space?.owner_id]);

  // Maintain reference stability
  const stableAuth = useMemo(() => {
    const prev = prevAuthRef.current;
    if (!prev ||
      prev.authLoading !== currentAuth.authLoading ||
      prev.isAuthenticated !== currentAuth.isAuthenticated ||
      prev.user?.id !== currentAuth.user?.id ||
      prev.stableSpaceId !== currentAuth.stableSpaceId ||
      JSON.stringify(prev.permissions) !== JSON.stringify(currentAuth.permissions)
    ) {
      prevAuthRef.current = currentAuth;
      return currentAuth;
    }
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