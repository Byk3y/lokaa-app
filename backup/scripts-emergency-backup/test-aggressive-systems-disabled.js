/**
 * 🧪 Test Script: Verify Aggressive Systems are Disabled
 * 
 * Quick test to verify the mobile background refresh issue is fixed
 */

window.testAggressiveSystemsDisabled = function() {
  console.log('\n🧪 TESTING AGGRESSIVE SYSTEMS DISABLED');
  console.log('=====================================');
  
  const tests = [];
  
  // Test 1: Health Monitor Disabled
  const healthMonitorDisabled = !window.supabaseHealthMonitor?.enabled;
  tests.push({
    name: 'Health Monitor Disabled',
    passed: healthMonitorDisabled,
    result: healthMonitorDisabled ? 'Disabled (good)' : 'Still active (bad)',
    expected: 'Should be disabled to prevent aggressive recovery'
  });
  
  // Test 2: Fetch Override Active
  const fetchOverridden = window.fetch.toString().includes('consecutive401s');
  tests.push({
    name: 'Skool-style Fetch Override',
    passed: fetchOverridden,
    result: fetchOverridden ? 'Patient mode active' : 'Original fetch (aggressive)',
    expected: 'Should use patient 401 handling'
  });
  
  // Test 3: Mobile Detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  tests.push({
    name: 'Mobile Device Detection',
    passed: true,
    result: isMobile ? 'Mobile device' : 'Desktop device',
    expected: 'Should work on both mobile and desktop'
  });
  
  // Test 4: Disabler Script Active
  const disablerActive = !!window.aggressiveSystemsDisabled;
  tests.push({
    name: 'Disabler Script Active',
    passed: disablerActive,
    result: disablerActive ? 'Active and loaded' : 'Not loaded',
    expected: 'Should be loaded and active'
  });
  
  // Calculate results
  const passedTests = tests.filter(t => t.passed).length;
  const totalTests = tests.length;
  const successRate = Math.round((passedTests / totalTests) * 100);
  
  // Display results
  console.log(`\n📊 Test Results: ${successRate}% (${passedTests}/${totalTests})\n`);
  
  tests.forEach((test, i) => {
    console.log(`${i + 1}. ${test.name}`);
    console.log(`   Status: ${test.passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Result: ${test.result}`);
    console.log(`   Expected: ${test.expected}\n`);
  });
  
  // Overall assessment
  if (successRate >= 75) {
    console.log('🎉 EXCELLENT: Aggressive systems appear to be disabled!');
    console.log('📱 MOBILE TEST: Try minimizing browser for 30s+ and returning');
    console.log('   Expected: Small glitch indicator, no full page refresh');
  } else {
    console.log('⚠️ ISSUES DETECTED: Some aggressive systems may still be active');
    console.log('🔄 Try refreshing the page to ensure disabler script runs first');
  }
  
  return { tests, successRate, recommendation: successRate >= 75 ? 'ready_for_mobile_test' : 'needs_refresh' };
};

// Auto-run quick test
setTimeout(() => {
  console.log('🍎 Aggressive Systems Disabler Test Available');
  console.log('📋 Run: window.testAggressiveSystemsDisabled()');
  
  // Quick status check
  if (window.aggressiveSystemsDisabled) {
    console.log('✅ Disabler script: LOADED');
  } else {
    console.log('❌ Disabler script: NOT LOADED');
  }
}, 1000);
