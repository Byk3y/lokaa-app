/**
 * 🔍 WHITE SCREEN DIAGNOSTIC
 * 
 * Diagnoses why the app is showing white screen after cleanup
 */

(function() {
  console.log('\n🔍 WHITE SCREEN DIAGNOSTIC');
  console.log('========================');
  
  // 1. Check if React root is mounting
  const reactRoot = document.querySelector('#root');
  console.log('📱 React Root Element:', {
    exists: !!reactRoot,
    hasContent: reactRoot?.children?.length > 0,
    innerHTML: reactRoot?.innerHTML?.slice(0, 100) + '...'
  });
  
  // 2. Check for JavaScript errors
  const originalError = window.onerror;
  const errors = [];
  
  window.onerror = function(message, source, lineno, colno, error) {
    errors.push({ message, source, lineno, colno, error });
    console.error('🚨 JavaScript Error:', { message, source, lineno, colno });
    if (originalError) originalError.apply(this, arguments);
  };
  
  // 3. Check if main.tsx is loading
  console.log('📦 Script Loading Status:', {
    mainScript: !!document.querySelector('script[src*="main.tsx"]'),
    emergencyScript: !!document.querySelector('script[src*="emergency-disable"]'),
    totalScripts: document.querySelectorAll('script').length
  });
  
  // 4. Check if Vite is working
  if (window.__vite_is_modern_browser) {
    console.log('✅ Vite detected - modern browser support');
  } else {
    console.log('⚠️ Vite not detected or browser compatibility issue');
  }
  
  // 5. Check for common React issues
  setTimeout(() => {
    console.log('\n📊 5-SECOND CHECK:');
    console.log('==================');
    
    // Check if React has mounted
    const hasReactContent = reactRoot?.children?.length > 0;
    console.log('React mounted:', hasReactContent);
    
    // Check for errors collected
    console.log('Errors collected:', errors.length);
    if (errors.length > 0) {
      console.log('🚨 Errors found:', errors);
    }
    
    // Check for auth context
    const hasAuthProvider = document.querySelector('[data-testid*="auth"]') || 
                           reactRoot?.innerHTML?.includes('auth') ||
                           reactRoot?.innerHTML?.includes('Auth');
    console.log('Auth context likely present:', hasAuthProvider);
    
    // Check for router
    const hasRouter = reactRoot?.innerHTML?.includes('router') ||
                     reactRoot?.innerHTML?.includes('Router') ||
                     window.location.pathname !== '/';
    console.log('Router likely present:', hasRouter);
    
    // Provide diagnosis
    if (!hasReactContent) {
      console.log('\n🎯 DIAGNOSIS: React not mounting');
      console.log('💡 LIKELY CAUSES:');
      console.log('  1. JavaScript errors preventing React from starting');
      console.log('  2. Emergency cleanup script interfering with React');
      console.log('  3. Missing essential dependencies');
      console.log('  4. Browser compatibility issues');
      
      console.log('\n🔧 QUICK FIXES TO TRY:');
      console.log('  1. window.fixWhiteScreen() - Disable emergency script');
      console.log('  2. Check browser console for red errors');
      console.log('  3. Hard refresh (Cmd+Shift+R)');
      console.log('  4. Check if auth token is valid');
    } else {
      console.log('\n✅ DIAGNOSIS: React appears to be working');
      console.log('The white screen might be a loading state or auth issue');
    }
  }, 5000);
  
  // 6. Provide quick fix function
  window.fixWhiteScreen = function() {
    console.log('\n🛠️ ATTEMPTING WHITE SCREEN FIX...');
    
    // Check if emergency script is interfering
    if (window.emergencyMobileCleanup) {
      console.log('🔄 Disabling emergency cleanup...');
      window.emergencyMobileCleanup = null;
    }
    
    // Clear any stored errors
    window.onerror = originalError;
    
    // Force React re-mount if needed
    if (reactRoot && reactRoot.children.length === 0) {
      console.log('🔄 Attempting to trigger React mount...');
      // This would normally be handled by the main.tsx, but we can try to force it
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);
    }
    
    console.log('✅ Fix attempted. If still white, check browser console for errors.');
  };
  
  // 7. Auto-fix if obvious issue detected
  setTimeout(() => {
    if (reactRoot?.children?.length === 0 && errors.length === 0) {
      console.log('🤖 Auto-attempting white screen fix...');
      window.fixWhiteScreen();
    }
  }, 3000);
  
  console.log('✅ White screen diagnostic loaded. Use window.fixWhiteScreen() if needed.');
  
})(); 