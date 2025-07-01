/**
 * 🔍 PRESENCE SYSTEM DEBUGGER v2.0
 * 
 * Comprehensive script to debug why online members show as 0
 * Fixed for development environment with correct import paths
 */

window.debugPresenceIssue = {
  
  async getSupabaseClient() {
    // Try multiple ways to get the Supabase client
    try {
      // Method 1: Try to get from global window
      if (window.supabase) {
        console.log('✅ [PresenceDebugger] Using global Supabase client');
        return window.supabase;
      }
      
      // Method 2: Try to import from correct path (without leading slash for Vite)
      try {
        const clientModule = await import('@/integrations/supabase/client');
        console.log('✅ [PresenceDebugger] Imported Supabase client module');
        return clientModule.getSupabaseClient();
      } catch (importError) {
        console.log('⚠️ [PresenceDebugger] Import failed, trying alternative paths...');
      }
      
      // Method 3: Try relative path
      try {
        const clientModule = await import('../src/integrations/supabase/client');
        console.log('✅ [PresenceDebugger] Imported via relative path');
        return clientModule.getSupabaseClient();
      } catch (relativeError) {
        console.log('⚠️ [PresenceDebugger] Relative import failed');
      }
      
      // Method 4: Try to access from React context if available
      if (window.React && window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        console.log('⚠️ [PresenceDebugger] Trying to access via React DevTools...');
        // This would require more complex React DevTools integration
      }
      
      throw new Error('No Supabase client access method worked');
      
    } catch (error) {
      console.error('❌ [PresenceDebugger] Failed to get Supabase client:', error);
      return null;
    }
  },
  
  async enableFullLogging() {
    console.log('🔧 [PresenceDebugger] Enabling full console logging...');
    
    // Enable all dev logger categories
    if (window.devLogger) {
      window.devLogger.allowAll();
      console.log('✅ [PresenceDebugger] All dev logging enabled');
    } else {
      console.log('⚠️ [PresenceDebugger] devLogger not available');
    }
    
    // Enable presence debug specifically
    if (window.devLogger && window.devLogger.onlyAllow) {
      window.devLogger.onlyAllow('Error', 'Warning', 'Critical', 'Auth', 'Chat', 'PresenceDebug', 'GlobalPresence', 'UnifiedPresence');
      console.log('✅ [PresenceDebugger] Presence logging enabled');
    }
  },

  async getCurrentUserInfo() {
    console.log('👤 [PresenceDebugger] Getting current user info...');
    
    try {
      const supabase = await this.getSupabaseClient();
      if (!supabase) {
        console.error('❌ [PresenceDebugger] No Supabase client available');
        return null;
      }
      
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('❌ [PresenceDebugger] Auth error:', error);
        return null;
      }
      
      console.log('✅ [PresenceDebugger] Current user:', {
        id: user?.id,
        email: user?.email,
        authenticated: !!user
      });
      
      return user;
    } catch (error) {
      console.error('❌ [PresenceDebugger] Error getting user:', error);
      return null;
    }
  },

  async getSpaceInfo() {
    console.log('🏠 [PresenceDebugger] Getting space info...');
    
    const spaceId = '235e68d1-89df-4d2d-8945-e7756d60de20';
    const subdomain = 'nocode-architects';
    
    try {
      const supabase = await this.getSupabaseClient();
      if (!supabase) {
        console.error('❌ [PresenceDebugger] No Supabase client available');
        return null;
      }
      
      const { data: space, error } = await supabase
        .from('spaces')
        .select('*')
        .eq('id', spaceId)
        .single();
      
      if (error) {
        console.error('❌ [PresenceDebugger] Space query error:', error);
        return null;
      }
      
      console.log('✅ [PresenceDebugger] Space info:', {
        id: space.id,
        name: space.name,
        subdomain: space.subdomain,
        owner_id: space.owner_id
      });
      
      return space;
    } catch (error) {
      console.error('❌ [PresenceDebugger] Error getting space:', error);
      return null;
    }
  },

  async testMemberCounts() {
    console.log('📊 [PresenceDebugger] Testing member counts...');
    
    const spaceId = '235e68d1-89df-4d2d-8945-e7756d60de20';
    
    try {
      const supabase = await this.getSupabaseClient();
      if (!supabase) {
        console.error('❌ [PresenceDebugger] No Supabase client available');
        return null;
      }
      
      // Get all space members
      const { data: members, error } = await supabase
        .from('space_members')
        .select('id, user_id, role, status, is_online, users(full_name)')
        .eq('space_id', spaceId)
        .eq('status', 'active');
      
      if (error) {
        console.error('❌ [PresenceDebugger] Member query error:', error);
        return null;
      }
      
      const totalCount = members?.length || 0;
      const adminCount = members?.filter(m => m.role === 'admin')?.length || 0;
      const onlineCountDB = members?.filter(m => m.is_online)?.length || 0;
      
      console.log('✅ [PresenceDebugger] Database member counts:', {
        totalMembers: totalCount,
        adminMembers: adminCount,
        onlineMembersDB: onlineCountDB,
        allMembers: members?.map(m => ({
          user_id: m.user_id,
          name: m.users?.full_name,
          role: m.role,
          is_online: m.is_online
        }))
      });
      
      return {
        totalMembers: totalCount,
        adminMembers: adminCount,
        onlineMembersDB: onlineCountDB,
        members
      };
    } catch (error) {
      console.error('❌ [PresenceDebugger] Error testing member counts:', error);
      return null;
    }
  },

  async testPresenceSystem() {
    console.log('🌐 [PresenceDebugger] Testing presence system...');
    
    const spaceId = '235e68d1-89df-4d2d-8945-e7756d60de20';
    
    try {
      const supabase = await this.getSupabaseClient();
      if (!supabase) {
        console.error('❌ [PresenceDebugger] No Supabase client available');
        return null;
      }
      
      // Create a test presence channel
      const channel = supabase.channel(`test_presence_debug:${spaceId}`, {
        config: {
          presence: {
            key: spaceId,
          },
        },
      });
      
      console.log('🔗 [PresenceDebugger] Created test presence channel');
      
      return new Promise((resolve) => {
        let resolved = false;
        
        const resolveOnce = (result) => {
          if (!resolved) {
            resolved = true;
            channel.unsubscribe();
            resolve(result);
          }
        };
        
        channel
          .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const allPresence = Object.values(state || {}).flat();
            const onlineUsers = allPresence
              .filter(p => p?.user_id && p?.space_id === spaceId)
              .map(p => p.user_id);
            const uniqueUsers = [...new Set(onlineUsers)];
            
            console.log('✅ [PresenceDebugger] Presence sync result:', {
              presenceState: state,
              allPresence,
              onlineUsers,
              uniqueUsers,
              onlineCount: uniqueUsers.length
            });
            
            resolveOnce({
              onlineCount: uniqueUsers.length,
              onlineUsers: uniqueUsers,
              presenceState: state
            });
          })
          .subscribe(async (status) => {
            console.log('📡 [PresenceDebugger] Presence subscription status:', status);
            
            if (status === 'SUBSCRIBED') {
              // Track presence for current user
              const user = await this.getCurrentUserInfo();
              if (user) {
                await channel.track({
                  user_id: user.id,
                  online_at: new Date().toISOString(),
                  space_id: spaceId
                });
                console.log('📍 [PresenceDebugger] Tracking presence for user:', user.id);
              }
              
              // Set timeout to resolve if no sync happens
              setTimeout(() => {
                const state = channel.presenceState();
                console.log('⏰ [PresenceDebugger] Timeout - current presence state:', state);
                resolveOnce({
                  onlineCount: 0,
                  onlineUsers: [],
                  presenceState: state,
                  timeout: true
                });
              }, 5000);
            }
          });
      });
    } catch (error) {
      console.error('❌ [PresenceDebugger] Error testing presence system:', error);
      return null;
    }
  },

  async testReactHooks() {
    console.log('⚛️ [PresenceDebugger] Testing React hooks (if available)...');
    
    // Try to access the hooks if they're available globally
    const spaceId = '235e68d1-89df-4d2d-8945-e7756d60de20';
    
    // Look for global React DevTools or hook instances
    if (window.React || window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      console.log('⚛️ [PresenceDebugger] React detected - checking hook states...');
      
      // Note: This is tricky without direct access to hook instances
      // We'll check what we can from global state
      console.log('ℹ️ [PresenceDebugger] Direct hook inspection not available - use React DevTools for detailed hook states');
    } else {
      console.log('⚠️ [PresenceDebugger] React not globally accessible');
    }
  },

  async checkIfIncognitoMode() {
    console.log('🕵️ [PresenceDebugger] Checking if running in incognito mode...');
    
    // Try to detect incognito mode
    const isIncognito = await new Promise((resolve) => {
      const fs = window.RequestFileSystem || window.webkitRequestFileSystem;
      if (!fs) {
        resolve(false);
        return;
      }
      
      fs(window.TEMPORARY, 100, () => resolve(false), () => resolve(true));
    });
    
    console.log(isIncognito ? '🕵️ [PresenceDebugger] INCOGNITO MODE DETECTED' : '👁️ [PresenceDebugger] Normal browsing mode');
    
    return isIncognito;
  },

  async checkCurrentURL() {
    console.log('🌐 [PresenceDebugger] Checking current URL and routing...');
    
    const currentURL = window.location.href;
    const pathname = window.location.pathname;
    const subdomain = window.location.hostname.split('.')[0];
    
    console.log('📍 [PresenceDebugger] Current location:', {
      fullURL: currentURL,
      pathname,
      subdomain,
      expectedSpace: 'nocode-architects'
    });
    
    return {
      currentURL,
      pathname,
      subdomain,
      isExpectedSpace: subdomain === 'nocode-architects' || pathname.includes('nocode-architects')
    };
  },

  async runAllTests() {
    console.log('🚀 [PresenceDebugger] Running comprehensive presence diagnostics...');
    console.log('================================================');
    
    // Step 1: Enable full logging
    await this.enableFullLogging();
    
    // Step 2: Check current URL/routing
    const urlInfo = await this.checkCurrentURL();
    
    // Step 3: Check incognito mode
    const isIncognito = await this.checkIfIncognitoMode();
    
    // Step 4: Get current user
    const user = await this.getCurrentUserInfo();
    
    // Step 5: Get space info
    const space = await this.getSpaceInfo();
    
    // Step 6: Test member counts
    const memberCounts = await this.testMemberCounts();
    
    // Step 7: Test presence system
    const presenceResult = await this.testPresenceSystem();
    
    // Step 8: Test React hooks
    await this.testReactHooks();
    
    // Summary
    console.log('');
    console.log('📋 [PresenceDebugger] DIAGNOSTIC SUMMARY:');
    console.log('================================================');
    console.log('🌐 Current URL:', urlInfo.fullURL);
    console.log('📍 Current Path:', urlInfo.pathname);
    console.log('🏷️ Subdomain:', urlInfo.subdomain);
    console.log('✅ Expected Space:', urlInfo.isExpectedSpace ? 'YES' : 'NO');
    console.log('👤 User:', user ? `${user.email} (${user.id})` : 'Not authenticated');
    console.log('🏠 Space:', space ? `${space.name} (${space.subdomain})` : 'Not found');
    console.log('🕵️ Incognito Mode:', isIncognito ? 'YES (may affect presence)' : 'NO');
    console.log('📊 DB Member Counts:', memberCounts ? `${memberCounts.totalMembers} total, ${memberCounts.adminMembers} admin, ${memberCounts.onlineMembersDB} online` : 'Failed');
    console.log('🌐 Presence System:', presenceResult ? `${presenceResult.onlineCount} online users detected` : 'Failed');
    
    if (presenceResult?.timeout) {
      console.log('⚠️ Presence system timeout - this may indicate connectivity issues');
    }
    
    console.log('');
    console.log('🔧 [PresenceDebugger] Next steps:');
    
    if (!user) {
      console.log('❗ CRITICAL: User not authenticated - this is likely the main issue');
      console.log('- Try logging in again');
      console.log('- Check if auth tokens are valid');
    }
    
    if (!urlInfo.isExpectedSpace) {
      console.log('❗ WARNING: Not on expected space URL');
      console.log('- Navigate to nocode-architects space');
    }
    
    if (memberCounts?.onlineMembersDB === 0 && presenceResult?.onlineCount === 0) {
      console.log('- Both DB and presence show 0 users - check if presence tracking is working');
      console.log('- Try opening another tab/browser with the same space');
    }
    
    if (memberCounts?.onlineMembersDB !== presenceResult?.onlineCount) {
      console.log('- Mismatch between DB and presence counts - this indicates sync issues');
    }
    
    if (isIncognito) {
      console.log('- Incognito mode detected - try in normal browsing mode');
    }
    
    return {
      urlInfo,
      user,
      space,
      isIncognito,
      memberCounts,
      presenceResult
    };
  }
};

