import { log } from '@/utils/logger';
/**
 * 🚀 OPTIMIZED AVATAR COMPONENT
 * 
 * High-performance avatar component with:
 * - Intersection Observer lazy loading
 * - Smart caching integration (NEW!)
 * - Progressive loading transitions
 * - Performance monitoring
 * - Accessibility enhancements
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { AvatarCacheService } from '@/services/AvatarCacheService';
import { useAvatar } from '@/shared/utils/avatar-utils';

interface AvatarUser {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

interface OptimizedAvatarProps {
  user: AvatarUser;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  className?: string;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  enableLazyLoading?: boolean;
  enableCaching?: boolean; // 🚀 NEW: Smart caching
  placeholderType?: 'skeleton' | 'blur' | 'initials';
  loadingTransition?: 'fade' | 'blur-to-sharp' | 'scale';
  onClick?: () => void;
  'aria-label'?: string;
}

const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm', 
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
  xxl: 'w-24 h-24 text-2xl'
};

export function OptimizedAvatar({ 
  user,
  size = 'md',
  className = '',
  showOnlineStatus = false,
  isOnline = false,
  enableLazyLoading = true,
  enableCaching = true, // 🚀 NEW: Enabled by default
  placeholderType = 'initials',
  loadingTransition = 'blur-to-sharp',
  onClick,
  'aria-label': ariaLabel,
  ...props 
}: OptimizedAvatarProps) {
  const [isIntersecting, setIsIntersecting] = useState(!enableLazyLoading);
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [cachedUrl, setCachedUrl] = useState<string | null>(null);
  const [loadStartTime] = useState(Date.now());
  const [preloadImage, setPreloadImage] = useState<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Use unified avatar resolver
  const avatar = useAvatar(user);

  // 🚀 ENHANCED: Instant cache checking with preload optimization
  useEffect(() => {
    if (enableCaching && user.id && avatar.hasImage) {
      // Check cache first
      const cached = AvatarCacheService.getCachedAvatar(user.id, size);
      if (cached) {
        setCachedUrl(cached);
        setImageStatus('loaded'); // 🎯 INSTANT: Mark as loaded if cached
        log.debug('Component', `🎯 [OptimizedAvatar] Cache hit for user ${user.id}`);
      } else if (avatar.url) {
        // 🚀 PRELOAD: Start loading image immediately without waiting for intersection
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          // Cache the successful load
          AvatarCacheService.setCachedAvatar(user.id, avatar.url!, size);
          setCachedUrl(avatar.url!);
          setImageStatus('loaded');
          log.debug('Component', `🎯 [OptimizedAvatar] Preloaded and cached avatar for user ${user.id}`);
        };
        img.onerror = () => {
          setImageStatus('error');
        };
        img.src = avatar.url;
        setPreloadImage(img);
      }
    }
  }, [enableCaching, user.id, avatar.hasImage, avatar.url, size]);

  // 🔍 Intersection Observer for lazy loading (only when not preloaded)
  useEffect(() => {
    if (!enableLazyLoading || !containerRef.current || cachedUrl || preloadImage) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '50px' // Start loading 50px before entering viewport
      }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [enableLazyLoading, cachedUrl, preloadImage]);

  // 📊 Performance tracking (simplified)
  useEffect(() => {
    if (imageStatus === 'loaded' && avatar.hasImage) {
      const loadTime = Date.now() - loadStartTime;
      log.debug('Component', '🚀 [OptimizedAvatar] Load time:', { userId: user.id, loadTime, size });
    }
  }, [imageStatus, avatar.hasImage, loadStartTime, size, user.id]);

  // Generate accessible label
  const accessibleLabel = ariaLabel || 
    `${user.full_name || 'User'} profile picture` +
    (avatar.hasImage ? '' : ` showing initials ${avatar.initials}`);

  // Memoize size classes for performance
  const sizeClasses = useMemo(() => SIZE_CLASSES[size], [size]);

  // 🎯 Determine which URL to use (cached, preloaded, or original)
  const imageUrl = cachedUrl || (preloadImage?.complete ? avatar.url : null) || 
                   (isIntersecting ? avatar.url : null);

  // 🎯 ENHANCED: Smarter showing logic
  const shouldShowImage = avatar.hasImage && imageUrl && (
    imageStatus === 'loaded' || 
    (cachedUrl && imageStatus !== 'error') ||
    (preloadImage?.complete && imageStatus !== 'error')
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative inline-flex items-center justify-center rounded-full overflow-hidden flex-shrink-0',
        sizeClasses,
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
      data-optimized-avatar="true"
      data-user-id={user.id}
      data-enable-caching={enableCaching}
      data-enable-lazy-loading={enableLazyLoading}
      onClick={onClick}
      role={onClick ? 'button' : 'img'}
      aria-label={accessibleLabel}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      {...props}
    >
      {/* Image Layer with Smart Loading */}
      {shouldShowImage && (
        <img
          src={imageUrl}
          alt={accessibleLabel}
          className={cn(
            'w-full h-full object-cover transition-all duration-200 ease-out',
            {
              'opacity-100 scale-100 blur-0': imageStatus === 'loaded' || cachedUrl,
              'opacity-0 scale-105 blur-sm': imageStatus === 'loading' && loadingTransition === 'blur-to-sharp',
              'opacity-0 scale-110': imageStatus === 'loading' && loadingTransition === 'scale',
              'opacity-0': imageStatus === 'loading' && loadingTransition === 'fade'
            }
          )}
          onLoad={() => setImageStatus('loaded')}
          onError={() => setImageStatus('error')}
          loading={enableLazyLoading ? 'lazy' : 'eager'}
        />
      )}
      
      {/* Fallback/Placeholder Layer - Only show when truly needed */}
      {(!avatar.hasImage || (!shouldShowImage && imageStatus !== 'loaded')) && (
        <div 
          className={cn(
            'absolute inset-0 flex items-center justify-center transition-opacity duration-200',
            shouldShowImage && imageStatus === 'loaded' ? 'opacity-0' : 'opacity-100'
          )}
          style={{ backgroundColor: avatar.backgroundColor }}
        >
          {/* Skeleton Loading */}
          {placeholderType === 'skeleton' && imageStatus === 'loading' && (
            <div className="bg-white/20 w-full h-full rounded-full" />
          )}
          
          {/* Initials Fallback */}
          {(placeholderType === 'initials' || !avatar.hasImage || imageStatus === 'error') && (
            <span className="font-semibold text-white select-none">
              {avatar.initials}
            </span>
          )}
          
          {/* Blur Placeholder */}
          {placeholderType === 'blur' && avatar.hasImage && imageStatus === 'loading' && (
            <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
          )}
        </div>
      )}

      {/* Online Status Indicator */}
      {showOnlineStatus && (
        <div 
          className={cn(
            'absolute -bottom-0.5 -right-0.5 border-2 border-white rounded-full',
            size === 'xs' ? 'w-2 h-2' : 'w-3 h-3',
            isOnline ? 'bg-green-500' : 'bg-gray-400'
          )}
          aria-hidden="true"
        />
      )}

      {/* Screen reader only description */}
      <span className="sr-only">
        {avatar.hasImage 
          ? `Profile picture of ${user.full_name}`
          : `Initials ${avatar.initials} for ${user.full_name}`
        }
        {showOnlineStatus && ` - ${isOnline ? 'Online' : 'Offline'}`}
      </span>
    </div>
  );
}

