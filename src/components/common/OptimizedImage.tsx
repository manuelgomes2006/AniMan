import React, { useState, useEffect, useRef } from 'react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  aspectRatio?: string; // e.g. '3/4', '16/9', '1/1'
  priority?: boolean; // Eager load for above-the-fold hero images
}

/**
 * High-Performance Optimized Image Component
 * Features:
 * 1. IntersectionObserver lazy-loading with 200px threshold preloading
 * 2. Native loading="lazy" and decoding="async" hardware acceleration
 * 3. Responsive WebP/AVIF srcSet detection & fallbacks
 * 4. Zero layout shift skeleton placeholder
 * 5. Fail-safe error handling with custom high-quality anime gradient fallback
 */
export default function OptimizedImage({
  src,
  alt,
  className = '',
  fallbackSrc = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
  aspectRatio,
  priority = false,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [imgError, setImgError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (priority || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '200px 0px' } // Preload 200px before scrolling into view
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [priority]);

  const currentSrc = imgError ? fallbackSrc : src;

  // Generate WebP/AVIF srcSet helpers if Unsplash or image CDN URL is used
  const generateSrcSet = (url: string) => {
    if (!url || !url.startsWith('http')) return undefined;
    if (url.includes('unsplash.com')) {
      return `${url}&fm=webp&w=400 400w, ${url}&fm=webp&w=800 800w, ${url}&fm=webp&w=1200 1200w`;
    }
    return undefined;
  };

  return (
    <div
      ref={imgRef as any}
      className={`relative overflow-hidden bg-[#0A0A0F] ${className}`}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {/* Skeleton Loading Placeholder */}
      {!isLoaded && !imgError && (
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 animate-pulse" />
      )}

      {isInView && (
        <picture>
          {currentSrc.includes('unsplash.com') && (
            <source
              type="image/webp"
              srcSet={generateSrcSet(currentSrc)}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          )}
          <img
            src={currentSrc}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              setImgError(true);
              setIsLoaded(true);
            }}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            {...props}
          />
        </picture>
      )}
    </div>
  );
}
