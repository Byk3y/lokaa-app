import { useCallback, useEffect } from 'react';
import { log } from '@/utils/logger';

interface MobileKeyboardConfig {
  enableKeyboardSupport?: boolean;
  isMobile?: boolean;
  showLessonView?: boolean;
  onBack?: () => void;
  onNextLesson?: () => void;
  onPreviousLesson?: () => void;
}

/**
 * Simple mobile keyboard navigation hook
 * Handles basic keyboard events for mobile navigation
 */
export function useMobileKeyboard(config: MobileKeyboardConfig): void {
  const {
    enableKeyboardSupport = true,
    isMobile = false,
    showLessonView = false,
    onBack,
    onNextLesson,
    onPreviousLesson
  } = config;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enableKeyboardSupport || !isMobile) return;

    // Prevent default behavior for navigation keys
    const navigationKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Escape'];
    if (navigationKeys.includes(e.key)) {
      e.preventDefault();
    }

    switch (e.key) {
      case 'ArrowLeft':
        log.debug('Mobile', '⌨️ [useMobileKeyboard] Arrow left pressed');
        onBack?.();
        break;
      case 'ArrowRight':
        if (showLessonView) {
          log.debug('Mobile', '⌨️ [useMobileKeyboard] Arrow right pressed');
          onNextLesson?.();
        }
        break;
      case 'ArrowUp':
        if (showLessonView) {
          log.debug('Mobile', '⌨️ [useMobileKeyboard] Arrow up pressed');  
          onPreviousLesson?.();
        }
        break;
      case 'ArrowDown':
        if (showLessonView) {
          log.debug('Mobile', '⌨️ [useMobileKeyboard] Arrow down pressed');
          onNextLesson?.();
        }
        break;
      case 'Escape':
        log.debug('Mobile', '⌨️ [useMobileKeyboard] Escape pressed');
        onBack?.();
        break;
    }
  }, [enableKeyboardSupport, isMobile, showLessonView, onBack, onNextLesson, onPreviousLesson]);

  // Set up keyboard event listeners
  useEffect(() => {
    if (!enableKeyboardSupport) return;

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enableKeyboardSupport, handleKeyDown]);
}