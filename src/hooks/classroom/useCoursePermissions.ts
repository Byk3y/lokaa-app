import { useCallback, useEffect, useState } from 'react';
import { log } from '@/utils/logger';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PermissionData {
  canViewDrafts: boolean;
  isCreator: boolean;
  isGeneralAdmin: boolean;
  isSpaceAdmin: boolean;
  userId: string | null;
  courseId: string | null;
}

interface UseCoursePermissionsReturn {
  // Permission checking functions
  checkPermissions: (courseId: string) => Promise<PermissionData>;
  canViewDrafts: boolean;
  isCreator: boolean;
  isGeneralAdmin: boolean;
  isSpaceAdmin: boolean;
  
  // Current permission state
  currentPermissions: PermissionData | null;
  permissionsLoading: boolean;
  permissionsError: string | null;
}

interface UseCoursePermissionsOptions {
  enableLogging?: boolean;
  autoCheckOnMount?: boolean;
  courseId?: string | null;
}

/**
 * Custom hook for checking user permissions and access control for courses
 * 
 * Features:
 * - User role validation (creator, admin, space admin)
 * - Course access control
 * - Draft viewing permissions
 * - Cached permission checking
 * - Comprehensive logging for debugging
 */
export function useCoursePermissions(options: UseCoursePermissionsOptions = {}): UseCoursePermissionsReturn {
  const {
    enableLogging = true,
    autoCheckOnMount = false,
    courseId = null
  } = options;

  const { user } = useAuth();
  const [currentPermissions, setCurrentPermissions] = useState<PermissionData | null>(null);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);

  // Main permission checking function
  const checkPermissions = useCallback(async (courseId: string): Promise<PermissionData> => {
    if (!user?.id) {
      const defaultPermissions: PermissionData = {
        canViewDrafts: false,
        isCreator: false,
        isGeneralAdmin: false,
        isSpaceAdmin: false,
        userId: null,
        courseId
      };
      
      if (enableLogging) {
        log.debug('Hook', '🔐 [useCoursePermissions] No user authenticated, returning default permissions');
      }
      
      return defaultPermissions;
    }

    try {
      setPermissionsLoading(true);
      setPermissionsError(null);
      
      if (enableLogging) {
        log.debug('Hook', `🔐 [useCoursePermissions] Checking permissions for course: ${courseId}`);
      }

      const supabase = getSupabaseClient();

      // Get current user session
      const { data: { user: currentUser }, error: sessionError } = await supabase.auth.getUser();
      if (sessionError || !currentUser) {
        throw new Error('Authentication error');
      }

      // Fetch course data to get creator and space info
      // Try to determine if courseId is a UUID, short_id, or slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId);
      const isShortId = /^[a-zA-Z0-9]{8}$/.test(courseId); // 8 character alphanumeric
      
      let courseQuery = supabase.from('courses').select('creator_id, space_id');
      
      if (isUUID) {
        courseQuery = courseQuery.eq('id', courseId);
      } else if (isShortId) {
        courseQuery = courseQuery.eq('short_id', courseId);
      } else {
        courseQuery = courseQuery.eq('slug', courseId);
      }
      
      let { data: courseData, error: courseError } = await courseQuery.single();

      if (courseError) {
        // If short_id lookup failed, try slug lookup as fallback
        if (isShortId) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('courses')
            .select('creator_id, space_id')
            .eq('slug', courseId)
            .single();
          
          if (fallbackError) {
            const { data: uuidFallbackData, error: uuidFallbackError } = await supabase
              .from('courses')
              .select('creator_id, space_id')
              .eq('id', courseId)
              .single();
            
            if (uuidFallbackError) throw uuidFallbackError;
            courseData = uuidFallbackData;
          } else {
            courseData = fallbackData;
          }
        } else if (!isUUID) {
          // If slug lookup failed, try short_id and UUID lookup as fallback
          const { data: shortIdFallbackData, error: shortIdFallbackError } = await supabase
            .from('courses')
            .select('creator_id, space_id')
            .eq('short_id', courseId)
            .single();
          
          if (shortIdFallbackError) {
            const { data: uuidFallbackData, error: uuidFallbackError } = await supabase
              .from('courses')
              .select('creator_id, space_id')
              .eq('id', courseId)
              .single();
            
            if (uuidFallbackError) throw uuidFallbackError;
            courseData = uuidFallbackData;
          } else {
            courseData = shortIdFallbackData;
          }
        } else {
          throw courseError;
        }
      }

      if (courseError) {
        throw new Error('Course not found');
      }

      // Check if user is the creator
      const isCreator = currentUser.id === courseData.creator_id;

      // Check if user is a general admin
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('role')
        .eq('id', currentUser.id)
        .single();

      const isGeneralAdmin = userProfile?.role === 'admin';

      // Check if user is a space admin
      let isSpaceAdmin = false;
      if (courseData.space_id) {
        const { data: spaceMembership, error: membershipError } = await supabase
          .from('space_members')
          .select('role, status')
          .eq('space_id', courseData.space_id)
          .eq('user_id', currentUser.id)
          .single();

        isSpaceAdmin = spaceMembership?.role === 'admin' && spaceMembership?.status === 'active';
      }

      // Determine if user can view drafts
      const canViewDrafts = isCreator || isGeneralAdmin || isSpaceAdmin;

      const permissions: PermissionData = {
        canViewDrafts,
        isCreator,
        isGeneralAdmin,
        isSpaceAdmin,
        userId: currentUser.id,
        courseId
      };

      if (enableLogging) {
        log.debug('Hook', '🔐 [useCoursePermissions] Permissions calculated:', {
          courseId,
          userId: currentUser.id,
          isCreator,
          isGeneralAdmin,
          isSpaceAdmin,
          canViewDrafts
        });
      }

      setCurrentPermissions(permissions);
      return permissions;

    } catch (error: any) {
      const errorMessage = error.message || 'Failed to check permissions';
      
      if (enableLogging) {
        log.error('Hook', '🔐 [useCoursePermissions] Error checking permissions:', error);
      }

      setPermissionsError(errorMessage);
      
      // Return default permissions on error
      const defaultPermissions: PermissionData = {
        canViewDrafts: false,
        isCreator: false,
        isGeneralAdmin: false,
        isSpaceAdmin: false,
        userId: user?.id || null,
        courseId
      };

      return defaultPermissions;
    } finally {
      setPermissionsLoading(false);
    }
  }, [user?.id, enableLogging]);

  // Auto-check permissions on mount if enabled
  useEffect(() => {
    if (autoCheckOnMount && courseId) {
      checkPermissions(courseId);
    }
  }, [autoCheckOnMount, courseId, checkPermissions]);

  return {
    checkPermissions,
    canViewDrafts: currentPermissions?.canViewDrafts || false,
    isCreator: currentPermissions?.isCreator || false,
    isGeneralAdmin: currentPermissions?.isGeneralAdmin || false,
    isSpaceAdmin: currentPermissions?.isSpaceAdmin || false,
    currentPermissions,
    permissionsLoading,
    permissionsError
  };
} 