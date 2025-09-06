import { log } from '@/utils/logger';
import React from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useOptimizedAuth } from '@/contexts/AuthContext';
import { useSpace } from '@/contexts/SpaceContext';
import CourseDetailView from '@/components/classroom/CourseDetailView';
import { SpaceLoadingFallback } from '@/routes/LazyRoutes';
// ✅ FIXED: Removed usePersistentTabs - using standard React Router navigation
import { extractTabFromPathname } from '@/utils/tabUtils';

/**
 * CourseDetailPage - Router-aware wrapper for CourseDetailView
 * Handles URL parameters and navigation for course slug routing
 * 
 * Phase 3.2: Updated for new slug-based URL pattern /:subdomain/space/classroom/:courseSlug
 * ✅ ENHANCED: Mobile views render outside SpaceLayout for clean standalone experience
 */
const CourseDetailPage: React.FC = () => {
  const { courseSlug: paramCourseSlug, subdomain } = useParams<{ 
    courseSlug: string;
    subdomain: string;
  }>();
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useOptimizedAuth();
  const { space, loading: spaceLoading } = useSpace();
  
  // ✅ FIXED: Use standard React Router navigation to determine tab state
  const currentTab = extractTabFromPathname(location.pathname);
  const isTabActive = (tab: string) => currentTab === tab;
  
  // Extract course slug from URL pathname (Phase 3.2 - new slug-based pattern)
  const extractCourseSlugFromPath = () => {
    // ✅ FIX: Use window.location.pathname directly to avoid stale React Router location
    const currentPathname = window.location.pathname;
    // ✅ Phase 3.2: Support new slug-based pattern: /:subdomain/space/classroom/:courseSlug
    const newMatch = currentPathname.match(/^\/[^\/]+\/space\/classroom\/([^\/]+)$/);
    if (newMatch) {
      return newMatch[1];
    }
    return null;
  };
  
  // Use param course slug or extract from pathname
  const courseSlug = paramCourseSlug || extractCourseSlugFromPath();
  
  // Extract lesson ID from query params (Skool-style ?md=lessonId)
  const lessonId = searchParams.get('md');
  // Extract module ID from query params (legacy support)
  const moduleId = searchParams.get('moduleId');
  
  // Handle back navigation to classroom
  const handleBackToClassroom = () => {
    if (subdomain) {
      // Navigate back to classroom tab within the persistent shell
      navigate(`/${subdomain}/space/classroom`);
    } else {
      navigate('/');
    }
  };
  
  // ✅ ENHANCED FIX: Guard against being rendered when not on a course detail route
  // This check must come BEFORE loading state to prevent unnecessary renders
  // FIXED: Use window.location.pathname directly to avoid stale React Router location
  const currentPathname = window.location.pathname;
  const isOnCourseDetailRoute = currentPathname.match(/^\/[^\/]+\/space\/classroom\/[^\/]+$/);
  const isOnClassroomOverviewRoute = currentPathname.match(/^\/[^\/]+\/space\/classroom$/);
  
  // 🚨 CRITICAL FIX: Use persistent tab state as single source of truth
  // Only render if we're actually supposed to show a course detail AND classroom tab is active
  const isClassroomTabActive = isTabActive('classroom');
  
  // FIXED: Only extract course slug if we're on classroom tab to prevent stale pathname issues
  const hasValidCourseSlug = isClassroomTabActive && !!(paramCourseSlug || extractCourseSlugFromPath());
  
  // FIXED: Use persistent tab state as primary source of truth, not URL parsing
  // This prevents race conditions where URL is stale during navigation transitions
  const shouldRender = !!(
    hasValidCourseSlug && 
    isClassroomTabActive &&
    currentTab === 'classroom'
    // Removed URL-based checks to prevent stale pathname issues during navigation
  );
  
  if (!shouldRender) {
    // Don't navigate back - just return null to let the parent handle rendering
    return null;
  }
  
  // Loading state
  if (authLoading || spaceLoading || !courseSlug) {
    return <SpaceLoadingFallback />;
  }
  
  // No access - redirect to classroom
  if (!user || !space) {
    handleBackToClassroom();
    return null;
  }
  
  log.debug('Page', '🎓 [CourseDetailPage] Rendering with params (Phase 3.2 - New URL Pattern):', {
    courseSlug,
    lessonId,
    subdomain,
    moduleId,
    userId: user.id,
    spaceId: space.id,
    urlPattern: `/:subdomain/space/classroom/:courseSlug`
  });
  
  // ✅ UPDATED: Render within persistent shell context - no SpaceLayout wrapper needed
  return (
    <CourseDetailView
      courseId={courseSlug} // For now, use courseSlug as courseId (will be resolved by slug lookup)
      onBack={handleBackToClassroom}
      moduleId={moduleId || undefined} // Pass module ID for direct module navigation
      lessonId={lessonId || undefined} // Pass lesson ID for direct lesson navigation (Skool-style)
    />
  );
};

export default CourseDetailPage;