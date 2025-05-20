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
    
    // Check space_members records
    console.log('Checking space_members records...');
    const { data: memberRecords, error: memberError } = await supabase
      .from('space_members')
      .select('*, space:spaces(name, subdomain)')
      .eq('user_id', userId);
      
    if (memberError) {
      console.error('Error fetching space member records:', memberError);
    } else {
      console.log('Space member records:', memberRecords);
    }
    
    return {
      ownedSpaces,
      memberRecords
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
    return { success: false, error: 'Missing required parameters', phase: 'validation' };
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
    
    // Step 3: Check space_members table
    let hasAccessViaMembership = false;
    let memberRecord = null;
    let membershipRole = null;
    let membershipStatus = null;
    
    console.log('3. Checking space_members table...');
    const { data: smData, error: smError } = await supabase
      .from('space_members')
      .select('id, role, status')
      .eq('space_id', spaceData.id)
      .eq('user_id', userId)
      .maybeSingle();
        
    if (smError && smError.code !== 'PGRST116') {
      console.error('Error checking space_members:', smError);
      return { 
        success: false, 
        error: smError.message, 
        code: smError.code,
        phase: 'member_check',
        spaceData 
      };
    }
      
    if (smData) {
      memberRecord = smData;
      membershipRole = smData.role;
      membershipStatus = smData.status;
      if (smData.status === 'active') {
        hasAccessViaMembership = true;
      }
      console.log('Found space_members record:', memberRecord);
    }
    
    const hasAccess = isOwner || hasAccessViaMembership;

    if (isOwner && (membershipRole === null || membershipRole !== 'admin')) {
        membershipRole = 'admin';
        membershipStatus = 'active';
    }
    
    // Step 4: Return comprehensive results
    return {
      success: true,
      hasAccess,
      isOwner,
      memberRecord,
      membershipRole,
      membershipStatus,
      spaceData,
      summary: hasAccess ? 
        (isOwner ? `User is the owner of this space (Role: ${membershipRole}, Status: ${membershipStatus})` : `User has access via membership (Role: ${membershipRole}, Status: ${membershipStatus})`) :
        `User does not have access to this space (Membership status: ${membershipStatus || 'not a member'})`
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

// TODO: This function is outdated and needs complete refactoring to work with space_members.

// TODO: This function is outdated and needs complete refactoring to work with space_members. 