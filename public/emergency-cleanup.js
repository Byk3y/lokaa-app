
// Emergency storage cleanup for auth issues
window.emergencyCleanup = function() {
  console.log('🧹 Running emergency storage cleanup...');
  
  // Clear auth-related storage
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('sb-') || key.includes('auth') || key.includes('supabase'))) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log('🗑️ Removed:', key);
  });
  
  // Clear session storage
  sessionStorage.removeItem('userWantsDiscover');
  sessionStorage.removeItem('lastRedirectAttempt');
  
  console.log('✅ Emergency cleanup completed. Refreshing page...');
  window.location.reload();
};

console.log('🆘 Emergency cleanup available: window.emergencyCleanup()');
