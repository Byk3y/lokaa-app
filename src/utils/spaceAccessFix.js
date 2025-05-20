/**
 * Utility functions to diagnose and fix space access issues
 * These can be executed from the browser console
 * Example usage:
 * 
 * // Check access to a space:
 * spaceAccessFix.checkAccess('my-space-subdomain')
 * 
 * // Fix access to a space (requires being logged in as admin or space owner):
 * // spaceAccessFix.fixAccess('some-user-id', 'my-space-subdomain') // TODO: This function is outdated due to space_members migration
 * 
 * // Run the client-side check (works without requiring the RPC functions):
 * spaceAccessFix.clientSideCheck('my-space-subdomain')
 */

// This needs to be initialized with the Supabase client
const spaceAccessFix = {
  supabase: null,
  
  init: function(supabaseClient) {
    this.supabase = supabaseClient;
    console.log('Space access fix utility initialized');
    return this;
  },
  
  // Call the debug_my_space_access RPC function
  // Note: The underlying RPC check_user_space_access has been updated.
  // The response will now contain member_records, membership_role, membership_status.
  checkAccess: async function(spaceSubdomain) {
    if (!this.supabase) {
      console.error('Supabase client not initialized. Call spaceAccessFix.init(supabase) first.');
      return null;
    }
    
    if (!spaceSubdomain) {
      console.error('Missing required parameter: spaceSubdomain');
      return null;
    }
    
    console.log(`Checking access for current user to space: ${spaceSubdomain}`);
    
    try {
      const { data, error } = await this.supabase.rpc('debug_my_space_access', {
        space_subdomain: spaceSubdomain
      });
      
      if (error) {
        console.error('Error checking space access:', error);
        return { success: false, error: error.message };
      }
      
      console.log('Access check result:', data);
      return data;
    } catch (error) {
      console.error('Exception checking space access:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Check access for a specific user (admin only)
  // Note: The underlying RPC check_user_space_access has been updated.
  // The response will now contain member_records, membership_role, membership_status.
  checkUserAccess: async function(userId, spaceSubdomain) {
    if (!this.supabase) {
      console.error('Supabase client not initialized. Call spaceAccessFix.init(supabase) first.');
      return null;
    }
    
    if (!userId || !spaceSubdomain) {
      console.error('Missing required parameters: userId and spaceSubdomain');
      return null;
    }
    
    console.log(`Checking access for user ${userId} to space: ${spaceSubdomain}`);
    
    try {
      const { data, error } = await this.supabase.rpc('debug_user_space_access', {
        user_id: userId,
        space_subdomain: spaceSubdomain
      });
      
      if (error) {
        console.error('Error checking user space access:', error);
        return { success: false, error: error.message };
      }
      
      console.log('User access check result:', data);
      return data;
    } catch (error) {
      console.error('Exception checking user space access:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Fix access for a user to a space
  // TODO: This function is outdated and needs complete refactoring to work with space_members.
  // The original fix_space_access RPC it calls is also commented out.
  // A new approach for admin-fixing memberships in space_members is required.
  fixAccess: async function(userId, spaceSubdomain) {
    console.warn('fixAccess function is currently disabled as it relies on the outdated space_access table and fix_space_access RPC.');
    return { success: false, error: 'Function disabled due to space_members migration.', phase: 'disabled' };
  },
  
  // Client-side access check (fallback if RPC functions don't exist)
  clientSideCheck: async function(spaceSubdomain) {
    if (!this.supabase) {
      console.error('Supabase client not initialized. Call spaceAccessFix.init(supabase) first.');
      return null;
    }
    
    if (!spaceSubdomain) {
      console.error('Missing required parameter: spaceSubdomain');
      return null;
    }
    
    console.log(`Performing client-side access check for space: ${spaceSubdomain}`);
    
    try {
      // 1. Get current user
      const { data: { user }, error: userError } = await this.supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Error getting current user:', userError || 'No user found');
        return { success: false, error: userError?.message || 'Not authenticated', phase: 'auth_check' };
      }
      
      const userId = user.id;
      console.log('Current user ID:', userId);
      
      // 2. Fetch space by subdomain
      const { data: spaceData, error: spaceError } = await this.supabase
        .from('spaces')
        .select('id, name, subdomain, owner_id')
        .eq('subdomain', spaceSubdomain)
        .single();
        
      if (spaceError) {
        console.error('Error fetching space:', spaceError);
        return { 
          success: false, 
          error: spaceError.message,
          phase: 'space_lookup'
        };
      }
      
      if (!spaceData) {
        console.error('Space not found with subdomain:', spaceSubdomain);
        return { 
          success: false, 
          error: 'Space not found',
          phase: 'space_lookup'
        };
      }
      
      console.log('Found space:', spaceData);
      
      // 3. Check if user is owner
      const isOwner = spaceData.owner_id === userId;
      console.log('Is user the owner?', isOwner);
      
      // 4. Check space_members records
      let memberRole = null;
      let memberStatus = null;
      let memberRecord = null; 

      const { data: memberData, error: memberError } = await this.supabase
        .from('space_members') // Changed from space_access
        .select('role, status, created_at, updated_at, id') // Added role, status
        .eq('space_id', spaceData.id)
        .eq('user_id', userId)
        // .eq('status', 'active') // We fetch the record first, then check status for hasAccess
        .maybeSingle(); // Expect at most one record
        
      if (memberError && memberError.code !== 'PGRST116') { // PGRST116: 0 rows
        console.error('Error checking space membership:', memberError);
        return { 
          success: false, 
          error: memberError.message,
          phase: 'member_check'
        };
      }
      
      const hasActiveMemberRecord = memberData && memberData.status === 'active';
      if (memberData) {
        memberRecord = memberData;
        memberRole = memberData.role;
        memberStatus = memberData.status;
        console.log('Space member record found:', memberData);
      }

      const hasAccess = isOwner || hasActiveMemberRecord;
      
      if (isOwner && !memberRole) { // If owner and no specific member record, infer role/status
        memberRole = 'owner';
        memberStatus = 'active';
      }

      console.log('Has access via active membership record?', hasActiveMemberRecord);
      
      // 5. Return result
      return {
        success: true,
        hasAccess,
        isOwner,
        memberRecord: memberRecord, // Changed from accessRecords
        membershipRole: memberRole,
        membershipStatus: memberStatus,
        space: spaceData,
        user: { id: userId },
        summary: hasAccess ? 
          (isOwner ? `User is the owner of this space (Role: ${memberRole}, Status: ${memberStatus})` : `User has access via membership (Role: ${memberRole}, Status: ${memberStatus})`) :
          `User does not have access to this space (Membership status: ${memberStatus || 'not a member'})`
      };
    } catch (error) {
      console.error('Exception in client-side check:', error);
      return { 
        success: false, 
        error: error.message || 'Unknown error',
        phase: 'unexpected'
      };
    }
  },
  
  // Create access record directly using insert
  // TODO: This function is outdated and needs complete refactoring to work with space_members.
  // It should likely call a new admin RPC to create/update memberships in space_members with proper role/status.
  createAccessRecord: async function(userId, spaceId) {
    console.warn('createAccessRecord function is currently disabled as it relies on the outdated space_access table.');
    return { success: false, error: 'Function disabled due to space_members migration.', phase: 'disabled' };
  }
};

// Export for browser console use
if (typeof window !== 'undefined') {
  window.spaceAccessFix = spaceAccessFix;
}

export default spaceAccessFix; 