import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CourseGrid } from './CourseGrid';
import CourseDetailView from './CourseDetailView';
import CreateCourseDialog from '../space/dialogs/CreateCourseDialog';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/contexts/AuthContext';
import { useSpace } from '@/contexts/SpaceContext';
import { toast } from '@/hooks/use-toast';
import { getCourseUrl, generateSlug, getUniqueCourseSlug } from '@/utils/slugUtils';
import { useClassroomStore } from '@/stores/classroom/classroomStore';
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import type { CourseDisplayData } from '@/hooks/useClassroomCache';

export const ClassroomTabRefactored = ({
  courses: propCourses = [],
  loading: propLoading = false,
  auth: propAuth = null,
  space: propSpace = null,
  permissions: propPermissions = { isOwner: false },
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
  
  // Check if this component is currently the active tab
  const isActiveTab = location.pathname.includes('/classroom');
  
  // Zustand store state and actions
  const courses = useClassroomStore(state => state.courses);
  const loading = useClassroomStore(state => state.loading);
  const setCourses = useClassroomStore(state => state.setCourses);
  const setLoading = useClassroomStore(state => state.setLoading);
  const addCourse = useClassroomStore(state => state.addCourse);
  const removeCourse = useClassroomStore(state => state.removeCourse);
  const lastRefreshTime = useClassroomStore(state => state.lastRefreshTime);
  const hasValidCache = useClassroomStore(state => state.hasValidCache);
  const cacheExpiry = useClassroomStore(state => state.cacheExpiry);
  
  // Local state for view management only
  const [searchTerm, setSearchTermLocal] = useState(propSearchTerm);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid');
  
  // Create course dialog state
  const [isCreateCourseDialogOpen, setIsCreateCourseDialogOpen] = useState(false);
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  
  
  // Use context data if props aren't provided
  const effectiveSpace = propSpace || currentSpace;
  const effectiveAuth = propAuth || { user, isAuthenticated: !!user, authLoading };
  
  
  // Fix permission calculation - only use prop permissions if explicitly set
  const effectivePermissions = propPermissions.isOwner === true ? propPermissions : { 
    isOwner: !!(user?.id && effectiveSpace?.owner_id && user.id === effectiveSpace.owner_id),
    isAdmin: spacePermissions?.isAdmin ?? false,
    canCreateContent: spacePermissions?.canCreateContent ?? false
  };
  
  // Debug permission calculation
  console.log('🔐 [ClassroomTab] Permission debug:', {
    userId: user?.id,
    spaceOwnerId: effectiveSpace?.owner_id,
    isOwner: effectivePermissions.isOwner,
    isAdmin: effectivePermissions.isAdmin,
    canCreateContent: effectivePermissions.canCreateContent,
    propIsOwner: propPermissions.isOwner,
    hasSpace: !!effectiveSpace,
    spaceName: effectiveSpace?.name
  });
  

  // Calculate hasSpaceOwnerInfo for loading states
  // If we have space data and user data, we have enough info to proceed
  const hasSpaceOwnerInfo = !!(effectiveSpace && effectiveSpace.id && user);



  // Track when component becomes active (for cached components)
  const prevActiveTab = useRef(isActiveTab);
  
  // Simple component mount/unmount effect
  useEffect(() => {
    console.log('🔄 [ClassroomTab] Component mounted/updated, courses length:', courses?.length || 0);
  }, []);
  
  // Effect to handle when cached component becomes active
  useEffect(() => {
    const wasInactive = !prevActiveTab.current;
    const isNowActive = isActiveTab;
    
    if (wasInactive && isNowActive) {
      console.log('🔄 [ClassroomTab] Component activated from cache, checking course data');
      // Check if cache is expired
      const now = Date.now();
      const cacheAge = lastRefreshTime ? now - lastRefreshTime : Infinity;
      const isCacheExpired = cacheAge > cacheExpiry;
      
      if (isCacheExpired || !hasValidCache) {
        console.log('🔄 [ClassroomTab] Cache expired or invalid, refreshing course data');
        setLoading(true);
      } else {
        console.log('🔄 [ClassroomTab] Using valid cached course data');
      }
    }
    
    prevActiveTab.current = isActiveTab;
  }, [isActiveTab, effectiveSpace?.id, loading, lastRefreshTime, hasValidCache, cacheExpiry]);

  // Effect to handle returning from course detail view to classroom
  useEffect(() => {
    // Only run this effect if this tab is currently active
    if (!isActiveTab) {
      console.log('🔄 [ClassroomTab] Skipping return check - not active tab');
      return;
    }
    
    // Dynamic pathname check - works for any subdomain
    const isOnClassroomPage = location.pathname.endsWith('/space/classroom');
    const hasSpaceInfo = !!effectiveSpace?.id;
    const hasNoCourses = courses.length === 0;
    const isNotLoading = !loading;
    const hasCacheExpired = lastRefreshTime ? (Date.now() - lastRefreshTime) > cacheExpiry : true;
    
    console.log('🔄 [ClassroomTab] Return check:', {
      isOnClassroomPage,
      hasSpaceInfo,
      hasNoCourses,
      isNotLoading,
      hasCacheExpired,
      pathname: location.pathname,
      isActiveTab,
      lastRefreshTime: lastRefreshTime ? new Date(lastRefreshTime).toISOString() : 'never'
    });
    
    // Only trigger fetch if we're on classroom page, have space info, no courses, not loading, and cache has expired
    if (isOnClassroomPage && hasSpaceInfo && hasNoCourses && isNotLoading && hasCacheExpired) {
      console.log('🔄 [ClassroomTab] Detected return to classroom without courses and expired cache, forcing fetch');
      setLoading(true);
    }
  }, [location.pathname, effectiveSpace?.id, courses.length, loading, isActiveTab, lastRefreshTime, cacheExpiry]);
  
  // Removed safety net effect that was causing loading loops
  
  // Track courses updates
  useEffect(() => {
    if (courses.length > 0) {
      console.log('🔄 [ClassroomTab] Courses loaded:', courses.length);
    }
  }, [courses]);

  // Fetch courses from database
  useEffect(() => {
    // Only fetch courses if this tab is currently active
    if (!isActiveTab) {
      console.log('🔍 [ClassroomTab] Skipping course fetch - not active tab');
      return;
    }
    
    const fetchCourses = async () => {
      if (!effectiveSpace?.id) {
        console.log('🔍 [ClassroomTab] No space ID, skipping fetch');
        setLoading(false); // Ensure loading is false if we skip
        return;
      }
      
      // Only skip if we're not loading AND cache is valid (regardless of course count)
      const now = Date.now();
      const cacheAge = lastRefreshTime ? now - lastRefreshTime : Infinity;
      const isCacheValid = hasValidCache && cacheAge < cacheExpiry;
      
      if (!loading && isCacheValid) {
        console.log('🔍 [ClassroomTab] Not in loading state and have valid cache, skipping fetch');
        return;
      }
      
      // Set loading state if we need to fetch
      if (!loading) {
        console.log('🔍 [ClassroomTab] Setting loading state for course fetch');
        setLoading(true);
      }
      
      console.log('🔍 [ClassroomTab] Fetching courses for space:', effectiveSpace.id);
      try {
        const supabase = getSupabaseClient();
        // Build query - owners can see all courses, members only see published ones
        let query = supabase
          .from('courses')
          .select(`
            id,
            title,
            description,
            slug,
            access_type,
            price,
            currency,
            is_published,
            created_at,
            updated_at,
            space_id,
            creator_id,
            cover_image_url
          `)
          .eq('space_id', effectiveSpace.id);
          
        // Non-owners should only see published courses
        if (!effectivePermissions.isOwner) {
          query = query.eq('is_published', true);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
          
        if (error) {
          console.error('Error fetching courses:', error);
          setLoading(false);
          return;
        }
        
        // Transform data to match CourseDisplayData interface
        const transformedCourses = data?.map(course => ({
          ...course,
          image_url: course.cover_image_url,
          slug: course.slug,
          students: 0,
          enrolled: false,
          progress: 0
        })) || [];
        
        setCourses(transformedCourses);
        console.log(`🎓 [ClassroomTab] Loaded ${transformedCourses.length} courses`);
      } catch (error) {
        console.error('Failed to fetch courses:', error);
        setLoading(false);
      }
    };

    // Only fetch if loading is true or cache is invalid
    if (loading || !hasValidCache || (lastRefreshTime && (Date.now() - lastRefreshTime) > cacheExpiry)) {
      fetchCourses();
    }
  }, [effectiveSpace?.id, effectivePermissions?.isOwner, user?.id, loading, isActiveTab, hasValidCache, lastRefreshTime, cacheExpiry]);

  // Handle course selection (view course)
  const handleCourseView = (course: CourseDisplayData) => {
    console.log(`🎓 [ClassroomTab] Opening course detail view for course: ${course.id}`, course);
    console.log(`🎓 [ClassroomTab] Space subdomain:`, effectiveSpace?.subdomain);
    console.log(`🎓 [ClassroomTab] Current location:`, window.location.pathname);
    
    // Get subdomain from current URL path as fallback
    const currentPath = window.location.pathname;
    const pathSegments = currentPath.split('/').filter(Boolean);
    const subdomainFromPath = pathSegments[0]; // First segment should be subdomain
    
    const subdomain = effectiveSpace?.subdomain || subdomainFromPath;
    console.log(`🎓 [ClassroomTab] Using subdomain:`, subdomain);
    
    // Navigate to course URL using slug or ID
    const courseIdentifier = course.slug || course.id;
    const courseUrl = `/${subdomain}/space/classroom/${courseIdentifier}`;
    
    console.log(`🎓 [ClassroomTab] Generated course URL:`, courseUrl);
    console.log(`🎓 [ClassroomTab] Navigating to:`, courseUrl);
    
    // Try navigation with replace: false to ensure proper history handling
    try {
      navigate(courseUrl, { replace: false });
      console.log(`🎓 [ClassroomTab] Navigation attempted successfully`);
    } catch (error) {
      console.error(`🎓 [ClassroomTab] Navigation error:`, error);
      // Fallback to window.location
      window.location.href = courseUrl;
    }
  };

  // Handle back to grid view
  const handleBackToGrid = () => {
    console.log('🎓 [ClassroomTab] Returning to course grid view');
    setSelectedCourseId(null);
    setViewMode('grid');
  };

  // Handle create course
  const handleCreateCourseInternal = () => {
    console.log('🎓 [ClassroomTab] Opening create course dialog');
    setIsCreateCourseDialogOpen(true);
  };

  // Handle course creation from dialog
  const handleCourseCreate = async (courseData: {
    title: string;
    description: string;
    accessType: "open" | "paid";
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
      
      console.log('🎓 [ClassroomTab] Generated slug for course:', { baseSlug, uniqueSlug });
      
      const { data, error } = await supabase
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

      // Transform and add to courses list
      const newCourse = {
        ...data,
        image_url: data.cover_image_url, // Map cover_image_url to image_url for CourseCard compatibility
        slug: data.slug, // Include slug for URL routing
        students: 0,
        enrolled: false,
        progress: 0
      } as CourseDisplayData;
      
      addCourse(newCourse);
      
      toast({
        title: "Course Created",
        description: `"${courseData.title}" has been created successfully.`,
        variant: "default"
      });
      
      setIsCreateCourseDialogOpen(false);
    } catch (error: any) {
      console.error('Error creating course:', error);
      toast({
        title: "Error Creating Course",
        description: error.message || "An unexpected error occurred",
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
      const supabase = getSupabaseClient();
      
      const { error } = await supabase
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
    } catch (error: any) {
      console.error('Error deleting course:', error);
      toast({
        title: "Error Deleting Course",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  // Render course detail view
  if (viewMode === 'detail' && selectedCourseId) {
    return (
      <>
        <CourseDetailView
          courseId={selectedCourseId}
          onBack={handleBackToGrid}
        />
      </>
    );
  }

  return (
    <>
      <CourseGrid
        key={`course-grid-${effectiveSpace?.id}-${isActiveTab}`}
        courses={courses}
        isLoading={loading}
        authLoading={effectiveAuth?.authLoading ?? false}
        hasSpaceOwnerInfo={hasSpaceOwnerInfo}
        hasValidAuth={effectiveAuth?.isAuthenticated ?? true}
        isOwner={effectivePermissions?.isOwner ?? false}
        isAdmin={effectivePermissions?.isAdmin ?? false}
        user={effectiveAuth?.user}
        onCreateCourse={handleCreateCourseInternal}
        onViewCourse={handleCourseView}
        onEditCourse={handleEditCourse}
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
    </>
  );
};
