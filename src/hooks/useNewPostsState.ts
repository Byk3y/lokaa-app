import { useState, useCallback, useEffect, useRef } from 'react';

interface UseNewPostsStateProps {
  onLoadNewPosts?: (postIds: string[]) => Promise<void>;
  maxRetries?: number;
  retryDelay?: number;
}

export const useNewPostsState = ({ 
  onLoadNewPosts,
  maxRetries = 3,
  retryDelay = 2000 
}: UseNewPostsStateProps) => {
  const [isLoadingNewPosts, setIsLoadingNewPosts] = useState(false);
  const [lastNotificationTime, setLastNotificationTime] = useState<Date | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  // Enhanced load new posts handler with retry logic
  const handleLoadNewPosts = useCallback(async (postIds: string[]) => {
    if (isLoadingNewPosts || postIds.length === 0) return;

    setIsLoadingNewPosts(true);
    setLoadError(null);
    
    const attemptLoad = async (attempt: number = 1): Promise<void> => {
      try {
  
        
        if (onLoadNewPosts) {
          await onLoadNewPosts(postIds);
        }
        
        console.log(`✅ [NewPostsState] Successfully loaded new posts`);
        setLastNotificationTime(new Date());
        setIsDismissed(false);
        setRetryCount(0);
        setLoadError(null);
        
      } catch (error) {
        console.error(`❌ [NewPostsState] Failed to load new posts (attempt ${attempt}):`, error);
        
        if (attempt < maxRetries) {
          console.log(`🔄 [NewPostsState] Retrying in ${retryDelay}ms...`);
          setRetryCount(attempt);
          
          retryTimeoutRef.current = setTimeout(() => {
            attemptLoad(attempt + 1);
          }, retryDelay);
        } else {
          setLoadError(`Failed to load new posts after ${maxRetries} attempts`);
          setRetryCount(0);
        }
      }
    };

    await attemptLoad();
    setIsLoadingNewPosts(false);
  }, [isLoadingNewPosts, onLoadNewPosts, maxRetries, retryDelay]);

  // Dismiss notification
  const handleDismissNotification = useCallback(() => {
    console.log('🔄 [NewPostsState] Dismissing notification');
    setIsDismissed(true);
  }, []);

  // Update last notification time
  const updateLastNotificationTime = useCallback(() => {
    setLastNotificationTime(new Date());
    setIsDismissed(false); // Reset dismissal when new notification appears
  }, []);

  // Reset all states
  const resetStates = useCallback(() => {
    setIsLoadingNewPosts(false);
    setIsDismissed(false);
    setLastNotificationTime(null);
    setLoadError(null);
    setRetryCount(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    isLoadingNewPosts,
    isDismissed,
    lastNotificationTime,
    loadError,
    retryCount,
    handleLoadNewPosts,
    handleDismissNotification,
    updateLastNotificationTime,
    resetStates,
  };
}; 