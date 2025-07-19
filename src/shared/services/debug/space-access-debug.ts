import { log } from '@/utils/logger';
import { getSupabaseClient } from "@/integrations/supabase/client";
import { env } from "@/core/config/env";
import {
  checkSpaceAccess,
  createSpaceAccess,
  diagnoseSpaceAccess,
  checkCurrentSpaceAccess,
  directSpaceAccessCheck,
  type SpaceAccessResult,
  type CheckAccessResult,
  type DirectCheckResult
} from "@/shared/services/database";

// Extend Window interface for debugging tools
declare global {
  interface Window {
    spaceAccessDebug?: SpaceAccessDebugger;
  }
}

/**
 * Space access debug result interface
 */
export interface SpaceAccessDebugResult {
  success: boolean;
  hasAccess?: boolean;
  isOwner?: boolean;
  memberRecord?: any;
  membershipRole?: string | null;
  membershipStatus?: string | null;
  space?: any;
  user?: { id: string };
  summary?: string;
  error?: string;
  phase?: string;
}

/**
 * User space access debug result
 */
export interface UserSpaceAccessDebugResult {
  success: boolean;
  error?: string;
  phase?: string;
}

/**
 * Consolidated user space debug result
 */
export interface UserSpaceDebugResult {
  success: boolean;
  ownedSpaces?: any[];
  memberRecords?: any[];
  error?: any;
}

/**
 * Space permissions debug result
 */
export interface SpacePermissionsDebugResult {
  userId: string;
  spaceId: string;
  isOwner: boolean;
  isAdmin: boolean;
  isMember: boolean;
  canCreateContent: boolean;
  canEditSpace: boolean;
  canManageMembers: boolean;
  canAccessSettings: boolean;
  databaseChecks: {
    spaceExists: boolean;
    ownerCheck: any;
    membershipCheck: any;
    accessRecord: any;
    rls: {
      postsTable: any;
    };
  };
  errors: string[];
}

/**
 * Environment-safe space access debugging utilities
 * Only available in development mode
 */
class SpaceAccessDebugger {
  private supabaseClient: typeof supabase | null = null;
  private isInitialized = false;

  /**
   * Initialize the debugger with Supabase client
   */
  init(supabaseClient: typeof supabase): this {
    if (!env.isDevelopment) {
      log.warn('Service', 'Space access debugger is only available in development mode');
      return this;
    }

    this.supabaseClient = supabaseClient;
    this.isInitialized = true;
    log.debug('Service', 'Space access debug utility initialized');
    return this;
  }

  /**
   * Client-side access check using database services
   * This is the main debug function, replacing the RPC-based checks
   */
  async clientSideCheck(spaceSubdomain: string): Promise<SpaceAccessDebugResult> {
    if (!this.isInitialized || !this.supabaseClient) {
      log.error('Service', 'Debugger not initialized. Call init(supabase) first.');
      return { success: false, error: 'Not initialized', phase: 'initialization' };
    }
    
    if (!spaceSubdomain) {
      log.error('Service', 'Missing required parameter: spaceSubdomain');
      return { success: false, error: 'Missing spaceSubdomain', phase: 'validation' };
    }
    
    log.debug('Service', `Performing client-side access check for space: ${spaceSubdomain}`);
    
    try {
      // Use the new database service for access check
      const accessResult = await checkSpaceAccess(spaceSubdomain);
      
      return {
        success: true,
        hasAccess: accessResult.hasAccess,
        isOwner: accessResult.isOwner,
        memberRecord: accessResult.memberRecord,
        membershipRole: accessResult.membershipRole,
        membershipStatus: accessResult.membershipStatus,
        space: accessResult.space,
        user: accessResult.user ? { id: accessResult.user.id } : undefined,
        summary: accessResult.hasAccess ? 
          (accessResult.isOwner ? 
            `User is the owner of this space (Role: ${accessResult.membershipRole}, Status: ${accessResult.membershipStatus})` : 
            `User has access via membership (Role: ${accessResult.membershipRole}, Status: ${accessResult.membershipStatus})`) :
          `User does not have access to this space (Membership status: ${accessResult.membershipStatus || 'not a member'})`
      };
    } catch (error) {
      log.error('Service', 'Exception in client-side check:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        phase: 'unexpected'
      };
    }
  }

