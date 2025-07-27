import { log } from '@/utils/logger';
import React from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useOptimizedAuth } from '@/contexts/AuthContext';
import { useSpace } from '@/contexts/SpaceContext';
import CourseDetailView from '@/components/classroom/CourseDetailView';
import { SpaceLoadingFallback } from '@/routes/LazyRoutes';

/**
 * CourseDetailPage - Router-aware wrapper for CourseDetailView
 * Handles URL parameters and navigation for course slug routing
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
  
  // Extract course slug from URL pathname (new pattern only)
  const extractCourseSlugFromPath = () => {
    // ✅ FIX: Only support new pattern: /:subdomain/space/classroom/:courseSlug
    const newMatch = location.pathname.match(/^\/[^\/]+\/space\/classroom\/([^\/]+)$/);
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
  
  // ✅ FIX: Guard against being rendered when not on a course detail route (new pattern only)
  // This check must come BEFORE loading state to prevent unnecessary renders
  const isOnCourseDetailRoute = location.pathname.match(/^\/[^\/]+\/space\/classroom\/[^\/]+$/);
  
  // 🚨 ADDITIONAL GUARD: Prevent rendering with invalid course data during tab transitions
  const hasValidCourseSlug = !!(paramCourseSlug || extractCourseSlugFromPath());
  const shouldRender = isOnCourseDetailRoute && hasValidCourseSlug;
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [CourseDetailPage] Route guard check:', {
      pathname: location.pathname,
      isOnCourseDetailRoute: !!isOnCourseDetailRoute,
      hasValidCourseSlug,
      shouldRender,
      courseSlug: paramCourseSlug || extractCourseSlugFromPath(),
      matchResult: location.pathname.match(/^\/[^\/]+\/space\/classroom\/[^\/]+$/)
    });
  }
  
  if (!shouldRender) {
    // Don't navigate back - just return null to let the parent handle rendering
    if (process.env.NODE_ENV === 'development') {
      console.log('🚫 [CourseDetailPage] Returning null - invalid route or course data');
    }
    return null;
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ [CourseDetailPage] Route guard passed - rendering CourseDetailPage');
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
  
  log.debug('Page', '🎓 [CourseDetailPage] Rendering with params:', {
    courseSlug,
    lessonId,
    subdomain,
    moduleId,
    userId: user.id,
    spaceId: space.id
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