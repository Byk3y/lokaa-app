// Test Supabase client after page reload
console.log('🔧 Testing Supabase client after page reload...');

const testSupabaseAfterReload = async () => {
  try {
    console.log('🔍 Checking Supabase client status...');
    
    // Check if client exists
    if (!window.supabase) {
      console.error('❌ window.supabase not found!');
      return;
    }
    
    console.log('✅ Supabase client exists');
    
    // Check service worker status
    console.log('🔍 Service worker status:');
    console.log('- Controller:', navigator.serviceWorker.controller);
    console.log('- Registrations:', await navigator.serviceWorker.getRegistrations());
    
    // Test auth session
    console.log('🔍 Testing auth session...');
    
    const sessionPromise = window.supabase.auth.getSession();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Session timeout')), 3000);
    });
    
    try {
      const sessionResult = await Promise.race([sessionPromise, timeoutPromise]);
      console.log('✅ Auth session working:', {
        hasSession: !!sessionResult.data?.session,
        user: sessionResult.data?.session?.user?.email,
        error: sessionResult.error
      });
      
      // Test simple database query
      console.log('🔍 Testing simple database query...');
      
      const queryPromise = window.supabase
        .from('spaces')
        .select('id, name, subdomain')
        .eq('subdomain', 'nocode-architects')
        .single();
        
      const queryTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), 5000);
      });
      
      try {
        const queryResult = await Promise.race([queryPromise, queryTimeoutPromise]);
        console.log('🎉 Database query working:', queryResult);
        
        if (queryResult.data) {
          console.log('✅ SUCCESS! Supabase is working properly');
          console.log('💡 The timeouts in your app might be due to component-level issues');
        }
        
      } catch (queryError) {
        console.error('❌ Database query failed:', queryError.message);
        
        // Check network tab
        console.log('🔍 Check Network tab for failed requests to:');
        console.log('- https://nmddvthcsyppyjncqfsk.supabase.co/rest/v1/');
        console.log('- Look for 500 errors, CORS issues, or blocked requests');
      }
      
    } catch (authError) {
      console.error('❌ Auth session failed:', authError.message);
      console.log('💡 Auth system is still not working - deeper issue exists');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

testSupabaseAfterReload(); 