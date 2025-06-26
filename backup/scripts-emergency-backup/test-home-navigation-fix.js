/**
 * HOME NAVIGATION FIX TEST
 * 
 * Tests that clicking home button from chat navigates directly
 * to space without page refresh or multiple redirects
 */

window.homeNavigationFixTest = {
  
  /**
   * Test the home navigation fix
   */
  testHomeNavigation() {
    console.log('🏠 [HomeNavigationFixTest] Testing home navigation fix...');
    console.log('==========================================');
    
    // Check current route
    const currentRoute = window.location.pathname;
    console.log('📍 Current route:', currentRoute);
    
    // Check if space data is available
    this.checkSpaceDataAvailability();
    
    // Check if cached space data is available
    this.checkCachedSpaceData();
    
    // Test manual home click
    console.log('\n🧪 Manual test:');
    console.log('1. Navigate to /app/chat');
    console.log('2. Click the Home button in bottom nav');
    console.log('3. Expected: Direct navigation to space (no page refresh)');
    console.log('4. Watch console for navigation logs');
    
    // Monitor navigation
    this.startNavigationMonitoring();
  },
  
  /**
   * Check if space data is available in the store
   */
  checkSpaceDataAvailability() {
    console.log('\n📊 Space Data Availability:');
    
    // Try to access the space store
    try {
      // Check if React components have space data
      const spaceElements = document.querySelectorAll('[data-space-name], [data-subdomain]');
      if (spaceElements.length > 0) {
        console.log('✅ Space data found in DOM');
        spaceElements.forEach(el => {
          const spaceName = el.getAttribute('data-space-name');
          const subdomain = el.getAttribute('data-subdomain');
          if (spaceName) console.log('  - Space name:', spaceName);
          if (subdomain) console.log('  - Subdomain:', subdomain);
        });
      } else {
        console.log('⚠️ No space data found in DOM');
      }
    } catch (e) {
      console.log('❌ Error checking space data:', e.message);
    }
  },
  
  /**
   * Check cached space data in localStorage
   */
  checkCachedSpaceData() {
    console.log('\n💾 Cached Space Data:');
    
    try {
      const lastActiveSpace = localStorage.getItem('lastActiveSpace');
      if (lastActiveSpace) {
        const spaceData = JSON.parse(lastActiveSpace);
        console.log('✅ Cached space data found:', {
          name: spaceData.name,
          subdomain: spaceData.subdomain,
          timestamp: new Date(spaceData.timestamp).toLocaleString()
        });
      } else {
        console.log('⚠️ No cached space data found');
      }
    } catch (e) {
      console.log('❌ Error reading cached space data:', e.message);
    }
  },
  
  /**
   * Monitor navigation events
   */
  startNavigationMonitoring() {
    console.log('\n🔍 Starting navigation monitoring...');
    
    let navigationCount = 0;
    const startTime = Date.now();
    
    // Monitor console logs for navigation
    const originalLog = console.log;
    console.log = (...args) => {
      const message = args.join(' ');
      
      // Track navigation logs
      if (message.includes('[BottomNav] Navigating') || 
          message.includes('Route change') ||
          message.includes('NavigationAwareRealtime')) {
        navigationCount++;
        const timeSinceStart = Date.now() - startTime;
        console.warn(`🧭 NAVIGATION ${navigationCount} (${timeSinceStart}ms):`, message);
        
        // Check if it's a problematic navigation
        if (message.includes('→ /')) {
          console.error('🚨 PROBLEMATIC: Navigation to root detected!');
        }
        if (message.includes('→ /app →')) {
          console.error('🚨 PROBLEMATIC: Multiple redirects detected!');
        }
      }
      
      return originalLog.apply(console, args);
    };
    
    // Check for page refresh
    const originalReload = window.location.reload;
    window.location.reload = function() {
      console.error('🚨 PAGE REFRESH DETECTED!');
      return originalReload.apply(window.location, arguments);
    };
    
    // Stop monitoring after 30 seconds
    setTimeout(() => {
      console.log = originalLog;
      window.location.reload = originalReload;
      
      console.log('\n📊 Navigation Monitoring Results:');
      console.log(`Total navigations: ${navigationCount}`);
      if (navigationCount === 1) {
        console.log('✅ EXCELLENT: Single navigation (expected)');
      } else if (navigationCount > 1) {
        console.log('⚠️ WARNING: Multiple navigations detected');
      } else {
        console.log('ℹ️ No navigations detected during monitoring');
      }
    }, 30000);
  },
  
  /**
   * Test the home button click programmatically
   */
  testHomeButtonClick() {
    console.log('🏠 [HomeNavigationFixTest] Testing home button click...');
    
    // Find the home button
    const bottomNav = document.querySelector('.fixed.bottom-0');
    if (!bottomNav) {
      console.log('❌ Bottom navigation not found');
      return;
    }
    
    const homeButton = Array.from(bottomNav.querySelectorAll('button')).find(btn => 
      btn.textContent?.toLowerCase().includes('home') || 
      btn.querySelector('[data-lucide="home"]')
    );
    
    if (homeButton) {
      console.log('✅ Home button found, clicking...');
      const beforeRoute = window.location.pathname;
      homeButton.click();
      
      setTimeout(() => {
        const afterRoute = window.location.pathname;
        console.log('📍 Navigation result:', { before: beforeRoute, after: afterRoute });
        
        if (beforeRoute === afterRoute) {
          console.log('⚠️ No navigation occurred');
        } else if (afterRoute.includes('/space')) {
          console.log('✅ Successfully navigated to space');
        } else {
          console.log('❌ Unexpected navigation result');
        }
      }, 1000);
    } else {
      console.log('❌ Home button not found');
    }
  }
};

console.log(`
🏠 HOME NAVIGATION FIX TEST READY!

🧪 Available Commands:
• window.homeNavigationFixTest.testHomeNavigation() - Run complete test
• window.homeNavigationFixTest.testHomeButtonClick() - Test button click
• window.homeNavigationFixTest.checkSpaceDataAvailability() - Check space data
• window.homeNavigationFixTest.checkCachedSpaceData() - Check cached data

🎯 Expected Behavior:
• Home click should navigate directly to space
• No page refresh or multiple redirects
• Single navigation log: /app/chat → /space-name/space

🚨 Problem Indicators:
• Navigation to "/" (root)
• Multiple redirects (/ → /app → /space)
• Page refresh detection
• Full app reinitialization logs
`); 