import { useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
  created_at: string;
  user_id: string;
  title: string | null;
}

interface PostBatch {
  posts: NewPostData[];
  lastAdded: Date;
}

export const useRealtimePosts = ({ 
  spaceId, 
  userId, 
  isEnabled = true,
  debounceMs = 2000,
  maxBatchSize = 10,
  delayOnScroll = true
}: UseRealtimePostsProps) => {
  const [newPostIds, setNewPostIds] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [lastPageLoad] = useState<Date>(new Date());
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const batchRef = useRef<PostBatch>({ posts: [], lastAdded: new Date() });
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // Track user scrolling activity
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

  // Smart batching function with enhanced debouncing
  const addNewPostId = (postId: string, postUserId: string, postData: NewPostData) => {
    // Don't show notification for user's own posts
    if (postUserId === userId) {
      console.log(`🚫 [Realtime] Ignoring own post: ${postId}`);
      return;
    }

    // Don't add posts if they're too close to page load (avoid duplicates)
    const timeSincePageLoad = Date.now() - lastPageLoad.getTime();
    if (timeSincePageLoad < 5000) {
      console.log(`⏳ [Realtime] Ignoring post too close to page load: ${postId}`);
      return;
    }

    console.log(`📦 [Realtime] Batching new post: ${postId}`);
    
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
      console.log(`🐌 [Realtime] User scrolling, delaying notification`);
    }

    if (batchRef.current.posts.length >= maxBatchSize) {
      delay = 500; // Faster processing for large batches
      console.log(`🚀 [Realtime] Large batch detected, processing quickly`);
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
            console.log(`✨ [Realtime] Processing batch of ${newIds.length} posts:`, newIds);
            return [...prev, ...newIds];
          }
          return prev;
        });
        
        // Clear the batch
        batchRef.current.posts = [];
      }
    }, delay);
  };

  // Clear new post notifications
  const clearNewPosts = () => {
    setNewPostIds([]);
  };

  // Remove specific post from notifications
  const removePostId = (postId: string) => {
    setNewPostIds(prev => prev.filter(id => id !== postId));
  };

  useEffect(() => {
    if (!isEnabled || !spaceId) return;

    console.log(`🔔 [RealtimePosts] Setting up subscription for space: ${spaceId}`);
    console.log(`🔔 [RealtimePosts] Filter: space_id=eq.${spaceId}`);
    console.log(`🔔 [RealtimePosts] Current user ID: ${userId}`);

    // Create channel for this space
    const channel = getSupabaseClient()
      .channel(`posts_space_${spaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: `space_id=eq.${spaceId}`,
        },
        (payload) => {
          console.log('🔔 [RealtimePosts] New post detected:', payload);
          console.log('🔔 [RealtimePosts] Payload details:', {
            event: payload.eventType,
            table: payload.table,
            schema: payload.schema,
            new: payload.new,
            old: payload.old
          });
          
          if (payload.new && typeof payload.new === 'object') {
            const newPost = payload.new as NewPostData;
            console.log('🔔 [RealtimePosts] Processing new post:', {
              id: newPost.id,
              user_id: newPost.user_id,
              space_id: (newPost as any).space_id,
              created_at: newPost.created_at,
              currentUserId: userId
            });
            addNewPostId(newPost.id, newPost.user_id, newPost);
          } else {
            console.warn('🔔 [RealtimePosts] Invalid payload.new:', payload.new);
          }
        }
      )
      .subscribe((status) => {
        console.log(`🔔 [RealtimePosts] Subscription status: ${status}`);
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    // Cleanup function
    return () => {
      console.log('🔔 [RealtimePosts] Cleaning up subscription');
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (channelRef.current) {
        getSupabaseClient().removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [spaceId, userId, isEnabled]);

  // Cleanup on unmount
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