// Auto-run basic test
console.log('🔍 [PresenceDebugger] v2.0 loaded. Run window.debugPresenceIssue.runAllTests() for full diagnosis');

// Additional simple diagnostics that don't require imports
window.debugPresenceIssue.quickDiagnostic = function() {
  console.log('⚡ [PresenceDebugger] Quick diagnostic (no imports needed)...');
  console.log('================================================');
  
  // Check auth state in localStorage
  const authKeys = Object.keys(localStorage).filter(key => 
    key.includes('auth') || key.includes('supabase') || key.includes('token') || key.includes('session')
  );
  
  console.log('🔑 Auth-related localStorage keys:', authKeys);
  
  // Check for user session
  const sbAuthToken = localStorage.getItem('sb-ghkcbkphilbpxfrvnhoi-auth-token');
  console.log('🎫 Supabase auth token exists:', !!sbAuthToken);
  
  if (sbAuthToken) {
    try {
      const authData = JSON.parse(sbAuthToken);
      console.log('👤 User from localStorage:', {
        hasUser: !!authData?.user,
        userId: authData?.user?.id,
        email: authData?.user?.email,
        tokenExpiry: authData?.expires_at ? new Date(authData.expires_at * 1000) : 'unknown'
      });
    } catch (e) {
      console.log('⚠️ Could not parse auth token');
    }
  }
  
  // Check current URL
  console.log('📍 Current location:', {
    url: window.location.href,
    pathname: window.location.pathname,
    hostname: window.location.hostname,
    isLocalhost: window.location.hostname === 'localhost'
  });
  
  // Check for React DevTools
  console.log('⚛️ React DevTools available:', !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__);
  
  // Check for presence-related data in DOM
  const onlineCountElements = document.querySelectorAll('[data-testid*="online"], .online-count, [class*="online"]');
  console.log('🌐 Online count elements in DOM:', onlineCountElements.length);
  
  if (onlineCountElements.length > 0) {
    Array.from(onlineCountElements).forEach((el, index) => {
      console.log(`  Element ${index}:`, {
        text: el.textContent?.trim(),
        classes: el.className,
        id: el.id,
        testId: el.getAttribute('data-testid')
      });
    });
  }
  
  // Check for member-related data in DOM
  const memberElements = document.querySelectorAll('[data-testid*="member"], .member-count, [class*="member"]');
  console.log('👥 Member elements in DOM:', memberElements.length);
  
  // Check for any global state managers
  const globalStates = [];
  if (window.zustand) globalStates.push('zustand');
  if (window.redux) globalStates.push('redux');
  if (window.jotai) globalStates.push('jotai');
  if (window.valtio) globalStates.push('valtio');
  
  console.log('🗄️ Global state managers:', globalStates.length > 0 ? globalStates : 'none detected');
  
  // Check for Supabase related globals
  const supabaseGlobals = [];
  if (window.supabase) supabaseGlobals.push('window.supabase');
  if (window._supabase) supabaseGlobals.push('window._supabase');
  if (window.getSupabaseClient) supabaseGlobals.push('window.getSupabaseClient');
  
  console.log('🗄️ Supabase globals:', supabaseGlobals.length > 0 ? supabaseGlobals : 'none detected');
  
  console.log('');
  console.log('💡 Quick assessment:');
  
  if (!sbAuthToken) {
    console.log('❌ CRITICAL: No auth token found - user likely not logged in');
    console.log('   Solution: Log in to the app');
  } else {
    console.log('✅ Auth token found - user appears to be logged in');
  }
  
  if (window.location.hostname === 'localhost') {
    console.log('🏠 Running on localhost - development environment');
  } else {
    console.log('🌐 Running on production/staging environment');
  }
  
  if (onlineCountElements.length === 0) {
    console.log('❌ No online count elements found in DOM');
    console.log('   Possible causes: Component not rendered, CSS selectors changed');
  } else {
    console.log('✅ Online count elements found in DOM');
  }
  
  console.log('');
  console.log('🔧 Next steps:');
  console.log('1. If auth token missing: Log in again');
  console.log('2. If elements missing: Check if SpaceInfoSidebar is rendered');
  console.log('3. For full diagnosis: Run window.debugPresenceIssue.runAllTests()');
};

