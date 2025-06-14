#!/usr/bin/env node

/**
 * Avatar Debug Utility
 * 
 * Add this to browser console to debug avatar loading issues
 */

console.log(`
🔍 Avatar Debug Utility
Copy and paste this in your browser console to debug avatar issues:

window.debugAvatars = function() {
  const authContext = window.React?.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?.ReactCurrentOwner?.current?._owner;
  
  console.log('🔍 Avatar Debug Report:');
  console.log('='.repeat(50));
  
  // Check if useOptimizedAuth is available
  console.log('1. Auth Context Check:');
  if (typeof window.getAuthState === 'function') {
    const auth = window.getAuthState();
    console.log('   ✅ Auth state available');
    console.log('   User:', auth.user?.email);
    console.log('   User metadata avatar:', auth.user?.user_metadata?.avatar_url);
    console.log('   UserDetails avatar:', auth.userDetails?.avatar_url);
    console.log('   Loading:', auth.loading);
  } else {
    console.log('   ❌ Auth state not available in window');
  }
  
  console.log('\\n2. Avatar Components Check:');
  
  // Check ProfileDropdown
  const profileDropdown = document.querySelector('[data-testid="profile-dropdown"], .avatar img, avatar img');
  if (profileDropdown) {
    console.log('   ✅ Avatar component found');
    console.log('   Src:', profileDropdown.src || 'No src attribute');
  } else {
    console.log('   ❌ No avatar components found');
  }
  
  console.log('\\n3. Network Requests:');
  console.log('   Check Network tab for avatar URL requests');
  console.log('   Look for 404s or CORS errors');
  
  console.log('\\n4. Fallback Chain Test:');
  console.log('   Expected order: user.user_metadata.avatar_url → userDetails.avatar_url → empty string');
  
  return 'Debug complete. Check logs above.';
};

// Auto-expose auth state for debugging
window.getAuthState = function() {
  // This needs to be implemented in AuthContext
  return window.__AUTH_DEBUG_STATE__ || { message: 'Auth debug state not available' };
};

console.log('✅ Avatar debug utility loaded. Run window.debugAvatars() to start debugging.');
`);

if (typeof window !== 'undefined') {
  window.debugAvatars = function() {
    console.log('🔍 Avatar Debug Report:');
    console.log('='.repeat(50));
    
    console.log('1. Auth Context Check:');
    if (typeof window.getAuthState === 'function') {
      const auth = window.getAuthState();
      console.log('   ✅ Auth state available');
      console.log('   User:', auth.user?.email);
      console.log('   User metadata avatar:', auth.user?.user_metadata?.avatar_url);
      console.log('   UserDetails avatar:', auth.userDetails?.avatar_url);
      console.log('   Loading:', auth.loading);
    } else {
      console.log('   ❌ Auth state not available in window');
    }
    
    console.log('\n2. Avatar Components Check:');
    
    const profileDropdown = document.querySelector('[data-testid="profile-dropdown"], .avatar img, avatar img');
    if (profileDropdown) {
      console.log('   ✅ Avatar component found');
      console.log('   Src:', profileDropdown.src || 'No src attribute');
    } else {
      console.log('   ❌ No avatar components found');
    }
    
    console.log('\n3. Network Requests:');
    console.log('   Check Network tab for avatar URL requests');
    console.log('   Look for 404s or CORS errors');
    
    console.log('\n4. Fallback Chain Test:');
    console.log('   Expected order: user.user_metadata.avatar_url → userDetails.avatar_url → empty string');
    
    return 'Debug complete. Check logs above.';
  };
} 