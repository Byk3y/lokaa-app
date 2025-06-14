/**
 * Centralized Cache Key Management
 * Provides consistent and type-safe cache keys for TanStack Query
 */

export const CACHE_KEYS = {
  // Post-related cache keys
  posts: {
    all: ['posts'] as const,
    bySpace: (spaceId: string) => ['posts', 'space', spaceId] as const,
    byId: (postId: string) => ['posts', 'detail', postId] as const,
    byUser: (userId: string) => ['posts', 'user', userId] as const,
    trending: (spaceId?: string) => ['posts', 'trending', spaceId] as const,
  },
  
  // Comments cache keys
  comments: {
    all: ['comments'] as const,
    byPost: (postId: string) => ['comments', 'post', postId] as const,
    byUser: (userId: string) => ['comments', 'user', userId] as const,
    replies: (commentId: string) => ['comments', 'replies', commentId] as const,
  },
  
  // Likes cache keys
  likes: {
    all: ['likes'] as const,
    byPost: (postId: string) => ['likes', 'post', postId] as const,
    byUser: (userId: string) => ['likes', 'user', userId] as const,
    postLikeStatus: (postId: string, userId: string) => ['likes', 'status', postId, userId] as const,
    commentLikeStatus: (commentId: string, userId: string) => ['likes', 'comment', commentId, userId] as const,
  },
  
  // User-related cache keys
  users: {
    all: ['users'] as const,
    byId: (userId: string) => ['users', 'profile', userId] as const,
    activity: (userId: string) => ['users', 'activity', userId] as const,
  },
  
  // Space-related cache keys
  spaces: {
    all: ['spaces'] as const,
    byId: (spaceId: string) => ['spaces', 'detail', spaceId] as const,
    members: (spaceId: string) => ['spaces', 'members', spaceId] as const,
    categories: (spaceId: string) => ['spaces', 'categories', spaceId] as const,
  },
} as const;

// Cache TTL (Time To Live) configurations in milliseconds
export const CACHE_TTL = {
  // Posts: Medium freshness needed
  posts: 30 * 60 * 1000,        // 30 minutes
  
  // Comments: More frequent updates expected
  comments: 15 * 60 * 1000,     // 15 minutes
  
  // Likes: Need real-time feel
  likes: 5 * 60 * 1000,         // 5 minutes
  
  // User profiles: Rarely change
  userProfiles: 60 * 60 * 1000, // 1 hour
  
  // Space data: Moderately stable
  spaces: 45 * 60 * 1000,       // 45 minutes
  
  // Categories: Very stable
  categories: 2 * 60 * 60 * 1000, // 2 hours
} as const;

// Cache size limits
export const CACHE_LIMITS = {
  maxPosts: 1000,
  maxComments: 2000,
  maxUsers: 500,
  maxSpaces: 50,
} as const;

// Query configuration presets
export const QUERY_OPTIONS = {
  // Standard data that changes moderately
  standard: {
    staleTime: CACHE_TTL.posts,
    gcTime: CACHE_TTL.posts * 2,
    refetchOnWindowFocus: false,
    retry: 2,
  },
  
  // Real-time data that needs frequent updates
  realtime: {
    staleTime: CACHE_TTL.likes,
    gcTime: CACHE_TTL.likes * 2,
    refetchOnWindowFocus: true,
    retry: 1,
  },
  
  // Static data that rarely changes
  static: {
    staleTime: CACHE_TTL.categories,
    gcTime: CACHE_TTL.categories * 2,
    refetchOnWindowFocus: false,
    retry: 3,
  },
  
  // User-specific data
  user: {
    staleTime: CACHE_TTL.userProfiles,
    gcTime: CACHE_TTL.userProfiles * 2,
    refetchOnWindowFocus: false,
    retry: 2,
  },
} as const;

// Helper functions for cache key generation
export const createCacheKey = {
  post: (postId: string) => CACHE_KEYS.posts.byId(postId),
  postComments: (postId: string) => CACHE_KEYS.comments.byPost(postId),
  postLikes: (postId: string) => CACHE_KEYS.likes.byPost(postId),
  userLikeStatus: (postId: string, userId: string) => CACHE_KEYS.likes.postLikeStatus(postId, userId),
} as const;

// Cache invalidation patterns
export const INVALIDATION_PATTERNS = {
  // When a post is updated, invalidate related caches
  onPostUpdate: (postId: string, spaceId: string) => [
    CACHE_KEYS.posts.byId(postId),
    CACHE_KEYS.posts.bySpace(spaceId),
    CACHE_KEYS.comments.byPost(postId),
  ],
  
  // When a comment is added, invalidate related caches
  onCommentAdd: (postId: string, spaceId: string) => [
    CACHE_KEYS.comments.byPost(postId),
    CACHE_KEYS.posts.byId(postId),
    CACHE_KEYS.posts.bySpace(spaceId),
  ],
  
  // When a like is toggled, invalidate related caches
  onLikeToggle: (postId: string, userId: string) => [
    CACHE_KEYS.likes.byPost(postId),
    CACHE_KEYS.likes.postLikeStatus(postId, userId),
    CACHE_KEYS.posts.byId(postId),
  ],
} as const; 