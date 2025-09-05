import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { log } from '@/utils/logger';
import { Loader2 } from 'lucide-react';

/**
 * Legacy redirect component for course URLs
 * Redirects from /:subdomain/space/classroom/:courseId to /:subdomain/space/classroom/:courseSlug
 */
export default function CourseLegacyRedirect() {
  const { subdomain, courseId } = useParams<{ subdomain: string; courseId: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const redirectToSlugUrl = async () => {
      if (!subdomain || !courseId) {
        setError('Invalid URL parameters');
        setIsLoading(false);
        return;
      }

      try {
        // Get the course details to get the slug
        const { data: courseData, error: courseError } = await getSupabaseClient()
          .from('courses')
          .select(`
            id,
            slug,
            space_id,
            spaces!inner(subdomain)
          `)
          .eq('id', courseId)
          .single();

        if (courseError || !courseData) {
          throw new Error('Course not found');
        }

        // Verify the space subdomain matches
        if (courseData.spaces.subdomain !== subdomain) {
          throw new Error('Course does not belong to this space');
        }

        // Redirect to the slug-based URL
        const newUrl = `/${subdomain}/space/classroom/${courseData.slug}`;
        log.debug('CourseLegacyRedirect', `Redirecting from /${subdomain}/space/classroom/${courseId} to ${newUrl}`);
        navigate(newUrl, { replace: true });
      } catch (err) {
        log.error('CourseLegacyRedirect', 'Error redirecting course URL:', err);
        setError(err instanceof Error ? err.message : 'Failed to redirect course URL');
        setIsLoading(false);
      }
    };

    redirectToSlugUrl();
  }, [subdomain, courseId, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500 mb-4" />
          <p className="text-gray-600">Redirecting to course...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Course Not Found</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(`/${subdomain}/space`, { replace: true })}
            className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
          >
            Go to Space
          </button>
        </div>
      </div>
    );
  }

  return null;
}
