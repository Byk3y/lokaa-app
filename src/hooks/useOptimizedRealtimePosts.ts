import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseOptimizedRealtimePostsProps {
  spaceId: string;
  userId: string;
  isEnabled?: boolean;
  debounceMs?: number;
  maxBatchSize?: number;
  delayOnScroll?: boolean;
  connectionTimeout?: number;
  maxReconnectAttempts?: number;
  performanceMode?: 'standard' | 'performance' | 'battery';
}

interface NewPostData {
  id: string;
  created_at: string;
  user_id: string;
  title: string | null;
  content?: string;
  space_id: string;
}

interface PostBatch {
  posts: NewPostData[];
  lastAdded: Date;
  priority: 'low' | 'normal' | 'high';
}

interface ConnectionMetrics {
  connectTime: number;
  reconnectCount: number;
  lastError: string | null;
  avgLatency: number;
  packetsReceived: number;
}

const PERFORMANCE_CONFIGS = {
  standard: {
    debounceMs: 2000,
    maxBatchSize: 10,
    heartbeatInterval: 30000,
    connectionTimeout: 10000,
  },
  performance: {
    debounceMs: 1000,
    maxBatchSize: 15,
    heartbeatInterval: 15000,
    connectionTimeout: 5000,
  },
  battery: {
    debounceMs: 5000,
    maxBatchSize: 5,
    heartbeatInterval: 60000,
    connectionTimeout: 15000,
  },
};

