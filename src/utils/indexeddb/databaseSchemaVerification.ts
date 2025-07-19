import { log } from '@/utils/logger';
/**
 * Database Schema Verification for IndexedDB System
 * 
 * Verifies all required database tables, views, and functions exist
 * Used during Phase 1 to document current database schema
 */

import { getSupabaseClient } from '@/integrations/supabase/client';

export interface SchemaVerificationResult {
  component: string;
  type: 'table' | 'view' | 'function';
  exists: boolean;
  verified: boolean;
  details?: any;
  error?: string;
}

export interface DatabaseSchemaStatus {
  overall: 'healthy' | 'degraded' | 'critical';
  score: number;
  components: SchemaVerificationResult[];
  summary: {
    totalComponents: number;
    verified: number;
    missing: number;
    errors: number;
  };
}

/**
 * Database Schema Verifier
 * 
 * Validates all database components required by IndexedDB bridge
 */
export class DatabaseSchemaVerifier {
  private requiredComponents = {
    tables: [
      'space_members',
      'users',
      'chat_conversations', 
      'chat_participants',
      'chat_messages',
      'spaces',
      'posts',
      'space_categories'
    ],
    views: [
      'user_conversations'
    ],
    functions: [
      'get_or_create_direct_conversation',
      'update_user_presence', 
      'get_public_space_stats'
    ]
  };

  /**
   * Perform comprehensive schema verification
   */
  async verifySchema(): Promise<DatabaseSchemaStatus> {
    log.debug('Utils', '🔍 [DatabaseSchemaVerifier] Starting schema verification...');
    
    const results: SchemaVerificationResult[] = [];
    
    // Verify tables
    for (const tableName of this.requiredComponents.tables) {
      const result = await this.verifyTable(tableName);
      results.push(result);
    }
    
    // Verify views
    for (const viewName of this.requiredComponents.views) {
      const result = await this.verifyView(viewName);
      results.push(result);
    }
    
    // Verify functions
    for (const functionName of this.requiredComponents.functions) {
      const result = await this.verifyFunction(functionName);
      results.push(result);
    }
    
    // Calculate overall status
    const summary = this.calculateSummary(results);
    const score = summary.verified / summary.totalComponents;
    
    let overall: 'healthy' | 'degraded' | 'critical';
    if (score >= 0.95) overall = 'healthy';
    else if (score >= 0.8) overall = 'degraded';
    else overall = 'critical';
    
    const status: DatabaseSchemaStatus = {
      overall,
      score: Math.round(score * 100) / 100,
      components: results,
      summary
    };
    
    log.debug('Utils', `✅ [DatabaseSchemaVerifier] Verification complete: ${overall} (${Math.round(score * 100)}%)`);
    
    return status;
  }

