/**
 * 🚨 Emergency Database Recovery Utility
 * Handles RLS policy errors and provides fallback mechanisms
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface RecoveryOptions {
  retryAttempts?: number;
  fallbackToPublic?: boolean;
  useCache?: boolean;
}

interface SpaceAccessResult {
  success: boolean;
  data?: any;
  error?: string;
  strategy?: string;
}

class EmergencyDatabaseRecovery {
  private static readonly POLICY_ERROR_KEYWORDS = [
    'recursion detected',
    'policy',
    '406',
    'infinite',
    'too deep'
  ];

  /**
   * Check if an error is related to RLS policy issues
   */
  static isPolicyError(error: any): boolean {
    const errorMessage = String(error?.message || error || '').toLowerCase();
    return this.POLICY_ERROR_KEYWORDS.some(keyword => 
      errorMessage.includes(keyword)
    );
  }

  /**
   * Safe space query with automatic fallback mechanisms
   */
  static async safeSpaceQuery(
    userId: string,
    options: RecoveryOptions = {}
  ): Promise<SpaceAccessResult> {
    const { 
      retryAttempts = 3, 
      fallbackToPublic = true, 
      useCache = true 
    } = options;

    console.log('🚨 [Recovery] Starting safe space query for user:', userId);

    // Strategy 1: Try direct space access
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const result = await this.tryDirectSpaceAccess(userId);
        if (result.success) {
          console.log(`✅ [Recovery] Direct access successful on attempt ${attempt}`);
          return result;
        }
      } catch (error) {
        console.warn(`⚠️ [Recovery] Attempt ${attempt} failed:`, error);
        
        if (this.isPolicyError(error)) {
          console.log('🔧 [Recovery] Policy error detected, switching to fallback');
          break; // Skip remaining retries for policy errors
        }
        
        if (attempt === retryAttempts) {
          console.error('💥 [Recovery] All direct attempts failed');
        }
      }
    }

    // Strategy 2: Fallback to public spaces if enabled
    if (fallbackToPublic) {
      try {
        const publicResult = await this.tryPublicSpacesFallback(userId);
        if (publicResult.success) {
          console.log('✅ [Recovery] Public fallback successful');
          return publicResult;
        }
      } catch (error) {
        console.warn('⚠️ [Recovery] Public fallback failed:', error);
      }
    }

    // Strategy 3: Cache fallback if enabled
    if (useCache) {
      try {
        const cacheResult = await this.tryCacheFallback(userId);
        if (cacheResult.success) {
          console.log('✅ [Recovery] Cache fallback successful');
          return cacheResult;
        }
      } catch (error) {
        console.warn('⚠️ [Recovery] Cache fallback failed:', error);
      }
    }

    return {
      success: false,
      error: 'All recovery strategies failed',
      strategy: 'recovery-failed'
    };
  }

  /**
   * Try direct database access
   */
  private static async tryDirectSpaceAccess(userId: string): Promise<SpaceAccessResult> {
    // 🚨 PHASE 8: Only use RPC function to avoid policy recursion
    try {
      const { data: publicSpaces, error: rpcError } = await getSupabaseClient()
        .rpc('get_public_spaces');

      if (!rpcError && publicSpaces) {
        return {
          success: true,
          data: publicSpaces,
          strategy: 'rpc-public-spaces'
        };
      } else {
        throw new Error(rpcError?.message || 'RPC call failed');
      }
    } catch (rpcError) {
      console.warn('🚨 [Recovery] RPC method failed:', rpcError);
      throw rpcError; // Don't fallback to direct queries that cause 406 errors
    }
  }

  /**
   * Try public spaces fallback using RPC
   */
  private static async tryPublicSpacesFallback(userId: string): Promise<SpaceAccessResult> {
    const { data, error } = await getSupabaseClient()
      .rpc('get_public_spaces');

    if (error) {
      throw error;
    }

    return {
      success: true,
      data: data || [],
      strategy: 'public-spaces-rpc'
    };
  }

  /**
   * Try cache fallback
   */
  private static async tryCacheFallback(userId: string): Promise<SpaceAccessResult> {
    const cachedSpaces = localStorage.getItem(`user_spaces_${userId}`);
    
    if (cachedSpaces) {
      try {
        const parsedSpaces = JSON.parse(cachedSpaces);
        return {
          success: true,
          data: parsedSpaces,
          strategy: 'cache-fallback'
        };
      } catch (parseError) {
        throw new Error('Cache parse failed');
      }
    }

    throw new Error('No cache available');
  }

  /**
   * Safe member check with fallback
   */
  static async safeMembershipCheck(
    spaceId: string,
    userId: string
  ): Promise<{ isMember: boolean; isOwner: boolean; strategy: string }> {
    try {
      // 🚨 PHASE 8: Use our safe SECURITY DEFINER functions instead of direct queries
      
      // Check membership using our safe function (correct parameter order: space_id, user_id)
      const { data: membershipResult, error: membershipError } = await getSupabaseClient()
        .rpc('check_user_space_membership', {
          p_space_id: spaceId,
          p_user_id: userId
        });

      if (!membershipError && membershipResult !== null) {
        // Check if user is owner using our safe function (correct parameter order: space_id, user_id)
        const { data: ownershipResult, error: ownershipError } = await getSupabaseClient()
          .rpc('check_user_is_space_owner', {
            p_space_id: spaceId,
            p_user_id: userId
          });

        const isOwner = !ownershipError && ownershipResult === true;
        const isMember = membershipResult === true || isOwner;

        return {
          isMember,
          isOwner,
          strategy: 'safe-functions'
        };
      }

    } catch (error) {
      console.warn('🚨 [Recovery] Safe membership check failed:', error);
    }

    // Ultimate fallback: assume no access (conservative approach)
    return {
      isMember: false,
      isOwner: false,
      strategy: 'fallback-no-access'
    };
  }

  /**
   * Show user-friendly error message
   */
  static showRecoveryMessage(strategy: string) {
    const messages = {
      'rpc-public-spaces': 'Loaded spaces successfully',
      'direct-query': 'Loaded spaces with basic access',
      'public-spaces-rpc': 'Showing public spaces only',
      'cache-fallback': 'Loaded from offline cache',
      'recovery-failed': 'Unable to load spaces. Please refresh the page.'
    };

    const message = messages[strategy as keyof typeof messages] || 'Spaces loaded with limited access';
    
    if (strategy === 'recovery-failed') {
      toast({
        title: "Connection Issue",
        description: message,
        variant: "destructive",
      });
    } else if (strategy.includes('fallback') || strategy.includes('cache')) {
      toast({
        title: "Limited Access",
        description: message,
        variant: "default",
      });
    }
  }

  /**
   * Clear problematic cache entries
   */
  static clearProblemCache() {
    const cacheKeys = [
      'user_spaces_',
      'space_access_',
      'lastActiveSpace',
      'ownedSpaces',
      'memberSpaces'
    ];

    cacheKeys.forEach(keyPrefix => {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(keyPrefix)) {
          localStorage.removeItem(key);
        }
      });
    });

    console.log('🧹 [Recovery] Cleared problematic cache entries');
  }

  /**
   * Safe space members query using SECURITY DEFINER function
   */
  static async safeSpaceMembersQuery(spaceId: string): Promise<{
    success: boolean;
    data: any[] | null;
    strategy: string;
    error?: string;
  }> {
    try {
      console.log('🚨 [Recovery] Getting space members safely for space:', spaceId);
      
      const { data, error } = await getSupabaseClient()
        .rpc('get_space_members_safe', {
          p_space_id: spaceId
        });

      if (error) {
        console.error('🚨 [Recovery] Safe space members query failed:', error);
        return {
          success: false,
          data: null,
          strategy: 'safe-rpc-failed',
          error: error.message
        };
      }

      console.log('✅ [Recovery] Safe space members query successful, found members:', data?.length || 0);
      
      return {
        success: true,
        data: data || [],
        strategy: 'safe-rpc-members'
      };
    } catch (error) {
      console.error('🚨 [Recovery] Exception in safe space members query:', error);
      return {
        success: false,
        data: null,
        strategy: 'safe-rpc-exception',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Debug function to help identify white screen issues
   */
  static debugSpaceAccess(userId: string, spaceSubdomain?: string) {
    console.log('🔍 [Recovery] === DEBUG SPACE ACCESS ===');
    console.log('🔍 [Recovery] User ID:', userId);
    console.log('🔍 [Recovery] Space Subdomain:', spaceSubdomain);
    console.log('🔍 [Recovery] Current URL:', window.location.href);
    console.log('🔍 [Recovery] React DevTools available:', !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__);
    
    // Check if we have the global debug functions
    const debugFunctions = [
      'testPhase5B',
      'validatePhase5BFixes', 
      'validatePhase5BFixesV2',
      'validateSmartRedirect'
    ];
    
    debugFunctions.forEach(func => {
      console.log(`🔍 [Recovery] ${func} available:`, typeof (window as any)[func] === 'function');
    });
    
    // Check local storage and session storage
    console.log('🔍 [Recovery] Local storage items:', Object.keys(localStorage));
    console.log('🔍 [Recovery] Session storage items:', Object.keys(sessionStorage));
    
    // Check for any errors in console
    console.log('🔍 [Recovery] === DEBUG COMPLETE ===');
  }

  /**
   * Test emergency functions to ensure they're working
   */
  static async testEmergencyFunctions(userId: string) {
    console.log('🧪 [Recovery] Testing emergency functions...');
    
    try {
      // Test 1: Safe space query
      const spaceResult = await this.safeSpaceQuery(userId, { retryAttempts: 1 });
      console.log('🧪 [Recovery] Safe space query result:', spaceResult.success ? 'PASS' : 'FAIL');
      
      if (spaceResult.data && spaceResult.data.length > 0) {
        const firstSpace = spaceResult.data[0];
        console.log('🧪 [Recovery] First space found:', firstSpace.name, firstSpace.subdomain);
        
        // Test 2: Membership check
        const membershipResult = await this.safeMembershipCheck(firstSpace.id, userId);
        console.log('🧪 [Recovery] Membership check result:', membershipResult.isMember ? 'MEMBER' : 'NOT_MEMBER');
        console.log('🧪 [Recovery] Ownership check result:', membershipResult.isOwner ? 'OWNER' : 'NOT_OWNER');
      }
      
      console.log('✅ [Recovery] Emergency functions test completed');
    } catch (error) {
      console.error('❌ [Recovery] Emergency functions test failed:', error);
    }
  }
}

// Make debug function available globally for easier debugging
if (typeof window !== 'undefined') {
  (window as any).debugSpaceAccess = EmergencyDatabaseRecovery.debugSpaceAccess.bind(EmergencyDatabaseRecovery);
}

export default EmergencyDatabaseRecovery; 