/**
 * 🎯 Posts Types - Centralized Type Definitions
 * 
 * Extracted from useOptimizedCachedPosts.ts to eliminate duplication
 * and provide a single source of truth for post-related types.
 */

import type { CachedPostType } from '@/features/posts/types/cachedPost';
import type { PostCardProps } from '@/features/posts/types/postCard';

/**
 * Tab visibility state for mobile refresh behavior
 */
export interface TabVisibilityState {
  lastTabVisit: number;
  isFirstVisit: boolean;
  refreshThreshold: number; // Time in ms before data needs refresh
}

/**
 * Return interface for the optimized cached posts hook
 */
export interface UseOptimizedCachedPostsReturn {
  posts: CachedPostType[];
  pinnedPosts: CachedPostType[];
  loading: boolean;
  error: string | null;
  refetch: (forceRefresh?: boolean) => Promise<void>;
  
  // Pagination
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  loadPage: (page: number) => Promise<void>;
  isLoadingMore: boolean; // New: tracks pagination loading specifically
  
  // Action handlers
  handlePostCreated: (post: CachedPostType) => void;
  handlePostUpdated: (postId: string, updates: Partial<CachedPostType>) => void;
  handlePostDeleted: (postId: string) => void;
  handleLikeToggled: (postId: string, newLikeCount: number) => void;
  handleCommentAdded: (postId: string, newCommentCount: number) => void;
  handlePinToggled: (postId: string, isPinned: boolean, pinPosition?: number) => void;
  
  // Utility functions
  mapPostToCardProps: (post: CachedPostType) => PostCardProps;
  
  // Tab switching refresh
  refreshOnTabSwitch: () => Promise<void>;
}

/**
 * Options for the useOptimizedCachedPosts hook
 */
export interface UseOptimizedCachedPostsOptions {
  disableVisibilityTracking?: boolean;
}

/**
 * Post enrichment parameters
 */
export interface PostEnrichmentParams {
  posts: any[];
  spaceId: string;
  subscriberId: string;
}

/**
 * Cache management parameters
 */
export interface CacheManagementParams {
  spaceId: string;
  subscriberId: string;
  posts: CachedPostType[];
  setPosts: (posts: CachedPostType[]) => void;
  pinnedPosts: CachedPostType[];
  setPinnedPosts: (posts: CachedPostType[]) => void;
}

/**
 * Fetching parameters
 */
export interface FetchingParams {
  spaceId: string;
  subscriberId: string;
  setPosts: (posts: CachedPostType[]) => void;
  setPinnedPosts: (posts: CachedPostType[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentPage: (page: number) => void;
  setTotalCount: (count: number) => void;
  setIsLoadingMore: (loading: boolean) => void;
}
