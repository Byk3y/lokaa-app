import { log } from '@/utils/logger';
import React, { memo, useMemo, useCallback, useRef, useEffect } from 'react';
import { performanceMonitor } from '../../utils/performanceMonitor';
import { useCleanupTracker } from '../../hooks/useCleanupTracker';
import { getInitials } from '@/shared/utils/avatar-utils';
import { sanitizePostContent } from '@/utils/htmlSanitizer';

/**
 * Higher-order component for automatic performance memoization
 */
export function withPerformanceMemo<P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  componentName: string,
  customCompare?: (prevProps: P, nextProps: P) => boolean
) {
  const MemoizedComponent = memo(function PerformanceMemoComponent(props: P) {
    const cleanup = useCleanupTracker(componentName);
    const renderTimingId = useRef<string>();
    const renderCount = useRef(0);
    const lastPropsRef = useRef<P>(props);
    
    // Track render performance
    useEffect(() => {
      renderCount.current++;
      renderTimingId.current = performanceMonitor.startComponentTiming(componentName);
      
      // Log re-render causes in development
      if (process.env.NODE_ENV === 'development' && renderCount.current > 1) {
        const changedProps = Object.keys(props).filter(
          key => props[key] !== lastPropsRef.current[key]
        );
        
        if (changedProps.length > 0) {
          log.debug('Component', `[${componentName}] Re-render #${renderCount.current} caused by props:`, changedProps);
        }
      }
      
      lastPropsRef.current = props;
      
      return () => {
        if (renderTimingId.current) {
          const duration = performanceMonitor.endComponentTiming(renderTimingId.current);
          
          // Log slow renders
          if (duration > 16) { // 60fps threshold
            log.warn('Component', `[${componentName}] Slow render: ${duration.toFixed(2)}ms`);
          }
        }
      };
    });
    
    return <Component {...props} />;
  }, customCompare || ((prevProps, nextProps) => {
    // Default shallow comparison with performance logging
    const keys = Object.keys(nextProps);
    
    for (const key of keys) {
      if (prevProps[key] !== nextProps[key]) {
        if (process.env.NODE_ENV === 'development') {
          log.debug('Component', `[${componentName}] Prop '${key}' changed:`, {
            from: prevProps[key],
            to: nextProps[key]
          });
        }
        return false;
      }
    }
    
    return true;
  }));
  
  MemoizedComponent.displayName = `withPerformanceMemo(${componentName})`;
  return MemoizedComponent;
}

/**
 * Hook for expensive calculations with performance tracking
 */
export function useExpensiveMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  debugName?: string
): T {
  const timingRef = useRef<string>();
  
  return useMemo(() => {
    if (debugName) {
      timingRef.current = performanceMonitor.startComponentTiming(`useMemo:${debugName}`);
    }
    
    const result = factory();
    
    if (debugName && timingRef.current) {
      const duration = performanceMonitor.endComponentTiming(timingRef.current);
      if (duration > 5) { // Log memoizations taking more than 5ms
        log.warn('Component', `[useMemo:${debugName}] Expensive calculation: ${duration.toFixed(2)}ms`);
      }
    }
    
    return result;
  }, deps);
}

/**
 * Hook for stable callbacks with performance tracking
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
  debugName?: string
): T {
  const callCountRef = useRef(0);
  
  return useCallback((...args: Parameters<T>) => {
    callCountRef.current++;
    
    if (debugName && process.env.NODE_ENV === 'development') {
      if (callCountRef.current > 100) {
        log.warn('Component', `[useStableCallback:${debugName}] High call count: ${callCountRef.current}`);
      }
    }
    
    return callback(...args);
  }, deps) as T;
}

/**
 * Example: Optimized PostCard component
 */
interface PostCardProps {
  id: string;
  content?: string;
  media_urls?: string[];
  content_gif_url?: string;
  likes?: number;
  comments?: number;
  author?: {
    id: string;
    name: string;
    avatar?: string;
  };
  onLikeToggled?: (postId: string) => void;
  onPostClick?: (postId: string) => void;
  onCommentClick?: (postId: string) => void;
}

