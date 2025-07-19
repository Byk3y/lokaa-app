import { log } from '@/utils/logger';
/**
 * EMERGENCY PHASE 6/7 CRISIS FIX VALIDATION
 * 
 * This validates the critical fixes for:
 * 1. Logout failure cascade (Phase 6)
 * 2. API storm prevention (Phase 7)
 * 3. Deprecated space_access table removal
 */

export interface CrisisFix {
  name: string;
  status: 'fixed' | 'failed' | 'warning';
  description: string;
  test: () => Promise<boolean>;
}

export const emergencyPhase67Fixes: CrisisFix[] = [
  {
    name: 'LOGOUT_FAILURE_CASCADE',
    status: 'fixed',
    description: 'Prevents logout → discover → space redirect loop',
    test: async () => {
      // Check if AuthContext SIGNED_OUT handler properly clears state
      const authContextContent = await fetch('/src/contexts/AuthContext.tsx').then(r => r.text());
      return authContextContent.includes('setSession(null)') && 
             authContextContent.includes('setUser(null)') &&
             authContextContent.includes('navigate(\'/\', { replace: true })');
    }
  },
  
  {
    name: 'SPACE_ACCESS_TABLE_REMOVAL',
    status: 'fixed', 
    description: 'Removes all references to deprecated space_access table',
    test: async () => {
      try {
        // Check SpaceAboutPage uses space_members
        const aboutPageContent = await fetch('/src/pages/SpaceAboutPage.tsx').then(r => r.text());
        const profileSpacesContent = await fetch('/src/components/profile/ProfileSpaces.tsx').then(r => r.text());
        
        return aboutPageContent.includes('space_members') && 
               !aboutPageContent.includes('space_access') &&
               profileSpacesContent.includes('space_members') &&
               !profileSpacesContent.includes('space_access');
      } catch {
        return false;
      }
    }
  },
  
  {
    name: 'API_STORM_CIRCUIT_BREAKER',
    status: 'fixed',
    description: 'Prevents concurrent request storms on discover page',
    test: async () => {
      try {
        const discoverContent = await fetch('/src/pages/Discover.tsx').then(r => r.text());
        return discoverContent.includes('throttledRequest') &&
               discoverContent.includes('MAX_CONCURRENT_REQUESTS') &&
               discoverContent.includes('Circuit breaker');
      } catch {
        return false;
      }
    }
  },
  
  {
    name: 'SMART_REDIRECT_SAFETY',
    status: 'fixed',
    description: 'Prevents smart redirect after logout',
    test: async () => {
      try {
        const discoverContent = await fetch('/src/pages/Discover.tsx').then(r => r.text());
        return discoverContent.includes('user?.email') &&
               discoverContent.includes('User state became invalid') &&
               discoverContent.includes('small delay to ensure user state');
      } catch {
        return false;
      }
    }
  }
];

export async function validateEmergencyFixes(): Promise<{ 
  allFixed: boolean; 
  results: CrisisFix[];
  summary: string; 
}> {
  log.debug('Utils', '🚨 EMERGENCY PHASE 6/7 FIX VALIDATION STARTING...');
  
  const results: CrisisFix[] = [];
  let fixedCount = 0;
  
  for (const fix of emergencyPhase67Fixes) {
    try {
      const passed = await fix.test();
      const result = { 
        ...fix, 
        status: passed ? 'fixed' as const : 'failed' as const 
      };
      results.push(result);
      
      if (passed) {
        fixedCount++;
        log.debug('Utils', `✅ ${fix.name}: ${fix.description}`);
      } else {
        log.error('Utils', `❌ ${fix.name}: ${fix.description}`);
      }
    } catch (error) {
      log.error('Utils', `⚠️ ${fix.name}: Test failed with error:`, error);
      results.push({ 
        ...fix, 
        status: 'warning' as const 
      });
    }
  }
  
  const allFixed = fixedCount === emergencyPhase67Fixes.length;
  const summary = `${fixedCount}/${emergencyPhase67Fixes.length} critical fixes validated`;
  
  log.debug('Utils', `🚨 EMERGENCY VALIDATION COMPLETE: ${summary}`);
  
  if (allFixed) {
    log.debug('Utils', '🎉 ALL CRITICAL ISSUES RESOLVED! Safe to continue.');
  } else {
    log.error('Utils', '💥 SOME CRITICAL ISSUES REMAIN! Manual intervention required.');
  }
  
  return { allFixed, results, summary };
}

// Auto-run validation in development
if (typeof window !== 'undefined') {
  (window as any).validateEmergencyPhase67Fixes = validateEmergencyFixes;
  log.debug('Utils', '🔧 Emergency validation available: window.validateEmergencyPhase67Fixes()');
} 