  /**
   * Verify a database table exists and has expected structure
   */
  private async verifyTable(tableName: string): Promise<SchemaVerificationResult> {
    try {
      // Check if table exists
      const { data: tableCheck, error: tableError } = await getSupabaseClient()
        .from('information_schema.tables')
        .select('table_name, table_type')
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
        .maybeSingle();

      if (tableError) {
        return {
          component: tableName,
          type: 'table',
          exists: false,
          verified: false,
          error: tableError.message
        };
      }

      const exists = !!tableCheck;
      
      if (!exists) {
        return {
          component: tableName,
          type: 'table',
          exists: false,
          verified: false,
          error: 'Table not found'
        };
      }

      // Verify table structure by attempting a basic query
      const { data: structureCheck, error: structureError } = await getSupabaseClient()
        .from(tableName)
        .select('*')
        .limit(0); // Just check structure, no data

      if (structureError) {
        return {
          component: tableName,
          type: 'table',
          exists: true,
          verified: false,
          error: `Structure verification failed: ${structureError.message}`
        };
      }

      return {
        component: tableName,
        type: 'table',
        exists: true,
        verified: true,
        details: tableCheck
      };

    } catch (error) {
      return {
        component: tableName,
        type: 'table',
        exists: false,
        verified: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Verify a database view exists and is accessible
   */
  private async verifyView(viewName: string): Promise<SchemaVerificationResult> {
    try {
      // Check if view exists
      const { data: viewCheck, error: viewError } = await getSupabaseClient()
        .from('information_schema.tables')
        .select('table_name, table_type')
        .eq('table_schema', 'public')
        .eq('table_name', viewName)
        .maybeSingle();

      if (viewError) {
        return {
          component: viewName,
          type: 'view',
          exists: false,
          verified: false,
          error: viewError.message
        };
      }

      const exists = !!viewCheck;
      
      if (!exists) {
        return {
          component: viewName,
          type: 'view',
          exists: false,
          verified: false,
          error: 'View not found'
        };
      }

      // Verify view is accessible by attempting a query
      const { data: accessCheck, error: accessError } = await getSupabaseClient()
        .from(viewName)
        .select('*')
        .limit(0);

      if (accessError) {
        return {
          component: viewName,
          type: 'view',
          exists: true,
          verified: false,
          error: `Access verification failed: ${accessError.message}`
        };
      }

      return {
        component: viewName,
        type: 'view',
        exists: true,
        verified: true,
        details: viewCheck
      };

    } catch (error) {
      return {
        component: viewName,
        type: 'view',
        exists: false,
        verified: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Verify a database function exists and is callable
   */
  private async verifyFunction(functionName: string): Promise<SchemaVerificationResult> {
    try {
      // Check if function exists
      const { data: functionCheck, error: functionError } = await getSupabaseClient()
        .from('information_schema.routines')
        .select('routine_name, routine_type')
        .eq('routine_schema', 'public')
        .eq('routine_name', functionName)
        .maybeSingle();

      if (functionError) {
        return {
          component: functionName,
          type: 'function',
          exists: false,
          verified: false,
          error: functionError.message
        };
      }

      const exists = !!functionCheck;
      
      if (!exists) {
        return {
          component: functionName,
          type: 'function',
          exists: false,
          verified: false,
          error: 'Function not found'
        };
      }

      // For critical functions, do a basic callable test
      const isCallable = await this.testFunctionCallability(functionName);
      
      return {
        component: functionName,
        type: 'function',
        exists: true,
        verified: isCallable,
        details: functionCheck,
        error: isCallable ? undefined : 'Function exists but not callable'
      };

    } catch (error) {
      return {
        component: functionName,
        type: 'function',
        exists: false,
        verified: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test if a function is callable (basic smoke test)
   */
  private async testFunctionCallability(functionName: string): Promise<boolean> {
    try {
      switch (functionName) {
        case 'get_or_create_direct_conversation':
          // Test with dummy UUIDs - expect error but function should be callable
          await getSupabaseClient().rpc(functionName, {
            user1_id: '00000000-0000-0000-0000-000000000000',
            user2_id: '11111111-1111-1111-1111-111111111111'
          });
          break;
          
        case 'update_user_presence':
          // Test with dummy data - expect error but function should be callable
          await getSupabaseClient().rpc(functionName, {
            target_space_id: '00000000-0000-0000-0000-000000000000'
          });
          break;
          
        case 'get_public_space_stats':
          // Test with dummy space ID
          await getSupabaseClient().rpc(functionName, {
            space_id: '00000000-0000-0000-0000-000000000000'
          });
          break;
          
        default:
          return true; // Unknown function, assume callable if it exists
      }
      
      return true; // If no error thrown, function is callable
      
    } catch (error) {
      // Check if error is about function not existing vs just bad parameters
      const errorMessage = (error as any)?.message || '';
      const functionNotFound = errorMessage.includes('function') && errorMessage.includes('does not exist');
      
      return !functionNotFound; // If function exists but has parameter issues, it's still callable
    }
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(results: SchemaVerificationResult[]) {
    return {
      totalComponents: results.length,
      verified: results.filter(r => r.verified).length,
      missing: results.filter(r => !r.exists).length,
      errors: results.filter(r => !!r.error).length
    };
  }

  /**
   * Generate detailed report for logging/debugging
   */
  generateReport(status: DatabaseSchemaStatus): string {
    const lines = [
      '📊 DATABASE SCHEMA VERIFICATION REPORT',
      '=' .repeat(50),
      `Overall Status: ${status.overall.toUpperCase()} (${Math.round(status.score * 100)}%)`,
      `Components: ${status.summary.verified}/${status.summary.totalComponents} verified`,
      ''
    ];

    if (status.summary.missing > 0) {
      lines.push('❌ MISSING COMPONENTS:');
      status.components
        .filter(c => !c.exists)
        .forEach(c => lines.push(`  - ${c.component} (${c.type}): ${c.error}`));
      lines.push('');
    }

    if (status.summary.errors > 0) {
      lines.push('⚠️ COMPONENTS WITH ERRORS:');
      status.components
        .filter(c => c.exists && !c.verified)
        .forEach(c => lines.push(`  - ${c.component} (${c.type}): ${c.error}`));
      lines.push('');
    }

    lines.push('✅ VERIFIED COMPONENTS:');
    status.components
      .filter(c => c.verified)
      .forEach(c => lines.push(`  - ${c.component} (${c.type})`));

    return lines.join('\n');
  }
}

// Export singleton instance
export const databaseSchemaVerifier = new DatabaseSchemaVerifier();

// Global interface for debugging
if (typeof window !== 'undefined') {
  (window as any).databaseSchemaVerifier = {
    verify: () => databaseSchemaVerifier.verifySchema(),
    generateReport: async () => {
      const status = await databaseSchemaVerifier.verifySchema();
      const report = databaseSchemaVerifier.generateReport(status);
      log.debug('Utils', report);
      return status;
    }
  };
} 