import { supabase } from '@/integrations/supabase/client';

/**
 * Utility function to debug space permissions for a specific user
 * @param userId User ID to check permissions for
 * @param spaceId Space ID to check permissions for
 * @returns Object with detailed permission information
 */
export async function debugSpacePermissions(userId: string, spaceId: string) {
  console.log(`Debugging permissions for user ${userId} in space ${spaceId}`);
  
  if (!userId || !spaceId) {
    console.error('Missing userId or spaceId parameters');
    return { error: 'Missing parameters', userId, spaceId };
  }
  
  const debug = {
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
        postsTable: null,
        spaceAccessTable: null
      }
    },
    errors: [] as string[]
  };
  
  try {
    // Step 1: Check if space exists
    const { data: spaceData, error: spaceError } = await supabase
      .from('spaces')
      .select('id, name, subdomain, owner_id, is_private')
      .eq('id', spaceId)
      .single();
    
    if (spaceError) {
      debug.errors.push(`Space fetch error: ${spaceError.message}`);
      return debug;
    }
    
    debug.databaseChecks.spaceExists = true;
    
    // Step 2: Check if user is the owner
    debug.isOwner = spaceData.owner_id === userId;
    debug.databaseChecks.ownerCheck = {
      spaceOwnerId: spaceData.owner_id,
      userId,
      isMatch: debug.isOwner
    };
    
    // If owner, automatically set admin and member status
    if (debug.isOwner) {
      debug.isAdmin = true;
      debug.isMember = true;
      debug.canCreateContent = true;
      debug.canEditSpace = true;
      debug.canManageMembers = true;
      debug.canAccessSettings = true;
    } else {
      // Step 3: Check membership in space_access table
      const { data: accessData, error: accessError } = await supabase
        .from('space_access')
        .select('*')
        .eq('space_id', spaceId)
        .eq('user_id', userId)
        .eq('is_active', true);
      
      if (accessError) {
        debug.errors.push(`Access check error: ${accessError.message}`);
      } else {
        debug.databaseChecks.membershipCheck = !!accessData && accessData.length > 0;
        
        if (accessData && accessData.length > 0) {
          debug.isMember = true;
          debug.databaseChecks.accessRecord = accessData[0];
          
          // Check if user is an admin
          debug.isAdmin = accessData[0].role === 'admin';
          
          // Set derived permissions based on role
          debug.canEditSpace = debug.isAdmin;
          debug.canManageMembers = debug.isAdmin;
          debug.canCreateContent = true; // All members can create content now
          debug.canAccessSettings = false; // Only owner can access settings
        }
      }
    }
    
    // Step 4: Check RLS policies
    try {
      const { data: postsCheck, error: postsError } = await supabase
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
    
    try {
      const { data: insertTest, error: insertError } = await supabase
        .from('posts')
        .insert({
          content: 'Test post (will be rolled back)',
          user_id: userId,
          space_id: spaceId
        })
        .select()
        .single();
      
      // If we get here, the insert worked - immediately delete the test post
      if (insertTest?.id) {
        await supabase
          .from('posts')
          .delete()
          .eq('id', insertTest.id);
          
        debug.databaseChecks.rls.postsTable = {
          ...debug.databaseChecks.rls.postsTable,
          canInsert: true,
          insertedId: insertTest.id
        };
      }
    } catch (err) {
      debug.databaseChecks.rls.postsTable = {
        ...debug.databaseChecks.rls.postsTable,
        canInsert: false,
        insertError: err instanceof Error ? err.message : 'Unknown error'
      };
    }
    
    return debug;
  } catch (error) {
    debug.errors.push(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown'}`);
    return debug;
  }
} 