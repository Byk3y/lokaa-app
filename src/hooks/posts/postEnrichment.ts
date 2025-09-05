/**
 * 🎯 Post Enrichment - Metadata Fetching & Type Transformation
 * 
 * Extracted from useOptimizedCachedPosts.ts to handle post metadata enrichment
 * using global cache coordinator for optimal performance.
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import { globalCache } from '@/utils/globalCacheCoordinator';
import { cacheQueries } from '@/utils/globalCacheCoordinator';
import type { CachedPostType } from '@/features/posts/types/cachedPost';
import type { PostEnrichmentParams } from './postTypes';

/**
 * Enrich posts with author and category metadata using global cache
 * 
 * @param posts - Raw posts from database
 * @param spaceId - Current space ID
 * @param subscriberId - Unique subscriber identifier
 * @returns Promise<CachedPostType[]> - Enriched posts with metadata
 */
export async function enrichPostsWithMetadata(
  posts: any[], 
  spaceId: string, 
  subscriberId: string
): Promise<CachedPostType[]> {
  if (!posts.length) return [];

  // Get unique user IDs and category IDs
  const userIds = Array.from(new Set(posts.map(p => p.user_id).filter(Boolean)));
  const categoryIds = Array.from(new Set(posts.map(p => p.category_id).filter(Boolean)));

  // Fetch authors and categories using global cache
  const [authorsData, categoriesData] = await Promise.all([
    // Fetch authors
    userIds.length > 0 ? globalCache.get(
      `users:${userIds.join(',')}`,
      async () => {
        const { data, error } = await getSupabaseClient()!
          .from('users')
          .select('id, full_name, avatar_url, profile_url, activity_score')
          .in('id', userIds);
        if (error) throw error;
        return data || [];
      },
      subscriberId
    ) : [],
    
    // Fetch categories
    categoryIds.length > 0 ? cacheQueries.categories(spaceId, subscriberId) : []
  ]);

  // Create lookup maps
  const authorsMap = new Map<string, any>();
  authorsData.forEach((author: any) => authorsMap.set(author.id, author));
  
  const categoriesMap = new Map<string, any>();
  categoriesData.forEach((cat: any) => categoriesMap.set(cat.id, cat));

  // Enrich posts with metadata
  return posts.map(post => ({
    id: post.id,
    created_at: post.created_at,
    content: post.content,
    title: post.title,
    like_count: post.like_count || 0,
    comment_count: post.comment_count || 0,
    user_id: post.user_id,
    space_id: post.space_id,
    media_urls: post.media_urls,
    category: post.category_id ? categoriesMap.get(post.category_id) || null : null,
    author: authorsMap.get(post.user_id) || null,
    is_pinned: post.is_pinned || false,
    pinned_at: post.pinned_at,
    pin_position: post.pin_position,
    pin_category: post.pin_category,
    edited_at: post.edited_at,
    poll_data: post.poll_data,
    slug: post.slug,
  })) as CachedPostType[];
}

/**
 * Enrich cached posts with metadata (async version for cache loading)
 * 
 * @param params - Post enrichment parameters
 * @returns Promise<CachedPostType[]> - Enriched posts
 */
export async function enrichCachedPosts(params: PostEnrichmentParams): Promise<CachedPostType[]> {
  const { posts, spaceId, subscriberId } = params;
  return enrichPostsWithMetadata(posts, spaceId, subscriberId);
}
