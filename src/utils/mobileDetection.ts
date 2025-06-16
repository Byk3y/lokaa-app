/**
 * Mobile Detection Utility
 * 
 * Provides reliable mobile device detection to prevent mobile-specific
 * systems from running on desktop browsers.
 */

interface MobileDetectionResult {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  userAgent: string;
  screenSize: 'small' | 'medium' | 'large';
  touchCapable: boolean;
}

class MobileDetection {
  private static instance: MobileDetection;
  private detectionResult: MobileDetectionResult | null = null;

  private constructor() {
    this.detectDevice();
    
    // Make available globally for debugging
    if (typeof window !== 'undefined') {
      (window as any).mobileDetection = this;
    }
  }

  static getInstance(): MobileDetection {
    if (!MobileDetection.instance) {
      MobileDetection.instance = new MobileDetection();
    }
    return MobileDetection.instance;
  }

  /**
   * Comprehensive mobile device detection
   */
  private detectDevice(): void {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      this.detectionResult = {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        deviceType: 'desktop',
        userAgent: '',
        screenSize: 'large',
        touchCapable: false
      };
      return;
    }

    const userAgent = navigator.userAgent.toLowerCase();
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Use screen.width for actual device screen, not viewport (more reliable)
    const deviceScreenWidth = window.screen?.width || screenWidth;
    const deviceScreenHeight = window.screen?.height || screenHeight;
    
    const touchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Mobile patterns (more comprehensive)
    const mobilePatterns = [
      /android.*mobile/,
      /iphone/,
      /ipod/,
      /blackberry/,
      /windows phone/,
      /mobile/
    ];

    // Tablet patterns  
    const tabletPatterns = [
      /ipad/,
      /android(?!.*mobile)/,
      /tablet/,
      /kindle/,
      /silk/
    ];

    // Desktop patterns (to override false positives)
    const desktopPatterns = [
      /windows nt/,
      /macintosh/,
      /linux.*x86/,
      /chrome.*desktop/
    ];

    // Check for mobile
    const isMobileUA = mobilePatterns.some(pattern => pattern.test(userAgent));
    
    // Check for tablet
    const isTabletUA = tabletPatterns.some(pattern => pattern.test(userAgent));
    
    // Check for desktop (strong indicator)
    const isDesktopUA = desktopPatterns.some(pattern => pattern.test(userAgent));
    
    // Screen size detection using device screen, not viewport
    const isSmallDeviceScreen = deviceScreenWidth <= 768;
    const isMediumDeviceScreen = deviceScreenWidth > 768 && deviceScreenWidth <= 1024;
    const isLargeDeviceScreen = deviceScreenWidth > 1024;

    // Enhanced mobile detection logic
    let isMobile = false;
    let isTablet = false;
    let isDesktop = true; // Default to desktop

    if (isDesktopUA) {
      // Strong desktop indicators override everything
      isDesktop = true;
      isMobile = false;
      isTablet = false;
    } else if (isMobileUA) {
      // Clear mobile user agent
      isMobile = true;
      isDesktop = false;
      isTablet = false;
    } else if (isTabletUA) {
      // Clear tablet user agent
      isTablet = true;
      isDesktop = false;
      isMobile = false;
    } else {
      // Ambiguous case - use device screen size + touch, but be conservative
      // Only consider mobile if BOTH small screen AND touch capable
      if (isSmallDeviceScreen && touchCapable) {
        isMobile = true;
        isDesktop = false;
      } else if (isMediumDeviceScreen && touchCapable) {
        isTablet = true;
        isDesktop = false;
      }
      // Otherwise stay desktop (conservative approach)
    }

    // Determine device type
    let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
    if (isMobile) deviceType = 'mobile';
    else if (isTablet) deviceType = 'tablet';

    // Determine screen size category based on current viewport (for responsive design)
    let screenSize: 'small' | 'medium' | 'large' = 'large';
    if (screenWidth <= 768) screenSize = 'small';
    else if (screenWidth <= 1024) screenSize = 'medium';

    this.detectionResult = {
      isMobile,
      isTablet,
      isDesktop,
      deviceType,
      userAgent,
      screenSize,
      touchCapable
    };

    // Log detection result in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📱 [MobileDetection] Device detected:', {
        deviceType,
        screenSize,
        viewportWidth: screenWidth,
        deviceScreenWidth,
        touchCapable,
        userAgent: userAgent.substring(0, 50) + '...',
        detectionMethod: isDesktopUA ? 'userAgent-desktop' : 
                        isMobileUA ? 'userAgent-mobile' : 
                        isTabletUA ? 'userAgent-tablet' : 'screen+touch'
      });
    }
  }

  /**
   * Check if current device is mobile
   */
  isMobile(): boolean {
    return this.detectionResult?.isMobile ?? false;
  }

  /**
   * Check if current device is tablet
   */
  isTablet(): boolean {
    return this.detectionResult?.isTablet ?? false;
  }

  /**
   * Check if current device is desktop
   */
  isDesktop(): boolean {
    return this.detectionResult?.isDesktop ?? true;
  }

  /**
   * Get device type
   */
  getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    return this.detectionResult?.deviceType ?? 'desktop';
  }

  /**
   * Check if device has touch capability
   */
  isTouchCapable(): boolean {
    return this.detectionResult?.touchCapable ?? false;
  }

  /**
   * Get screen size category
   */
  getScreenSize(): 'small' | 'medium' | 'large' {
    return this.detectionResult?.screenSize ?? 'large';
  }

  /**
   * Get full detection result
   */
  getDetectionResult(): MobileDetectionResult {
    return this.detectionResult ?? {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      deviceType: 'desktop',
      userAgent: '',
      screenSize: 'large',
      touchCapable: false
    };
  }

  /**
   * Check if mobile-specific features should be enabled
   */
  shouldEnableMobileFeatures(): boolean {
    return this.isMobile() || this.isTablet();
  }

  /**
   * Check if desktop-specific features should be enabled
   */
  shouldEnableDesktopFeatures(): boolean {
    return this.isDesktop();
  }

  /**
   * Re-detect device (useful for responsive changes)
   */
  redetect(): void {
    this.detectDevice();
  }
}

// Create singleton instance
export const mobileDetection = MobileDetection.getInstance();

// Export convenience functions
export const isMobile = () => mobileDetection.isMobile();
export const isTablet = () => mobileDetection.isTablet();
export const isDesktop = () => mobileDetection.isDesktop();
export const getDeviceType = () => mobileDetection.getDeviceType();
export const shouldEnableMobileFeatures = () => mobileDetection.shouldEnableMobileFeatures();
export const shouldEnableDesktopFeatures = () => mobileDetection.shouldEnableDesktopFeatures();

export default mobileDetection; 