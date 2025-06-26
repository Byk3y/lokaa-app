/**
 * 🔍 DEBUG: Mobile Systems Status Checker
 * 
 * Checks which mobile systems are still active and identifies conflicts
 */

console.log('🔍 [Debug] Checking mobile systems status...');

window.debugMobileSystems = {
  
  checkActiveSystem() {
    console.log('\n🔍 [Debug] Active Mobile Systems Check:');
    console.log('=====================================');
    
    const systems = [
      'simpleMobileManager',
      'mobileSessionManager', 
      'mobileLifecycle',
      'healthMonitor',
      'phase1Recovery',
      'globalErrorInterceptor',
      'hmrAutoRecovery'
    ];
    
    const activeSystems = [];
    
    systems.forEach(system => {
      if (window[system]) {
        const isBlocked = window[system].__blocked || window[system].__comprehensiveFixOverride;
        const status = isBlocked ? '✅ BLOCKED' : '🚨 ACTIVE (CONFLICT!)';
        console.log(`${status} ${system}`);
        
        if (!isBlocked) {
          activeSystems.push(system);
        }
      } else {
        console.log(`⚪ NOT FOUND ${system}`);
      }
    });
    
    console.log(`\n📊 Summary: ${activeSystems.length} conflicting systems found`);
    
    if (activeSystems.length > 0) {
      console.log('🚨 CONFLICTS:', activeSystems);
      console.log('⚠️  These systems may cause white screen reloads!');
    } else {
      console.log('✅ No conflicts detected');
    }
    
    return activeSystems;
  },
  
  testReloadPrevention() {
    console.log('\n🛡️ [Debug] Testing reload prevention...');
    
    let reloadBlocked = true;
    
    try {
      // Test location.reload
      const originalReload = window.location.reload;
      window.location.reload();
      
      if (typeof originalReload === 'function') {
        console.log('🚨 location.reload NOT blocked!');
        reloadBlocked = false;
      }
    } catch (e) {
      console.log('✅ location.reload blocked');
    }
    
    // Test history methods
    try {
      window.history.go(0);
      console.log('🚨 history.go NOT blocked!');
      reloadBlocked = false;
    } catch (e) {
      console.log('✅ history.go blocked');
    }
    
    return reloadBlocked;
  },
  
  checkComprehensiveFix() {
    console.log('\n🛡️ [Debug] Comprehensive Fix Status:');
    console.log('===================================');
    
    const hasComprehensiveFix = !!window.comprehensiveMobileFix;
    const hasEmergencyKiller = !!window.emergencyMobileKiller;
    
    console.log(`Comprehensive Fix: ${hasComprehensiveFix ? '✅ Active' : '❌ Missing'}`);
    console.log(`Emergency Killer: ${hasEmergencyKiller ? '✅ Active' : '❌ Missing'}`);
    
    if (hasComprehensiveFix) {
      const status = window.comprehensiveMobileFix.status();
      console.log('Status:', status);
    }
    
    return { hasComprehensiveFix, hasEmergencyKiller };
  },
  
  runFullDiagnostic() {
    console.log('\n🧪 [Debug] FULL MOBILE SYSTEMS DIAGNOSTIC');
    console.log('==========================================');
    
    const conflicts = this.checkActiveSystem();
    const reloadBlocked = this.testReloadPrevention();
    const fixStatus = this.checkComprehensiveFix();
    
    console.log('\n📋 DIAGNOSTIC SUMMARY:');
    console.log(`Conflicting Systems: ${conflicts.length}`);
    console.log(`Reload Prevention: ${reloadBlocked ? 'Working' : 'FAILED'}`);
    console.log(`Comprehensive Fix: ${fixStatus.hasComprehensiveFix ? 'Active' : 'Missing'}`);
    
    if (conflicts.length === 0 && reloadBlocked && fixStatus.hasComprehensiveFix) {
      console.log('\n🎉 DIAGNOSIS: System should work correctly!');
      console.log('📱 Test by backgrounding app for 30+ seconds');
    } else {
      console.log('\n🚨 DIAGNOSIS: Issues detected - may still reload');
      console.log('💡 Try refreshing and check if conflicts persist');
    }
    
    return {
      conflicts: conflicts.length,
      reloadBlocked,
      hasComprehensiveFix: fixStatus.hasComprehensiveFix,
      diagnosis: conflicts.length === 0 && reloadBlocked && fixStatus.hasComprehensiveFix ? 'healthy' : 'issues'
    };
  }
};

// Auto-run diagnostic in 5 seconds
setTimeout(() => {
  console.log('\n🔧 Auto-running mobile systems diagnostic...');
  window.debugMobileSystems.runFullDiagnostic();
}, 5000);

console.log('🔧 Manual check: window.debugMobileSystems.runFullDiagnostic()'); 