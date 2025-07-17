import React, { useState, useRef, useEffect, memo } from 'react';
import { Book } from 'lucide-react';

interface LazyImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  placeholder?: React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
}

export const LazyImage = memo<LazyImageProps>(({
  src,
  alt,
  className = '',
  fallbackClassName = '',
  placeholder,
  onLoad,
  onError
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Set up intersection observer for lazy loading
  useEffect(() => {
    const img = imgRef.current;
    if (!img || !src) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observerRef.current?.disconnect();
        }
      },
      {
        root: null,
        rootMargin: '50px', // Start loading 50px before the image comes into view
        threshold: 0.1
      }
    );

    observerRef.current.observe(img);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Show fallback if no src, error, or not loaded yet
  if (!src || hasError || !isInView) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-slate-100 ${fallbackClassName}`}>
        {placeholder || <Book className="h-12 w-12 text-slate-400" />}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Loading placeholder */}
      {!isLoaded && (
        <div className={`absolute inset-0 flex items-center justify-center bg-slate-100 ${fallbackClassName}`}>
          {placeholder || <Book className="h-12 w-12 text-slate-400" />}
        </div>
      )}
      
      {/* Actual image */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />
    </div>
  );
});

LazyImage.displayName = 'LazyImage'; 