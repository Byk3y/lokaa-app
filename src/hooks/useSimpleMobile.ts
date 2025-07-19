import { log } from '@/utils/logger';
/**
 * 🚫 DISABLED: SimpleMobile Hook - replaced by comprehensive fix
 * 
 * This hook is disabled because mobile protection is now handled 
 * by the comprehensive fix in index.html to prevent reload conflicts
 */

// DISABLED: SimpleMobileManager import causes conflicts with comprehensive fix
// // DISABLED: SimpleMobileManager import causes conflicts with comprehensive fix
// import { simpleMobileManager } from '@/utils/SimpleMobileManager';

import { useState, useEffect } from 'react';

/**
 * Safe fallback hook that returns minimal mobile state
 * without any of the conflicting mobile management systems
 */
export function useSimpleMobile() {
  const [mobileState] = useState({
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    isOnline: true,
    backgroundDetected: false,
    sessionValid: true,
    __disabledByComprehensiveFix: true
  });

  useEffect(() => {
    log.debug('Hook', '🚫 [useSimpleMobile] DISABLED - mobile protection handled by comprehensive fix');
  }, []);

  return mobileState;
} 