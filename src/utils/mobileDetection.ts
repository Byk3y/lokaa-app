/**
 * ✨ Industry-Standard Mobile Detection
 * 
 * Simplified, fast mobile detection following industry best practices
 * Designed to work with the Mobile App Optimizer
 */

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
  const hasRealTouch = navigator.maxTouchPoints > 0 && /Android|iPhone|iPad/i.test(userAgent);
  
  // Device is mobile if it has mobile user agent AND (mobile platform OR real touch)
  const isMobile = isMobileUserAgent && (isMobilePlatform || hasRealTouch);
  
  return isMobile;
}

/**
 * Should enable mobile-specific features
 * Uses simplified mobile detection for consistent behavior
 */
export function shouldEnableMobileFeatures(): boolean {
  return detectMobileDevice();
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

  const isMobile = detectMobileDevice();
  
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
      touchCapable: 'ontouchstart' in window || navigator.maxTouchPoints > 0
    }
  };
}

/**
 * Refresh mobile detection (simplified - no caching needed)
 */
export function refreshMobileDetection(): boolean {
  return detectMobileDevice();
}

/**
 * Get mobile detection debug info (simplified)
 */
export function getMobileDetectionDebug() {
  return {
    isMobile: detectMobileDevice(),
    cached: false, // No caching in simplified version
    cacheAge: 0,
    cacheValid: false,
    lastDetectionTime: Date.now(),
    info: getMobileInfo()
  };
}

/**
 * Legacy compatibility function
 */
export function isMobile(): boolean {
  return detectMobileDevice();
}

// Export the main detection function as default
export default detectMobileDevice; 