import { supabase } from "@/integrations/supabase/client";
import type { MemberRole } from '@/contexts/MembershipContext';

/**
 * Diagnoses database schema issues by checking for a space record
 * and examining table structure
 */
export async function diagnoseSpacesTable() {
  console.log("Diagnosing spaces table...");
  
  try {
    // Check if the table exists and has any records
    const { data, error } = await supabase
      .from('spaces')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error("Error accessing spaces table:", error);
      return {
        success: false,
        message: `Error accessing spaces table: ${error.message}`,
        error
      };
    }
    
    // Check actual columns in the table
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log("Spaces table has these columns:", columns);
      
      // Check for required columns
      const requiredColumns = ['id', 'name', 'subdomain', 'owner_id'];
      const missingColumns = requiredColumns.filter(col => !columns.includes(col));
      
      if (missingColumns.length > 0) {
        return {
          success: false,
          message: `Missing required columns: ${missingColumns.join(', ')}`,
          columns
        };
      }
      
      return {
        success: true,
        message: "Spaces table structure looks valid",
        columns
      };
    } else {
      console.log("Spaces table exists but has no records");
      return {
        success: true,
        message: "Spaces table exists but has no records"
      };
    }
  } catch (err) {
    console.error("Unexpected error diagnosing spaces table:", err);
    return {
      success: false,
      message: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

/**
 * Creates a space with minimal fields to avoid policy issues
 */
export async function createMinimalSpace(
  name: string, 
  subdomain: string, 
  ownerId: string
) {
  console.log("Creating minimal space with:", { name, subdomain, ownerId });
  
  try {
    // Use a direct, minimal insert to avoid policy issues
    const { data, error } = await supabase
      .from('spaces')
      .insert({
        name,
        subdomain,
        owner_id: ownerId,
        created_at: new Date().toISOString()
      })
      .select('id, subdomain')
      .single();
    
    if (error) {
      console.error("Error creating minimal space:", error);
      return { success: false, error };
    }
    
    console.log("Space created successfully:", data);
    return { success: true, data };
  } catch (err) {
    console.error("Unexpected error creating space:", err);
    return { 
      success: false, 
      error: err instanceof Error ? err : new Error(String(err)) 
    };
  }
}

/**
 * Adds a user to a space via the space_access table
 */
export async function addUserToSpace(spaceId: string, userId: string, roleParam: MemberRole = 'admin') {
  console.log("[databaseUtils addUserToSpace] Adding user to space:", { spaceId, userId, roleParam });
  
  // Determine the role for space_members: owners/admins become admins, members remain members.
  const roleForSpaceMembers: 'admin' | 'member' = (roleParam === 'owner' || roleParam === 'admin') ? 'admin' : 'member';

  try {
    const { error } = await supabase
      .from('space_access')
      .insert({
        space_id: spaceId,
        user_id: userId,
        is_active: true,
        role: roleParam // space_access.role can be text and store 'owner', 'admin', or 'member'
      });
    
    if (error) {
      console.error("Error adding user to space (space_access):", error);
      return { success: false, error };
    }

    console.log("[databaseUtils addUserToSpace] Successfully added user to space_access.");

    // NOW, ALSO ADD TO space_members
    try {
      const { error: memberInsertError } = await supabase
        .from('space_members')
        .insert({
          user_id: userId,
          space_id: spaceId,
          role: roleForSpaceMembers, // Use the adjusted role for space_members table
          status: 'active',
          joined_at: new Date().toISOString()
        });

      if (memberInsertError) {
        console.error("[databaseUtils addUserToSpace] Error inserting into space_members:", memberInsertError);
        // This is a significant issue, as the membership is now inconsistent.
        // Return success:false but indicate partial success if space_access insert worked.
        return { 
          success: false, 
          error: memberInsertError, 
          message: "User added to space_access, but failed to finalize in space_members."
        };
      }
      console.log("[databaseUtils addUserToSpace] Successfully inserted into space_members.");
      return { success: true };

    } catch (memberErr) {
      console.error("[databaseUtils addUserToSpace] Exception during space_members insert:", memberErr);
      return { 
        success: false, 
        error: memberErr instanceof Error ? memberErr : new Error(String(memberErr)),
        message: "User added to space_access, but an exception occurred finalizing in space_members."
      };
    }

  } catch (err) {
    console.error("Unexpected error in addUserToSpace (outer try-catch):", err);
    return { 
      success: false, 
      error: err instanceof Error ? err : new Error(String(err)),
      message: "User added to space_access, but an unexpected error occurred."
    };
  }
}

/**
 * Check if a subdomain is available (not already used)
 */
export async function isSubdomainAvailable(subdomain: string) {
  console.log("Checking if subdomain is available:", subdomain);
  
  try {
    const { data, error } = await supabase
      .from('spaces')
      .select('id')
      .eq('subdomain', subdomain)
      .maybeSingle();
    
    if (error) {
      console.error("Error checking subdomain availability:", error);
      return { available: false, error };
    }
    
    return { available: !data, exists: !!data };
  } catch (err) {
    console.error("Unexpected error checking subdomain:", err);
    return { 
      available: false, 
      error: err instanceof Error ? err : new Error(String(err)) 
    };
  }
}

/**
 * Generate a clean, URL-friendly slug from a string
 */
export function generateSlug(str: string) {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')       // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, '') // Remove all non-alphanumeric chars except hyphens
    .replace(/-+/g, '-')        // Replace multiple hyphens with single
    .replace(/^-|-$/g, '');     // Remove leading/trailing hyphens
} 