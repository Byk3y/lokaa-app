// Emergency Client Reset Script for Lokaa Connect Spaces
// Based on comprehensive research findings
// Run this in browser console when client becomes corrupted after hard refresh

console.log('🚨 [EmergencyReset] Starting research-based emergency client reset...');

async function emergencyClientReset() {
  try {
    console.log('🛑 [EmergencyReset] Implementing research-recommended recovery...');
    
    // RESEARCH FIX 1: Check for multiple client instances
    console.log('🔍 [Step 1] Checking for multiple GoTrueClient instances...');
    
    const clientRefs = [];
    if (window.supabase) clientRefs.push('window.supabase');
    if (window.__supabaseClient) clientRefs.push('window.__supabaseClient');
    
    console.log(`📊 [Step 1] Found ${clientRefs.length} client references:`, clientRefs);
    
    if (clientRefs.length > 1) {
      console.warn('⚠️ [Step 1] Multiple client instances detected - this is the root cause!');
    }
    
    // RESEARCH FIX 2: Session recovery instead of client recreation
    console.log('🔍 [Step 2] Attempting session recovery...');
    
    const existingClient = window.supabase || window.__supabaseClient;
    
    if (existingClient) {
      try {
        // Check session validity
        const { data: sessionData, error: sessionError } = await existingClient.auth.getSession();
        
        if (sessionError || !sessionData.session) {
          console.log('🔄 [Step 2] Invalid session detected, attempting restoration...');
          
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
                console.log('✅ [Step 2] Session restored from localStorage');
              } else {
                console.log('⚠️ [Step 2] Stored session expired, clearing...');
                await existingClient.auth.signOut({ scope: 'local' });
                localStorage.removeItem('supabase.auth.token');
              }
            } catch (e) {
              console.warn('⚠️ [Step 2] Session restoration failed:', e);
              await existingClient.auth.signOut({ scope: 'local' });
            }
          }
        } else {
          console.log('✅ [Step 2] Session is valid');
        }
        
        // RESEARCH FIX 3: Refresh realtime connections
        if (existingClient.realtime) {
          console.log('🔄 [Step 2] Refreshing realtime connections...');
          existingClient.realtime.disconnect();
          await new Promise(resolve => setTimeout(resolve, 1000));
          // Realtime will auto-reconnect on next subscription
        }
        
        // Test the client
        console.log('🧪 [Step 2] Testing recovered client...');
        const testResult = await Promise.race([
          existingClient.from('spaces').select('id').limit(1),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Test timeout')), 5000))
        ]);
        
        if (testResult.error) {
          throw new Error(`Recovery test failed: ${testResult.error.message}`);
        }
        
        console.log('✅ [Step 2] Client recovery successful without reinitialization!');
        
        // Clear any stale caches
        if (window.clearMembersCache) window.clearMembersCache();
        if (window.clearPostsCache) window.clearPostsCache();
        
        // Force page refresh to reset UI state
        console.log('🔄 [Step 2] Forcing page refresh to reset UI state...');
        window.location.reload();
        
        return;
        
      } catch (error) {
        console.error('❌ [Step 2] Session recovery failed:', error);
        console.log('🔄 [Step 2] Falling back to client reset...');
      }
    }
    
    // RESEARCH FIX 4: Last resort - clear session and prompt re-auth
    console.log('🔄 [Step 3] Clearing corrupted session state...');
    
    if (existingClient) {
      try {
        await existingClient.auth.signOut({ scope: 'local' });
        console.log('✅ [Step 3] Cleared corrupted session');
      } catch (e) {
        console.warn('⚠️ [Step 3] Session clear warning:', e);
      }
    }
    
    // Clear localStorage auth data
    localStorage.removeItem('supabase.auth.token');
    sessionStorage.removeItem('session_corruption_detected');
    
    // Clear all client references
    if (window.supabase) window.supabase = null;
    if (window.__supabaseClient) window.__supabaseClient = null;
    delete window.supabase;
    delete window.__supabaseClient;
    
    console.log('🔄 [Step 3] User will need to re-authenticate');
    
    // Dispatch event for app to handle re-authentication
    window.dispatchEvent(new CustomEvent('supabase-auth-required', {
      detail: { 
        reason: 'emergency-reset',
        timestamp: Date.now() 
      }
    }));
    
    // Force page refresh
    console.log('🔄 [Step 3] Forcing page refresh...');
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
    
  } catch (error) {
    console.error('❌ [EmergencyReset] Emergency reset failed:', error);
    
    // Nuclear option - force reload
    console.log('💥 [EmergencyReset] Nuclear option - forcing hard reload...');
    window.location.reload(true);
  }
}

// RESEARCH FIX 5: Add localStorage monitoring
function monitorLocalStorage() {
  console.log('📊 [LocalStorage] Current auth state:');
  console.log('- supabase.auth.token:', !!localStorage.getItem('supabase.auth.token'));
  console.log('- session_corruption_detected:', sessionStorage.getItem('session_corruption_detected'));
  console.log('- intentional_signout:', sessionStorage.getItem('intentional_signout'));
  
  const authToken = localStorage.getItem('supabase.auth.token');
  if (authToken) {
    try {
      const tokenData = JSON.parse(authToken);
      const isExpired = tokenData.expires_at * 1000 <= Date.now();
      console.log('- Token expires at:', new Date(tokenData.expires_at * 1000));
      console.log('- Token expired:', isExpired);
    } catch (e) {
      console.log('- Token parse error:', e.message);
    }
  }
}

// RESEARCH FIX 6: Service worker check
function checkServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      console.log('📊 [ServiceWorker] Active registrations:', registrations.length);
      registrations.forEach((reg, index) => {
        console.log(`- Registration ${index + 1}:`, reg.scope);
      });
      
      if (registrations.length > 1) {
        console.warn('⚠️ [ServiceWorker] Multiple registrations detected - potential conflict');
      }
    });
  }
}

// Run the emergency reset
console.log('🔍 [EmergencyReset] Pre-reset diagnostics:');
monitorLocalStorage();
checkServiceWorker();

console.log('🚀 [EmergencyReset] Starting emergency reset in 2 seconds...');
setTimeout(emergencyClientReset, 2000); 