  /**
   * Fix space access using database services
   */
  async fixAccess(spaceSubdomain: string): Promise<UserSpaceAccessDebugResult> {
    if (!this.isInitialized) {
      log.error('Service', 'Debugger not initialized. Call init(supabase) first.');
      return { success: false, error: 'Not initialized', phase: 'initialization' };
    }

    log.debug('Service', `Attempting to diagnose and potentially fix access for space: ${spaceSubdomain}`);
    
    try {
      // Use the new database service for access diagnosis
      const result = await diagnoseSpaceAccess(spaceSubdomain);
      
      if (result.success && result.hasAccess) {
        log.debug('Service', 'Access diagnosis successful - user has access');
        return { success: true };
      } else if (result.success && !result.hasAccess) {
        log.debug('Service', 'Access diagnosis: user does not have access');
        log.debug('Service', 'Issues found:', result.issues);
        log.debug('Service', 'Recommendations:', result.recommendations);
        
        // Try to create access if user and space exist but no access
        if (result.user && result.space && !result.isOwner) {
          log.debug('Service', 'Attempting to create space membership...');
          const createResult = await createSpaceAccess(result.space.id);
          if (createResult.success) {
            log.debug('Service', 'Space membership created successfully');
            return { success: true };
          } else {
            log.error('Service', 'Failed to create membership:', createResult.error);
            return { 
              success: false, 
              error: createResult.error instanceof Error ? createResult.error.message : 'Failed to create membership',
              phase: 'membership_creation'
            };
          }
        } else {
          return { 
            success: false, 
            error: `Access cannot be fixed: ${result.issues.join(', ')}`,
            phase: 'access_diagnosis'
          };
        }
      } else {
        log.error('Service', 'Access diagnosis failed:', result.issues);
        return { 
          success: false, 
          error: result.issues.join(', '),
          phase: 'diagnosis_failure'
        };
      }
    } catch (error) {
      log.error('Service', 'Exception fixing access:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        phase: 'unexpected'
      };
    }
  }

  /**
   * Comprehensive debug check that combines access check and provides fix suggestions
   */
  async debugSpace(spaceSubdomain: string): Promise<SpaceAccessDebugResult & { canFix?: boolean; fixSuggestion?: string }> {
    const result = await this.clientSideCheck(spaceSubdomain);
    
    if (!result.success) {
      return result;
    }

    // Add fix suggestions
    const canFix = !result.hasAccess && !!result.space && !!result.user;
    const fixSuggestion = canFix ? 
      'Try running: spaceAccessDebug.fixAccess("' + spaceSubdomain + '")' : 
      undefined;

    return {
      ...result,
      canFix,
      fixSuggestion
    };
  }

  /**
   * Debug utility to check database access for a user (consolidated from debugTools.ts)
   */
  async debugUserSpaceAccess(userId: string): Promise<UserSpaceDebugResult> {
    if (!env.isDevelopment) {
      log.warn('Service', 'Debug functions are only available in development mode');
      return { success: false, error: 'Not available in production' };
    }

    if (!userId) {
      log.error('Service', 'No user ID provided');
      return { success: false, error: 'No user ID provided' };
    }
    
    log.debug('Service', 'Debugging space access for user:', userId);
    
    try {
      // Check owned spaces
      log.debug('Service', 'Checking owned spaces...');
      const { data: ownedSpaces, error: ownedError } = await getSupabaseClient()
        .from('spaces')
        .select('*')
        .eq('owner_id', userId);
        
      if (ownedError) {
        log.error('Service', 'Error fetching owned spaces:', ownedError);
        return { success: false, error: ownedError };
      }
      
      log.debug('Service', 'Owned spaces:', ownedSpaces);
      
      // Check space_members records
      log.debug('Service', 'Checking space_members records...');
      const { data: memberRecords, error: memberError } = await getSupabaseClient()
        .from('space_members')
        .select('*, space:spaces(name, subdomain)')
        .eq('user_id', userId);
        
      if (memberError) {
        log.error('Service', 'Error fetching space member records:', memberError);
        return { success: false, error: memberError };
      }
      
      log.debug('Service', 'Space member records:', memberRecords);
      
      return {
        success: true,
        ownedSpaces,
        memberRecords
      };
    } catch (error) {
      log.error('Service', 'Unexpected error during debugging:', error);
      return { success: false, error };
    }
  }

  /**
   * Check if a user has access to a specific space (consolidated from debugTools.ts)
   */
  async checkSpaceAccessForUser(userId: string, spaceSubdomain: string): Promise<SpaceAccessDebugResult> {
    if (!env.isDevelopment) {
      log.warn('Service', 'Debug functions are only available in development mode');
      return { success: false, error: 'Not available in production', phase: 'environment' };
    }

    if (!userId || !spaceSubdomain) {
      log.error('Service', 'Missing required parameters: userId and spaceSubdomain are required');
      return { success: false, error: 'Missing required parameters', phase: 'validation' };
    }
    
    log.debug('Service', `Checking access for user ${userId} to space ${spaceSubdomain}`);
    
    try {
      // Use the database service for comprehensive access check
      const result = await checkCurrentSpaceAccess(spaceSubdomain);
      
      // Verify the user matches
      if (result.user?.id !== userId) {
        return {
          success: false,
          error: 'User mismatch - currently authenticated user differs from requested userId',
          phase: 'user_verification'
        };
      }
      
      return {
        success: true,
        hasAccess: result.hasAccess,
        isOwner: result.isOwner,
        memberRecord: result.memberRecord,
        membershipRole: result.membershipRole,
        membershipStatus: result.membershipStatus,
        space: result.space,
        user: result.user ? { id: result.user.id } : undefined,
        summary: result.hasAccess ? 
          (result.isOwner ? `User is the owner of this space (Role: ${result.membershipRole}, Status: ${result.membershipStatus})` : `User has access via membership (Role: ${result.membershipRole}, Status: ${result.membershipStatus})`) :
          `User does not have access to this space (Membership status: ${result.membershipStatus || 'not a member'})`
      };
      
    } catch (error) {
      log.error('Service', 'Unexpected error during access check:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        phase: 'unexpected' 
      };
    }
  }

