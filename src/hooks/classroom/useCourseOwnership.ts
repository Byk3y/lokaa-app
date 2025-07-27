import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSpace } from '@/contexts/SpaceContext';
import type { CourseDetailData } from '@/types/classroom/courseDetail';
import { log } from '@/utils/logger';

interface UseCourseOwnershipReturn {
  isOwner: boolean;
  ownershipLoading: boolean;
  error: string | null;
  checkOwnership: () => Promise<void>;
  ownershipDetails: {
    isCourseCreator: boolean;
    isGeneralAdmin: boolean;
    isSpaceAdmin: boolean;
    isSpaceOwner: boolean;
    canEdit: boolean;
  } | null;
}

interface UseCourseOwnershipProps {
  course: CourseDetailData | null;
  onOwnershipChange?: (isOwner: boolean) => void;
}

/**
 * Custom hook for managing course ownership and permission checking
 * Extracted from CourseDetailView.tsx to improve maintainability and testability
 */
export const useCourseOwnership = (props: UseCourseOwnershipProps): UseCourseOwnershipReturn => {
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [ownershipLoading, setOwnershipLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [ownershipDetails, setOwnershipDetails] = useState<{
    isCourseCreator: boolean;
    isGeneralAdmin: boolean;
    isSpaceAdmin: boolean;
    isSpaceOwner: boolean;
    canEdit: boolean;
  } | null>(null);

  const { user } = useAuth();
  const { space } = useSpace();

  const checkOwnership = useCallback(async () => {
    try {
      setError(null);
      setOwnershipLoading(true);
      
      const supabase = getSupabaseClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser || !props.course) {
        setIsOwner(false);
        setOwnershipDetails(null);
        return;
      }

      // Check if user is the course creator
      const isCourseCreator = authUser.id === props.course.creator_id;
      
      // Check if user is a general admin
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', authUser.id)
        .single();
      
      const isGeneralAdmin = userProfile?.role === 'admin';
      
      // Check if user is a space admin (for the space this course belongs to)
      let isSpaceAdmin = false;
      if (props.course.space_id) {
        const { data: spaceMembership, error: membershipError } = await supabase
          .from('space_members')
          .select('role, status')
          .eq('space_id', props.course.space_id)
          .eq('user_id', authUser.id)
          .single();
        
        if (membershipError && membershipError.code !== 'PGRST116') {
          log.error('Component', 'Error checking space membership:', membershipError);
        }
        
        isSpaceAdmin = spaceMembership?.role === 'admin' && spaceMembership?.status === 'active';
      }

      // Check if user is the space owner
      const isSpaceOwner = space?.owner_id === authUser.id;
      
      // User can edit if they're the creator OR a general admin OR a space admin OR the space owner
      const canEdit = isCourseCreator || isGeneralAdmin || isSpaceAdmin || isSpaceOwner;

      const details = {
        isCourseCreator,
        isGeneralAdmin,
        isSpaceAdmin,
        isSpaceOwner,
        canEdit
      };

      log.debug('Component', '🎓 [useCourseOwnership] Ownership check:', {
        hasUser: !!authUser,
        hasCourse: !!props.course,
        userId: authUser.id,
        courseCreatorId: props.course.creator_id,
        isCourseCreator,
        userRole: userProfile?.role,
        isGeneralAdmin,
        spaceId: props.course.space_id,
        spaceOwnerId: space?.owner_id,
        isSpaceAdmin,
        isSpaceOwner,
        canEdit,
        courseTitle: props.course.title
      });



      setIsOwner(canEdit);
      setOwnershipDetails(details);

      // Call optional callback for ownership changes
      if (props.onOwnershipChange) {
        props.onOwnershipChange(canEdit);
      }

    } catch (error) {
      log.error('Component', 'Error checking ownership:', error);
      setError('Failed to check ownership permissions');
      setIsOwner(false);
      setOwnershipDetails(null);
    } finally {
      setOwnershipLoading(false);
    }
  }, [props.course, space?.owner_id, props.onOwnershipChange]);

  // Auto-check ownership when course changes
  useEffect(() => {
    if (props.course) {
      checkOwnership();
    } else {
      setIsOwner(false);
      setOwnershipLoading(false);
      setOwnershipDetails(null);
    }
  }, [props.course, checkOwnership]);

  return {
    isOwner,
    ownershipLoading,
    error,
    checkOwnership,
    ownershipDetails
  };
}; 