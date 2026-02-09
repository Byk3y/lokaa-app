import { log } from '@/utils/logger';
import { useEffect, useRef, useState } from 'react';
import { useRealtime } from '@/hooks/useRealtime';

interface UseRealtimePostsProps {
  spaceId: string;
  userId: string;
  isEnabled?: boolean;
  debounceMs?: number;
  maxBatchSize?: number;
  delayOnScroll?: boolean;
  onPostUpdated?: (postId: string, updates: any) => void;
  onPostDeleted?: (postId: string) => void;
}

interface NewPostData {
  id: string;
  user_id: string;
  created_at: string;
  content?: string;
}

interface PostBatch {
  posts: NewPostData[];
  lastAdded: Date;
}

/**
 * 🚀 NAVIGATION-AWARE useRealtimePosts using pooled RealtimeManager
 * 
 * ✅ BENEFITS:
 * - Subscriptions survive component unmounting AND navigation
 * - Prevents cleanup during Chat⟷Space navigation
 * - Eliminates posts rerendering during navigation
 * - Maintains all existing functionality
 * - Drop-in replacement for original hook
 */
export const useRealtimePostsOptimized = ({
  spaceId,
  userId,
  isEnabled = true,
  debounceMs = 2000,
  maxBatchSize = 10,
  delayOnScroll = true,
  onPostUpdated,
  onPostDeleted
}: UseRealtimePostsProps) => {
  const [newPostIds, setNewPostIds] = useState<string[]>([]);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [lastPageLoad] = useState<Date>(new Date());

  const debounceTimeoutRef = useRef<any>();
  const batchRef = useRef<PostBatch>({ posts: [], lastAdded: new Date() });
  const scrollTimeoutRef = useRef<any>();

  // Track user scrolling activity (unchanged)
  useEffect(() => {
    if (!delayOnScroll) return;

    const handleScroll = () => {
      setIsUserScrolling(true);

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        setIsUserScrolling(false);
      }, 1500);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [delayOnScroll]);

  // Smart batching function (unchanged)
  const addNewPostId = (postId: string, postUserId: string, postData: NewPostData) => {
    // Don't show notification for user's own posts
    if (postUserId === userId) {
      log.debug('Hook', `🚫 [RealtimeOptimized] Ignoring own post: ${postId}`);
      return;
    }

    // Don't add posts if they're too close to page load (avoid duplicates)
    const timeSincePageLoad = Date.now() - lastPageLoad.getTime();
    if (timeSincePageLoad < 5000) {
      log.debug('Hook', `⏳ [RealtimeOptimized] Ignoring post too close to page load: ${postId}`);
      return;
    }

    log.debug('Hook', `📦 [RealtimeOptimized] Batching new post: ${postId}`);

    // Add to current batch
    batchRef.current.posts.push(postData);
    batchRef.current.lastAdded = new Date();

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Determine delay based on user activity and batch size
    let delay = debounceMs;

    if (isUserScrolling && delayOnScroll) {
      delay = debounceMs * 1.5; // Increase delay if user is scrolling
      log.debug('Hook', `🐌 [RealtimeOptimized] User scrolling, delaying notification`);
    }

    if (batchRef.current.posts.length >= maxBatchSize) {
      delay = 500; // Faster processing for large batches
      log.debug('Hook', `🚀 [RealtimeOptimized] Large batch detected, processing quickly`);
    }

    // Set new timeout with smart delay
    debounceTimeoutRef.current = setTimeout(() => {
      const currentBatch = [...batchRef.current.posts];

      if (currentBatch.length > 0) {
        setNewPostIds((prev: string[]) => {
          const newIds = currentBatch
            .map(post => post.id)
            .filter(id => !prev.includes(id));

          if (newIds.length > 0) {
            log.debug('Hook', `✨ [RealtimeOptimized] Processing batch of ${newIds.length} posts:`, newIds);
            return [...prev, ...newIds];
          }
          return prev;
        });

        // Clear the batch
        batchRef.current.posts = [];
      }
    }, delay);
  };

  // Clear new post notifications (unchanged)
  const clearNewPosts = () => {
    setNewPostIds([]);
  };

  // Remove specific post from notifications (unchanged)
  const removePostId = (postId: string) => {
    setNewPostIds((prev: string[]) => prev.filter((id: string) => id !== postId));
  };

  // 🔥 KEY CHANGE: Use unified RealtimeManager (via useRealtime)
  const handleRealtimeEvent = (payload: any) => {
    log.debug('Hook', `🔔 [RealtimeOptimized] Event detected (${payload.eventType}):`, payload);

    const eventType = payload.eventType;

    // Handle INSERT (New Post)
    if (eventType === 'INSERT') {
      if (payload.new && typeof payload.new === 'object') {
        const newPost = payload.new as NewPostData;
        log.debug('Hook', '🔔 [RealtimeOptimized] Processing new post:', {
          id: newPost.id,
          user_id: newPost.user_id,
          space_id: (newPost as any).space_id,
          created_at: newPost.created_at,
          currentUserId: userId
        });
        addNewPostId(newPost.id, newPost.user_id, newPost);
      } else {
        log.warn('Hook', '🔔 [RealtimeOptimized] Invalid payload.new for INSERT:', payload.new);
      }
      return;
    }

    // Handle UPDATE (e.g., comment count changed)
    if (eventType === 'UPDATE') {
      if (payload.new && typeof payload.new === 'object') {
        const updatedPost = payload.new;
        log.debug('Hook', '📝 [RealtimeOptimized] Processing post update:', {
          id: updatedPost.id,
          comment_count: updatedPost.comment_count,
          like_count: updatedPost.like_count
        });

        if (onPostUpdated) {
          onPostUpdated(updatedPost.id, updatedPost);
        }
      } else {
        log.warn('Hook', '🔔 [RealtimeOptimized] Invalid payload.new for UPDATE:', payload.new);
      }
      return;
    }

    // Handle DELETE
    if (eventType === 'DELETE') {
      if (payload.old && payload.old.id) {
        log.debug('Hook', '🗑️ [RealtimeOptimized] Processing post deletion:', payload.old.id);

        if (onPostDeleted) {
          onPostDeleted(payload.old.id);
        }

        // Also remove from local "New Posts" notification if present
        removePostId(payload.old.id);
      } else {
        log.warn('Hook', '🔔 [RealtimeOptimized] Invalid payload.old for DELETE:', payload.old);
      }
    }
  };

  const [isConnected, setIsConnected] = useState(false);

  useRealtime(
    isEnabled ? spaceId : undefined,
    'posts',
    handleRealtimeEvent,
    {
      event: '*',
      filter: `space_id=eq.${spaceId}`,
      protectOnNavigation: true
    }
  );

  // Connection state is now implicit in useRealtime, but we'll set it to isEnabled && !!spaceId for compatibility
  useEffect(() => {
    setIsConnected(isEnabled && !!spaceId);
  }, [isEnabled, spaceId]);

  // Cleanup on unmount (simplified)
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    newPostIds,
    newPostCount: newPostIds.length,
    isConnected,
    clearNewPosts,
    removePostId,
  };
};

// 🔥 MIGRATION HELPER: Alias for easy transition
export const useRealtimePosts = useRealtimePostsOptimized; 