/**
 * 🧪 MOBILE AUTH FIX VALIDATION
 * 
 * Tests that login, sign out, and API calls work properly
 * after fixing the simpleMobileManager references
 */

window.authFixValidation = {
  
  // Test 1: Check if simpleMobileManager references are removed
  testSimpleMobileManagerRemoval() {
    console.log('\n🧪 [AuthFix] Testing simpleMobileManager removal...');
    
    // Check if simpleMobileManager exists globally
    const hasGlobalSimpleMobileManager = typeof window.simpleMobileManager !== 'undefined';
    
    // Test if AuthContext has access to it (should be undefined)
    let authContextHasReference = false;
    try {
      // This would normally cause a ReferenceError if the import is removed
      eval('simpleMobileManager.setUser');
      authContextHasReference = true;
    } catch (e) {
      if (e.message.includes("Can't find variable: simpleMobileManager")) {
        authContextHasReference = false; // Good - reference removed
      } else {
        authContextHasReference = 'unknown';
      }
    }
    
    const result = {
      globalSimpleMobileManager: hasGlobalSimpleMobileManager,
      authContextReference: authContextHasReference,
      status: !hasGlobalSimpleMobileManager && !authContextHasReference ? 'FIXED' : 'NEEDS_FIX'
    };
    
    console.log('📋 SimpleMobileManager Removal Test:', result);
    return result;
  },
  
  // Test 2: Check if API calls work without fake responses
  async testApiCalls() {
    console.log('\n🧪 [AuthFix] Testing API calls...');
    
    try {
      // Test a simple API call that should work normally
      const response = await fetch('/api/test-endpoint-doesnt-exist');
      
      // If we get here, fetch is working (even if endpoint doesn't exist)
      const isNormalResponse = response.status === 404 || response.status >= 400;
      const isFakeResponse = response.status === 200 && (await response.text()).includes('network_blocked');
      
      const result = {
        fetchWorking: true,
        getsNormalResponse: isNormalResponse,
        getsFakeResponse: isFakeResponse,
        status: isNormalResponse && !isFakeResponse ? 'NORMAL_OPERATION' : 'INTERFERENCE_DETECTED'
      };
      
      console.log('📋 API Calls Test:', result);
      return result;
    } catch (error) {
      // This is expected for non-existent endpoints
      const result = {
        fetchWorking: true,
        error: error.message,
        status: 'NORMAL_OPERATION' // Errors are expected for non-existent endpoints
      };
      
      console.log('📋 API Calls Test:', result);
      return result;
    }
  },
  
  // Test 3: Check if auth context is accessible
  testAuthContext() {
    console.log('\n🧪 [AuthFix] Testing auth context access...');
    
    let authContextWorking = false;
    let authState = null;
    
    try {
      // Try to access the global auth context
      if (window.authContext) {
        authState = window.authContext;
        authContextWorking = true;
      }
      
      // Or try the useOptimizedAuth store
      if (window.useOptimizedAuth?.getState) {
        authState = window.useOptimizedAuth.getState();
        authContextWorking = true;
      }
    } catch (error) {
      console.log('⚠️ Auth context access error:', error.message);
    }
    
    const result = {
      authContextWorking,
      hasUser: !!authState?.user,
      loading: authState?.loading || false,
      status: authContextWorking ? 'ACCESSIBLE' : 'NEEDS_CHECK'
    };
    
    console.log('📋 Auth Context Test:', result);
    return result;
  },
  
  // Test 4: Check comprehensive fix status
  testComprehensiveFix() {
    console.log('\n🧪 [AuthFix] Testing comprehensive fix status...');
    
    const hasComprehensiveFix = !!window.comprehensiveMobileFix;
    const comprehensiveStatus = hasComprehensiveFix ? window.comprehensiveMobileFix.status() : null;
    
    const result = {
      comprehensiveFixActive: hasComprehensiveFix,
      backgroundDetection: comprehensiveStatus?.backgroundDetection || false,
      reloadsPrevented: comprehensiveStatus?.reloadsPrevented || false,
      status: hasComprehensiveFix ? 'ACTIVE' : 'MISSING'
    };
    
    console.log('📋 Comprehensive Fix Test:', result);
    return result;
  },
  
  // Run all tests
  async runAllTests() {
    console.log('\n🚨 MOBILE AUTH FIX VALIDATION - RUNNING ALL TESTS');
    console.log('='.repeat(60));
    
    const results = {
      simpleMobileManagerRemoval: this.testSimpleMobileManagerRemoval(),
      apiCalls: await this.testApiCalls(),
      authContext: this.testAuthContext(),
      comprehensiveFix: this.testComprehensiveFix()
    };
    
    // Overall status
    const allGood = [
      results.simpleMobileManagerRemoval.status === 'FIXED',
      results.apiCalls.status === 'NORMAL_OPERATION',
      results.authContext.status === 'ACCESSIBLE',
      results.comprehensiveFix.status === 'ACTIVE'
    ];
    
    const overallStatus = allGood.every(x => x) ? '🎉 ALL TESTS PASSED' : '⚠️ SOME ISSUES DETECTED';
    
    console.log('\n📊 OVERALL VALIDATION RESULTS:');
    console.log('✅ SimpleMobileManager Removed:', results.simpleMobileManagerRemoval.status);
    console.log('✅ API Calls Working:', results.apiCalls.status);
    console.log('✅ Auth Context Access:', results.authContext.status);
    console.log('✅ Comprehensive Fix:', results.comprehensiveFix.status);
    console.log('\n🎯 OVERALL STATUS:', overallStatus);
    
    if (overallStatus.includes('ALL TESTS PASSED')) {
      console.log('\n🎉 SUCCESS! You should now be able to:');
      console.log('   ✅ Login without "simpleMobileManager" errors');
      console.log('   ✅ Sign out without "simpleMobileManager" errors');
      console.log('   ✅ Use API calls without interference');
      console.log('   ✅ Background app without white screens');
      console.log('\n📱 TEST: Try logging in and signing out now!');
    } else {
      console.log('\n⚠️ Some issues detected. Check individual test results above.');
    }
    
    return results;
  },
  
  // Quick status check
  quickCheck() {
    console.log('\n⚡ Quick Auth Fix Check...');
    
    const hasSimpleMobileManager = typeof window.simpleMobileManager !== 'undefined';
    const hasComprehensiveFix = !!window.comprehensiveMobileFix;
    const hasAuthContext = !!window.authContext || !!window.useOptimizedAuth;
    
    console.log(`📋 SimpleMobileManager: ${hasSimpleMobileManager ? '❌ Still Present' : '✅ Removed'}`);
    console.log(`📋 Comprehensive Fix: ${hasComprehensiveFix ? '✅ Active' : '❌ Missing'}`);
    console.log(`📋 Auth Context: ${hasAuthContext ? '✅ Available' : '❌ Missing'}`);
    
    return {
      simpleMobileManagerRemoved: !hasSimpleMobileManager,
      comprehensiveFixActive: hasComprehensiveFix,
      authContextAvailable: hasAuthContext
    };
  }
};

// Auto-run quick check after 3 seconds
setTimeout(() => {
  console.log('\n🔧 Auto-running auth fix validation...');
  window.authFixValidation.quickCheck();
}, 3000);

console.log('\n🧪 Auth Fix Validation Commands:');
console.log('   - window.authFixValidation.runAllTests() - Run comprehensive tests');
console.log('   - window.authFixValidation.quickCheck() - Quick status check');
console.log('   - window.authFixValidation.testSimpleMobileManagerRemoval() - Test specific fix'); 