// Auto-run quick diagnostic
setTimeout(() => {
  console.log('');
  window.debugPresenceIssue.quickDiagnostic();
}, 1000);

// Add specific SpaceInfoSidebar diagnostic
window.debugPresenceIssue.checkSpaceInfoSidebar = function() {
  console.log('🔍 [PresenceDebugger] Checking SpaceInfoSidebar rendering...');
  console.log('================================================');
  
  // Look for SpaceInfoSidebar component in DOM
  const sidebarElements = [
    // Look for various possible selectors
    document.querySelector('[class*="SpaceInfoSidebar"]'),
    document.querySelector('[data-testid*="space-info"]'),
    document.querySelector('[class*="space-info"]'),
    // Look for the main container structure
    document.querySelector('.w-full.bg-white.dark\\:bg-gray-800 .rounded-lg.shadow-md'),
    // Look for member count containers
    document.querySelector('.grid.grid-cols-3'),
    // Look for specific text patterns
    ...Array.from(document.querySelectorAll('*')).filter(el => 
      el.textContent && (
        el.textContent.includes('Members') ||
        el.textContent.includes('Online') ||
        el.textContent.includes('Admin')
      )
    ).slice(0, 5) // Limit to first 5 matches
  ].filter(Boolean);
  
  console.log('🏗️ Potential SpaceInfoSidebar elements found:', sidebarElements.length);
  
  if (sidebarElements.length > 0) {
    sidebarElements.forEach((el, index) => {
      console.log(`📋 Element ${index}:`, {
        tagName: el.tagName,
        className: el.className,
        id: el.id,
        textContent: el.textContent?.slice(0, 100) + (el.textContent?.length > 100 ? '...' : ''),
        hasChildElements: el.children.length,
        boundingRect: el.getBoundingClientRect()
      });
    });
  } else {
    console.log('❌ No SpaceInfoSidebar elements found');
  }
  
  // Check for specific member count displays
  const memberCountTexts = Array.from(document.querySelectorAll('*')).filter(el => {
    const text = el.textContent?.trim();
    return text && (
      /^\d+$/.test(text) || // Just numbers
      text.includes('Members') ||
      text.includes('Online') ||
      text.includes('Admin')
    );
  }).slice(0, 10);
  
  console.log('🔢 Elements with member-related text:', memberCountTexts.length);
  memberCountTexts.forEach((el, index) => {
    console.log(`  Text ${index}: "${el.textContent?.trim()}" (${el.tagName}.${el.className})`);
  });
  
  // Check for React Fiber data (component tree)
  const reactFiberKey = Object.keys(document.body).find(key => key.startsWith('__reactInternalInstance') || key.startsWith('__reactFiber'));
  console.log('⚛️ React Fiber detected:', !!reactFiberKey);
  
  // Look for any error boundaries or loading states
  const errorElements = document.querySelectorAll('[class*="error"], [class*="loading"], [data-testid*="error"], [data-testid*="loading"]');
  console.log('⚠️ Error/Loading elements:', errorElements.length);
  
  if (errorElements.length > 0) {
    Array.from(errorElements).forEach((el, index) => {
      console.log(`  Error/Loading ${index}:`, {
        text: el.textContent?.trim(),
        classes: el.className
      });
    });
  }
  
  // Check current route/page
  const pathname = window.location.pathname;
  console.log('📍 Current route:', pathname);
  console.log('🎯 Expected SpaceInfoSidebar on this route:', pathname.includes('/space'));
  
  return {
    sidebarElementsFound: sidebarElements.length,
    memberCountTextsFound: memberCountTexts.length,
    hasReactFiber: !!reactFiberKey,
    errorElementsFound: errorElements.length,
    isOnSpacePage: pathname.includes('/space')
  };
};

