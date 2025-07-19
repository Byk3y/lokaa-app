import { log } from '@/utils/logger';
import { useMemo, useRef, useEffect } from 'react';
import { TrustToken } from '@/utils/simpleFastPath';
import { TrustTokenService } from '@/services/TrustTokenService';

interface TrustTokenResult {
  isValid: boolean;
  loading: boolean;
  token: TrustToken | null;
  error?: string;
}

/**
 * useTrustToken - React hook for trust token validation
 * 
 * Provides a simple interface to the TrustTokenService with proper React lifecycle management.
 * Replaces the complex memoized validation logic that was in SpaceTabContent.tsx.
 * 
 * @param subdomain - The space subdomain to validate against
 * @param userId - The user ID to validate against  
 * @returns TrustTokenResult with validation status and token data
 */
export function useTrustToken(subdomain: string | undefined, userId: string | undefined): TrustTokenResult {
  // Track if we've logged the trust token confirmation to prevent spam
  const loggedRef = useRef(false);

  // Memoized validation result
  const result = useMemo(() => {
    // Return loading state if we don't have required parameters
    if (!subdomain || !userId) {
      return {
        isValid: false,
        loading: false,
        token: null,
        error: 'Missing subdomain or userId'
      };
    }

    try {
      // Use the centralized service for validation
      const token = TrustTokenService.validateToken(subdomain, userId);
      
      return {
        isValid: !!token,
        loading: false,
        token,
        error: undefined
      };
    } catch (error) {
      return {
        isValid: false,
        loading: false,
        token: null,
        error: error instanceof Error ? error.message : 'Trust token validation failed'
      };
    }
  }, [subdomain, userId]);

  // Log trust token confirmation once (preserving original behavior)
  useEffect(() => {
    if (result.token && !loggedRef.current) {
      loggedRef.current = true;
      log.debug('Hook', '🔒 [useTrustToken] Trust token access confirmed');
    }
  }, [result.token]);

  return result;
} 