export const useOptimizedRealtimePosts = ({
  spaceId,
  userId,
  isEnabled = true,
  debounceMs,
  maxBatchSize,
  delayOnScroll = true,
  connectionTimeout = 10000,
  maxReconnectAttempts = 5,
  performanceMode = 'standard',
}: UseOptimizedRealtimePostsProps) => {
  // Performance config
  const config = useMemo(() => ({
    ...PERFORMANCE_CONFIGS[performanceMode],
    ...(debounceMs && { debounceMs }),
    ...(maxBatchSize && { maxBatchSize }),
    connectionTimeout,
  }), [performanceMode, debounceMs, maxBatchSize, connectionTimeout]);

  // State management
  const [newPostIds, setNewPostIds] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [connectionMetrics, setConnectionMetrics] = useState<ConnectionMetrics>({
    connectTime: 0,
    reconnectCount: 0,
    lastError: null,
    avgLatency: 0,
    packetsReceived: 0,
  });

  // Refs for cleanup and state tracking
  const channelRef = useRef<RealtimeChannel | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatRef = useRef<NodeJS.Timeout>();
  const connectionTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptRef = useRef(0);
  const lastPageLoad = useRef<Date>(new Date());
  const batchRef = useRef<PostBatch>({
    posts: [],
    lastAdded: new Date(),
    priority: 'normal',
  });

  // Performance monitoring
  const [performanceMetrics, setPerformanceMetrics] = useState({
    memoryUsage: 0,
    processingTime: 0,
    queueSize: 0,
  });

  // Optimized scroll detection with throttling
  const handleScroll = useCallback(() => {
    if (!delayOnScroll) return;

    setIsUserScrolling(true);
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 1500);
  }, [delayOnScroll]);

  // Throttled scroll listener
  useEffect(() => {
    if (!delayOnScroll) return;

    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', throttledScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll, delayOnScroll]);

  // Memory monitoring
  useEffect(() => {
    const monitorMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setPerformanceMetrics(prev => ({
          ...prev,
          memoryUsage: memory.usedJSHeapSize / memory.jsHeapSizeLimit,
        }));
      }
    };

    const interval = setInterval(monitorMemory, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Optimized batch processing with priority queuing
  const processBatch = useCallback((posts: NewPostData[], priority: 'low' | 'normal' | 'high' = 'normal') => {
    const startTime = performance.now();
    
    // Filter unique posts efficiently
    const uniquePosts = posts.filter((post, index, self) => 
      self.findIndex(p => p.id === post.id) === index
    );

    setNewPostIds(prev => {
      const newIds = uniquePosts
        .map(post => post.id)
        .filter(id => !prev.includes(id));
      
      if (newIds.length > 0) {
        console.log(`✨ [OptimizedRealtime] Processing ${newIds.length} posts (${priority} priority)`);
        
        // Update performance metrics
        const processingTime = performance.now() - startTime;
        setPerformanceMetrics(prev => ({
          ...prev,
          processingTime,
          queueSize: prev.queueSize + newIds.length,
        }));

        return [...prev, ...newIds].slice(-50); // Keep only last 50 for memory efficiency
      }
      return prev;
    });
  }, []);

  // Enhanced post processing with intelligent prioritization
  const addNewPostId = useCallback((postData: NewPostData) => {
    // Don't process own posts
    if (postData.user_id === userId) {
      console.log(`🚫 [OptimizedRealtime] Ignoring own post: ${postData.id}`);
      return;
    }

    // Ignore posts too close to page load
    const timeSincePageLoad = Date.now() - lastPageLoad.current.getTime();
    if (timeSincePageLoad < 5000) {
      console.log(`⏳ [OptimizedRealtime] Ignoring post too close to page load: ${postData.id}`);
      return;
    }

    // Determine priority based on content and timing
    let priority: 'low' | 'normal' | 'high' = 'normal';
    
    // High priority for posts with media or polls
    if (postData.content?.includes('media') || postData.content?.includes('poll')) {
      priority = 'high';
    }
    
    // Low priority during high activity periods
    if (batchRef.current.posts.length > config.maxBatchSize * 0.7) {
      priority = 'low';
    }

    console.log(`📦 [OptimizedRealtime] Queuing post: ${postData.id} (${priority} priority)`);
    
    // Add to batch with priority
    batchRef.current.posts.push(postData);
    batchRef.current.lastAdded = new Date();
    batchRef.current.priority = priority;

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Calculate intelligent delay
    let delay = config.debounceMs;
    
    switch (priority) {
      case 'high':
        delay = Math.max(500, delay * 0.5); // Faster for high priority
        break;
      case 'low':
        delay = delay * 1.5; // Slower for low priority
        break;
    }

    if (isUserScrolling && delayOnScroll) {
      delay *= 1.5; // Additional delay if scrolling
    }

    if (batchRef.current.posts.length >= config.maxBatchSize) {
      delay = 300; // Very fast processing for large batches
    }

    // Process batch with delay
    debounceTimeoutRef.current = setTimeout(() => {
      const currentBatch = [...batchRef.current.posts];
      const currentPriority = batchRef.current.priority;
      
      if (currentBatch.length > 0) {
        processBatch(currentBatch, currentPriority);
        batchRef.current.posts = [];
        batchRef.current.priority = 'normal';
      }
    }, delay);
  }, [userId, config, isUserScrolling, delayOnScroll, processBatch]);

  // Connection management with auto-reconnect
  const establishConnection = useCallback(() => {
    if (!isEnabled || !spaceId || channelRef.current) return;

    const connectStartTime = Date.now();
    console.log(`🔌 [OptimizedRealtime] Establishing connection (attempt ${reconnectAttemptRef.current + 1})`);

    // Set connection timeout
    connectionTimeoutRef.current = setTimeout(() => {
      console.log('⏰ [OptimizedRealtime] Connection timeout, retrying...');
      if (reconnectAttemptRef.current < maxReconnectAttempts) {
        reconnectAttemptRef.current++;
        establishConnection();
      }
    }, config.connectionTimeout);

    const channel = supabase
      .channel(`posts_space_${spaceId}_optimized`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: `space_id=eq.${spaceId}`,
        },
        (payload) => {
          const receiveTime = Date.now();
          console.log('📨 [OptimizedRealtime] Post received:', payload.new?.id);
          
          // Update connection metrics
          setConnectionMetrics(prev => ({
            ...prev,
            packetsReceived: prev.packetsReceived + 1,
            avgLatency: (prev.avgLatency + (receiveTime - connectStartTime)) / 2,
          }));

          if (payload.new && typeof payload.new === 'object') {
            const newPost = payload.new as NewPostData;
            addNewPostId(newPost);
          }
        }
      )
      .subscribe((status) => {
        console.log(`🔔 [OptimizedRealtime] Status: ${status}`);
        
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }

        if (status === 'SUBSCRIBED') {
          const connectTime = Date.now() - connectStartTime;
          setIsConnected(true);
          setConnectionMetrics(prev => ({
            ...prev,
            connectTime,
            lastError: null,
          }));
          reconnectAttemptRef.current = 0;
          
          // Start heartbeat
          heartbeatRef.current = setInterval(() => {
            console.log('💓 [OptimizedRealtime] Heartbeat');
          }, config.heartbeatInterval);
          
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setConnectionMetrics(prev => ({
            ...prev,
            lastError: 'Channel error',
            reconnectCount: prev.reconnectCount + 1,
          }));
          
          // Auto-reconnect with exponential backoff
          if (reconnectAttemptRef.current < maxReconnectAttempts) {
            const backoffDelay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
            setTimeout(() => {
              reconnectAttemptRef.current++;
              establishConnection();
            }, backoffDelay);
          }
        }
      });

    channelRef.current = channel;
  }, [isEnabled, spaceId, config, maxReconnectAttempts, addNewPostId]);

  // Connection effect
  useEffect(() => {
    establishConnection();

    return () => {
      console.log('🔌 [OptimizedRealtime] Cleaning up connection');
      
      // Clear all timeouts
      [debounceTimeoutRef, scrollTimeoutRef, heartbeatRef, connectionTimeoutRef].forEach(ref => {
        if (ref.current) {
          clearTimeout(ref.current);
        }
      });

      // Remove channel
      if (channelRef.current) {
        getSupabaseClient().removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      setIsConnected(false);
      reconnectAttemptRef.current = 0;
    };
  }, [establishConnection]);

  // Public methods
  const clearNewPosts = useCallback(() => {
    setNewPostIds([]);
    setPerformanceMetrics(prev => ({ ...prev, queueSize: 0 }));
  }, []);

  const removePostId = useCallback((postId: string) => {
    setNewPostIds(prev => prev.filter(id => id !== postId));
  }, []);

  const forceReconnect = useCallback(() => {
    if (channelRef.current) {
      getSupabaseClient().removeChannel(channelRef.current);
      channelRef.current = null;
    }
    reconnectAttemptRef.current = 0;
    establishConnection();
  }, [establishConnection]);

  // Get connection health status
  const getConnectionHealth = useCallback(() => {
    const { connectTime, reconnectCount, avgLatency, packetsReceived } = connectionMetrics;
    
    let health: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
    
    if (connectTime > 5000 || reconnectCount > 2 || avgLatency > 2000) {
      health = 'poor';
    } else if (connectTime > 3000 || reconnectCount > 1 || avgLatency > 1000) {
      health = 'fair';
    } else if (connectTime > 1000 || avgLatency > 500) {
      health = 'good';
    }
    
    return {
      health,
      metrics: connectionMetrics,
      performance: performanceMetrics,
      isOptimal: health === 'excellent' && performanceMetrics.memoryUsage < 0.8,
    };
  }, [connectionMetrics, performanceMetrics]);

  return {
    newPostIds,
    newPostCount: newPostIds.length,
    isConnected,
    connectionMetrics,
    performanceMetrics,
    clearNewPosts,
    removePostId,
    forceReconnect,
    getConnectionHealth,
  };
}; 