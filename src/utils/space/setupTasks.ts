import { supabase } from '@/integrations/supabase/client';

/**
 * TaskID mapping between frontend and database
 */
const TASK_MAP = {
  'invitePeople': 'invited_members',
  'addDescription': 'added_description', 
  'setCoverImage': 'set_cover_image',
  'writeFirstPost': 'first_post'
};

// Interface for the space_setup table
interface SpaceSetup {
  id: string;
  space_id: string;
  invited_members: boolean;
  added_description: boolean;
  set_cover_image: boolean;
  first_post: boolean;
  updated_at: string;
}

// Interface for the frontend task state
interface SetupTasks {
  invitePeople: boolean;
  addDescription: boolean;
  setCoverImage: boolean;
  writeFirstPost: boolean;
}

/**
 * Update a specific setup task for a space
 */
export async function updateSetupTask(spaceId: string, taskId: string, completed: boolean): Promise<boolean> {
  if (!spaceId) {
    console.error('Missing space ID for updateSetupTask');
    return false;
  }
  
  // Map frontend task IDs to database column names
  const dbColumn = TASK_MAP[taskId as keyof typeof TASK_MAP];
  if (!dbColumn) {
    console.error(`Unknown task ID: ${taskId}`);
    return false;
  }
  
  try {
    console.log(`Updating setup task ${taskId} (${dbColumn}) to ${completed} for space ${spaceId}`);
    
    // Use a simple query instead of RPC to avoid type issues
    const { data, error } = await supabase
      .from('space_setup')
      .update({ [dbColumn]: completed, updated_at: new Date().toISOString() })
      .eq('space_id', spaceId)
      .select();
      
    if (error) {
      console.error('Error updating setup task:', error);
      
      // If the record doesn't exist, create it
      if (error.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('space_setup')
          .insert([{ 
            space_id: spaceId, 
            [dbColumn]: completed,
            updated_at: new Date().toISOString()
          }]);
        
        if (insertError) {
          console.error('Error creating setup record:', insertError);
          return false;
        }
        return true;
      }
      
      return false;
    }
    
    console.log('Setup task updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating setup task:', error);
    return false;
  }
}

/**
 * Fetch all setup tasks for a space
 */
export async function fetchSetupTasks(spaceId: string): Promise<SetupTasks | null> {
  if (!spaceId) {
    console.error('Missing space ID for fetchSetupTasks');
    return null;
  }
  
  try {
    console.log(`Fetching setup tasks for space ${spaceId}`);
    
    // Execute raw SQL query to avoid type issues
    const { data, error } = await supabase
      .from('space_setup')
      .select('*')
      .eq('space_id', spaceId)
      .single();
      
    if (error) {
      // No record found, this is a new space
      if (error.code === 'PGRST116') {
        console.log('No setup record found, creating new one');
        
        // Try to create an initial record
        const { error: insertError } = await supabase
          .from('space_setup')
          .insert([{ 
            space_id: spaceId,
            invited_members: false,
            added_description: false,
            set_cover_image: false,
            first_post: false
          }]);
          
        if (insertError) {
          console.error('Error creating initial setup record:', insertError);
          // Return default values even if insert fails
          return {
            invitePeople: false,
            addDescription: false,
            setCoverImage: false,
            writeFirstPost: false
          };
        }
        
        // Return default values for new record
        return {
          invitePeople: false,
          addDescription: false,
          setCoverImage: false,
          writeFirstPost: false
        };
      } 
      
      console.error('Error fetching setup tasks:', error);
      return null;
    }
    
    if (!data) {
      console.warn('No data returned for setup tasks');
      return {
        invitePeople: false,
        addDescription: false,
        setCoverImage: false,
        writeFirstPost: false
      };
    }
    
    console.log('Fetched setup tasks:', data);
    
    // Map database columns to frontend task IDs
    return {
      invitePeople: !!data.invited_members,
      addDescription: !!data.added_description,
      setCoverImage: !!data.set_cover_image,
      writeFirstPost: !!data.first_post
    };
  } catch (error) {
    console.error('Error fetching setup tasks:', error);
    return null;
  }
} 