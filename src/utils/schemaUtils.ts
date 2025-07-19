import { log } from '@/utils/logger';
import { getSupabaseClient } from "@/integrations/supabase/client";

// Valid table names from the Database type
type TableName = "spaces" | "comments" | "posts" | "users" | 
  "course_enrollments" | "courses" | "course_lessons" | 
  "event_attendees" | "events" | "payments" | "referrals" | "space_access";

/**
 * Examines the structure of a specific database table
 * @param tableName The name of the table to examine
 * @returns The structure of the table or null if there was an error
 */
export async function examineTableStructure(tableName: TableName) {
  try {
    // First, let's try to get a sample record to see the columns
    const { data: sampleData, error: sampleError } = await getSupabaseClient()
      .from(tableName)
      .select('*')
      .limit(1);
      
    let columns: string[] = [];
    let sample = null;
    
    if (!sampleError && sampleData && sampleData.length > 0) {
      columns = Object.keys(sampleData[0]);
      sample = sampleData[0];
      log.debug('Utils', `Found ${columns.length} columns in ${tableName} table:`, columns);
    } else {
      log.warn('Utils', `Unable to fetch sample data from ${tableName}:`, sampleError);
    }
    
    // Instead of using RPC call, infer schema details from the sample data
    let schemaDetails = null;
    if (sample) {
      schemaDetails = columns.map(colName => {
        const value = sample[colName];
        const dataType = value === null ? 'null' : typeof value;
        return {
          column_name: colName,
          data_type: dataType,
          example_value: value,
          is_nullable: value === null ? 'YES' : 'UNKNOWN'
        };
      });
    }
    
    return {
      columns,
      sample,
      schemaDetails,
      error: sampleError || null
    };
  } catch (error) {
    log.error('Utils', `Error examining table ${tableName}:`, error);
    return {
      columns: [],
      sample: null, 
      schemaDetails: null,
      error
    };
  }
}

/**
 * Gets a simplified list of available columns for a table
 * @param tableName The name of the table
 * @returns Array of column names or empty array if error
 */
export async function getTableColumns(tableName: TableName): Promise<string[]> {
  try {
    const result = await examineTableStructure(tableName);
    return result.columns || [];
  } catch (error) {
    log.error('Utils', `Error getting columns for ${tableName}:`, error);
    return [];
  }
} 