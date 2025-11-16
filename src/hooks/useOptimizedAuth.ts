/**
 * @deprecated This hook has been moved to AuthContext.
 * All components should import useOptimizedAuth directly from '@/contexts/AuthContext'.
 * 
 * This temporary compatibility layer prevents breaking existing imports.
 * Please migrate your imports when possible.
 * 
 * NOTE: Scroll reset logic has been moved to AuthContext to prevent duplicate resets.
 * This hook now only provides a compatibility layer for the auth state.
 */

import { useOptimizedAuth as useAuthFromContext } from '@/contexts/AuthContext';

export function useOptimizedAuth() {
  // Simply re-export from AuthContext - scroll reset is now handled there
  return useAuthFromContext();
} 