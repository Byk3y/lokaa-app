import { log } from '@/utils/logger';
import React from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useOptimizedAuth } from '@/contexts/AuthContext';
import { useSpace } from '@/contexts/SpaceContext';
import CourseDetailView from '@/components/classroom/CourseDetailView';
import { SpaceLoadingFallback } from '@/routes/LazyRoutes';

/**
 * CourseDetailPage - Router-aware wrapper for CourseDetailView
 * Handles URL parameters and navigation for course slug routing
 */
const CourseDetailPage: React.FC = () => {
  const { courseSlug, subdomain } = useParams<{ 
    courseSlug: string;
    subdomain: string;
  }>();
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useOptimizedAuth();
  const { space, loading: spaceLoading } = useSpace();
  
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