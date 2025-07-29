import { useCallback, useRef } from 'react';
import { log } from '@/utils/logger';

interface MobileGesturesConfig {
  enableHapticFeedback?: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onBack?: () => void;
  onNextLesson?: () => void;
  showLessonView?: boolean;
}

interface TouchEventHandlers {
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchEnd: (e: React.TouchEvent) => void;
}

/**
 * Simple mobile gesture hook
 * Handles basic touch gestures for mobile navigation
 */
export function useMobileGestures(config: MobileGesturesConfig): TouchEventHandlers {
  const {
    enableHapticFeedback = true,
    onSwipeLeft,
    onSwipeRight,
    onBack,
    onNextLesson,
    showLessonView = false
  } = config;

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Simple haptic feedback
  const triggerHapticFeedback = useCallback(() => {
    if (enableHapticFeedback && navigator.vibrate) {
      navigator.vibrate([10]);
    }
  }, [enableHapticFeedback]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Detect swipe gestures
    const minSwipeDistance = 50;
    const maxSwipeTime = 300;

    if (deltaTime < maxSwipeTime) {
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
        // Horizontal swipe detected
        if (deltaX > 0) {
          // Swipe right - go back
          log.debug('Mobile', '👆 [useMobileGestures] Swipe right detected');
          triggerHapticFeedback();
          onSwipeRight?.();
          onBack?.();
        } else {
          // Swipe left - go to next lesson
          log.debug('Mobile', '👆 [useMobileGestures] Swipe left detected');
          if (showLessonView) {
            triggerHapticFeedback();
            onSwipeLeft?.();
            onNextLesson?.();
          }
        }
      }
    }

    touchStartRef.current = null;
  }, [enableHapticFeedback, onSwipeLeft, onSwipeRight, onBack, onNextLesson, showLessonView, triggerHapticFeedback]);

  return {
    handleTouchStart,
    handleTouchEnd
  };
}