// Add a function to directly inspect the SpaceInfoSidebar component props
window.debugPresenceIssue.inspectComponentState = function() {
  console.log('🔬 [PresenceDebugger] Inspecting component state...');
  console.log('================================================');
  
  // Try to find SpaceInfoSidebar by looking for its distinctive structure
  const spaceInfoContainer = document.querySelector('.w-full.bg-white, .w-full.rounded-lg, [class*="space"]');
  
  if (spaceInfoContainer) {
    console.log('📦 Found potential SpaceInfoSidebar container');
    
    // Look for the member stats grid
    const memberGrid = spaceInfoContainer.querySelector('.grid.grid-cols-3, .grid-cols-3');
    if (memberGrid) {
      console.log('📊 Found member stats grid');
      
      // Extract the displayed numbers
      const statNumbers = Array.from(memberGrid.querySelectorAll('.text-lg, .font-semibold'))
        .map(el => el.textContent?.trim())
        .filter(text => /^\d+$/.test(text));
      
      console.log('🔢 Displayed stats:', statNumbers);
      
      // Extract the labels
      const statLabels = Array.from(memberGrid.querySelectorAll('.text-xs'))
        .map(el => el.textContent?.trim());
      
      console.log('🏷️ Stat labels:', statLabels);
      
      return {
        foundGrid: true,
        displayedNumbers: statNumbers,
        labels: statLabels
      };
    } else {
      console.log('❌ No member stats grid found in container');
    }
  } else {
    console.log('❌ No SpaceInfoSidebar container found');
  }
  
  return { foundGrid: false };
};

