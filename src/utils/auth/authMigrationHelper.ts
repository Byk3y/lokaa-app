/**
 * Authentication Migration Helper
 * 
 * This module provides comprehensive migration and validation utilities
 * for resolving localStorage key inconsistency issues and ensuring 
 * proper authentication state management.
 * 
 * MIGRATION SCOPE: Fixes localStorage key inconsistency issues identified during investigation
 * - Removes conflicting custom localStorage patterns
 * - Validates Supabase authentication state
 * - Provides migration statistics and monitoring
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import { clearAllAuthTokens, validateAuthSession, type AuthValidationResult } from './authTokenUtils';

/**
 * Migration statistics and monitoring
 */
interface MigrationStats {
  sessionId: string;
  startTime: number;
  attempts: number;
  successfulMigrations: number;
  keysCleared: string[];
  lastMigrationTime: number | null;
  totalMigrationTime: number;
  errors: string[];
}

/**
 * Migration result interface
 */
interface MigrationResult {
  success: boolean;
  sessionValid: boolean;
  keysCleared: string[];
  timeTaken: number;
  errors: string[];
  recommendations: string[];
}

/**
 * Migration Helper Class
 * Provides comprehensive authentication localStorage migration functionality
 */
class AuthMigrationHelper {
  private isRunning = false;
  private stats: MigrationStats;

  constructor() {
    this.stats = this.initializeStats();
  }

  /**
   * Initialize migration statistics
   */
  private initializeStats(): MigrationStats {
    return {
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      attempts: 0,
      successfulMigrations: 0,
      keysCleared: [],
      lastMigrationTime: null,
      totalMigrationTime: 0,
      errors: []
    };
  }

