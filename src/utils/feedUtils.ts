import { log } from '@/utils/logger';
import type { FetchedPostType } from "@/types/feedTypes";

/**
 * Updates pin positions for pinned posts in the database
 * @param posts Array of posts to update positions for
 * @param supabaseClient Supabase client instance
 * @returns Promise<boolean> Success status
 */
export const updatePinPositions = async (posts: FetchedPostType[], supabaseClient: any): Promise<boolean> => {
  try {
    // Only update positions for pinned posts
    const pinnedPosts = posts.filter(post => post.is_pinned);
    
    // Create a batch of updates for all pin positions
    const updates = pinnedPosts.map((post, index) => ({
      id: post.id,
      pin_position: index + 1 // 1-based position
    }));
    
    // Update all posts in a single batch operation
    if (updates.length > 0) {
      
      // Use RPC function if available for more robust server-side handling
      try {
        // First try using the update_pin_positions function if it exists
        const { data, error } = await supabaseClient
          .rpc('update_pin_positions', { 
            post_ids: updates.map(u => u.id), 
            category: pinnedPosts[0]?.pin_category || 'general'
          });
        
        if (error) {
          log.debug('Utils', 'RPC function not available, falling back to direct update:', error);
          // Fall back to direct update
          const { error: upsertError } = await supabaseClient
            .from('posts')
            .upsert(updates, { onConflict: 'id' });
          
          if (upsertError) {
            log.error('Utils', 'Error updating pin positions:', upsertError);
            return false;
          }
        } else {
          log.debug('Utils', 'Successfully updated pin positions via RPC');
        }
      } catch (rpcError) {
        // RPC function might not exist, so fall back to direct update
        log.debug('Utils', 'RPC failed, using direct update instead');
        const { error: upsertError } = await supabaseClient
          .from('posts')
          .upsert(updates, { onConflict: 'id' });
        
        if (upsertError) {
          log.error('Utils', 'Error updating pin positions:', upsertError);
          return false;
        }
      }
    }
    
    return true;
  } catch (err) {
    log.error('Utils', 'Exception updating pin positions:', err);
    return false;
  }
};

/**
 * Sorts pinned posts by their pin position, with fallback to pinned_at
 * @param pinnedPosts Array of pinned posts to sort
 * @returns Sorted array of pinned posts
 */
export const sortPinnedPostsByPosition = (pinnedPosts: FetchedPostType[]): FetchedPostType[] => {
  return [...pinnedPosts].sort((a, b) => {
    // Sort pinned posts by pin_position first (if available)
    if (a.pin_position !== null && b.pin_position !== null) {
      return a.pin_position - b.pin_position;
    }
    // Fallback to pinned_at for posts without position
    if (a.pinned_at && b.pinned_at) {
      return new Date(a.pinned_at).getTime() - new Date(b.pinned_at).getTime();
    }
    return 0;
  });
};

/**
 * Sorts regular posts by creation date (newest first)
 * @param posts Array of posts to sort
 * @returns Sorted array of posts
 */
export const sortPostsByDate = (posts: FetchedPostType[]): FetchedPostType[] => {
  return [...posts].sort((a, b) => 
    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );
};

/**
 * Combines and sorts posts for regular members (pinned first, then regular)
 * @param pinnedPosts Array of pinned posts
 * @param fetchedPosts Array of regular posts
 * @returns Combined and sorted array of posts
 */
export const combinePostsForMembers = (
  pinnedPosts: FetchedPostType[], 
  fetchedPosts: FetchedPostType[]
): FetchedPostType[] => {
  const sortedPinnedPosts = sortPinnedPostsByPosition(pinnedPosts);
  const sortedRegularPosts = sortPostsByDate(fetchedPosts);
  
  // Combine with pinned posts first (to maintain their prominence), then regular posts
  return [...sortedPinnedPosts, ...sortedRegularPosts];
};

/**
 * Filters posts by selected category
 * @param posts Array of posts to filter
 * @param selectedTab Selected category ID or "all"
 * @returns Filtered array of posts
 */
export const filterPostsByCategory = (posts: FetchedPostType[], selectedTab: string): FetchedPostType[] => {
  if (selectedTab === "all") return posts;
  return posts.filter(post => post.category?.id === selectedTab);
};

/**
 * Filters pinned posts by selected category, including pin_category
 * @param pinnedPosts Array of pinned posts to filter
 * @param selectedTab Selected category ID or "all"
 * @returns Filtered array of pinned posts
 */
export const filterPinnedPostsByCategory = (pinnedPosts: FetchedPostType[], selectedTab: string): FetchedPostType[] => {
  if (selectedTab === "all") return pinnedPosts;
  return pinnedPosts.filter(post => 
    post.category?.id === selectedTab || post.pin_category === selectedTab
  );
};

/**
 * Gets the display name for a category-specific pinned section
 * @param selectedTab Selected category ID
 * @param categories Array of available categories
 * @returns Display name for the section
 */
export const getCategoryDisplayName = (selectedTab: string, categories: any[]): string => {
  return categories.find(cat => cat.id === selectedTab)?.name || selectedTab;
};

/**
 * Determines which posts to show based on user role and permissions
 * @param pinnedPosts Array of pinned posts
 * @param fetchedPosts Array of regular posts
 * @param isOwnerOrAdmin Whether user is owner or admin
 * @returns Array of posts to display
 */
export const getPostsToShow = (
  pinnedPosts: FetchedPostType[],
  fetchedPosts: FetchedPostType[],
  isOwnerOrAdmin: boolean
): FetchedPostType[] => {
  if (isOwnerOrAdmin) {
    // For admins/owners: only show non-pinned posts (pinned posts are in separate section above)
    return fetchedPosts;
  } else {
    // For regular members: combine regular posts + pinned posts
    return combinePostsForMembers(pinnedPosts, fetchedPosts);
  }
}; 