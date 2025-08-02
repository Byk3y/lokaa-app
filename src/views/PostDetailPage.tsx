import { log } from '@/utils/logger';
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import SpaceLayout from '@/components/layout/SpaceLayout';
import SpaceHeader from '@/components/layout/SpaceHeader';
import PostDetailModal from '@/components/space/post-detail/PostDetailModal';
import type { PostCardProps } from '@/features/posts/types/postCard';
import type { Attachment } from '@/features/posts/types/postTypes';
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';

/**
 * This page handles standalone post views at /:spaceSlug/space/:postSlug
 * It can be accessed directly or via history.pushState from post cards
 */
export default function PostDetailPage() {
  const { subdomain, postSlug } = useParams<{ subdomain: string; postSlug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useOptimizedAuth();
  const { loadActiveSpace, space, permissions } = useSpaceSettingsStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [post, setPost] = useState<PostCardProps | null>(null);
  const [notFound, setNotFound] = useState(false);

  // URL Validation - Check for malformed URLs that could cause issues
  useEffect(() => {
    const currentPath = location.pathname;
    
    // Check for /space/space duplication
    if (currentPath.includes('/space/space')) {
      log.warn('Page', 'PostDetailPage: Detected malformed URL with /space/space duplication:', currentPath);
      const correctedPath = currentPath.replace(/\/space\/space/g, '/space');
      navigate(correctedPath, { replace: true });
      return;
    }
    
    // Validate subdomain format
    if (subdomain && (subdomain.includes('space') || subdomain.length < 2)) {
      log.warn('Page', 'PostDetailPage: Invalid subdomain detected:', subdomain);
      setError('Invalid URL format');
      setNotFound(true);
      return;
    }
    
    // Validate postSlug format
    if (postSlug && (postSlug.includes('/') || postSlug.length < 1)) {
      log.warn('Page', 'PostDetailPage: Invalid post slug detected:', postSlug);
      setError('Invalid post URL');
      setNotFound(true);
      return;
    }
  }, [location.pathname, subdomain, postSlug, navigate]);

  // If we receive the post data via location state, use that immediately
  useEffect(() => {
    if (location.state?.post) {
      setPost(location.state.post);
      setLoading(false);
    }
  }, [location.state]);

  // Load the space data if it's not already loaded
  useEffect(() => {
    if (subdomain && user?.id) {
      loadActiveSpace({ subdomain }, user.id);
    }
  }, [subdomain, user?.id, loadActiveSpace]);

  // Fetch the post by slug if not provided via location state
  useEffect(() => {
    const fetchPostBySlug = async () => {
      if (!subdomain || !postSlug || location.state?.post) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // First, get the space ID for the subdomain
        const { data: spaceData, error: spaceError } = await getSupabaseClient()
          .from('spaces')
          .select('id')
          .eq('subdomain', subdomain)
          .single();
          
        if (spaceError) {
          log.error('Page', 'Error fetching space by subdomain:', spaceError);
          throw new Error('Space not found');
        }
        
        if (!spaceData) {
          setNotFound(true);
          throw new Error('Space not found');
        }
        
        // Then fetch the post by slug and space_id
        log.debug('Page', '[Debug Post Fetch] Parameters:', {
          subdomain,
          postSlug,
          spaceIdUsed: spaceData.id 
        });

        const { data: postDataRaw, error: postError } = await getSupabaseClient()
          .from('posts')
          .select(`
            id, 
            created_at, 
            content, 
            title, 
            like_count, 
            comment_count, 
            user_id, 
            space_id, 
            media_urls, 
            category_id,
            is_pinned,
            pinned_at,
            pin_position,
            pin_category,
            edited_at,
            poll_data,
            slug,
            space:spaces (
              id,
              subdomain
            )
          `)
          .eq('slug', postSlug)
          .eq('space_id', spaceData.id)
          .single();

        let postData = postDataRaw;

        if (postError) {
          // If no post found by slug, check if it's an old-style post ID
          if (postError.code === 'PGRST116') {
            // Try to get by ID in case this is a legacy ID-based URL
            const { data: legacyPost, error: legacyError } = await getSupabaseClient()
              .from('posts')
              .select(`
                id, 
                created_at, 
                content, 
                title, 
                like_count, 
                comment_count, 
                user_id, 
                space_id, 
                media_urls, 
                category_id,
                is_pinned,
                pinned_at,
                pin_position,
                pin_category,
                edited_at,
                poll_data,
                slug,
                space:spaces (
                  id,
                  subdomain
                )
              `)
              .eq('id', postSlug)
              .eq('space_id', spaceData.id)
              .single();

            if (legacyError) {
              setNotFound(true);
              throw new Error('Post not found');
            }

            // Redirect to the slug URL if this was a legacy ID-based URL
            if (legacyPost && legacyPost.slug) {
              navigate(`/${subdomain}/space/${legacyPost.slug}`, {
                replace: true,
                state: { preserveSpace: true }
              });
              return;
            }

            // If no slug, use the legacy post data
            postData = legacyPost;
          } else {
            throw postError;
          }
        }

        if (!postData) {
          setNotFound(true);
          throw new Error('Post not found');
        }

        // Fetch author data separately for the post
        let authorData = null;
        if (postData.user_id) {
          const { data: userData, error: userError } = await getSupabaseClient()
            .from('users')
            .select('id, full_name, avatar_url, profile_url, activity_score')
            .eq('id', postData.user_id)
            .single();

          if (!userError && userData) {
            authorData = userData;
          }
        }

        // Add author data to post
        const postWithAuthor = {
          ...postData,
          author: authorData
        };

        postData = postWithAuthor;

        // Fetch category information if available
        let category = null;
        if (postData.category_id) {
          const { data: categoryData } = await getSupabaseClient()
            .from('space_categories')
            .select('id, name, icon')
            .eq('id', postData.category_id)
            .single();
          
          if (categoryData) {
            category = {
              id: categoryData.id,
              name: categoryData.name,
              icon: categoryData.icon
            };
          }
        }

        // Use the author data we fetched separately
        const author = {
          id: postData.author?.id || '',
          name: postData.author?.full_name || 'Unknown User',
          avatar: postData.author?.avatar_url || null,
          profile_url: postData.author?.profile_url || null,
          activity_score: postData.author?.activity_score || 0,
        };

        // Safely handle media_urls and poll_data with proper casting
        const media_urls = postData.media_urls 
          ? (Array.isArray(postData.media_urls) 
              ? (postData.media_urls as unknown as Attachment[])
              : null)
          : null;
        
        const poll_data = postData.poll_data
          ? (Array.isArray(postData.poll_data)
              ? (postData.poll_data as unknown as string[])
              : null)
          : null;

        // Map the fetched data to PostCardProps format
        const mappedPost: PostCardProps = {
          id: postData.id,
          spaceId: postData.space_id,
          currentUserId: user?.id,
          author,
          title: postData.title,
          content: postData.content,
          createdAt: postData.created_at || new Date().toISOString(),
          editedAt: postData.edited_at,
          category: category,
          likes: postData.like_count || 0,
          comments: postData.comment_count || 0,
          media_urls,
          isPinned: postData.is_pinned || false,
          pinCategory: postData.pin_category || null,
          isAdmin: permissions?.isAdmin || permissions?.isOwner || false,
          poll_data,
          slug: postData.slug,
        };

        setPost(mappedPost);
      } catch (err) {
        log.error('Page', 'Error fetching post:', err);
        setError('Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    fetchPostBySlug();
  }, [subdomain, postSlug, user?.id, navigate, location.state, permissions?.isAdmin, permissions?.isOwner]);

  // Handle comments being added
  const handleCommentAdded = (postId: string, newCommentCount: number) => {
    if (post && post.id === postId) {
      setPost({
        ...post,
        comments: newCommentCount
      });
    }
  };

  // Handle likes being toggled
  const handleLikeToggled = (postId: string, newLikeCount: number) => {
    if (post && post.id === postId) {
      setPost({
        ...post,
        likes: newLikeCount
      });
    }
  };

  // Handle post updates
  const handlePostUpdated = (updatedPost: PostCardProps) => {
    setPost(updatedPost);
  };

  // Handle post deletion
  const handlePostDeleted = (postId: string) => {
    if (post && post.id === postId) {
      // Navigate back to the space feed
      navigate(`/${subdomain}/space`, { replace: true });
    }
  };

  // Handle pin toggling
  const handlePinToggled = (postId: string, isPinned: boolean, category?: string | null) => {
    if (post && post.id === postId) {
      setPost({
        ...post,
        isPinned,
        pinCategory: category || null
      });
    }
  };

  // Handle closing the modal (navigate back to previous page)
  const handleCloseModal = () => {
    // Use browser back navigation to respect the user's navigation history
    // This ensures that if they came from notifications, they go back to notifications
    // If they came from the feed, they go back to the feed
    if (window.history.length > 1) {
      navigate(-1); // Go back one step in history
    } else {
      // Fallback to space feed if no history
      navigate(`/${subdomain}/space`, { replace: true });
    }
  };

  // Create meta title for the page
  const getPageTitle = () => {
    if (loading) return 'Loading post...';
    if (error || notFound) return 'Post not found';
    return post?.title || post?.content?.substring(0, 50) || 'Post';
  };

  // Get meta description for SEO
  const getMetaDescription = () => {
    if (!post?.content) return '';
    
    // Strip HTML tags and get plain text
    const plainText = post.content.replace(/<[^>]*>?/gm, '');
    return plainText.length > 160 ? plainText.substring(0, 157) + '...' : plainText;
  };

  // Get canonical URL
  const getCanonicalUrl = () => {
    if (!subdomain || !postSlug) return '';
    return `${window.location.origin}/${subdomain}/space/${postSlug}`;
  };

  // Get preview image for social sharing
  const getPreviewImage = () => {
    if (!post?.media_urls) return '';
    
    // Find first image or video thumbnail
    const firstImage = post.media_urls.find(media => 
      media.type === 'file' && media.fileType?.startsWith('image/') ||
      (media.type === 'video' && media.thumbnailUrl)
    );
    
    return firstImage?.url || firstImage?.thumbnailUrl || '';
  };

  return (
    <>
      <Helmet>
        <title>{getPageTitle()} | {space?.name || 'Lokaa Connect'}</title>
        <meta name="description" content={getMetaDescription()} />
        
        {/* Canonical URL */}
        <link rel="canonical" href={getCanonicalUrl()} />
        
        {/* OpenGraph Tags */}
        <meta property="og:title" content={getPageTitle()} />
        <meta property="og:description" content={getMetaDescription()} />
        <meta property="og:url" content={getCanonicalUrl()} />
        <meta property="og:type" content="article" />
        {getPreviewImage() && <meta property="og:image" content={getPreviewImage()} />}
        
        {/* Twitter Card Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={getPageTitle()} />
        <meta name="twitter:description" content={getMetaDescription()} />
        {getPreviewImage() && <meta name="twitter:image" content={getPreviewImage()} />}
      </Helmet>

      <SpaceLayout
        header={<SpaceHeader subdomain={subdomain} searchQuery="" onSearchQueryChange={() => {}} />}
        nav={<div />}
      >
        <div className="min-h-screen flex items-center justify-center py-12">
          {loading && (
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-800">Loading post...</h2>
              <div className="mt-6 space-y-4 w-[500px]">
                <Skeleton className="h-12 w-3/4 mx-auto" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-6 w-1/2 mx-auto" />
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="text-center">
              <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Post</h2>
              <p className="text-gray-600">{error}</p>
              <button 
                onClick={() => navigate(`/${subdomain}/space`)} 
                className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md"
              >
                Return to Feed
              </button>
            </div>
          )}

          {notFound && !loading && !error && (
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Post Not Found</h2>
              <p className="text-gray-600">The post you're looking for doesn't exist or has been removed.</p>
              <button 
                onClick={() => navigate(`/${subdomain}/space`)} 
                className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md"
              >
                Return to Feed
              </button>
            </div>
          )}

          {post && !loading && !error && !notFound && (
            <PostDetailModal
              isOpen={true}
              onClose={handleCloseModal}
              post={post}
              onCommentAdded={handleCommentAdded}
              onLikeToggled={handleLikeToggled}
              onPostUpdated={handlePostUpdated}
              onPostDeleted={handlePostDeleted}
              onPinToggled={handlePinToggled}
            />
          )}
        </div>
      </SpaceLayout>
    </>
  );
} 