export const OptimizedPostCard = withPerformanceMemo(
  function PostCard(props: PostCardProps) {
    const { 
      id, 
      content, 
      media_urls, 
      content_gif_url, 
      likes = 0, 
      comments = 0, 
      author,
      onLikeToggled,
      onPostClick,
      onCommentClick
    } = props;
    
    // Memoize expensive content processing
    const processedContent = useExpensiveMemo(() => {
      if (!content) return '';
      
      // Process content with markdown-like formatting
      const processed = content
        .replace(/@(\w+)/g, '<mention>@$1</mention>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
        
      // Sanitize the processed content to prevent XSS
      return sanitizePostContent(processed);
    }, [content], 'processContent');
    
    // Memoize media configuration
    const mediaConfig = useMemo(() => ({
      urls: media_urls || [],
      hasMedia: !!(media_urls?.length || content_gif_url),
      gifUrl: content_gif_url,
      primaryMedia: media_urls?.[0] || content_gif_url
    }), [media_urls, content_gif_url]);
    
    // Stable event handlers to prevent child re-renders
    const handleLike = useStableCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      onLikeToggled?.(id);
    }, [id, onLikeToggled], 'handleLike');
    
    const handleClick = useStableCallback(() => {
      onPostClick?.(id);
    }, [id, onPostClick], 'handleClick');
    
    const handleCommentClick = useStableCallback(() => {
      onCommentClick?.(id);
    }, [id, onCommentClick], 'handleCommentClick');
    
    // Memoize author display
    const authorDisplay = useMemo(() => {
      if (!author) return { name: 'Unknown', avatar: null };
      return {
        name: author.name || 'Unknown User',
        avatar: author.avatar,
        initials: author.name?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'U'
      };
    }, [author]);
    
    return (
      <div 
        className="post-card border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
        onClick={handleClick}
      >
        {/* Author Section */}
        <div className="flex items-center mb-3">
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center mr-3">
            {authorDisplay.avatar ? (
              <img 
                src={authorDisplay.avatar} 
                alt={authorDisplay.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-sm font-medium text-gray-600">
                {authorDisplay.initials}
              </span>
            )}
          </div>
          <span className="font-medium text-gray-900">{authorDisplay.name}</span>
        </div>
        
        {/* Content Section */}
        {processedContent && (
          <div 
            className="mb-3 text-gray-800"
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        )}
        
        {/* Media Section */}
        {mediaConfig.hasMedia && (
          <div className="mb-3">
            {mediaConfig.primaryMedia && (
              <img 
                src={mediaConfig.primaryMedia}
                alt="Post media"
                className="w-full rounded-md max-h-64 object-cover"
                loading="lazy"
              />
            )}
          </div>
        )}
        
        {/* Actions Section */}
        <div className="flex items-center space-x-4 pt-2 border-t">
          <button
            onClick={handleLike}
            className="flex items-center space-x-1 text-gray-600 hover:text-red-500 transition-colors"
          >
            <span>❤️</span>
            <span>{likes}</span>
          </button>
          
          <button
            onClick={handleCommentClick}
            className="flex items-center space-x-1 text-gray-600 hover:text-blue-500 transition-colors"
          >
            <span>💬</span>
            <span>{comments}</span>
          </button>
        </div>
      </div>
    );
  },
  'PostCard',
  (prevProps, nextProps) => {
    // Custom comparison for PostCard
    return (
      prevProps.id === nextProps.id &&
      prevProps.content === nextProps.content &&
      prevProps.likes === nextProps.likes &&
      prevProps.comments === nextProps.comments &&
      JSON.stringify(prevProps.media_urls) === JSON.stringify(nextProps.media_urls) &&
      prevProps.content_gif_url === nextProps.content_gif_url &&
      JSON.stringify(prevProps.author) === JSON.stringify(nextProps.author)
    );
  }
);

/**
 * Example: Optimized User Avatar component
 */
interface UserAvatarProps {
  userId: string;
  name?: string;
  avatar?: string;
  size?: 'sm' | 'md' | 'lg';
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  onClick?: (userId: string) => void;
}

export const OptimizedUserAvatar = withPerformanceMemo(
  function UserAvatar(props: UserAvatarProps) {
    const { 
      userId, 
      name = '', 
      avatar, 
      size = 'md', 
      showOnlineStatus = false, 
      isOnline = false,
      onClick
    } = props;
    
    const sizeClasses = useMemo(() => {
      const sizes = {
        sm: 'w-6 h-6 text-xs',
        md: 'w-8 h-8 text-sm',
        lg: 'w-12 h-12 text-base'
      };
      return sizes[size];
    }, [size]);
    
    const initials = useMemo(() => getInitials(name), [name]);
    
    const handleClick = useStableCallback(() => {
      onClick?.(userId);
    }, [userId, onClick], 'avatarClick');
    
    return (
      <div className="relative inline-block">
        <div 
          className={`${sizeClasses} rounded-full bg-gray-300 flex items-center justify-center cursor-pointer overflow-hidden`}
          onClick={handleClick}
          title={name}
        >
          {avatar ? (
            <img 
              src={avatar}
              alt={name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="font-medium text-gray-600">
              {initials}
            </span>
          )}
        </div>
        
        {showOnlineStatus && (
          <div 
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
              isOnline ? 'bg-green-500' : 'bg-gray-400'
            }`}
          />
        )}
      </div>
    );
  },
  'UserAvatar'
);

/**
 * Performance debugging utilities - Phase 6 Compatible
 */
export const PerformanceDebugger = {
  /**
   * Log component render performance
   */
  logComponentPerformance: (componentName: string) => {
    // Phase 6: Use unified performance system
    if (typeof window !== 'undefined' && window.getPerformanceSummary) {
      const summary = window.getPerformanceSummary();
      log.debug('Component', `[${componentName}] Performance:`, summary);
    } else {
      log.debug('Component', `[${componentName}] Performance monitoring active via Phase 6 unified system`);
    }
  },
  
  /**
   * Get performance report for all memoized components
   */
  getPerformanceReport: () => {
    // Phase 6: Use unified performance system
    if (typeof window !== 'undefined' && window.getSystemHealth) {
      return window.getSystemHealth();
    }
    return { message: 'Phase 6 unified performance system active' };
  },
  
  /**
   * Start performance profiling session
   */
  startProfiling: () => {
    log.debug('Component', '🔍 Starting performance profiling...');
    // Phase 6: Performance monitoring is auto-initialized via unified system
  },
  
  /**
   * Stop performance profiling and get results
   */
  stopProfiling: () => {
    // Phase 6: Use unified performance system
    if (typeof window !== 'undefined' && window.getPerformanceSummary) {
      const report = window.getPerformanceSummary();
      log.debug('Component', '📊 Performance profiling complete:', report);
      return report;
    }
    log.debug('Component', '📊 Performance profiling complete - Phase 6 unified system');
    return { message: 'Phase 6 unified performance system active' };
  }
};

// Expose debugging tools in development
if (process.env.NODE_ENV === 'development') {
  (window as any).PerformanceDebugger = PerformanceDebugger;
} 