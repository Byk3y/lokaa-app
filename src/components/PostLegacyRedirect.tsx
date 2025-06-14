import { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

/**
 * This component handles redirects from legacy post URLs to the new slug-based URLs
 * It's used for routes like:
 * - /spaces/:spaceId/posts/:postId
 * - /space/:subdomain/posts/:postId
 */
export default function PostLegacyRedirect() {
  const { spaceId, postId, subdomain } = useParams<{ 
    spaceId?: string; 
    postId?: string;
    subdomain?: string;
  }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const redirectToSlugUrl = async () => {
      // Determine which URL pattern we're handling
      const isSpaceIdPattern = !!spaceId && !!postId;
      const isSubdomainPattern = !!subdomain && !!postId;
      
      if (!isSpaceIdPattern && !isSubdomainPattern) {
        setError('Invalid URL parameters');
        setIsLoading(false);
        return;
      }

      try {
        let spaceSubdomain: string | null = null;
        let finalPostId = postId;
        let finalSpaceId = spaceId;
        
        // For the spaceId pattern, we need to get the space subdomain first
        if (isSpaceIdPattern && spaceId) {
          // Get the space subdomain from the spaceId
          const { data: spaceData, error: spaceError } = await getSupabaseClient()
            .from('spaces')
            .select('subdomain')
            .eq('id', spaceId)
            .single();
            
          if (spaceError || !spaceData?.subdomain) {
            throw new Error('Space not found');
          }
          
          spaceSubdomain = spaceData.subdomain;
        } else if (isSubdomainPattern && subdomain) {
          // For subdomain pattern, first get the space ID
          const { data: spaceData, error: spaceError } = await getSupabaseClient()
            .from('spaces')
            .select('id')
            .eq('subdomain', subdomain)
            .single();
            
          if (spaceError || !spaceData?.id) {
            throw new Error('Space not found');
          }
          
          finalSpaceId = spaceData.id;
          spaceSubdomain = subdomain;
        }

        // Now get the post details using the space ID for a more reliable query
        const { data: postData, error: postError } = await getSupabaseClient()
          .from('posts')
          .select(`
            id,
            slug,
            space:spaces!space_id (
              id,
              subdomain
            )
          `)
          .eq('id', finalPostId)
          .eq('space_id', finalSpaceId)
          .single();

        if (postError || !postData) {
          throw new Error('Post not found');
        }

        // Check if we have a slug to redirect to
        if (postData.slug) {
          // Set the redirect path
          setRedirectPath(`/${spaceSubdomain}/space/${postData.slug}`);
        } else {
          // If there's no slug yet, use the ID as fallback
          setRedirectPath(`/${spaceSubdomain}/space/${postData.id}`);
        }
      } catch (err) {
        console.error('Error redirecting to slug URL:', err);
        setError('The post you are looking for could not be found');
      } finally {
        setIsLoading(false);
      }
    };

    redirectToSlugUrl();
  }, [spaceId, postId, subdomain, navigate]);

  // If we have a redirect path, use Navigate with replace to perform a client-side redirect
  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Post Not Found</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
      <p className="text-gray-600">Redirecting to post...</p>
    </div>
  );
} 