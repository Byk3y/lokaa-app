/**
 * 🎯 Posts Actions - CRUD Operations & Optimistic Updates
 * 
 * Extracted from useOptimizedCachedPosts.ts to handle post actions,
 * optimistic updates, and state management for posts.
 */

import { useCallback } from 'react';
import { log } from '@/utils/logger';
import { devLogger } from '@/utils/developmentLogger';
import type { CachedPostType } from '@/features/posts/types/cachedPost';
import type { CacheManagementParams } from './postTypes';

/**
 * Posts actions hook for CRUD operations
 * 
 * @param params - Cache management parameters
 * @returns Post action handlers
 */
export function usePostsActions(params: CacheManagementParams) {
  const {
    spaceId,
    subscriberId,
    posts,
    setPosts,
    pinnedPosts,
    setPinnedPosts
  } = params;

  // Handle post creation
  const handlePostCreated = useCallback((post: CachedPostType) => {
    devLogger.log('CacheDebug', `➕ [PostCreated] Adding new post to cache`, {
      postId: post.id,
      spaceId,
      subscriberId
    });

    if (post.is_pinned) {
      setPinnedPosts(prev => [post, ...prev]);
    } else {
      setPosts(prev => [post, ...prev]);
    }
  }, [spaceId, subscriberId, setPosts, setPinnedPosts]);

  // Handle post update
  const handlePostUpdated = useCallback((postId: string, updates: Partial<CachedPostType>) => {
    devLogger.log('CacheDebug', `✏️ [PostUpdated] Updating post in cache`, {
      postId,
      updates,
      spaceId,
      subscriberId
    });

    // Update in regular posts
    setPosts(prev => prev.map(post => 
      post.id === postId ? { ...post, ...updates } : post
    ));

    // Update in pinned posts
    setPinnedPosts(prev => prev.map(post => 
      post.id === postId ? { ...post, ...updates } : post
    ));
  }, [spaceId, subscriberId, setPosts, setPinnedPosts]);

  // Handle post deletion
  const handlePostDeleted = useCallback((postId: string) => {
    devLogger.log('CacheDebug', `🗑️ [PostDeleted] Removing post from cache`, {
      postId,
      spaceId,
      subscriberId
    });

    setPosts(prev => prev.filter(post => post.id !== postId));
    setPinnedPosts(prev => prev.filter(post => post.id !== postId));
  }, [spaceId, subscriberId, setPosts, setPinnedPosts]);

  // Handle like toggle
  const handleLikeToggled = useCallback((postId: string, newLikeCount: number) => {
    devLogger.log('CacheDebug', `❤️ [LikeToggled] Updating like count`, {
      postId,
      newLikeCount,
      spaceId,
      subscriberId
    });

    const updateLikeCount = (post: CachedPostType) => 
      post.id === postId ? { ...post, like_count: newLikeCount } : post;

    setPosts(prev => prev.map(updateLikeCount));
    setPinnedPosts(prev => prev.map(updateLikeCount));
  }, [spaceId, subscriberId, setPosts, setPinnedPosts]);

  // Handle comment added
  const handleCommentAdded = useCallback((postId: string, newCommentCount: number) => {
    devLogger.log('CacheDebug', `💬 [CommentAdded] Updating comment count`, {
      postId,
      newCommentCount,
      spaceId,
      subscriberId
    });

    const updateCommentCount = (post: CachedPostType) => 
      post.id === postId ? { ...post, comment_count: newCommentCount } : post;

    setPosts(prev => prev.map(updateCommentCount));
    setPinnedPosts(prev => prev.map(updateCommentCount));
  }, [spaceId, subscriberId, setPosts, setPinnedPosts]);

  // Handle pin toggle
  const handlePinToggled = useCallback((
    postId: string, 
    isPinned: boolean, 
    pinPosition?: number
  ) => {
    devLogger.log('CacheDebug', `📌 [PinToggled] Toggling pin status`, {
      postId,
      isPinned,
      pinPosition,
      spaceId,
      subscriberId
    });

    if (isPinned) {
      // Move from regular to pinned
      setPosts(prev => {
        const post = prev.find(p => p.id === postId);
        if (!post) return prev;
        
        const updatedPost = {
          ...post,
          is_pinned: true,
          pin_position: pinPosition,
          pinned_at: new Date().toISOString()
        };
        
        setPinnedPosts(prevPinned => [updatedPost, ...prevPinned]);
        return prev.filter(p => p.id !== postId);
      });
    } else {
      // Move from pinned to regular
      setPinnedPosts(prev => {
        const post = prev.find(p => p.id === postId);
        if (!post) return prev;
        
        const updatedPost = {
          ...post,
          is_pinned: false,
          pin_position: null,
          pinned_at: null
        };
        
        setPosts(prevRegular => [updatedPost, ...prevRegular]);
        return prev.filter(p => p.id !== postId);
      });
    }
  }, [spaceId, subscriberId, setPosts, setPinnedPosts]);

  // Handle comment count update (for modal interactions)
  const updateCommentCount = useCallback((postId: string, newCount: number) => {
    try {
      devLogger.log('CacheDebug', `💬 [CommentCount] Updating comment count for post ${postId}`, {
        postId,
        newCount,
        spaceId,
        subscriberId
      });

      const updateCount = (post: CachedPostType) => 
        post.id === postId ? { ...post, comment_count: newCount } : post;

      setPosts(prev => prev.map(updateCount));
      setPinnedPosts(prev => prev.map(updateCount));

    } catch (error) {
      log.error('Hook', `❌ [CacheDebug] Error updating comment count for post ${postId}:`, error instanceof Error ? error : undefined);
    }
  }, [spaceId, subscriberId, setPosts, setPinnedPosts]);

  return {
    handlePostCreated,
    handlePostUpdated,
    handlePostDeleted,
    handleLikeToggled,
    handleCommentAdded,
    handlePinToggled,
    updateCommentCount
  };
}
