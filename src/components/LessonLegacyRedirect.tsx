import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { log } from '@/utils/logger';
import { Loader2 } from 'lucide-react';

/**
 * Legacy redirect component for lesson URLs
 * Redirects from /:subdomain/space/classroom/:courseId/:lessonId to /:subdomain/space/classroom/:courseSlug/:lessonSlug
 */
export default function LessonLegacyRedirect() {
  const { subdomain, courseId, lessonId } = useParams<{ subdomain: string; courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const redirectToSlugUrl = async () => {
      if (!subdomain || !courseId || !lessonId) {
        setError('Invalid URL parameters');
        setIsLoading(false);
        return;
      }

      try {
        // Get the lesson details with course and space information
        const { data: lessonData, error: lessonError } = await getSupabaseClient()
          .from('course_lessons')
          .select(`
            id,
            slug,
            course_modules!inner(
              course_id,
              courses!inner(
                id,
                slug,
                space_id,
                spaces!inner(subdomain)
              )
            )
          `)
          .eq('id', lessonId)
          .single();

        if (lessonError || !lessonData) {
          throw new Error('Lesson not found');
        }

        const course = lessonData.course_modules.courses;
        
        // Verify the course ID and space subdomain match
        if (course.id !== courseId || course.spaces.subdomain !== subdomain) {
          throw new Error('Lesson does not belong to this course or space');
        }

        // Redirect to the slug-based URL
        const newUrl = `/${subdomain}/space/classroom/${course.slug}/${lessonData.slug}`;
        log.debug('LessonLegacyRedirect', `Redirecting from /${subdomain}/space/classroom/${courseId}/${lessonId} to ${newUrl}`);
        navigate(newUrl, { replace: true });
      } catch (err) {
        log.error('LessonLegacyRedirect', 'Error redirecting lesson URL:', err);
        setError(err instanceof Error ? err.message : 'Failed to redirect lesson URL');
        setIsLoading(false);
      }
    };

    redirectToSlugUrl();
  }, [subdomain, courseId, lessonId, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500 mb-4" />
          <p className="text-gray-600">Redirecting to lesson...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Lesson Not Found</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(`/${subdomain}/space/classroom`, { replace: true })}
            className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
          >
            Go to Classroom
          </button>
        </div>
      </div>
    );
  }

  return null;
}