/**
 * 🎯 Specialized variants for common use cases with optimized settings
 */

// Member list optimized variant with caching
export function MemberAvatar({ user, isOnline, onClick }: {
  user: AvatarUser;
  isOnline?: boolean;
  onClick?: () => void;
}) {
  return (
    <OptimizedAvatar
      user={user}
      size="lg"
      showOnlineStatus={true}
      isOnline={isOnline}
      enableLazyLoading={false} // 🚀 OPTIMIZED: Disable lazy loading for member lists
      enableCaching={true} // 🚀 Cache enabled for member lists
      placeholderType="initials"
      loadingTransition="fade"
      onClick={onClick}
    />
  );
}

// Profile header variant with enhanced quality
export function ProfileHeaderAvatar({ user, onClick }: {
  user: AvatarUser;
  onClick?: () => void;
}) {
  return (
    <OptimizedAvatar
      user={user}
      size="xxl"
      enableLazyLoading={false}
      enableCaching={true}
      placeholderType="initials"
      loadingTransition="blur-to-sharp"
      onClick={onClick}
      className="ring-4 ring-white shadow-lg"
    />
  );
}

// Chat message variant with fast loading and PROPER SIZING
export function ChatAvatar({ user, onClick }: {
  user: AvatarUser;
  onClick?: () => void;
}) {
  return (
    <OptimizedAvatar
      user={user}
      size="lg"
      enableLazyLoading={false} // 🚀 OPTIMIZED: Immediate loading for chat
      enableCaching={true} // 🚀 Cache for chat performance
      placeholderType="initials"
      loadingTransition="fade"
      onClick={onClick}
      className="h-12 w-12 flex-shrink-0" // 🚀 FIXED: Proper sizing to match original layout
    />
  );
} 