import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { log } from '@/utils/logger';
import { Loader2 } from 'lucide-react';

/**
 * Legacy redirect component for profile URLs
 * Phase 3.2: Redirects from /profile/:uuid to /:subdomain/profile/:username
 * This requires determining which space the user is currently in or defaulting to a space
 */
export default function ProfileLegacyRedirect() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const redirectToSpaceProfileUrl = async () => {
      if (!uuid) {
        setError('Invalid profile ID');
        setIsLoading(false);
        return;
      }

      try {
        // Get the user details
        const { data: userData, error: userError } = await getSupabaseClient()
          .from('users')
          .select(`
            id,
            username,
            slug
          `)
          .eq('id', uuid)
          .single();

        if (userError || !userData) {
          throw new Error('User not found');
        }

        // Phase 3.2: Try to determine the current space context
        // First, check if we're in a space context from the URL
        const currentPath = window.location.pathname;
        const spaceMatch = currentPath.match(/^\/([^/]+)\//);
        const currentSpace = spaceMatch ? spaceMatch[1] : null;
        
        if (currentSpace && currentSpace !== 'profile' && currentSpace !== 'app' && currentSpace !== 'discover') {
          // We're in a space context, redirect to space-based profile
          const newUrl = `/${currentSpace}/profile/${userData.username}`;
          log.debug('ProfileLegacyRedirect', `Redirecting from /profile/${uuid} to space profile: ${newUrl}`);
          navigate(newUrl, { replace: true });
        } else {
          // No space context, redirect to global profile (legacy fallback)
          const newUrl = `/@${userData.username}`;
          log.debug('ProfileLegacyRedirect', `No space context found, redirecting to global profile: ${newUrl}`);
          navigate(newUrl, { replace: true });
        }
      } catch (err) {
        log.error('ProfileLegacyRedirect', 'Error redirecting profile URL:', err);
        setError(err instanceof Error ? err.message : 'Failed to redirect profile URL');
        setIsLoading(false);
      }
    };

    redirectToSpaceProfileUrl();
  }, [uuid, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500 mb-4" />
          <p className="text-gray-600">Redirecting to profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Profile Not Found</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return null;
}
