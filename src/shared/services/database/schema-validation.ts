import { log } from '@/utils/logger';
import { getSupabaseClient } from "@/integrations/supabase/client";

/**
 * Schema validation result interface
 */
export interface SchemaValidationResult {
  success: boolean;
  message: string;
  error?: any;
  columns?: string[];
}

/**
 * Diagnoses database schema issues by checking for a space record
 * and examining table structure
 */
export async function diagnoseSpacesTable(): Promise<SchemaValidationResult> {
  log.debug('Service', "Diagnosing spaces table...");
  
  try {
    // Check if the table exists and has any records
    const { data, error } = await getSupabaseClient()
      .from('spaces')
      .select('*')
      .limit(1);
    
    if (error) {
      log.error('Service', "Error accessing spaces table:", error);
      return {
        success: false,
        message: `Error accessing spaces table: ${error.message}`,
        error
      };
    }
    
    // Check actual columns in the table
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      log.debug('Service', "Spaces table has these columns:", columns);
      
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
      log.debug('Service', "Spaces table exists but has no records");
      return {
        success: true,
        message: "Spaces table exists but has no records"
      };
    }
  } catch (err) {
    log.error('Service', "Unexpected error diagnosing spaces table:", err);
    return {
      success: false,
      message: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

/**
 * Validates space table columns against expected schema
 */
export async function validateSpaceTableColumns(expectedColumns: string[]): Promise<SchemaValidationResult> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('spaces')
      .select('*')
      .limit(1);
    
    if (error) {
      return {
        success: false,
        message: `Error accessing spaces table: ${error.message}`,
        error
      };
    }
    
    if (!data || data.length === 0) {
      return {
        success: true,
        message: "Cannot validate columns - table is empty"
      };
    }
    
    const actualColumns = Object.keys(data[0]);
    const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
    const extraColumns = actualColumns.filter(col => !expectedColumns.includes(col));
    
    return {
      success: missingColumns.length === 0,
      message: missingColumns.length === 0 
        ? "All expected columns are present"
        : `Missing columns: ${missingColumns.join(', ')}${extraColumns.length > 0 ? `, Extra columns: ${extraColumns.join(', ')}` : ''}`,
      columns: actualColumns
    };
  } catch (err) {
    return {
      success: false,
      message: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`
    };
  }
} 