  /**
   * Generate unique session ID for tracking
   */
  private generateSessionId(): string {
    return `migration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Run comprehensive localStorage authentication migration
   * This is the main migration function that should be called during app initialization
   * 
   * @param options - Migration options
   * @returns Migration result with success status and details
   */
  async runMigration(options: { 
    retries?: number; 
    emergencyFallback?: boolean;
    forceFullCleanup?: boolean;
  } = {}): Promise<MigrationResult> {
    const { retries = 3, emergencyFallback = true, forceFullCleanup = false } = options;
    
    // Prevent concurrent migrations
    if (this.isRunning) {
      return {
        success: false,
        sessionValid: false,
        keysCleared: [],
        timeTaken: 0,
        errors: ['Migration already in progress'],
        recommendations: ['Wait for current migration to complete']
      };
    }
    
    this.isRunning = true;
    const migrationStartTime = Date.now();
    this.stats.attempts++;
    
    try {
      // Step 1: Quick diagnostics
      const preDiagnostics = await this.getStorageDiagnostics();
      
      // Step 2: Validate current session
      const preValidation = await validateAuthSession();
      
      // Step 3: Early exit if no issues found
      if (!preValidation.hasInconsistentKeys) {
        const result = {
          success: true,
          sessionValid: preValidation.isValid,
          keysCleared: [],
          timeTaken: Date.now() - migrationStartTime,
          errors: [],
          recommendations: ['No migration needed - authentication state is clean']
        };
        this.updateStats(result);
        return result;
      }
      
      // Step 4: Perform migration
      const clearedKeys = clearAllAuthTokens(!forceFullCleanup);
      
      // Step 5: Post-migration validation
      const postValidation = await validateAuthSession();
      
      const result: MigrationResult = {
        success: !postValidation.hasInconsistentKeys,
        sessionValid: postValidation.isValid,
        keysCleared: clearedKeys,
        timeTaken: Date.now() - migrationStartTime,
        errors: [],
        recommendations: this.generateRecommendations(postValidation)
      };
      
      this.updateStats(result);
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown migration error';
      
      // Retry logic
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        this.isRunning = false;
        return this.runMigration({ ...options, retries: retries - 1 });
      }
      
      // Emergency fallback
      if (emergencyFallback) {
        try {
          const emergencyResult = await this.runEmergencyMigration();
          return emergencyResult;
        } catch (emergencyError) {
          const emergencyErrorMessage = emergencyError instanceof Error ? emergencyError.message : 'Emergency migration failed';
          
          return {
            success: false,
            sessionValid: false,
            keysCleared: [],
            timeTaken: Date.now() - migrationStartTime,
            errors: [errorMessage, emergencyErrorMessage],
            recommendations: ['Contact support - authentication system needs manual intervention']
          };
        }
      }
      
      return {
        success: false,
        sessionValid: false,
        keysCleared: [],
        timeTaken: Date.now() - migrationStartTime,
        errors: [errorMessage],
        recommendations: ['Retry migration', 'Clear browser cache', 'Contact support if issue persists']
      };
      
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Emergency migration for critical failures
   */
  private async runEmergencyMigration(): Promise<MigrationResult> {
    const migrationStartTime = Date.now();
    
    try {
      // Force clear all auth tokens
      const clearedKeys = clearAllAuthTokens(false);
      
      // Force Supabase sign out
      await getSupabaseClient().auth.signOut();
      
      // Wait for state to settle
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Validate final state
      const finalValidation = await validateAuthSession();
      
      const result: MigrationResult = {
        success: !finalValidation.hasInconsistentKeys,
        sessionValid: finalValidation.isValid,
        keysCleared: clearedKeys,
        timeTaken: Date.now() - migrationStartTime,
        errors: [],
        recommendations: ['Emergency migration completed', 'User will need to sign in again']
      };
      
      this.updateStats(result);
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Emergency migration failed';
      
      return {
        success: false,
        sessionValid: false,
        keysCleared: [],
        timeTaken: Date.now() - migrationStartTime,
        errors: [errorMessage],
        recommendations: ['Manual browser cache clear required', 'Contact support immediately']
      };
    }
  }

  /**
   * Get storage diagnostics for debugging
   */
  private async getStorageDiagnostics() {
    try {
      const validation = await validateAuthSession();
      
      return {
        timestamp: new Date().toISOString(),
        totalLocalStorageKeys: localStorage.length,
        problematicKeys: validation.problematicKeys,
        supabaseKeys: validation.supabaseKeys,
        sessionValid: validation.isValid,
        hasInconsistencies: validation.hasInconsistentKeys
      };
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        totalLocalStorageKeys: 0,
        problematicKeys: [],
        supabaseKeys: [],
        sessionValid: false,
        hasInconsistencies: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate recommendations based on validation results
   */
  private generateRecommendations(validation: AuthValidationResult): string[] {
    const recommendations: string[] = [];
    
    if (!validation.isValid) {
      recommendations.push('Authentication session is invalid - user may need to sign in again');
    }
    
    if (validation.hasInconsistentKeys) {
      recommendations.push('Inconsistent authentication keys detected - run migration again');
    }
    
    if (validation.problematicKeys.length > 0) {
      recommendations.push(`Clean up remaining problematic keys: ${validation.problematicKeys.join(', ')}`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Authentication state is clean and valid');
    }
    
    return recommendations;
  }

  /**
   * Update migration statistics
   */
  private updateStats(result: MigrationResult) {
    this.stats.lastMigrationTime = Date.now();
    this.stats.totalMigrationTime += result.timeTaken;
    this.stats.keysCleared.push(...result.keysCleared);
    this.stats.errors.push(...result.errors);
    
    if (result.success) {
      this.stats.successfulMigrations++;
    }
  }

  /**
   * Get migration statistics
   */
  getStats(): MigrationStats {
    return { ...this.stats };
  }

  /**
   * Check if migration should run
   * Simple heuristic to determine if migration is needed
   */
  async shouldRunMigration(): Promise<boolean> {
    try {
      const validation = await validateAuthSession();
      return validation.hasInconsistentKeys;
    } catch (error) {
      // If we can't validate, assume migration is needed
      return true;
    }
  }

  /**
   * Reset statistics (useful for testing)
   */
  resetStats(): void {
    this.stats = this.initializeStats();
  }
}

// Export singleton instance
export const authMigrationHelper = new AuthMigrationHelper();

// Export types
export type { MigrationResult, MigrationStats }; 