// Run the SpaceInfoSidebar check automatically after a delay
setTimeout(() => {
  console.log('');
  const sidebarCheck = window.debugPresenceIssue.checkSpaceInfoSidebar();
  console.log('');
  const componentState = window.debugPresenceIssue.inspectComponentState();
  
  console.log('');
  console.log('📋 [PresenceDebugger] SIDEBAR DIAGNOSTIC SUMMARY:');
  console.log('================================================');
  console.log('🏗️ Sidebar elements found:', sidebarCheck.sidebarElementsFound);
  console.log('🔢 Member count texts found:', sidebarCheck.memberCountTextsFound);
  console.log('⚛️ React Fiber available:', sidebarCheck.hasReactFiber);
  console.log('📊 Member grid found:', componentState.foundGrid);
  
  if (componentState.foundGrid) {
    console.log('✅ SpaceInfoSidebar appears to be rendered');
    console.log('🔢 Displayed numbers:', componentState.displayedNumbers);
    console.log('🏷️ Labels:', componentState.labels);
    
    if (componentState.displayedNumbers.includes('0')) {
      console.log('❗ Found zero values - this confirms the UI issue');
      console.log('💡 Solution: Check why useSimpleMemberCounts is not passing correct props to SpaceInfoSidebar');
    }
  } else {
    console.log('❌ SpaceInfoSidebar not rendered or structure changed');
    console.log('💡 Solution: Check if SpaceInfoSidebar component is mounted on this route');
  }
}, 2000);

