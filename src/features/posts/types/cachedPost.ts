/**
 * 🚀 Unified Posts Types - SHARED TYPE DEFINITIONS
 * Migrated from legacy hooks to eliminate duplication
 * 
 * Following the successful Avatar System pattern:
 * - Single source of truth for post types
 * - Eliminates duplicate definitions
 * - Enables clean legacy system removal
 */

interface GoodCategoryType {
  id: string;
  name: string;
  icon?: string | null;
}

export interface CachedPostType {
  id: string;
  created_at: string | null;
  content: string;
  title: string | null;
  like_count: number | null;
  comment_count: number | null;
  user_id: string;
  space_id: string;
  media_urls?: string[] | null;
  category: GoodCategoryType | null;
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    profile_url: string | null;
    activity_score?: number | null;
  } | null; 
  is_pinned?: boolean;
  pinned_at?: string | null;
  pin_position?: number | null;
  pin_category?: string | null;
  edited_at?: string | null;
  poll_data?: string[] | null;
  slug?: string | null;
}

/**
 * 🎯 Cache Entry Interface for Posts
 */
export interface PostsCacheEntry {
  posts: CachedPostType[];
  pinnedPosts: CachedPostType[];
  lastFetched: number;
  loading: boolean;
  error: string | null;
  // Pagination metadata
  totalCount: number;
  currentPage: number;
  hasNextPage: boolean;
  postsPerPage: number;
}

/**
 * 🔄 Backward compatibility export
 * Ensures existing imports continue to work during migration
 */
export type { GoodCategoryType }; 