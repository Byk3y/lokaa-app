import { 
  fixSpaceAccessBySubdomain, 
  comprehensiveSpaceRecovery,
  checkSpaceAccess,
  type AccessRecoveryResult,
  type SpaceAccessResult
} from '@/shared/services/database';

/**
 * User-friendly space recovery result
 */
export interface SpaceRecoveryResult {
  success: boolean;
  message: string;
  action?: 'reload' | 'redirect' | 'retry';
  redirectUrl?: string;
  error?: any;
}

/**
 * Attempts to recover access to a space for the current user
 * This is the main user-facing recovery function
 */
export async function recoverSpaceAccess(subdomain: string): Promise<SpaceRecoveryResult> {
  try {
    console.log(`[space-recovery] Attempting to recover access to space: ${subdomain}`);
    
    // First, try the comprehensive recovery method
    const recoveryResult = await comprehensiveSpaceRecovery(subdomain);
    
    if (recoveryResult.success) {
      return {
        success: true,
        message: recoveryResult.message || "Access recovered successfully",
        action: 'reload'
      };
    }
    
    // If comprehensive recovery failed, try the simpler fix
    const fixResult = await fixSpaceAccessBySubdomain(subdomain);
    
    if (fixResult.success) {
      return {
        success: true,
        message: "Access granted successfully",
        action: 'reload'
      };
    }
    
    // If both methods failed, provide helpful error message
    return {
      success: false,
      message: "Unable to recover access to this space. Please contact the space owner or try again later.",
      action: 'redirect',
      redirectUrl: '/discover',
      error: fixResult.error
    };
  } catch (error) {
    console.error("[space-recovery] Error during space access recovery:", error);
    return {
      success: false,
      message: "An unexpected error occurred while trying to recover access.",
      action: 'retry',
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Checks if a user can access a space and provides recovery options
 */
export async function checkSpaceAccessWithRecovery(subdomain: string): Promise<{
  accessResult: SpaceAccessResult;
  needsRecovery: boolean;
  recoveryAvailable: boolean;
}> {
  try {
    const accessResult = await checkSpaceAccess(subdomain);
    
    const needsRecovery = !accessResult.hasAccess && accessResult.space !== null;
    const recoveryAvailable = accessResult.user !== null && accessResult.space !== null;
    
    return {
      accessResult,
      needsRecovery,
      recoveryAvailable
    };
  } catch (error) {
    console.error("[space-recovery] Error checking space access:", error);
    return {
      accessResult: {
        space: null,
        isOwner: false,
        hasAccess: false,
        memberRecord: null,
        membershipRole: null,
        membershipStatus: null,
        user: null
      },
      needsRecovery: false,
      recoveryAvailable: false
    };
  }
}

/**
 * Provides user-friendly error messages based on access state
 */
export function getAccessErrorMessage(accessResult: SpaceAccessResult): string {
  if (!accessResult.user) {
    return "Please sign in to access this space.";
  }
  
  if (!accessResult.space) {
    return "This space does not exist or has been removed.";
  }
  
  if (accessResult.isOwner) {
    return "You own this space but there seems to be an access issue. Try recovering access.";
  }
  
  if (accessResult.memberRecord && accessResult.membershipStatus === 'inactive') {
    return "Your membership to this space is inactive. Contact the space owner.";
  }
  
  if (accessResult.memberRecord && accessResult.membershipStatus === 'pending') {
    return "Your membership to this space is pending approval.";
  }
  
  return "You don't have access to this space. Contact the space owner or try recovering access.";
}

/**
 * Determines the best recovery action based on access state
 */
export function getRecoveryAction(accessResult: SpaceAccessResult): {
  canRecover: boolean;
  action: 'sign-in' | 'recover' | 'contact-owner' | 'none';
  message: string;
} {
  if (!accessResult.user) {
    return {
      canRecover: true,
      action: 'sign-in',
      message: "Sign in to access this space"
    };
  }
  
  if (!accessResult.space) {
    return {
      canRecover: false,
      action: 'none',
      message: "Space not found"
    };
  }
  
  if (accessResult.isOwner || (accessResult.memberRecord && accessResult.membershipStatus === 'active')) {
    return {
      canRecover: true,
      action: 'recover',
      message: "Attempt access recovery"
    };
  }
  
  return {
    canRecover: false,
    action: 'contact-owner',
    message: "Contact space owner for access"
  };
} 