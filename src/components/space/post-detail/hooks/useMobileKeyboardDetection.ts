import { log } from '@/utils/logger';
import { useState, useEffect } from 'react';
import { shouldEnableMobileFeatures } from '@/utils/mobileDetection';

/**
 * Hook for detecting mobile keyboard state
 * Extracted from PostDetailModal for better separation of concerns
 */
export function useMobileKeyboardDetection() {
  const isMobile = shouldEnableMobileFeatures();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (!isMobile) return;

    const handleViewportChange = () => {
      const currentViewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.screen.height;
      
      // If viewport height is significantly smaller than screen height, keyboard is likely open
      const keyboardThreshold = windowHeight * 0.75;
      const keyboardIsOpen = currentViewportHeight < keyboardThreshold;
      
      setIsKeyboardOpen(keyboardIsOpen);
      
      log.debug('Component', '🔥 [useMobileKeyboardDetection] Keyboard state:', {
        keyboardIsOpen,
        currentViewportHeight,
        windowHeight,
        threshold: keyboardThreshold
      });
    };

    // Listen to visual viewport changes (better for keyboard detection)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      return () => window.visualViewport?.removeEventListener('resize', handleViewportChange);
    } else {
      // Fallback for older browsers
      window.addEventListener('resize', handleViewportChange);
      return () => window.removeEventListener('resize', handleViewportChange);
    }
  }, [isMobile]);

  return {
    isMobile,
    isKeyboardOpen
  };
} 