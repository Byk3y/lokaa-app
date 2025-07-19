import { log } from '@/utils/logger';
/**
 * Centralized Debug Services
 * 
 * This module provides access to all debugging utilities in a controlled manner.
 * All debug functions are environment-gated and only available in development mode.
 * 
 * @example
 * ```typescript
 * import { initializeDebugServices, debugServices } from '@/shared/services/debug';
 * 
 * // Initialize debug services in development mode
 * initializeDebugServices(supabase);
 * 
 * // Use debug services
 * debugServices.auth.checkSession();
 * debugServices.spaceAccess.clientSideCheck('my-space');
 * debugServices.profileRedirect.resetProfileRedirectCounter();
 * ```
 */

import { env } from "@/core/config/env";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { spaceAccessDebugger } from "./space-access-debug";
import { authDebugger } from "./auth-debug";
import { profileRedirectDebugger } from "./profile-redirect";

// Extend Window interface for debugging tools
declare global {
  interface Window {
    debugServices?: DebugServices;
    initializeDebugServices?: (supabaseClient: typeof supabase) => void;
  }
}

// Debug services interface
export interface DebugServices {
  auth: typeof authDebugger;
  spaceAccess: typeof spaceAccessDebugger;
  profileRedirect: typeof profileRedirectDebugger;
  isEnabled: boolean;
  isInitialized: boolean;
}

/**
 * Environment-safe debug services wrapper
 */
class DebugManager {
  private isInitialized = false;
  private isEnabled = false;

  constructor() {
    this.isEnabled = env.isDevelopment;
    
    if (this.isEnabled) {
      log.debug('Service', '🐛 Debug services available in development mode');
    }
  }

  /**
   * Initialize all debug services with Supabase client
   */
  initialize(supabaseClient: typeof supabase): void {
    if (!this.isEnabled) {
      log.warn('Service', 'Debug services are only available in development mode');
      return;
    }

    // Initialize individual debug services
    spaceAccessDebugger.init(supabaseClient);
    authDebugger.init(supabaseClient);
    // Profile redirect debugger doesn't need Supabase client

    this.isInitialized = true;
    log.debug('Service', '🐛 All debug services initialized');
  }

  /**
   * Get the debug services object
   */
  getServices(): DebugServices {
    return {
      auth: authDebugger,
      spaceAccess: spaceAccessDebugger,
      profileRedirect: profileRedirectDebugger,
      isEnabled: this.isEnabled,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Check if debug services are ready to use
   */
  isReady(): boolean {
    return this.isEnabled && this.isInitialized;
  }

  /**
   * Get environment information
   */
  getEnvironmentInfo() {
    return {
      isDevelopment: env.isDevelopment,
      isProduction: env.isProduction,
      nodeEnv: env.NODE_ENV,
      debugEnabled: this.isEnabled,
      debugInitialized: this.isInitialized
    };
  }
}

// Create singleton instance
const debugManager = new DebugManager();

// Export convenience functions
export const initializeDebugServices = (supabaseClient: typeof supabase): void => {
  debugManager.initialize(supabaseClient);
};

export const debugServices = debugManager.getServices();

export const isDebugReady = (): boolean => debugManager.isReady();

export const getDebugEnvironmentInfo = () => debugManager.getEnvironmentInfo();

// Export individual debug services for direct use
export { spaceAccessDebugger } from "./space-access-debug";
export { authDebugger } from "./auth-debug";
export { profileRedirectDebugger } from "./profile-redirect";

// Export types
export type { SpaceAccessDebugResult, UserSpaceAccessDebugResult } from "./space-access-debug";
export type { SessionCheckResult, UserCheckResult, StorageAnalysisResult, ClearStorageResult, EmergencySignOutResult } from "./auth-debug";
export type { ProfileRedirectDebugInfo } from "./profile-redirect";

// Export new consolidated debug types
export type { UserSpaceDebugResult, SpacePermissionsDebugResult } from "./space-access-debug";

// Development-only window exposure
if (env.isDevelopment && typeof window !== 'undefined') {
  window.debugServices = debugServices;
  window.initializeDebugServices = initializeDebugServices;
}

export default debugManager; 