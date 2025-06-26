import { useEffect, useRef, useState } from 'react';
import { navigationAwareRealtimeService } from '@/services/NavigationAwareRealtimeService';

interface UseRealtimePostsProps {
  spaceId: string;
  userId: string;
  isEnabled?: boolean;
  debounceMs?: number;
  maxBatchSize?: number;
  delayOnScroll?: boolean;
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
 * 🚀 NAVIGATION-AWARE useRealtimePosts using NavigationAwareRealtimeService
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
  delayOnScroll = true
}: UseRealtimePostsProps) => {
  const [newPostIds, setNewPostIds] = useState<string[]>([]);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [lastPageLoad] = useState<Date>(new Date());
  
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const batchRef = useRef<PostBatch>({ posts: [], lastAdded: new Date() });
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

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
      console.log(`🚫 [RealtimeOptimized] Ignoring own post: ${postId}`);
      return;
    }

    // Don't add posts if they're too close to page load (avoid duplicates)
    const timeSincePageLoad = Date.now() - lastPageLoad.getTime();
    if (timeSincePageLoad < 5000) {
      console.log(`⏳ [RealtimeOptimized] Ignoring post too close to page load: ${postId}`);
      return;
    }

    console.log(`📦 [RealtimeOptimized] Batching new post: ${postId}`);
    
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
      console.log(`🐌 [RealtimeOptimized] User scrolling, delaying notification`);
    }

    if (batchRef.current.posts.length >= maxBatchSize) {
      delay = 500; // Faster processing for large batches
      console.log(`🚀 [RealtimeOptimized] Large batch detected, processing quickly`);
    }

    // Set new timeout with smart delay
    debounceTimeoutRef.current = setTimeout(() => {
      const currentBatch = [...batchRef.current.posts];
      
      if (currentBatch.length > 0) {
        setNewPostIds(prev => {
          const newIds = currentBatch
            .map(post => post.id)
            .filter(id => !prev.includes(id));
          
          if (newIds.length > 0) {
            console.log(`✨ [RealtimeOptimized] Processing batch of ${newIds.length} posts:`, newIds);
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
    setNewPostIds(prev => prev.filter(id => id !== postId));
  };

  // 🔥 KEY CHANGE: Use NavigationAwareRealtimeService instead of GlobalRealtimeService
  const handleRealtimeEvent = (payload: any) => {
    console.log('🔔 [RealtimeOptimized] New post detected:', payload);
    console.log('🔔 [RealtimeOptimized] Payload details:', {
      event: payload.eventType,
      table: payload.table,
      schema: payload.schema,
      new: payload.new,
      old: payload.old
    });
    
    if (payload.new && typeof payload.new === 'object') {
      const newPost = payload.new as NewPostData;
      console.log('🔔 [RealtimeOptimized] Processing new post:', {
        id: newPost.id,
        user_id: newPost.user_id,
        space_id: (newPost as any).space_id,
        created_at: newPost.created_at,
        currentUserId: userId
      });
      addNewPostId(newPost.id, newPost.user_id, newPost);
    } else {
      console.warn('🔔 [RealtimeOptimized] Invalid payload.new:', payload.new);
    }
  };

  // 🚀 NAVIGATION-AWARE: Use NavigationAwareRealtimeService instead of direct GlobalRealtimeService
  const [isConnected, setIsConnected] = useState(false);
  const subscriptionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isEnabled || !spaceId) {
      setIsConnected(false);
      return;
    }

    console.log(`🔔 [RealtimeOptimized] Setting up subscription for space: ${spaceId}`);

    const subscriptionId = navigationAwareRealtimeService.subscribe(
      spaceId,
      'posts',
      handleRealtimeEvent,
      {
        event: 'INSERT',
        filter: `space_id=eq.${spaceId}`
      }
    );

    subscriptionIdRef.current = subscriptionId;
    setIsConnected(true);

    return () => {
      console.log('🔔 [RealtimeOptimized] Cleaning up subscription');
      if (subscriptionIdRef.current) {
        // 🛡️ NAVIGATION-AWARE: This will now check if cleanup should be prevented during navigation
        navigationAwareRealtimeService.unsubscribe(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
      }
      setIsConnected(false);
    };
  }, [spaceId, userId, isEnabled]);

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