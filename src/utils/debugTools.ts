import { supabase } from '@/integrations/supabase/client';

/**
 * Debug utility to check database access for a user
 * This can be called from the browser console to diagnose issues
 */
export async function debugUserSpaceAccess(userId: string) {
  if (!userId) {
    console.error('No user ID provided');
    return null;
  }
  
  console.log('Debugging space access for user:', userId);
  
  try {
    // Check owned spaces
    console.log('Checking owned spaces...');
    const { data: ownedSpaces, error: ownedError } = await supabase
      .from('spaces')
      .select('*')
      .eq('owner_id', userId);
      
    if (ownedError) {
      console.error('Error fetching owned spaces:', ownedError);
    } else {
      console.log('Owned spaces:', ownedSpaces);
    }
    
    // Check space_access records
    console.log('Checking space_access records...');
    const { data: accessRecords, error: accessError } = await supabase
      .from('space_access')
      .select('*')
      .eq('user_id', userId);
      
    if (accessError) {
      console.error('Error fetching space access records:', accessError);
    } else {
      console.log('Space access records:', accessRecords);
    }
    
    /* RLS test is commented out as the RPC doesn't exist yet
    console.log('Checking permissions via RLS test...');
    const { data: rlsTest, error: rlsError } = await supabase.rpc('check_user_permissions', {
      target_user_id: userId
    });
    
    if (rlsError) {
      console.error('Error checking permissions:', rlsError);
    } else {
      console.log('RLS test result:', rlsTest);
    }
    */
    
    return {
      ownedSpaces,
      accessRecords
    };
  } catch (error) {
    console.error('Unexpected error during debugging:', error);
    return null;
  }
}

/**
 * Check if a user has access to a specific space
 * This can be called from the browser console to diagnose space access issues
 * 
 * @param userId - The ID of the user to check
 * @param spaceSubdomain - The subdomain of the space to check
 * @returns A promise that resolves to an object with the access check results
 */
export async function checkSpaceAccessForUser(userId: string, spaceSubdomain: string) {
  if (!userId || !spaceSubdomain) {
    console.error('Missing required parameters: userId and spaceSubdomain are required');
    return { success: false, error: 'Missing required parameters' };
  }
  
  console.log(`Checking access for user ${userId} to space ${spaceSubdomain}`);
  
  try {
    // Step 1: First get the space by subdomain
    console.log('1. Looking up space by subdomain...');
    const { data: spaceData, error: spaceError } = await supabase
      .from('spaces')
      .select('id, name, subdomain, owner_id')
      .eq('subdomain', spaceSubdomain)
      .single();
      
    if (spaceError) {
      console.error('Error fetching space by subdomain:', spaceError);
      return { 
        success: false, 
        error: spaceError.message, 
        code: spaceError.code,
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
    
    // Step 2: Check if user is the owner
    const isOwner = spaceData.owner_id === userId;
    console.log('2. Is user the owner?', isOwner);
    
    // Step 3: If not owner, check space_access table
    let hasAccess = isOwner;
    let accessRecord = null;
    
    if (!isOwner) {
      console.log('3. Checking space_access table...');
      const { data: accessData, error: accessError } = await supabase
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
          code: accessError.code,
          phase: 'access_check',
          spaceData 
        };
      }
      
      hasAccess = accessData && accessData.length > 0;
      accessRecord = hasAccess ? accessData[0] : null;
      
      console.log('Has access through membership?', hasAccess);
      if (hasAccess) {
        console.log('Access record:', accessRecord);
      }
    }
    
    // Step 4: Return comprehensive results
    return {
      success: true,
      hasAccess,
      isOwner,
      accessRecord,
      spaceData,
      summary: hasAccess ? 
        (isOwner ? 'User is the owner of this space' : 'User has access via membership') : 
        'User does not have access to this space'
    };
    
  } catch (error) {
    console.error('Unexpected error during access check:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      phase: 'unexpected' 
    };
  }
}

// Function to ensure a user has proper space access
export async function ensureUserSpaceAccess(userId: string, spaceId: string) {
  if (!userId || !spaceId) {
    console.error('Missing required parameters');
    return { success: false, error: 'Missing required parameters' };
  }
  
  try {
    // Check if access record already exists
    const { data: existingAccess, error: checkError } = await supabase
      .from('space_access')
      .select('*')
      .eq('user_id', userId)
      .eq('space_id', spaceId)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') { // Not 'no rows returned'
      console.error('Error checking existing access:', checkError);
      return { success: false, error: checkError };
    }
    
    // If access record exists but is not active, update it
    if (existingAccess) {
      if (!existingAccess.is_active) {
        const { data: updated, error: updateError } = await supabase
          .from('space_access')
          .update({ is_active: true })
          .eq('id', existingAccess.id)
          .select()
          .single();
          
        if (updateError) {
          console.error('Error updating access record:', updateError);
          return { success: false, error: updateError };
        }
        
        return { success: true, data: updated, action: 'updated' };
      }
      
      return { success: true, data: existingAccess, action: 'exists' };
    }
    
    // If no access record exists, create one
    const { data: inserted, error: insertError } = await supabase
      .from('space_access')
      .insert({
        user_id: userId,
        space_id: spaceId,
        is_active: true,
        role: 'member'
      })
      .select()
      .single();
      
    if (insertError) {
      console.error('Error creating access record:', insertError);
      return { success: false, error: insertError };
    }
    
    return { success: true, data: inserted, action: 'created' };
  } catch (e) {
    console.error('Exception in ensureUserSpaceAccess:', e);
    return { success: false, error: e };
  }
}

// Function to manually fix the automation jungle space access for a user
export async function fixAutomationJungleAccess(userId: string) {
  if (!userId) {
    console.error('No user ID provided');
    return { success: false, error: 'No user ID provided' };
  }
  
  try {
    // Find the automation jungle space
    const { data: spaces, error: spaceError } = await supabase
      .from('spaces')
      .select('id')
      .eq('subdomain', 'automation-jungle')
      .single();
      
    if (spaceError) {
      console.error('Error finding automation jungle space:', spaceError);
      return { success: false, error: spaceError };
    }
    
    if (!spaces) {
      return { success: false, error: 'Automation jungle space not found' };
    }
    
    // Ensure access
    return await ensureUserSpaceAccess(userId, spaces.id);
  } catch (error) {
    console.error('Unexpected error fixing automation jungle access:', error);
    return { success: false, error };
  }
} 