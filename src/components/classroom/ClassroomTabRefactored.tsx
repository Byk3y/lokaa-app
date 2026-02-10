// React and routing
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Contexts and hooks
import { useSpace } from '@/contexts/SpaceContext';
import { useCachedClassroom } from '@/hooks/useCachedClassroom';
import { useClassroomAuth } from '@/hooks/classroom/useClassroomAuth';
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import { useToast } from '@/hooks/use-toast';

// Utils and services
import { log } from '@/utils/logger';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { generateSlug, getUniqueCourseSlug } from '@/utils/slugUtils';
import { extractTabFromPathname } from '@/utils/tabUtils';

// Components
import { CourseGrid } from './CourseGrid';
import CourseDetailView from './CourseDetailView';
import CreateCourseDialog from '../space/dialogs/CreateCourseDialog';
import EditCourseDialog from './dialogs/EditCourseDialog';

// Types
import type { CourseDisplayData } from '@/hooks/useClassroomCache';

interface ClassroomTabRefactoredProps {
  space?: {
    id: string;
    subdomain: string;
    owner_id: string;
    name: string;
  };
}

export const ClassroomTabRefactored = ({ space: propSpace }: ClassroomTabRefactoredProps = {}) => {
  const { space: contextSpace } = useSpace();
  const { toast } = useToast();

  // Use prop space as fallback for context space
  const currentSpace = contextSpace || propSpace;

  // ✅ Unified permission layer - using the refactored hook
  const { user, authLoading, isAuthenticated, permissions: effectivePermissions } = useClassroomAuth(currentSpace as any);

  const navigate = useNavigate();
  const location = useLocation();

  // ✅ FIXED: Use standard React Router navigation to determine tab state
  const currentTab = extractTabFromPathname(location.pathname);
  const isActiveTab = currentTab === 'classroom';

  // Use classroom cache system instead of Zustand store for proper progress synchronization
  const {
    courses,
    loading,
    error,
    refetch,
    updateCourse,
    removeCourse,
    addCourse,
    handleEnrollment,
    updateCourseProgress
  } = useCachedClassroom(
    currentSpace?.id && currentSpace.id !== '' ? currentSpace.id : undefined,
    user?.id,
    currentSpace?.owner_id
  );

  // Local state for view management only
  const [searchTerm, setSearchTermLocal] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid');

  // Create course dialog state
  const [isCreateCourseDialogOpen, setIsCreateCourseDialogOpen] = useState(false);
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);

  // Edit course dialog state
  const [isEditCourseDialogOpen, setIsEditCourseDialogOpen] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState<CourseDisplayData | null>(null);


  // Use context data
  const effectiveSpace = currentSpace;


  // Track previous active tab state for cache management
  // Effect  // Track activation for debugging
  const prevActiveTab = useRef(false);
  useEffect(() => {
    const isNowActive = isActiveTab;
    const wasInactive = !prevActiveTab.current;

    if (wasInactive && isNowActive) {
      if (effectiveSpace?.id) {
        log.debug('SpaceManagement', `🎓 [ClassroomTab] Tab activated for space ${effectiveSpace.id}, checking course data`);
      } else {
        log.debug('SpaceManagement', '🎓 [ClassroomTab] COMPONENT ACTIVATED - NO_ID state detected');
      }
    }
    prevActiveTab.current = isNowActive;
  }, [isActiveTab, effectiveSpace?.id]);

  // Effect to handle returning from course detail view to classroom
  useEffect(() => {
    // Only run this effect if this tab is currently active
    if (!isActiveTab) {
      log.debug('SpaceManagement', '🔄 [ClassroomTab] Skipping return check - not active tab');
      return;
    }

    // Dynamic pathname check - works for any subdomain
    const isOnClassroomPage = location.pathname.endsWith('/classroom') || location.pathname.includes('/courses/');

    // GUARD: Explicitly treat empty string ID as missing
    const hasSpaceInfo = !!effectiveSpace?.id && effectiveSpace.id !== '';
    const hasNoCourses = courses.length === 0;
    const isNotLoading = !loading;

    if (isActiveTab && process.env.NODE_ENV === 'development') {
      log.debug('SpaceManagement', '🎓 [ClassroomTab] Render State:', {
        id: hasSpaceInfo ? effectiveSpace?.id : `MISSING (${effectiveSpace?.id === '' ? 'EMPTY_STRING' : 'UNDEFINED'})`,
        subdomain: effectiveSpace?.subdomain,
        courses: courses.length,
        loading,
        hasAuth: !!user?.id
      });
    }

    // RECOVERY: If we're active but missing space ID, try to force a reload from the store
    const { loadActiveSpace } = useSpaceSettingsStore.getState();
    if (isActiveTab && !hasSpaceInfo && effectiveSpace?.subdomain && user?.id) {
      log.warn('SpaceManagement', `🛡️ [ClassroomTab] Missing Space ID for ${effectiveSpace.subdomain}, triggering recovery load`);
      loadActiveSpace({ subdomain: effectiveSpace.subdomain }, user.id, true);
    }

    // If we're on classroom page with no courses and not loading, trigger a refetch
    // ✅ PHASE 3.2 FIX: Don't trigger refetch while auth is still loading to prevent guest fetches
    if (isOnClassroomPage && hasSpaceInfo && hasNoCourses && isNotLoading && !authLoading) {
      log.debug('SpaceManagement', '🎓 [ClassroomTab] Triggering forced refetch - empty state detected while active');
      refetch();
    }
  }, [location.pathname, effectiveSpace?.id, courses.length, loading, isActiveTab, refetch, authLoading]);

  // Track courses updates
  useEffect(() => {
    if (courses.length > 0 && loading) {
      log.debug('SpaceManagement', '🔄 [ClassroomTab] Displaying stale courses while revalidating...');
    }
  }, [courses]);

  // ✅ FIX: Only render course detail view if we're actually on a course detail route
  // This prevents conflicts with SpaceTabContentTrulyPersistent routing logic
  // FIXED: Remove dependency on location.pathname which can be stale during state transitions
  const isOnCourseDetailRoute = location.pathname.match(/^\/[^\/]+\/space\/classroom\/[^\/]+$/);


  // Handle course selection (view course)
  const handleCourseView = (course: CourseDisplayData) => {
    if (process.env.NODE_ENV === 'development') {
      log.debug('SpaceManagement', `🎓 [ClassroomTab] Opening course detail view for course: ${course.id}`);
    }

    // Get subdomain from current URL path as fallback
    const currentPath = window.location.pathname;
    const pathSegments = currentPath.split('/').filter(Boolean);
    const subdomainFromPath = pathSegments[0]; // First segment should be subdomain

    const subdomain = effectiveSpace?.subdomain || subdomainFromPath;

    // ✅ FIX: Use new URL pattern consistently - use short_id for cleaner URLs (Skool-style)
    const courseIdentifier = course.short_id || course.slug || course.id;
    const courseUrl = `/${subdomain}/space/classroom/${courseIdentifier}`;

    // Update local state for immediate feedback if needed, although routing handles it
    setSelectedCourseId(course.id);
    setViewMode('detail');

    // Try navigation with replace: false to ensure proper history handling
    try {
      navigate(courseUrl, { replace: false });
    } catch (error) {
      log.error('SpaceManagement', `🎓 [ClassroomTab] Navigation error:`, error instanceof Error ? error : new Error(String(error)));
      // Fallback to window.location
      window.location.href = courseUrl;
    }
  };

  // Handle back to grid view
  const handleBackToGrid = () => {
    log.debug('Component', '🎓 [ClassroomTab] Returning to course grid view');
    setSelectedCourseId(null);
    setViewMode('grid');
  };

  // Handle create course
  const handleCreateCourseInternal = () => {
    log.debug('Component', '🎓 [ClassroomTab] Opening create course dialog');
    setIsCreateCourseDialogOpen(true);
  };

  // Handle edit course
  const handleEditCourseInternal = (course: CourseDisplayData) => {
    log.debug('Component', '🎓 [ClassroomTab] Opening edit course dialog for:', course.title);
    setCourseToEdit(course);
    setIsEditCourseDialogOpen(true);
  };

  // Handle course updated from edit dialog
  const handleCourseUpdated = (updatedCourse: CourseDisplayData) => {
    log.debug('Component', '🎓 [ClassroomTab] Course updated:', updatedCourse.title);
    updateCourse(updatedCourse.id, updatedCourse);
    setIsEditCourseDialogOpen(false);
    setCourseToEdit(null);
  };

  // Handle course creation from dialog
  const handleCourseCreate = async (courseData: {
    title: string;
    description: string;
    accessType: 'open' | 'paid';
    price: number | null;
    currency: string;
    isPublished: boolean;
    coverImageUrl?: string;
  }) => {
    if (!effectiveSpace?.id || !user?.id) {
      toast({
        title: "Error",
        description: "Unable to create course. Missing space or user information.",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingCourse(true);
    try {
      if (!effectiveSpace?.id) throw new Error('No space ID available');

      // Generate unique slug for the course
      const baseSlug = generateSlug(courseData.title);
      const uniqueSlug = await getUniqueCourseSlug(baseSlug, effectiveSpace.id);

      log.debug('Component', '🎓 [ClassroomTab] Generated slug for course:', { baseSlug, uniqueSlug });

      const supabaseClient = getSupabaseClient();
      if (!supabaseClient) {
        throw new Error('Supabase client not available');
      }

      const { data, error } = await supabaseClient
        .from('courses')
        .insert({
          title: courseData.title,
          description: courseData.description,
          space_id: effectiveSpace.id,
          creator_id: user.id,
          access_type: courseData.accessType,
          price: courseData.price,
          currency: courseData.currency,
          is_published: courseData.isPublished,
          cover_image_url: courseData.coverImageUrl,
          slug: uniqueSlug,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Transform and add to courses list using classroom cache
      const newCourse = {
        ...data,
        image_url: data.cover_image_url, // Map cover_image_url to image_url for CourseCard compatibility
        slug: data.slug, // Include slug for URL routing
        students: 0,
        enrolled: false,
        progress: undefined // Let the cache system calculate progress
      } as CourseDisplayData;

      addCourse(newCourse);

      toast({
        title: "Course Created",
        description: `"${courseData.title}" has been created successfully.`,
        variant: "default"
      });

      setIsCreateCourseDialogOpen(false);
    } catch (error) {
      log.error('Component', 'Failed to create course:', error instanceof Error ? error : new Error(String(error)));
      toast({
        title: "Error",
        description: "Failed to create course. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingCourse(false);
    }
  };

  // Handle course deletion
  const handleDeleteCourse = async (course: CourseDisplayData) => {
    if (!confirm(`Are you sure you want to delete "${course.title}" ? This action cannot be undone.`)) {
      return;
    }

    try {
      const supabaseClient = getSupabaseClient();
      if (!supabaseClient) {
        throw new Error('Supabase client not available');
      }

      const { error } = await supabaseClient
        .from('courses')
        .delete()
        .eq('id', course.id);

      if (error) throw error;

      // Remove from courses list
      removeCourse(course.id);

      toast({
        title: "Course Deleted",
        description: `"${course.title}" has been deleted successfully.`,
        variant: "default"
      });
    } catch (error: unknown) {
      log.error('Component', 'Error deleting course:', error instanceof Error ? error : new Error(String(error)));
      toast({
        title: "Error Deleting Course",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };



  // ✅ FIXED: Use standard React Router navigation to determine tab state
  // Render course detail view only if we're on a course detail route AND classroom tab is active
  const isClassroomTabActive = currentTab === 'classroom';

  if (viewMode === 'detail' && selectedCourseId && isOnCourseDetailRoute && isClassroomTabActive) {
    return (
      <>
        <CourseDetailView
          courseId={selectedCourseId}
          onBack={handleBackToGrid}
        />
      </>
    );
  }

  // FIXED: Reset view mode if we're not on a course detail route OR classroom tab is not active
  if (viewMode === 'detail' && (!isOnCourseDetailRoute || !isClassroomTabActive)) {
    setViewMode('grid');
    setSelectedCourseId(null);
  }

  // Enrollment handlers
  const handleEnroll = (course: CourseDisplayData) => handleEnrollment(course.id, true);
  const handleUnenroll = (courseIdOrCourse: string | CourseDisplayData) => {
    const id = typeof courseIdOrCourse === 'string' ? courseIdOrCourse : courseIdOrCourse.id;
    handleEnrollment(id, false);
  };
  const handleClearSearch = () => setSearchTermLocal("");

  return (
    <>
      <CourseGrid
        key={`course-grid-${effectiveSpace?.id}-${isActiveTab}`}
        courses={courses}
        isLoading={loading}
        authLoading={authLoading}
        hasSpaceOwnerInfo={!!(effectiveSpace && effectiveSpace.id && user)}
        hasValidAuth={isAuthenticated}
        isOwner={effectivePermissions?.isOwner ?? false}
        isAdmin={effectivePermissions?.isAdmin ?? false}
        user={user}
        onCreateCourse={handleCreateCourseInternal}
        onViewCourse={handleCourseView}
        onEditCourse={handleEditCourseInternal}
        onEnroll={handleEnroll}
        onUnenroll={handleUnenroll}
        onDeleteCourse={handleDeleteCourse}
        onClearSearch={handleClearSearch}
        isProcessingEnrollment={null}
        primaryColor={'#26A69A'}
        searchTerm={searchTerm}
      />

      {/* Course Creation Dialog */}
      <CreateCourseDialog
        isOpen={isCreateCourseDialogOpen}
        onOpenChange={setIsCreateCourseDialogOpen}
        onCreateCourse={handleCourseCreate}
        isCreating={isCreatingCourse}
        spacePricingType={'free'}
        primaryColor={'#26A69A'}
      />

      {/* Course Edit Dialog */}
      <EditCourseDialog
        isOpen={isEditCourseDialogOpen}
        onOpenChange={setIsEditCourseDialogOpen}
        course={courseToEdit}
        spacePricingType={'free'}
        primaryColor={'#26A69A'}
        onCourseUpdated={handleCourseUpdated}
      />
    </>
  );
};
