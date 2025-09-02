import { log } from '@/utils/logger';
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CourseGrid } from './CourseGrid';
import CourseDetailView from './CourseDetailView';
import CreateCourseDialog from '../space/dialogs/CreateCourseDialog';
import EditCourseDialog from './dialogs/EditCourseDialog';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/contexts/AuthContext';
import { useSpace } from '@/contexts/SpaceContext';
import { toast } from '@/hooks/use-toast';
import { getCourseUrl, generateSlug, getUniqueCourseSlug } from '@/utils/slugUtils';
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import type { CourseDisplayData } from '@/hooks/useClassroomCache';
// ✅ FIXED: Removed usePersistentTabs - using standard React Router navigation
import { extractTabFromPathname } from '@/utils/tabUtils';
import { useCachedClassroom } from '@/hooks/useCachedClassroom';

export const ClassroomTabRefactored = ({
  courses: propCourses = [],
  loading: propLoading = false,
  auth: propAuth = null,
  space: propSpace = null,
  permissions: propPermissions = { isOwner: false, isAdmin: false, canCreateContent: false },
  handleCreateCourse = () => {},
  handleViewCourse = () => {},
  handleEditCourse = () => {},
  handleEnroll = () => {},
  handleUnenroll = () => {},
  handleClearSearch = () => {},
  searchTerm: propSearchTerm = "",
  setSearchTerm = () => {},
} = {}) => {
  // Get auth and space context
  const { user, loading: authLoading } = useOptimizedAuth();
  const { space: currentSpace } = useSpace();
  const { permissions: spacePermissions } = useSpaceSettingsStore();
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
  } = useCachedClassroom(currentSpace?.id, user?.id, currentSpace?.owner_id);
  
  // Local state for view management only
  const [searchTerm, setSearchTermLocal] = useState(propSearchTerm);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid');
  
  // Create course dialog state
  const [isCreateCourseDialogOpen, setIsCreateCourseDialogOpen] = useState(false);
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  
  // Edit course dialog state
  const [isEditCourseDialogOpen, setIsEditCourseDialogOpen] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState<CourseDisplayData | null>(null);
  
  
  // Use context data if props aren't provided
  const effectiveSpace = propSpace || currentSpace;
  const effectiveAuth = propAuth || { user, isAuthenticated: !!user, authLoading };
  
  // Fix permissions logic with stable loading state to prevent flashing
  // Don't show/hide admin buttons until permissions are definitively loaded
  const effectivePermissions = React.useMemo(() => {
    // If spacePermissions is explicitly null (still loading), keep stable state
    if (spacePermissions === null) {
      // During loading, use propPermissions if available, otherwise remain stable
      return propPermissions || {
        isOwner: false,
        isAdmin: false,
        canCreateContent: false
      };
    }
    
    // Once spacePermissions has loaded (not null), use it as authoritative
    return spacePermissions || {
      isOwner: false,
      isAdmin: false,
      canCreateContent: false
    };
  }, [spacePermissions, propPermissions]);

  
  // Track previous active tab state for cache management
  const prevActiveTab = useRef(isActiveTab);
  
  // Effect to handle tab activation and cache management
  useEffect(() => {
    const wasInactive = !prevActiveTab.current;
    const isNowActive = isActiveTab;
    
    if (wasInactive && isNowActive) {
      log.debug('Component', '🔄 [ClassroomTab] Component activated, checking course data');
      // The classroom cache system will automatically handle data fetching
    }
    
    prevActiveTab.current = isActiveTab;
  }, [isActiveTab, effectiveSpace?.id]);

  // Effect to handle returning from course detail view to classroom
  useEffect(() => {
    // Only run this effect if this tab is currently active
    if (!isActiveTab) {
      log.debug('Component', '🔄 [ClassroomTab] Skipping return check - not active tab');
      return;
    }
    
    // Dynamic pathname check - works for any subdomain
    const isOnClassroomPage = location.pathname.endsWith('/space/classroom');
    const hasSpaceInfo = !!effectiveSpace?.id;
    const hasNoCourses = courses.length === 0;
    const isNotLoading = !loading;
    
    log.debug('Component', '🔄 [ClassroomTab] Return check:', {
      isOnClassroomPage,
      hasSpaceInfo,
      hasNoCourses,
      isNotLoading,
      pathname: location.pathname,
      isActiveTab
    });
    
    // If we're on classroom page with no courses and not loading, trigger a refetch
    if (isOnClassroomPage && hasSpaceInfo && hasNoCourses && isNotLoading) {
      log.debug('Component', '🔄 [ClassroomTab] Detected return to classroom without courses, triggering refetch');
      refetch();
    }
  }, [location.pathname, effectiveSpace?.id, courses.length, loading, isActiveTab, refetch]);
  
  // Track courses updates
  useEffect(() => {
    if (courses.length > 0) {
      log.debug('Component', '🔄 [ClassroomTab] Courses loaded:', courses.length);
    }
  }, [courses]);

  // ✅ FIX: Only render course detail view if we're actually on a course detail route
  // This prevents conflicts with SpaceTabContentTrulyPersistent routing logic
  // FIXED: Remove dependency on location.pathname which can be stale during state transitions
  const isOnCourseDetailRoute = location.pathname.match(/^\/[^\/]+\/space\/classroom\/[^\/]+$/);


  // Handle course selection (view course)
  const handleCourseView = (course: CourseDisplayData) => {
    if (process.env.NODE_ENV === 'development') {
      log.debug('Component', `🎓 [ClassroomTab] Opening course detail view for course: ${course.id}`);
    }
    
    // Get subdomain from current URL path as fallback
    const currentPath = window.location.pathname;
    const pathSegments = currentPath.split('/').filter(Boolean);
    const subdomainFromPath = pathSegments[0]; // First segment should be subdomain
    
    const subdomain = effectiveSpace?.subdomain || subdomainFromPath;
    
    // ✅ FIX: Use new URL pattern consistently - use short_id for cleaner URLs (Skool-style)
    const courseIdentifier = course.short_id || course.slug || course.id;
    const courseUrl = `/${subdomain}/space/classroom/${courseIdentifier}`;
    
    // Try navigation with replace: false to ensure proper history handling
    try {
      navigate(courseUrl, { replace: false });
    } catch (error) {
      log.error('Component', `🎓 [ClassroomTab] Navigation error:`, error instanceof Error ? error : new Error(String(error)));
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
      const supabase = getSupabaseClient();
      
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
    if (!confirm(`Are you sure you want to delete "${course.title}"? This action cannot be undone.`)) {
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

  return (
    <>
      <CourseGrid
        key={`course-grid-${effectiveSpace?.id}-${isActiveTab}`}
        courses={courses}
        isLoading={loading}
        authLoading={effectiveAuth?.authLoading ?? false}
        hasSpaceOwnerInfo={!!(effectiveSpace && effectiveSpace.id && user)}
        hasValidAuth={effectiveAuth?.isAuthenticated ?? true}
        isOwner={effectivePermissions?.isOwner ?? false}
        isAdmin={effectivePermissions?.isAdmin ?? false}
        user={effectiveAuth?.user}
        onCreateCourse={handleCreateCourseInternal}
        onViewCourse={handleCourseView}
        onEditCourse={handleEditCourseInternal}
        onEnroll={handleEnroll}
        onUnenroll={handleUnenroll}
        onDeleteCourse={handleDeleteCourse}
        onClearSearch={handleClearSearch}
        isProcessingEnrollment={null}
        primaryColor={effectiveSpace?.primary_color ?? '#26A69A'}
        searchTerm={searchTerm}
      />

      {/* Course Creation Dialog */}
      <CreateCourseDialog
        isOpen={isCreateCourseDialogOpen}
        onOpenChange={setIsCreateCourseDialogOpen}
        onCreateCourse={handleCourseCreate}
        isCreating={isCreatingCourse}
        spacePricingType={effectiveSpace?.pricing_type}
        primaryColor={effectiveSpace?.primary_color ?? '#26A69A'}
      />

      {/* Course Edit Dialog */}
      <EditCourseDialog
        isOpen={isEditCourseDialogOpen}
        onOpenChange={setIsEditCourseDialogOpen}
        course={courseToEdit}
        spacePricingType={effectiveSpace?.pricing_type}
        primaryColor={effectiveSpace?.primary_color ?? '#26A69A'}
        onCourseUpdated={handleCourseUpdated}
      />
    </>
  );
};
