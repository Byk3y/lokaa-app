/**
 * @deprecated This hook has been moved to AuthContext.
 * All components should import useOptimizedAuth directly from '@/contexts/AuthContext'.
 * 
 * This temporary compatibility layer prevents breaking existing imports.
 * Please migrate your imports when possible.
 */

import { useOptimizedAuth as AuthContextHook } from '@/contexts/AuthContext';

/**
 * Temporary re-export for backward compatibility.
 * 
 * @deprecated Use useOptimizedAuth from '@/contexts/AuthContext' instead
 */
export const useOptimizedAuth = AuthContextHook; 