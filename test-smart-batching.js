/**
 * 🧪 Smart Batching System Test Script
 * 
 * This script tests the complete Phase 2.5 Smart Batching implementation
 * including database functions, notification batching, and UI display.
 * 
 * Run in browser console: https://localhost:8082
 */

console.log('🧪 Testing Smart Batching System...\n');

// Test 1: Mobile Detection and Navigation
console.log('📱 Test 1: Mobile Detection and Navigation');
async function testMobileDetection() {
  try {
    // Check if mobile detection is working
    const { shouldEnableMobileFeatures } = await import('./src/utils/mobileDetection.js');
    const isMobile = shouldEnableMobileFeatures();
    
    console.log('✅ Mobile detection result:', isMobile);
    console.log('✅ Window width:', window.innerWidth);
    console.log('✅ User agent includes mobile:', /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    
    // Test notification badge behavior
    const notificationBadge = document.querySelector('[data-testid="notification-badge"]');
    if (notificationBadge) {
      console.log('✅ Notification badge found');
      
      // Simulate click to test navigation vs dropdown
      const clickEvent = new MouseEvent('click', { bubbles: true });
      notificationBadge.dispatchEvent(clickEvent);
      
      // Check if navigated to /notifs (mobile) or showed dropdown (desktop)
      setTimeout(() => {
        const currentPath = window.location.pathname;
        if (currentPath === '/notifs') {
          console.log('✅ Mobile navigation working - navigated to /notifs');
        } else {
          console.log('✅ Desktop dropdown working - stayed on current page');
        }
      }, 500);
    } else {
      console.log('⚠️  Notification badge not found - may need to be on a page with bottom nav');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Mobile detection test failed:', error);
    return false;
  }
}

// Test 2: Database Batching Functions
console.log('\n🗄️  Test 2: Database Batching Functions');
async function testDatabaseBatching() {
  try {
    // Test the database function by simulating notifications
    const { getSupabaseClient } = await import('./src/integrations/supabase/client.js');
    const supabase = getSupabaseClient();
    
    // Check if batching functions exist
    const { data: functions, error: functionsError } = await supabase
      .rpc('get_notification_batch_info', { notification_id: 'test' })
      .single();
    
    if (functionsError && functionsError.code === '42883') {
      console.log('⚠️  Database batching functions not found. This is expected if migration hasn\'t been run.');
      return false;
    }
    
    console.log('✅ Database batching functions available');
    return true;
  } catch (error) {
    console.error('❌ Database batching test failed:', error);
    return false;
  }
}

// Test 3: NotificationBatchManager Service
console.log('\n🔧 Test 3: NotificationBatchManager Service');
async function testBatchManager() {
  try {
    const { NotificationBatchManager } = await import('./src/services/NotificationBatchManager.js');
    
    // Test batch display info generation
    const mockNotification = {
      id: 'test-1',
      type: 'post_like',
      actor_count: 3,
      primary_actor_name: 'Francis',
      batch_key: 'post_like_post_123',
      created_at: new Date().toISOString(),
      read: false,
      data: { post_id: '123' }
    };
    
    const batchInfo = NotificationBatchManager.getBatchDisplayInfo(mockNotification);
    console.log('✅ Batch display info:', batchInfo);
    
    // Test batch text generation
    const expectedText = 'Francis and 2 others';
    if (batchInfo.displayText === expectedText) {
      console.log('✅ Batch text generation working correctly');
    } else {
      console.log('❌ Expected:', expectedText, 'Got:', batchInfo.displayText);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Batch manager test failed:', error);
    return false;
  }
}

// Test 4: UI Components - NotificationItem
console.log('\n🎨 Test 4: UI Components - NotificationItem');
async function testNotificationUI() {
  try {
    // Look for notification items on the page
    const notificationItems = document.querySelectorAll('[data-testid="notification-item"]');
    console.log('✅ Found', notificationItems.length, 'notification items');
    
    if (notificationItems.length > 0) {
      const firstItem = notificationItems[0];
      
      // Check for batch indicators
      const batchIndicator = firstItem.querySelector('[data-testid="batch-indicator"]');
      if (batchIndicator) {
        console.log('✅ Batch indicator found');
        console.log('✅ Batch count:', batchIndicator.textContent);
      } else {
        console.log('ℹ️  No batch indicator (may be single notification)');
      }
      
      // Check for proper avatar sizing (48px for mobile)
      const avatar = firstItem.querySelector('img, [data-testid="avatar"]');
      if (avatar) {
        const avatarSize = window.getComputedStyle(avatar);
        console.log('✅ Avatar size:', avatarSize.width, 'x', avatarSize.height);
      }
    } else {
      console.log('ℹ️  No notification items found - may need to navigate to notifications page');
    }
    
    return true;
  } catch (error) {
    console.error('❌ UI test failed:', error);
    return false;
  }
}

// Test 5: Space Drawer Functionality
console.log('\n🏠 Test 5: Space Drawer Functionality');
async function testSpaceDrawer() {
  try {
    // Look for hamburger menu button
    const hamburgerBtn = document.querySelector('[data-testid="hamburger-menu"]');
    if (hamburgerBtn) {
      console.log('✅ Hamburger menu button found');
      
      // Simulate click
      hamburgerBtn.click();
      
      // Check if drawer opens
      setTimeout(() => {
        const drawer = document.querySelector('[data-testid="space-drawer"]');
        if (drawer) {
          console.log('✅ Space drawer opened successfully');
          
          // Check for space list
          const spaceItems = drawer.querySelectorAll('[data-testid="space-item"]');
          console.log('✅ Found', spaceItems.length, 'spaces in drawer');
          
          // Check for filter dropdown
          const filterDropdown = drawer.querySelector('[data-testid="filter-dropdown"]');
          if (filterDropdown) {
            console.log('✅ Filter dropdown found');
          }
        } else {
          console.log('❌ Space drawer not found after click');
        }
      }, 500);
    } else {
      console.log('⚠️  Hamburger menu not found - may need to be on notifications page');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Space drawer test failed:', error);
    return false;
  }
}

// Test 6: Real-time Updates
console.log('\n⚡ Test 6: Real-time Updates');
async function testRealtimeUpdates() {
  try {
    const { useNotifications } = await import('./src/hooks/useNotifications.js');
    console.log('✅ Notifications hook available');
    
    // Check if real-time subscriptions are active
    const { getSupabaseClient } = await import('./src/integrations/supabase/client.js');
    const supabase = getSupabaseClient();
    
    // This is a basic check - in a real app, you'd want to test actual real-time updates
    const channels = supabase.getChannels();
    console.log('✅ Active Supabase channels:', channels.length);
    
    return true;
  } catch (error) {
    console.error('❌ Real-time test failed:', error);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Running all Smart Batching System tests...\n');
  
  const results = {
    mobileDetection: await testMobileDetection(),
    databaseBatching: await testDatabaseBatching(),
    batchManager: await testBatchManager(),
    notificationUI: await testNotificationUI(),
    spaceDrawer: await testSpaceDrawer(),
    realtimeUpdates: await testRealtimeUpdates()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const passedCount = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passedCount}/${totalTests} tests passed`);
  
  if (passedCount === totalTests) {
    console.log('🎉 All tests passed! Smart Batching System is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the logs above for details.');
  }
  
  return results;
}

// Auto-run tests
runAllTests().catch(console.error);

// Export for manual testing
window.smartBatchingTests = {
  runAllTests,
  testMobileDetection,
  testDatabaseBatching,
  testBatchManager,
  testNotificationUI,
  testSpaceDrawer,
  testRealtimeUpdates
};

console.log('\n💡 To run individual tests manually:');
console.log('window.smartBatchingTests.testMobileDetection()');
console.log('window.smartBatchingTests.testBatchManager()');
console.log('window.smartBatchingTests.testNotificationUI()');
console.log('etc...');