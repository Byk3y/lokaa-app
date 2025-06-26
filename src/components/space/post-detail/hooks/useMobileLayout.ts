/**
 * Hook for mobile layout calculations
 * Extracted from PostDetailModal for better separation of concerns
 */
export function useMobileLayout(isMobile: boolean, isKeyboardOpen: boolean, showHeaderOnDesktop: boolean = false) {
  
  // Calculate dynamic modal styles based on mobile/keyboard state
  const getModalStyles = () => {
    if (!isMobile) {
      return {
        className: `md:max-w-3xl md:w-[90vw] md:rounded-lg p-0 flex flex-col transition-all duration-300 ease-in-out ${
          showHeaderOnDesktop ? 'h-[95vh]' : 'h-[85vh]'
        }`,
        style: {
          maxHeight: '95vh',
        }
      };
    }

    // Mobile: Don't change modal height - just use standard mobile fullscreen
    // Dynamic height changes cause browser zoom issues
    return {
      className: "max-w-full w-full h-full max-h-full rounded-none p-0 flex flex-col",
      style: {}
    };
  };

  // Calculate content area padding based on mobile state
  const getContentPadding = () => {
    if (!isMobile) return "pb-0"; // Desktop: no bottom padding needed
    return "pb-32"; // Mobile: consistent padding, let fixed elements handle their own positioning
  };

  // Calculate content area style for mobile minimum height
  const getContentStyle = () => {
    return isMobile ? { minHeight: 'calc(100vh - 120px)' } : {};
  };

  // Calculate comment input positioning for mobile
  const getCommentInputStyles = () => {
    if (!isMobile) return {}; // Desktop handles this differently

    if (isKeyboardOpen) {
      // When keyboard is open: stick to bottom of viewport (no bottom nav visible)
      return {
        position: 'fixed' as const,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
      };
    } else {
      // When keyboard is closed: position above bottom nav
      return {
        position: 'fixed' as const,
        bottom: '64px', // 16 * 4 = 64px (bottom nav height)
        left: 0,
        right: 0,
        zIndex: 40,
      };
    }
  };

  return {
    modalStyles: getModalStyles(),
    contentPadding: getContentPadding(),
    contentStyle: getContentStyle(),
    commentInputStyles: getCommentInputStyles()
  };
} 