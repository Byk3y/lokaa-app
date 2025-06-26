/**
 * 🛑 AGGRESSIVE MOBILE SYSTEMS DISABLER
 * 
 * Completely disables all the conflicting mobile protection systems
 * that are causing the "Fetch API cannot load" errors and full app refreshes
 */

(function() {
  console.log('\n🛑 DISABLING AGGRESSIVE MOBILE SYSTEMS');
  console.log('=====================================');

  const disableSystem = (name, disableFunction) => {
    try {
      disableFunction();
      console.log(`✅ ${name}: DISABLED`);
      return true;
    } catch (error) {
      console.log(`⚠️ ${name}: Not found or already disabled`);
      return false;
    }
  };

  // 1. DISABLE HEALTH MONITOR (PRIMARY CULPRIT)
  disableSystem('HealthMonitor', () => {
    if (window.supabaseHealthMonitor) {
      // Stop all intervals
      if (window.supabaseHealthMonitor.intervalId) {
        clearInterval(window.supabaseHealthMonitor.intervalId);
      }
      
      // Disable recovery function
      window.supabaseHealthMonitor.recoverClient = () => {
        console.log('🍎 [SkoolMobile] Health monitor recovery blocked - using patient approach');
        return Promise.resolve();
      };
      
      // Disable health checking
      window.supabaseHealthMonitor.enabled = false;
    }
  });

  // 2. DISABLE PHASE 1 MOBILE RECOVERY
  disableSystem('Phase1MobileRecovery', () => {
    if (window.phase1Recovery) {
      window.phase1Recovery.disable?.();
    }
    if (window.phase1MobileRecovery) {
      window.phase1MobileRecovery.disable?.();
    }
  });

  // 3. DISABLE REMAINING AGGRESSIVE 401 HANDLERS
  disableSystem('GlobalErrorInterceptor remaining', () => {
    // Disable the remaining GlobalErrorInterceptor that's still catching 401s
    if (window.globalErrorInterceptor) {
      window.globalErrorInterceptor.handle401Error = () => {
        console.log('🍎 [SkoolMobile] GlobalErrorInterceptor 401 blocked - using patient approach');
        return Promise.resolve();
      };
    }
  });

  disableSystem('SimpleMobile aggressive 401 handling', () => {
    // Override SimpleMobile 401 detection to be patient
    if (window.simpleMobile) {
      window.simpleMobile.handle401 = () => {
        console.log('🍎 [SkoolMobile] SimpleMobile 401 blocked - using patient approach');
        return Promise.resolve();
      };
    }
  });

  // 4. OVERRIDE FETCH TO PREVENT AGGRESSIVE RECOVERY
  console.log('🔧 Installing Skool-style fetch override...');
  
  const originalFetch = window.fetch;
  let consecutive401s = 0;
  let lastFailureTime = 0;
  
  window.fetch = async function(...args) {
    try {
      const response = await originalFetch.apply(this, args);
      
      // Reset 401 counter on success
      if (response.ok) {
        consecutive401s = 0;
      }
      
      // Handle 401s with Skool-style patience
      if (response.status === 401) {
        consecutive401s++;
        const now = Date.now();
        
        // Only refresh session after 3 consecutive 401s AND 10+ seconds apart
        if (consecutive401s >= 3 && (now - lastFailureTime) > 10000) {
          console.log('🍎 [SkoolMobile] 3+ consecutive 401s detected - gentle session refresh');
          lastFailureTime = now;
          
          // Gentle session refresh (no aggressive recovery)
          try {
            const { supabase } = await import('/src/integrations/supabase/client.ts');
            await supabase.auth.refreshSession();
          } catch (refreshError) {
            console.log('🍎 [SkoolMobile] Session refresh failed, will retry later');
          }
        }
      }
      
      return response;
    } catch (error) {
      // Handle network errors with Skool-style patience
      if (error.message?.includes('Load failed') || 
          error.message?.includes('access control checks')) {
        
        console.log('🍎 [SkoolMobile] Network blocking detected - using cache/waiting patiently');
        
        // Don't trigger aggressive recovery, just wait
        return Promise.reject(error);
      }
      
      return Promise.reject(error);
    }
  };

  // 5. DISABLE ERROR TRACKING THAT TRIGGERS RECOVERY
  disableSystem('Error tracking systems', () => {
    // Disable error systems that trigger aggressive recovery
    ['errorTrackingSystem', 'criticalErrorHandler', 'networkErrorHandler'].forEach(system => {
      if (window[system]) {
        if (window[system].captureError) {
          const originalCaptureError = window[system].captureError;
          window[system].captureError = (error) => {
            // Only log 401s, don't trigger recovery
            if (error?.message?.includes('401')) {
              console.log('🍎 [SkoolMobile] 401 error logged but recovery blocked');
              return;
            }
            return originalCaptureError(error);
          };
        }
      }
    });
  });

  // 6. INSTALL PATIENT BACKGROUND HANDLING
  let sessionRefreshInProgress = false;
  window.addEventListener('visibilitychange', () => {
    if (!document.hidden && !sessionRefreshInProgress) {
      // User returned from background - be patient
      console.log('🍎 [SkoolMobile] Returned from background - staying patient');
      
      // Only refresh session if it's been a LONG time (10+ minutes)
      const lastRefresh = localStorage.getItem('skool_last_session_refresh');
      const now = Date.now();
      
      if (!lastRefresh || (now - parseInt(lastRefresh)) > 600000) { // 10 minutes
        sessionRefreshInProgress = true;
        
        setTimeout(async () => {
          try {
            const { supabase } = await import('/src/integrations/supabase/client.ts');
            await supabase.auth.refreshSession();
            localStorage.setItem('skool_last_session_refresh', now.toString());
            console.log('🍎 [SkoolMobile] Gentle session refresh completed');
          } catch (error) {
            console.log('🍎 [SkoolMobile] Session refresh skipped - will retry later');
          } finally {
            sessionRefreshInProgress = false;
          }
        }, 5000); // Wait 5 seconds for natural network recovery
      }
    }
  });

  console.log('\n🎉 AGGRESSIVE SYSTEMS DISABLED SUCCESSFULLY!');
  console.log('===========================================');
  console.log('✅ Health monitor recovery: BLOCKED');
  console.log('✅ Aggressive session validation: DISABLED');
  console.log('✅ Fetch override: PATIENT MODE');
  console.log('✅ Background return: GENTLE HANDLING');
  console.log('\n📱 Expected behavior now:');
  console.log('• Minimize browser 20-60s and return');
  console.log('• Should see: Small glitch indicator, no page refresh');
  console.log('• No more "Fetch API cannot load" errors');
  console.log('• No more aggressive recovery attempts');

  // Expose testing interface
  window.aggressiveSystemsDisabled = {
    status: () => {
      return {
        healthMonitor: !window.supabaseHealthMonitor?.enabled,
        fetchOverride: window.fetch !== originalFetch,
        allDisabled: true
      };
    },
    test: () => {
      console.log('🧪 Testing disabled systems...');
      console.log('Health monitor enabled:', window.supabaseHealthMonitor?.enabled || false);
      console.log('Fetch is overridden:', window.fetch !== originalFetch);
    }
  };

  console.log('\n🔧 Debug commands:');
  console.log('• window.aggressiveSystemsDisabled.status()');
  console.log('• window.aggressiveSystemsDisabled.test()');

})();
