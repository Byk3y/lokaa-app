import { getSupabaseClient } from "@/integrations/supabase/client";

/**
 * Space creation result interface
 */
export interface SpaceCreationResult {
  success: boolean;
  data?: {
    id: string;
    subdomain: string;
  };
  error?: any;
}

/**
 * Creates a space with minimal fields to avoid policy issues
 */
export async function createMinimalSpace(
  name: string, 
  subdomain: string, 
  ownerId: string
): Promise<SpaceCreationResult> {
  console.log("Creating minimal space with:", { name, subdomain, ownerId });
  
  try {
    // Use a direct, minimal insert to avoid policy issues
    const { data, error } = await getSupabaseClient()
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
 * Creates a complete space with all necessary fields
 */
export async function createSpace(
  name: string,
  subdomain: string,
  ownerId: string,
  options: {
    description?: string;
    isPrivate?: boolean;
    settings?: Record<string, any>;
  } = {}
): Promise<SpaceCreationResult> {
  console.log("Creating complete space with:", { name, subdomain, ownerId, options });
  
  try {
    const { data, error } = await getSupabaseClient()
      .from('spaces')
      .insert({
        name,
        subdomain,
        owner_id: ownerId,
        description: options.description || '',
        is_private: options.isPrivate || false,
        settings: options.settings || {},
        created_at: new Date().toISOString()
      })
      .select('id, subdomain, name')
      .single();
    
    if (error) {
      console.error("Error creating space:", error);
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
 * Validates space creation parameters
 */
export function validateSpaceCreationParams(
  name: string,
  subdomain: string,
  ownerId: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!name || name.trim().length === 0) {
    errors.push("Space name is required");
  }
  
  if (!subdomain || subdomain.trim().length === 0) {
    errors.push("Subdomain is required");
  } else if (!/^[a-z0-9-]+$/.test(subdomain)) {
    errors.push("Subdomain must contain only lowercase letters, numbers, and hyphens");
  }
  
  if (!ownerId || ownerId.trim().length === 0) {
    errors.push("Owner ID is required");
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
} 