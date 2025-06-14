import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
  placeholder?: 'blur' | 'skeleton' | 'none';
  priority?: boolean; // For above-the-fold images
  onLoad?: () => void;
  onError?: (error: Error) => void;
  width?: number;
  height?: number;
  aspectRatio?: 'square' | '16/9' | '4/3' | 'auto';
}

/**
 * OptimizedImage component with progressive loading and error handling
 * Provides better user experience through intelligent loading states
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  fallback = '/placeholder-image.png',
  placeholder = 'skeleton',
  priority = false,
  onLoad,
  onError,
  width,
  height,
  aspectRatio = 'auto'
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(priority); // Load immediately if priority
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || inView) return; // Skip if already loading or priority

    const img = imgRef.current;
    if (!img) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            observerRef.current?.disconnect();
          }
        });
      },
      {
        rootMargin: '100px', // Start loading 100px before image comes into view
        threshold: 0.1
      }
    );

    observerRef.current.observe(img);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [priority, inView]);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    setError(true);
    const errorMsg = new Error(`Failed to load image: ${src}`);
    onError?.(errorMsg);
    console.warn('Image load error:', errorMsg);
  }, [src, onError]);

  // Determine aspect ratio class
  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case 'square':
        return 'aspect-square';
      case '16/9':
        return 'aspect-video';
      case '4/3':
        return 'aspect-[4/3]';
      default:
        return '';
    }
  };

  // Generate placeholder based on type
  const renderPlaceholder = () => {
    if (placeholder === 'none') return null;

    const placeholderClass = cn(
      'absolute inset-0',
      getAspectRatioClass(),
      {
        'bg-gray-200 animate-pulse rounded': placeholder === 'skeleton',
        'bg-gradient-to-br from-gray-100 to-gray-200': placeholder === 'blur'
      }
    );

    return (
      <div className={placeholderClass}>
        {placeholder === 'skeleton' && (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('relative overflow-hidden', className, getAspectRatioClass())}>
      {/* Placeholder - shown while loading or if no image loaded yet */}
      {(!loaded || !inView) && renderPlaceholder()}
      
      {/* Main image - only load when in view or priority */}
      {inView && (
        <img
          ref={imgRef}
          src={error ? fallback : src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          width={width}
          height={height}
          className={cn(
            'transition-opacity duration-300 object-cover',
            {
              'opacity-100': loaded,
              'opacity-0': !loaded,
              'absolute inset-0 w-full h-full': aspectRatio !== 'auto'
            }
          )}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          style={{
            ...(width && height && { aspectRatio: `${width} / ${height}` })
          }}
        />
      )}
      
      {/* Error state overlay */}
      {error && loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
          <div className="text-center">
            <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p>Image unavailable</p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Pre-configured image components for common use cases
 */

// Avatar images - typically small and round
export const OptimizedAvatar: React.FC<Omit<OptimizedImageProps, 'aspectRatio' | 'placeholder'>> = (props) => (
  <OptimizedImage
    {...props}
    aspectRatio="square"
    placeholder="skeleton"
    className={cn('rounded-full', props.className)}
  />
);

// Cover images - typically wide banners
export const OptimizedCover: React.FC<Omit<OptimizedImageProps, 'aspectRatio' | 'placeholder'>> = (props) => (
  <OptimizedImage
    {...props}
    aspectRatio="16/9"
    placeholder="blur"
    className={cn('w-full', props.className)}
  />
);

// Thumbnail images - typically square
export const OptimizedThumbnail: React.FC<Omit<OptimizedImageProps, 'aspectRatio' | 'placeholder'>> = (props) => (
  <OptimizedImage
    {...props}
    aspectRatio="square"
    placeholder="skeleton"
    className={cn('rounded-lg', props.className)}
  />
);

/**
 * Higher-order component for progressive image enhancement
 */
export const withImageOptimization = <P extends { src?: string; alt?: string }>(
  Component: React.ComponentType<P>
) => {
  return (props: P) => {
    const { src, alt, ...rest } = props;
    
    if (src && alt) {
      return <OptimizedImage src={src} alt={alt} {...(rest as any)} />;
    }
    
    return <Component {...props} />;
  };
}; 