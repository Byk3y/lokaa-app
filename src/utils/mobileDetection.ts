/**
 * ✨ Industry-Standard Mobile Detection
 * 
 * Simplified, fast mobile detection following industry best practices
 * Designed to work with the Mobile App Optimizer
 */

// Global cache for mobile detection to prevent changes during session
let mobileDetectionCache: boolean | null = null;
let mobileDetectionInitialized = false;

/**
 * Simple, reliable mobile detection
 * Used by Mobile App Optimizer for consistent behavior
 */
function detectMobileDevice(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // More accurate mobile detection
  const userAgent = navigator.userAgent || '';
  
  // Check for mobile user agent
  const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  // Check for mobile platform
  const isMobilePlatform = /Android|iOS|iPhone|iPad/i.test(navigator.platform || '');
  
  // Check for touch capability (but not just any touch screen)
  // Only consider it mobile touch if it's actually a mobile device
  const hasRealTouch = navigator.maxTouchPoints > 0 && /Android|iPhone|iPad/i.test(userAgent);
  
  // Device is mobile if it has mobile user agent AND (mobile platform OR real touch)
  const isMobile = isMobileUserAgent && (isMobilePlatform || hasRealTouch);
  
  return isMobile;
}

/**
 * Should enable mobile-specific features
 * Uses simplified mobile detection for consistent behavior
 * NOW CACHED to prevent changes during session
 */
export function shouldEnableMobileFeatures(): boolean {
  return getStableMobileDetection();
}

/**
 * Get stable mobile detection that doesn't change during session
 * This prevents hook order violations when viewport changes
 */
export function getStableMobileDetection(): boolean {
  // If already initialized, return cached value
  if (mobileDetectionInitialized) {
    return mobileDetectionCache!;
  }

  // Initialize mobile detection once
  mobileDetectionCache = detectMobileDevice();
  mobileDetectionInitialized = true;

  // Log the detection result for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('📱 [MobileDetection] Initialized:', {
      isMobile: mobileDetectionCache,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      maxTouchPoints: navigator.maxTouchPoints,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    });
  }

  return mobileDetectionCache;
}

/**
 * Force refresh mobile detection (for testing only)
 * Should not be used in production as it can cause hook order issues
 */
export function forceRefreshMobileDetection(): boolean {
  mobileDetectionInitialized = false;
  mobileDetectionCache = null;
  return getStableMobileDetection();
}

/**
 * Get detailed mobile information
 */
export function getMobileInfo() {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      userAgent: '',
      viewport: { width: 0, height: 0 },
      touch: false,
      platform: 'unknown'
    };
  }

  const isMobile = getStableMobileDetection();
  
  return {
    isMobile,
    userAgent: navigator.userAgent || '',
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    platform: navigator.platform || 'unknown',
    // Detailed breakdown
    detection: {
      userAgentMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i.test(navigator.userAgent || ''),
      viewportMobile: window.innerWidth <= 768,
      touchCapable: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      cached: mobileDetectionInitialized,
      cachedValue: mobileDetectionCache
    }
  };
}

/**
 * Refresh mobile detection (simplified - no caching needed)
 * @deprecated Use getStableMobileDetection() instead
 */
export function refreshMobileDetection(): boolean {
  console.warn('⚠️ [MobileDetection] refreshMobileDetection() is deprecated. Use getStableMobileDetection() instead.');
  return getStableMobileDetection();
}

/**
 * Get mobile detection debug info (simplified)
 */
export function getMobileDetectionDebug() {
  return {
    isMobile: getStableMobileDetection(),
    cached: mobileDetectionInitialized,
    cacheAge: mobileDetectionInitialized ? Date.now() : 0,
    cacheValid: mobileDetectionInitialized,
    lastDetectionTime: Date.now(),
    info: getMobileInfo()
  };
}

/**
 * Legacy compatibility function
 * Now uses stable detection to prevent hook order issues
 */
export function isMobile(): boolean {
  return getStableMobileDetection();
}

// Export the main detection function as default
export default getStableMobileDetection; 