// Add a quick test to verify the fix
window.debugPresenceIssue.testFix = function() {
  console.log('🔧 [PresenceDebugger] Testing if the online count fix worked...');
  console.log('================================================');
  
  // Look for the member grid again
  const memberGrid = document.querySelector('.grid.grid-cols-3');
  if (memberGrid) {
    const statNumbers = Array.from(memberGrid.querySelectorAll('.text-lg, .font-semibold'))
      .map(el => el.textContent?.trim())
      .filter(text => /^\d+$/.test(text));
    
    console.log('🔢 Current displayed stats:', statNumbers);
    
    if (statNumbers.length >= 3) {
      const [members, online, admin] = statNumbers;
      console.log('📊 Breakdown: ', {
        members: `${members} Members`,
        online: `${online} Online`,
        admin: `${admin} Admin`
      });
      
      if (online === '0') {
        console.log('❌ STILL SHOWING 0 ONLINE - Fix may not have worked yet');
        console.log('💡 Try refreshing the page or waiting a moment for React to re-render');
      } else {
        console.log('✅ SUCCESS! Online count is now showing correctly:', online);
      }
    }
  } else {
    console.log('❌ Could not find member grid to test');
  }
  
  return statNumbers;
};

// Auto-test after page loads
setTimeout(() => {
  console.log('');
  window.debugPresenceIssue.testFix();
}, 3000);

