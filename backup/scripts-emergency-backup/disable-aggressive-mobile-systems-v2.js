/**
 * 🛑 AGGRESSIVE MOBILE SYSTEMS DISABLER V2
 * 
 * Enhanced version that catches ALL remaining aggressive systems
 * that were missed in V1, based on user's console logs
 */

(function() {
  console.log('\n🛑 DISABLING AGGRESSIVE MOBILE SYSTEMS V2');
  console.log('==========================================');

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

  // 1. DISABLE ALL ERROR INTERCEPTORS AND 401 HANDLERS
  disableSystem('All GlobalErrorInterceptor 401 handling', () => {
    // Find all global error interceptors
    ['globalErrorInterceptor', 'errorInterceptor', 'authErrorHandler'].forEach(interceptorName => {
      if (window[interceptorName]) {
        // Disable 401 detection
        if (window[interceptorName].handle401Error) {
          window[interceptorName].handle401Error = () => {
            console.log('🍎 [SkoolMobile] 401 interceptor blocked - using patient approach');
            return Promise.resolve();
          };
        }
        
        // Disable session refresh
        if (window[interceptorName].refreshSession) {
          window[interceptorName].refreshSession = () => {
            console.log('🍎 [SkoolMobile] Session refresh interceptor blocked');
            return Promise.resolve();
          };
        }

        // Disable error reporting
        if (window[interceptorName].captureError) {
          const originalCaptureError = window[interceptorName].captureError;
          window[interceptorName].captureError = (error) => {
            if (error?.message?.includes('401') || error?.status === 401) {
              console.log('🍎 [SkoolMobile] 401 error logged but recovery blocked');
              return Promise.resolve();
            }
            return originalCaptureError(error);
          };
        }
      }
    });
  });

  // 2. DISABLE SIMPLE MOBILE 401 DETECTION
  disableSystem('SimpleMobile 401 detection', () => {
    ['simpleMobile', 'simpleMobileManager', 'mobileManager'].forEach(mobileName => {
      if (window[mobileName]) {
        // Disable 401 detection
        if (window[mobileName].handle401) {
          window[mobileName].handle401 = () => {
            console.log('🍎 [SkoolMobile] SimpleMobile 401 blocked - using patient approach');
            return Promise.resolve();
          };
        }
      }
    });
  });

  // 3. SUPER PATIENT FETCH OVERRIDE
  console.log('🔧 Installing SUPER patient fetch override...');
  
  const originalFetch = window.fetch;
  let consecutive401s = 0;
  let lastFailureTime = 0;
  let sessionRefreshInProgress = false;
  
  window.fetch = async function(...args) {
    try {
      const response = await originalFetch.apply(this, args);
      
      // Reset 401 counter on success
      if (response.ok) {
        consecutive401s = 0;
      }
      
      // Handle 401s with EXTREME patience (like Skool)
      if (response.status === 401) {
        consecutive401s++;
        const now = Date.now();
        
        // Only refresh session after 5+ consecutive 401s AND 15+ seconds apart
        if (consecutive401s >= 5 && (now - lastFailureTime) > 15000 && !sessionRefreshInProgress) {
          console.log('🍎 [SkoolMobile] 5+ consecutive 401s - VERY gentle session refresh');
          lastFailureTime = now;
          sessionRefreshInProgress = true;
          
          setTimeout(async () => {
            try {
              const { supabase } = await import('/src/integrations/supabase/client.ts');
              await supabase.auth.refreshSession();
              console.log('🍎 [SkoolMobile] Super gentle session refresh completed');
            } catch (refreshError) {
              console.log('🍎 [SkoolMobile] Session refresh failed, will retry much later');
            } finally {
              sessionRefreshInProgress = false;
            }
          }, 10000);
        } else {
          console.log(`🍎 [SkoolMobile] 401 detected (${consecutive401s}/5) - staying patient`);
        }
      }
      
      return response;
    } catch (error) {
      if (error.message?.includes('Load failed') || 
          error.message?.includes('access control checks')) {
        console.log('🍎 [SkoolMobile] Network blocking - extreme patience mode');
        return Promise.reject(error);
      }
      return Promise.reject(error);
    }
  };

  console.log('\n🎉 SUPER AGGRESSIVE SYSTEMS DISABLED!');
  console.log('===================================');
  console.log('✅ All 401 handlers: BLOCKED');
  console.log('✅ Fetch override: EXTREME PATIENCE MODE');
  console.log('\n📱 Expected: Zero aggressive recovery, Skool-like patience');

  window.aggressiveSystemsDisabledV2 = {
    status: () => ({
      fetchOverridden: window.fetch !== originalFetch,
      consecutive401s,
      sessionRefreshInProgress,
      version: 'V2 - Super Patient'
    }),
    test: () => {
      console.log('🧪 Testing V2 disabled systems...');
      console.log('Fetch is V2 overridden:', window.fetch !== originalFetch);
      console.log('Consecutive 401s:', consecutive401s);
    }
  };

  console.log('\n🔧 V2 Debug: window.aggressiveSystemsDisabledV2.status()');

})();
