/**
 * @deprecated This hook has been moved to AuthContext.
 * Import directly from '@/contexts/AuthContext' instead.
 */

import { useOptimizedAuth as AuthContextHook } from '@/contexts/AuthContext';

/**
 * Re-export the auth hook from the AuthContext.
 * This is provided for backward compatibility during the migration period.
 * 
 * @deprecated Use useOptimizedAuth from '@/contexts/AuthContext' instead
 */
export const useOptimizedAuth = AuthContextHook; 