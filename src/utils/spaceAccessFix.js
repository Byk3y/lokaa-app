/**
 * Utility functions to diagnose and fix space access issues
 * These can be executed from the browser console
 * Example usage:
 * 
 * // Check access to a space:
 * spaceAccessFix.checkAccess('my-space-subdomain')
 * 
 * // Fix access to a space (requires being logged in as admin or space owner):
 * spaceAccessFix.fixAccess('some-user-id', 'my-space-subdomain')
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
  fixAccess: async function(userId, spaceSubdomain) {
    if (!this.supabase) {
      console.error('Supabase client not initialized. Call spaceAccessFix.init(supabase) first.');
      return null;
    }
    
    if (!userId || !spaceSubdomain) {
      console.error('Missing required parameters: userId and spaceSubdomain');
      return null;
    }
    
    console.log(`Fixing access for user ${userId} to space: ${spaceSubdomain}`);
    
    try {
      const { data, error } = await this.supabase.rpc('fix_space_access', {
        user_id: userId,
        space_subdomain: spaceSubdomain
      });
      
      if (error) {
        console.error('Error fixing space access:', error);
        return { success: false, error: error.message };
      }
      
      console.log('Fix result:', data);
      return data;
    } catch (error) {
      console.error('Exception fixing space access:', error);
      return { success: false, error: error.message };
    }
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
        return { success: false, error: userError?.message || 'Not authenticated' };
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
      
      // 4. Check space_access records
      const { data: accessData, error: accessError } = await this.supabase
        .from('space_access')
        .select('*')
        .eq('space_id', spaceData.id)
        .eq('user_id', userId)
        .eq('is_active', true);
        
      if (accessError) {
        console.error('Error checking space access:', accessError);
        return { 
          success: false, 
          error: accessError.message,
          phase: 'access_check'
        };
      }
      
      const hasAccessViaRecord = accessData && accessData.length > 0;
      const hasAccess = isOwner || hasAccessViaRecord;
      
      console.log('Has access via membership?', hasAccessViaRecord);
      console.log('Access records:', accessData);
      
      // 5. Return result
      return {
        success: true,
        hasAccess,
        isOwner,
        accessRecords: accessData || [],
        space: spaceData,
        user: { id: userId },
        summary: hasAccess ? 
          (isOwner ? 'User is the owner of this space' : 'User has access via membership') : 
          'User does not have access to this space'
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
  createAccessRecord: async function(userId, spaceId) {
    if (!this.supabase) {
      console.error('Supabase client not initialized. Call spaceAccessFix.init(supabase) first.');
      return null;
    }
    
    if (!userId || !spaceId) {
      console.error('Missing required parameters: userId and spaceId');
      return null;
    }
    
    console.log(`Creating direct access record for user ${userId} to space ID: ${spaceId}`);
    
    try {
      // First check if record already exists
      const { data: existingData, error: checkError } = await this.supabase
        .from('space_access')
        .select('id, is_active')
        .eq('space_id', spaceId)
        .eq('user_id', userId);
        
      if (checkError) {
        console.error('Error checking existing access:', checkError);
        return { success: false, error: checkError.message };
      }
      
      // If record exists, update it
      if (existingData && existingData.length > 0) {
        console.log('Access record already exists:', existingData[0]);
        
        // If it's not active, activate it
        if (!existingData[0].is_active) {
          const { data: updateData, error: updateError } = await this.supabase
            .from('space_access')
            .update({ is_active: true })
            .eq('id', existingData[0].id);
            
          if (updateError) {
            console.error('Error updating access record:', updateError);
            return { success: false, error: updateError.message };
          }
          
          console.log('Access record activated');
          return { success: true, action: 'activated', record: existingData[0] };
        }
        
        return { success: true, action: 'already_exists', record: existingData[0] };
      }
      
      // Create new record
      const { data: insertData, error: insertError } = await this.supabase
        .from('space_access')
        .insert({
          space_id: spaceId,
          user_id: userId,
          is_active: true,
          role: 'member'
        })
        .select();
        
      if (insertError) {
        console.error('Error creating access record:', insertError);
        return { success: false, error: insertError.message };
      }
      
      console.log('Access record created:', insertData);
      return { success: true, action: 'created', record: insertData };
    } catch (error) {
      console.error('Exception creating access record:', error);
      return { success: false, error: error.message };
    }
  }
};

// Export for browser console use
if (typeof window !== 'undefined') {
  window.spaceAccessFix = spaceAccessFix;
}

export default spaceAccessFix; 