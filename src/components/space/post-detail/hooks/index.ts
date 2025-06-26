/**
 * Extracted hooks from PostDetailModal refactoring
 * This improves separation of concerns and makes the component more maintainable
 */

export { useMobileKeyboardDetection } from './useMobileKeyboardDetection';
export { useMobileLayout } from './useMobileLayout';
export { usePostDetailModalState } from './usePostDetailModalState';

// Re-export existing hooks for convenience
export { usePostActionsEnhanced } from './usePostActionsEnhanced';
export { useCommentsEnhanced } from './useCommentsEnhanced'; 