import { log } from '@/utils/logger';
/**
 * 🎯 Post Service - Reliable Post Fetching
 * 
 * Avoids complex PostgREST relationship syntax by using separate queries.
 * This approach is more reliable and doesn't depend on schema cache.
 * 
 * Based on the proven pattern from PostDetailPage.tsx that works consistently.
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import type { PostCardProps } from '@/features/posts/types/postCard';
import type { Attachment } from '@/features/posts/types/postTypes';
import { devLogger } from '@/utils/developmentLogger';
import { getSpaceIdBySubdomain } from '@/config/knownSpaces';

export interface PostFetchOptions {
  timeout?: number;
  maxRetries?: number;
  spaceId: string;
}

export interface PostServiceResult {
  data: PostCardProps | null;
  error: string | null;
  fromCache?: boolean;
  source?: 'slug' | 'id' | 'fallback';
}

export class PostService {
  private static readonly DEFAULT_TIMEOUT = 15000; // 15 seconds
  private static readonly DEFAULT_MAX_RETRIES = 2;

  // Space ID mapping moved to centralized configuration in @/config/knownSpaces

  /**
   * Extract space ID from URL pathname as fallback
   */
  private static extractSpaceIdFromUrl(pathname: string): string | null {
    const segments = pathname.split('/');
    const subdomain = segments[1];
    return getSpaceIdBySubdomain(subdomain);
  }

  /**
   * Fetch a post by slug with reliable separate queries
   * 
   * @param slug - Post slug to fetch
   * @param options - Fetch options including spaceId, timeout, maxRetries
   * @param currentUserId - Current user ID for permissions
   * @returns Promise<PostServiceResult>
   */
  static async fetchPostBySlug(
    slug: string, 
    options: PostFetchOptions,
    currentUserId?: string
  ): Promise<PostServiceResult> {
    const { timeout = this.DEFAULT_TIMEOUT, maxRetries = this.DEFAULT_MAX_RETRIES, spaceId } = options;
    
    if (!spaceId) {
      return {
        data: null,
        error: 'Space ID is required for post fetching',
      };
    }

    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        // Add timeout functionality
        const timeoutController = new AbortController();
        const timeoutId = setTimeout(() => {
          timeoutController.abort();
        }, timeout);

        try {
          devLogger.log('PostService', `Attempt ${retryCount + 1}: Fetching post ${slug}...`);
          
          // Step 1: Fetch the post (simple query, no relationships)
          let postData: any = null;
          let fetchSource: 'slug' | 'id' = 'slug';

          const { data: postDataBySlug, error: postError } = await getSupabaseClient()
            .from('posts')
            .select(`
              id, created_at, content, title, like_count, comment_count, user_id, space_id, 
              media_urls, category_id, is_pinned, pinned_at, pin_position, pin_category, 
              updated_at, poll_data, slug
            `)
            .eq('slug', slug)
            .eq('space_id', spaceId)
            .single();

          clearTimeout(timeoutId);

          if (postError || !postDataBySlug) {
            if (process.env.NODE_ENV === 'development') {
              log.warn('Service', `[PostService] Slug fetch failed: ${postError?.message}, trying ID fallback...`);
            }
            
            // Try to fetch by ID as fallback for legacy URLs
            const { data: legacyPost, error: legacyError } = await getSupabaseClient()
              .from('posts')
              .select(`
                id, created_at, content, title, like_count, comment_count, user_id, space_id, 
                media_urls, category_id, is_pinned, pinned_at, pin_position, pin_category, 
                updated_at, poll_data, slug
              `)
              .eq('id', slug)
              .eq('space_id', spaceId)
              .single();

            if (legacyError || !legacyPost) {
              throw new Error(`Post not found: ${postError?.message || legacyError?.message || 'Unknown error'}`);
            }
            
            devLogger.log('PostService', `Found post by ID: ${legacyPost.id}`);
            postData = legacyPost;
            fetchSource = 'id';
          } else {
            devLogger.log('PostService', `Found post by slug: ${postDataBySlug.id}`);
            postData = postDataBySlug;
            fetchSource = 'slug';
          }

          if (!postData) {
            throw new Error('Post not found');
          }

          // Step 2: Fetch user data separately (reliable)
          let author = {
            id: '',
            name: 'Unknown User',
            avatar: null as string | null,
            profile_url: null as string | null,
            activity_score: 0,
          };

          if (postData.user_id) {
            devLogger.log('PostService', `Fetching user data for: ${postData.user_id}`);
            const { data: userData, error: userError } = await getSupabaseClient()
              .from('users')
              .select('id, full_name, avatar_url, profile_url, activity_score')
              .eq('id', postData.user_id)
              .single();

            if (!userError && userData) {
              author = {
                id: userData.id,
                name: userData.full_name || 'Unknown User',
                avatar: userData.avatar_url,
                profile_url: userData.profile_url,
                activity_score: userData.activity_score || 0,
              };
              devLogger.log('PostService', `Found author: ${author.name}`);
            } else {
              if (process.env.NODE_ENV === 'development') {
                log.warn('Service', `[PostService] User fetch failed: ${userError?.message}`);
              }
            }
          }

          // Step 3: Fetch category data separately (reliable)
          let category = null;
          if (postData.category_id) {
            devLogger.log('PostService', `Fetching category data for: ${postData.category_id}`);
            const { data: categoryData, error: categoryError } = await getSupabaseClient()
              .from('space_categories')
              .select('id, name, icon')
              .eq('id', postData.category_id)
              .single();
            
            if (!categoryError && categoryData) {
              category = {
                id: categoryData.id,
                name: categoryData.name,
                icon: categoryData.icon
              };
              devLogger.log('PostService', `Found category: ${category.name}`);
            } else {
              if (process.env.NODE_ENV === 'development') {
                log.warn('Service', `[PostService] Category fetch failed: ${categoryError?.message}`);
              }
            }
          }

          // Step 4: Transform media_urls to proper Attachment format
          let media_urls: Attachment[] | null = null;
          if (postData.media_urls) {
            if (Array.isArray(postData.media_urls)) {
              media_urls = postData.media_urls as Attachment[];
            }
          }

          // Step 5: Transform to PostCardProps format
          const mappedPost: PostCardProps = {
            id: postData.id,
            spaceId: postData.space_id,
            currentUserId: currentUserId,
            author,
            title: postData.title,
            content: postData.content,
            createdAt: postData.created_at || new Date().toISOString(),
            editedAt: postData.updated_at,
            category,
            likes: postData.like_count || 0,
            comments: postData.comment_count || 0,
            media_urls,
            isPinned: postData.is_pinned || false,
            pinCategory: postData.pin_category || null,
            isAdmin: false, // This will be set by the calling component based on permissions
            poll_data: postData.poll_data,
            slug: postData.slug,
          };

          devLogger.log('PostService', `Successfully fetched post: ${mappedPost.title || mappedPost.id}`);
          return { 
            data: mappedPost, 
            error: null, 
            source: fetchSource 
          };
          
        } catch (error) {
          clearTimeout(timeoutId);
          
          // Don't retry timeout errors, abort errors, or specific errors
          if (error instanceof Error && (
            error.message.includes('timeout') || 
            error.message.includes('aborted') ||
            error.message.includes('Post not found') ||
            error.name === 'AbortError'
          )) {
            if (process.env.NODE_ENV === 'development') {
              log.warn('Service', `[PostService] Non-retryable error: ${error.message}`);
            }
            throw error;
          }

          // Check for 400 errors (PostgREST relationship issues) - don't retry these
          if (error instanceof Error && (
            error.message.includes('400') || 
            error.message.includes('Bad Request') ||
            error.message.includes('relationship') ||
            error.message.includes('schema cache')
          )) {
            if (process.env.NODE_ENV === 'development') {
              log.warn('Service', `[PostService] 400/relationship error on attempt ${retryCount + 1}, not retrying:`, error.message);
            }
            throw error;
          }
          
          retryCount++;
          if (retryCount >= maxRetries) {
            throw error;
          }
          
          const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 2s, 4s
          if (process.env.NODE_ENV === 'development') {
            log.warn('Service', `[PostService] Attempt ${retryCount} failed, retrying in ${delay}ms:`, error.message);
          }
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        if (retryCount >= maxRetries) {
          if (process.env.NODE_ENV === 'development') {
            log.error('Service', '[PostService] Error fetching post after retries:', error);
          }
          return { 
            data: null, 
            error: error instanceof Error ? error.message : 'Failed to fetch post' 
          };
        }
      }
    }

    return { data: null, error: 'Maximum retries exceeded' };
  }

  /**
   * Fetch a post by ID (for compatibility)
   */
  static async fetchPostById(
    id: string,
    options: PostFetchOptions,
    currentUserId?: string
  ): Promise<PostServiceResult> {
    return this.fetchPostBySlug(id, options, currentUserId);
  }

  /**
   * Get space ID from URL pathname (utility for URL-based fallback)
   */
  static getSpaceIdFromUrl(pathname: string): string | null {
    return this.extractSpaceIdFromUrl(pathname);
  }

  /**
   * Add a new space mapping (for dynamic space discovery)
   */
  static addSpaceMapping(subdomain: string, spaceId: string): void {
    this.SPACE_MAPPING[subdomain] = spaceId;
  }

  /**
   * Get all available space mappings
   */
  static getSpaceMappings(): Record<string, string> {
    return { ...this.SPACE_MAPPING };
  }
}
