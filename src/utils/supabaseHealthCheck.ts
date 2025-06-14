/**
 * Supabase Client Health Check and Auto-Recovery System
 * 
 * This utility monitors the health of the Supabase client and automatically
 * recovers from corruption issues that can occur after hard refreshes.
 */

import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = "https://nmddvthcsyppyjncqfsk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tZGR2dGhjc3lwcHlqbmNxZnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ0ODg4MTYsImV4cCI6MjA2MDA2NDgxNn0.NMzMDvaOD2vHfBfjRbuit05EIdi7QK9pC_ChzX3klG0";

interface HealthCheckResult {
  isHealthy: boolean;
  latency: number;
  error?: string;
  timestamp: number;
}

class SupabaseHealthMonitor {
  private static instance: SupabaseHealthMonitor;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastHealthCheck: HealthCheckResult | null = null;
  private recoveryAttempts = 0;
  private maxRecoveryAttempts = 3;
  private isRecovering = false;

  private constructor() {}

  public static getInstance(): SupabaseHealthMonitor {
    if (!SupabaseHealthMonitor.instance) {
      SupabaseHealthMonitor.instance = new SupabaseHealthMonitor();
    }
    return SupabaseHealthMonitor.instance;
  }

  /**
   * Start monitoring the Supabase client health
   */
  public startMonitoring(): void {
    // Don't start multiple monitors
    if (this.healthCheckInterval) {
      return;
    }

    console.log('🏥 [HealthMonitor] Starting Supabase client health monitoring');

    // Initial health check
    this.performHealthCheck();

    // Set up periodic health checks (every 30 seconds)
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000);