// Add specific test to identify which component is causing the issue
window.debugPresenceIssue.identifyRenderingComponent = function() {
  console.log('🔍 [PresenceDebugger] Identifying which component is rendering SpaceInfoSidebar...');
  console.log('================================================');
  
  // Check current active tab
  const activeTab = document.querySelector('[role="tab"][aria-selected="true"]');
  if (activeTab) {
    console.log('📍 Active tab:', activeTab.textContent?.trim());
  }
  
  // Check for tab navigation
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
  console.log('🔖 Available tabs:', tabs.map(tab => tab.textContent?.trim()));
  
  // Check URL path to understand routing
  const path = window.location.pathname;
  console.log('🛣️ Current path:', path);
  
  // Check if we're on about page or feed page
  const isAboutPage = path.includes('/about') || document.querySelector('[data-testid*="about"]') || document.querySelector('.space-about-display');
  const isFeedPage = path.includes('/space') && !path.includes('/about');
  
  console.log('📄 Page detection:', {
    isAboutPage,
    isFeedPage,
    defaultSpace: path.includes('/space') && !path.includes('/about')
  });
  
  // Try to detect which component is active by looking for distinctive elements
  const feedElements = document.querySelectorAll('[class*="feed"], .post-card, [data-testid*="feed"]');
  const aboutElements = document.querySelectorAll('[class*="about"], .media-gallery, [data-testid*="about"]');
  
  console.log('🔍 Component detection:', {
    feedElementsFound: feedElements.length,
    aboutElementsFound: aboutElements.length
  });
  
  // Look for specific component markers in React DevTools if available
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('⚛️ React DevTools available - checking for component names...');
    
    // Try to find component names in the DOM
    const allElements = document.querySelectorAll('*');
    const reactElements = Array.from(allElements).filter(el => {
      const keys = Object.keys(el);
      return keys.some(key => key.startsWith('__reactInternalInstance') || key.startsWith('__reactFiber'));
    });
    
    console.log('⚛️ React elements found:', reactElements.length);
  }
  
  return {
    activeTab: activeTab?.textContent?.trim(),
    isAboutPage,
    isFeedPage,
    feedElementsFound: feedElements.length,
    aboutElementsFound: aboutElements.length
  };
};

// Auto-run component identification
setTimeout(() => {
  console.log('');
  const componentInfo = window.debugPresenceIssue.identifyRenderingComponent();
  console.log('');
  console.log('🎯 [PresenceDebugger] COMPONENT IDENTIFICATION RESULT:');
  console.log('================================================');
  
  if (componentInfo.isFeedPage && componentInfo.activeTab === 'All') {
    console.log('📋 DIAGNOSIS: You are on the FEED TAB');
    console.log('💡 The issue is likely in FeedTab.tsx, not AboutTab.tsx');
    console.log('🔧 Next step: Check FeedTab.tsx SpaceInfoSidebar props');
  } else if (componentInfo.isAboutPage) {
    console.log('📋 DIAGNOSIS: You are on the ABOUT TAB/PAGE');
    console.log('💡 The issue is likely in AboutTab.tsx or SpaceAboutDisplay.tsx');
    console.log('🔧 Next step: Check AboutTab.tsx SpaceInfoSidebar props');
  } else {
    console.log('📋 DIAGNOSIS: Unable to determine exact component');
    console.log('💡 Active tab:', componentInfo.activeTab);
    console.log('🔧 Next step: Check all SpaceInfoSidebar usages');
  }
  
  // Specific recommendation based on findings
  if (componentInfo.feedElementsFound > componentInfo.aboutElementsFound) {
    console.log('');
    console.log('🎯 SPECIFIC FIX NEEDED: FeedTab.tsx');
    console.log('The FeedTab component is likely the one rendering SpaceInfoSidebar');
    console.log('Check if FeedTab is passing onlineCount prop or has hook issues');
  }
}, 4000); 