  /**
   * Debug space permissions for a specific user (consolidated from spaceDebugUtils.ts)
   */
  async debugSpacePermissions(userId: string, spaceId: string): Promise<SpacePermissionsDebugResult> {
    if (!env.isDevelopment) {
      log.warn('Service', 'Debug functions are only available in development mode');
      return {
        userId,
        spaceId,
        isOwner: false,
        isAdmin: false,
        isMember: false,
        canCreateContent: false,
        canEditSpace: false,
        canManageMembers: false,
        canAccessSettings: false,
        databaseChecks: {
          spaceExists: false,
          ownerCheck: null,
          membershipCheck: null,
          accessRecord: null,
          rls: { postsTable: null }
        },
        errors: ['Debug functions are only available in development mode']
      };
    }

    log.debug('Service', `Debugging permissions for user ${userId} in space ${spaceId}`);
    
    if (!userId || !spaceId) {
      log.error('Service', 'Missing userId or spaceId parameters');
      return {
        userId,
        spaceId,
        isOwner: false,
        isAdmin: false,
        isMember: false,
        canCreateContent: false,
        canEditSpace: false,
        canManageMembers: false,
        canAccessSettings: false,
        databaseChecks: {
          spaceExists: false,
          ownerCheck: null,
          membershipCheck: null,
          accessRecord: null,
          rls: { postsTable: null }
        },
        errors: ['Missing parameters']
      };
    }
    
    const debug: SpacePermissionsDebugResult = {
      userId,
      spaceId,
      isOwner: false,
      isAdmin: false,
      isMember: false,
      canCreateContent: false,
      canEditSpace: false,
      canManageMembers: false,
      canAccessSettings: false,
      databaseChecks: {
        spaceExists: false,
        ownerCheck: null,
        membershipCheck: null,
        accessRecord: null,
        rls: {
          postsTable: null
        }
      },
      errors: []
    };
    
    try {
      // Check if space exists
      const { data: spaceData, error: spaceError } = await getSupabaseClient()
        .from('spaces')
        .select('id, name, subdomain, owner_id, is_private')
        .eq('id', spaceId)
        .single();
      
      if (spaceError) {
        debug.errors.push(`Space fetch error: ${spaceError.message}`);
        return debug;
      }
      
      debug.databaseChecks.spaceExists = true;
      
      // Check if user is the owner
      debug.isOwner = spaceData.owner_id === userId;
      debug.databaseChecks.ownerCheck = {
        spaceOwnerId: spaceData.owner_id,
        userId,
        isMatch: debug.isOwner
      };
      
      // If owner, set permissions
      if (debug.isOwner) {
        debug.isAdmin = true;
        debug.isMember = true;
        debug.canCreateContent = true;
        debug.canEditSpace = true;
        debug.canManageMembers = true;
        debug.canAccessSettings = true;
      } else {
        // Check membership in space_members table
        const { data: memberData, error: memberError } = await getSupabaseClient()
          .from('space_members')
          .select('*')
          .eq('space_id', spaceId)
          .eq('user_id', userId)
          .eq('status', 'active')
          .maybeSingle();
        
        if (memberError && memberError.code !== 'PGRST116') {
          debug.errors.push(`Member check error: ${memberError.message}`);
        } else {
          debug.databaseChecks.membershipCheck = !!memberData;
          
          if (memberData) {
            debug.isMember = true;
            debug.databaseChecks.accessRecord = memberData;
            
            // Set permissions based on role
            debug.isAdmin = memberData.role === 'admin';
            debug.canEditSpace = debug.isAdmin;
            debug.canManageMembers = debug.isAdmin;
            debug.canCreateContent = true; // All members can create content
            debug.canAccessSettings = false; // Only owner can access settings
          }
        }
      }
      
      // Check RLS policies for posts table
      try {
        const { data: postsCheck, error: postsError } = await getSupabaseClient()
          .from('posts')
          .select('count')
          .eq('space_id', spaceId)
          .limit(1);
        
        debug.databaseChecks.rls.postsTable = {
          canSelect: !postsError,
          error: postsError ? postsError.message : null
        };
      } catch (err) {
        debug.databaseChecks.rls.postsTable = {
          canSelect: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        };
      }
      
      return debug;
    } catch (error) {
      debug.errors.push(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown'}`);
      return debug;
    }
  }
}

// Create singleton instance
export const spaceAccessDebugger = new SpaceAccessDebugger();

// Development-only window exposure
if (env.isDevelopment && typeof window !== 'undefined') {
  window.spaceAccessDebug = spaceAccessDebugger;
}

// Export for programmatic use
export default spaceAccessDebugger; 