    // Expose health check function to window for manual testing
    if (typeof window !== 'undefined') {
      (window as any).checkSupabaseHealth = () => this.performHealthCheck();
      (window as any).recoverSupabaseClient = () => this.recoverClient();
    }
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('🏥 [HealthMonitor] Stopped health monitoring');
    }
  }

  /**
   * Perform a health check on the current Supabase client
   */
  public async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Get the current client using the singleton pattern
      const supabase = getSupabaseClient();
      
      if (!supabase) {
        throw new Error('Supabase client not available');
      }

      // Test with a simple, fast query with timeout
      const healthPromise = Promise.race([
        supabase.from('spaces').select('id').limit(1),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Health check timeout')), 3000);
        })
      ]);

      const { data, error } = await healthPromise;
      const latency = Date.now() - startTime;

      if (error) {
        throw error;
      }

      const result: HealthCheckResult = {
        isHealthy: true,
        latency,
        timestamp: Date.now()
      };

      this.lastHealthCheck = result;
      this.recoveryAttempts = 0; // Reset recovery attempts on successful check

      // Only log if latency is high or this is a recovery
      if (latency > 2000 || this.isRecovering) {
        console.log(`🏥 [HealthMonitor] Health check passed (${latency}ms)`);
        this.isRecovering = false;
      }

      return result;

    } catch (error) {
      const latency = Date.now() - startTime;
      const result: HealthCheckResult = {
        isHealthy: false,
        latency,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };

      this.lastHealthCheck = result;
      console.warn(`🏥 [HealthMonitor] Health check failed (${latency}ms):`, result.error);

      // Attempt recovery if not already recovering
      if (!this.isRecovering && this.recoveryAttempts < this.maxRecoveryAttempts) {
        this.attemptRecovery();
      }

      return result;
    }
  }

  /**
   * Attempt to recover the Supabase client
   */
  private async attemptRecovery(): Promise<void> {
    if (this.isRecovering) {
      return;
    }

    this.isRecovering = true;
    this.recoveryAttempts++;

    console.log(`🏥 [HealthMonitor] Attempting client recovery (attempt ${this.recoveryAttempts}/${this.maxRecoveryAttempts})`);

    try {
      await this.recoverClient();
      
      // Test the recovered client
      const healthCheck = await this.performHealthCheck();
      
      if (healthCheck.isHealthy) {
        console.log('✅ [HealthMonitor] Client recovery successful');
        this.isRecovering = false;
        this.recoveryAttempts = 0;
        
        // Notify the application that recovery was successful
        this.notifyRecoverySuccess();
      } else {
        throw new Error('Recovery verification failed');
      }

    } catch (error) {
      console.error(`❌ [HealthMonitor] Recovery attempt ${this.recoveryAttempts} failed:`, error);
      
      if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
        console.error('❌ [HealthMonitor] Max recovery attempts reached. Manual intervention required.');
        this.notifyRecoveryFailure();
      }
      
      this.isRecovering = false;
    }
  }

  /**
   * RESEARCH FIX: Recover the existing client instead of creating new instances
   * Based on research: avoid multiple client creation, focus on session recovery
   */
  public async recoverClient(): Promise<void> {
    console.log('🔧 [HealthMonitor] Attempting client recovery without reinitialization...');

    // Use the singleton client directly
    const existingClient = getSupabaseClient();
    
    if (!existingClient) {
      console.error('❌ [HealthMonitor] No existing client found for recovery');
      throw new Error('No client available for recovery');
    }

    try {
      // RESEARCH FIX: Focus on session recovery instead of client recreation
      console.log('🔍 [HealthMonitor] Checking session validity...');
      
      // Check current session
      const { data: sessionData, error: sessionError } = await existingClient.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        console.log('🔄 [HealthMonitor] Invalid session detected, attempting restoration...');
        
        // Try to restore from localStorage
        const authToken = localStorage.getItem('supabase.auth.token');
        if (authToken) {
          try {
            const tokenData = JSON.parse(authToken);
            if (tokenData.expires_at * 1000 > Date.now()) {
              await existingClient.auth.setSession({
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token
              });
              console.log('✅ [HealthMonitor] Session restored from localStorage');
            } else {
              console.log('⚠️ [HealthMonitor] Stored session expired, clearing...');
              await existingClient.auth.signOut({ scope: 'local' });
              localStorage.removeItem('supabase.auth.token');
            }
          } catch (e) {
            console.warn('⚠️ [HealthMonitor] Session restoration failed:', e);
            await existingClient.auth.signOut({ scope: 'local' });
          }
        } else {
          console.log('⚠️ [HealthMonitor] No stored session found');
        }
      } else {
        console.log('✅ [HealthMonitor] Session is valid, checking connectivity...');
      }

      // RESEARCH FIX: Clean up realtime connections without recreating client
      if (existingClient.realtime) {
        try {
          // Disconnect and reconnect realtime to refresh connections
          existingClient.realtime.disconnect();
          await new Promise(resolve => setTimeout(resolve, 1000));
          // Realtime will auto-reconnect on next subscription
          console.log('🔄 [HealthMonitor] Realtime connections refreshed');
        } catch (realtimeError) {
          console.warn('⚠️ [HealthMonitor] Realtime refresh warning:', realtimeError);
        }
      }

      // Test the recovered client with a simple query
      const testResult = await existingClient.from('spaces').select('id').limit(1);
      if (testResult.error) {
        throw new Error(`Recovery test failed: ${testResult.error.message}`);
      }

      console.log('✅ [HealthMonitor] Client recovery successful without reinitialization');
      
    } catch (error) {
      console.error('❌ [HealthMonitor] Client recovery failed:', error);
      
      // RESEARCH FIX: As last resort, clear session and prompt re-authentication
      // instead of creating new client instances
      try {
        await existingClient.auth.signOut({ scope: 'local' });
        console.log('🔄 [HealthMonitor] Cleared corrupted session, user will need to re-authenticate');
        
        // Dispatch event for app to handle re-authentication
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('supabase-auth-required', {
            detail: { 
              reason: 'client-recovery-failed',
              timestamp: Date.now() 
            }
          }));
        }
      } catch (signOutError) {
        console.error('❌ [HealthMonitor] Failed to clear session:', signOutError);
        throw error;
      }
    }
  }

  /**
   * Notify the application that recovery was successful
   */
  private notifyRecoverySuccess(): void {
    // Dispatch a custom event that components can listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('supabase-client-recovered', {
        detail: { timestamp: Date.now() }
      }));
    }

    // Clear any cache that might be stale
    this.clearStaleCache();
  }

  /**
   * Notify the application that recovery failed
   */
  private notifyRecoveryFailure(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('supabase-client-recovery-failed', {
        detail: { 
          timestamp: Date.now(),
          attempts: this.recoveryAttempts 
        }
      }));
    }
  }

  /**
   * Clear stale cache entries
   */
  private clearStaleCache(): void {
    try {
      // Clear cache functions if available
      if (typeof window !== 'undefined') {
        const clearFunctions = [
          'clearMembersCache',
          'clearPostsCache', 
          'clearCategoriesCache'
        ];

        clearFunctions.forEach(funcName => {
          if ((window as any)[funcName]) {
            (window as any)[funcName]();
          }
        });
      }
    } catch (e) {
      console.warn('⚠️ [HealthMonitor] Cache clear warning:', e);
    }
  }

  /**
   * Get the last health check result
   */
  public getLastHealthCheck(): HealthCheckResult | null {
    return this.lastHealthCheck;
  }

  /**
   * Check if the client is currently healthy
   */
  public isClientHealthy(): boolean {
    return this.lastHealthCheck?.isHealthy ?? false;
  }

  /**
   * Get health status for debugging
   */
  public getHealthStatus(): {
    isHealthy: boolean;
    lastCheck: HealthCheckResult | null;
    isRecovering: boolean;
    recoveryAttempts: number;
  } {
    return {
      isHealthy: this.isClientHealthy(),
      lastCheck: this.lastHealthCheck,
      isRecovering: this.isRecovering,
      recoveryAttempts: this.recoveryAttempts
    };
  }
}

// Export singleton instance
export const supabaseHealthMonitor = SupabaseHealthMonitor.getInstance();

// Auto-start monitoring in browser environment
if (typeof window !== 'undefined') {
  // Start monitoring after a short delay to allow client initialization
  setTimeout(() => {
    supabaseHealthMonitor.startMonitoring();
  }, 2000);

  // Expose to window for debugging
  (window as any).supabaseHealthMonitor = supabaseHealthMonitor;
  
  // ENHANCED: Expose manual recovery functions for immediate fixes
  (window as any).checkSupabaseHealth = async () => {
    console.log('🏥 [Manual] Performing health check...');
    const result = await supabaseHealthMonitor.performHealthCheck();
    console.log('🏥 [Manual] Health check result:', result);
    return result;
  };
  
  (window as any).recoverSupabaseClient = async () => {
    console.log('🔧 [Manual] Starting manual client recovery...');
    try {
      await supabaseHealthMonitor.recoverClient();
      console.log('✅ [Manual] Client recovery completed');
      
      // Verify recovery worked
      const healthCheck = await supabaseHealthMonitor.performHealthCheck();
      if (healthCheck.isHealthy) {
        console.log('🎉 [Manual] Recovery successful - client is now healthy!');
      } else {
        console.log('⚠️ [Manual] Recovery completed but client still unhealthy');
      }
      
      return { success: true, healthy: healthCheck.isHealthy };
    } catch (error) {
      console.error('❌ [Manual] Recovery failed:', error);
      return { success: false, error: error.message };
    }
  };
} 