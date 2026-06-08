import { log } from '@/utils/logger';
import { useState } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { PostCardProps } from '../types/postCard';
import type { Attachment } from '../types';

// Simple category type to avoid import issues
interface SpaceCategory {
  id: string;
  name: string;
  icon?: string;
}

// Define a simplified Json type to avoid excessive depth error
type SimpleJson = any;

export type SubmitPostParams = {
  title: string;
  content: string;
  categoryId?: string | null;
  attachments: Attachment[];
  pollData?: string[] | null;
  categories?: SpaceCategory[];
  content_gif_url?: string | null;
}

export type PostApiResponse = {
  success: boolean;
  postId?: string;
  slug?: string;
  error?: string;
}

interface UsePostSubmissionProps {
  spaceId: string;
  userId: string;
  editMode?: boolean;
  post?: PostCardProps;
  onPostCreated?: () => void;
  onPostUpdated?: (updatedPost: PostCardProps) => void;
  openPostModal?: (post: PostCardProps) => void;
}

/**
 * Custom hook to handle post submission
 */
export function usePostSubmission({
  spaceId,
  userId,
  editMode = false,
  post,
  onPostCreated,
  onPostUpdated
}: UsePostSubmissionProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /**
   * Submit a post (create new or update existing)
   */
  const submitPost = async ({
    title,
    content,
    categoryId,
    attachments,
    pollData,
    categories = []
  }: SubmitPostParams): Promise<PostApiResponse> => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    if (!content.trim() && !title.trim()) {
      setIsSubmitting(false);
      setSubmitError("Post title or content cannot be empty.");
      return { success: false, error: "Post title or content cannot be empty." };
    }

    if (!userId) {
      setIsSubmitting(false);
      setSubmitError("User ID is missing, cannot create post.");
      return { success: false, error: "User ID is missing, cannot create post." };
    }
    
    try {
      // Prepare attachments data for storage - simplified to avoid API issues
      const preparedAttachments = attachments.length > 0 ? attachments.map(att => ({
        url: att.url,
        name: att.name,
        type: att.type
      })) : [];
      
      if (editMode && post) {
        // Update existing post
        const { data: postData, error: postError } = await getSupabaseClient()
          .from('posts')
          .update({
            title: title.trim() || null,
            content: content.trim(),
            category_id: categoryId,
            media_urls: preparedAttachments.length > 0 ? preparedAttachments as SimpleJson : null,
            edited_at: new Date().toISOString(),
            poll_data: pollData && pollData.length > 0 ? pollData : null,
          })
          .eq('id', post.id)
          .select('*')
          .single();

        if (postError) {
          throw postError;
        }

        // Find the category from the provided categories array
        const category = categoryId 
          ? categories.find(cat => cat.id === categoryId) || post.category 
          : post.category;

        // Create updated post object to pass back to parent component
        const updatedPost: PostCardProps = {
          ...post,
          title: postData.title,
          content: postData.content,
          category: category,
          editedAt: postData.edited_at,
          media_urls: preparedAttachments as Attachment[],
          poll_data: pollData,
          slug: postData.slug
        };
        
        // Call the onPostUpdated callback
        if (onPostUpdated) {
          onPostUpdated(updatedPost);
        }
        
        return { success: true, postId: post.id, slug: postData.slug };
      } else {
        // Insert new post - let the database handle slug generation
        const { data: postData, error: postError } = await getSupabaseClient()
          .from('posts')
          .insert({
            title: title.trim() || null,
            content: content.trim(),
            user_id: userId,
            space_id: spaceId,
            category_id: categoryId,
            media_urls: preparedAttachments.length > 0 ? preparedAttachments as SimpleJson : null,
            poll_data: pollData && pollData.length > 0 ? pollData : null,
            // Explicitly setting slug to null to ensure the trigger fires
            slug: null
          })
          .select('*')
          .single();

        if (postError) {
          log.error('Hook', 'Post insert error:', postError);
          log.error('Hook', 'Post data being inserted:', {
            title: title.trim() || null,
            content: content.trim(),
            user_id: userId,
            space_id: spaceId,
            category_id: categoryId,
            media_urls: preparedAttachments.length > 0 ? preparedAttachments : null,
            poll_data: pollData && pollData.length > 0 ? pollData : null,
            slug: null
          });
          throw postError;
        }

        log.debug('Hook', "Post created with data:", postData);
        
        // If the slug wasn't generated immediately, explicitly fetch it
        let finalPostData = postData;
        if (!postData.slug) {
          log.debug('Hook', "Slug not found in initial response, fetching post again");
          
          // Try multiple times with increasing delays
          for (let attempt = 1; attempt <= 5; attempt++) {
            // Wait with exponential backoff (longer wait times and more attempts)
            const delayMs = Math.min(attempt * attempt * 300, 3000); // 300ms, 1200ms, 2700ms, etc. (max 3s)
            log.debug('Hook', `Waiting ${delayMs}ms before retry attempt ${attempt}`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            
            // Fetch the post again to get the slug
            const { data: refreshedPost, error: refreshError } = await getSupabaseClient()
              .from('posts')
              .select('*')
              .eq('id', postData.id)
              .single();
              
            if (!refreshError && refreshedPost && refreshedPost.slug) {
              log.debug('Hook', "Refreshed post data:", refreshedPost);
              finalPostData = refreshedPost;
              break; // Exit the loop if we got the slug
            } else {
              log.error('Hook', `Retry attempt ${attempt} failed:`, refreshError || "Slug still missing");
              if (attempt === 5) {
                // Last attempt, manually generate and update the slug
                log.debug('Hook', "All retry attempts failed, manually creating slug");
                
                // Try calling the generate_post_slug function directly
                try {
                  const { data: generatedSlug, error: slugError } = await getSupabaseClient()
                    .rpc('generate_post_slug', { 
                      title: title.trim(), 
                      space_id: spaceId,
                      content: content.trim()
                    });
                    
                  if (!slugError && generatedSlug) {
                    log.debug('Hook', "Successfully generated slug via RPC:", generatedSlug);
                    
                    // Update the post with the generated slug
                    const { data: updatedPost, error: updateError } = await getSupabaseClient()
                      .from('posts')
                      .update({ slug: generatedSlug })
                      .eq('id', postData.id)
                      .select('*')
                      .single();
                      
                    if (!updateError && updatedPost) {
                      log.debug('Hook', "Updated post with generated slug:", updatedPost);
                      finalPostData = updatedPost;
                    } else {
                      log.error('Hook', "Failed to update with generated slug:", updateError);
                      // Fall back to client-side slug generation
                      await handleFallbackSlugGeneration();
                    }
                  } else {
                    log.error('Hook', "Failed to generate slug via RPC:", slugError);
                    // Fall back to client-side slug generation
                    await handleFallbackSlugGeneration();
                  }
                } catch (rpcError) {
                  log.error('Hook', "Error calling generate_post_slug RPC:", rpcError);
                  // Fall back to client-side slug generation
                  await handleFallbackSlugGeneration();
                }
              }
            }
          }
        }
        
        // Local function for client-side fallback slug generation
        async function handleFallbackSlugGeneration() {
          // Generate a slug from the title or content
          const baseSlug = title.trim() || content.trim().substring(0, 100);
          const slugifiedTitle = baseSlug
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 100) || `post-${Date.now()}`;
          
          // Manual update with our generated slug
          const { data: updatedPost, error: updateError } = await getSupabaseClient()
            .from('posts')
            .update({ slug: slugifiedTitle })
            .eq('id', postData.id)
            .select('*')
            .single();
            
          if (!updateError && updatedPost) {
            log.debug('Hook', "Manually updated post with slug:", updatedPost);
            finalPostData = updatedPost;
          } else {
            log.error('Hook', "Failed to manually update slug:", updateError);
          }
        }
        
        if (finalPostData) {
          if (onPostCreated) {
            onPostCreated();
          }
        }
        
        return { success: true, postId: finalPostData?.id, slug: finalPostData?.slug };
      }
    } catch (error) {
      log.error('Hook', 'Error submitting post:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error submitting post';
      setSubmitError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return {
    isSubmitting,
    submitError,
    submitPost
  };
} 
