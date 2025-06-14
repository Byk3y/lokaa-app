// Test fresh Supabase client initialization
console.log('🔧 Testing fresh Supabase client initialization...');

const testFreshClient = async () => {
  try {
    console.log('🔍 Step 1: Testing existing client...');
    
    // Test existing client with timeout
    const existingClientTest = async () => {
      const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Existing client timeout')), 3000);
      });
      
      const sessionPromise = window.supabase.auth.getSession();
      return Promise.race([sessionPromise, timeout]);
    };
    
    try {
      const existingResult = await existingClientTest();
      console.log('✅ Existing client works:', existingResult);
    } catch (error) {
      console.error('❌ Existing client failed:', error.message);
    }
    
    console.log('🔍 Step 2: Creating fresh client...');
    
    // Import createClient dynamically to avoid module conflicts
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    
    const freshClient = createClient(
      'https://nmddvthcsyppyjncqfsk.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tZGR2dGhjc3lwcHlqbmNxZnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ0ODg4MTYsImV4cCI6MjA2MDA2NDgxNn0.NMzMDvaOD2vHfBfjRbuit05EIdi7QK9pC_ChzX3klG0',
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
          storage: window.localStorage,
          storageKey: 'supabase.auth.token.fresh', // Different key to avoid conflicts
          debug: false
        }
      }
    );
    
    console.log('✅ Fresh client created');
    
    console.log('🔍 Step 3: Testing fresh client auth...');
    
    const freshClientTest = async () => {
      const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Fresh client timeout')), 3000);
      });
      
      const sessionPromise = freshClient.auth.getSession();
      return Promise.race([sessionPromise, timeout]);
    };
    
    try {
      const freshResult = await freshClientTest();
      console.log('✅ Fresh client auth works:', freshResult);
      
      console.log('🔍 Step 4: Testing fresh client database query...');
      
      const queryResult = await freshClient
        .from('spaces')
        .select('id, name, subdomain')
        .eq('subdomain', 'nocode-architects')
        .single();
        
      console.log('✅ Fresh client database query works:', queryResult);
      
      if (queryResult.data) {
        console.log('🎉 SOLUTION FOUND: Fresh client works perfectly!');
        console.log('💡 The issue is with the existing client initialization');
        console.log('💡 Recommendation: Reinitialize the Supabase client');
        
        // Store fresh client for comparison
        window.freshSupabase = freshClient;
        console.log('🔧 Fresh client available as window.freshSupabase for testing');
      }
      
    } catch (freshError) {
      console.error('❌ Fresh client also failed:', freshError.message);
      console.log('💡 This indicates a deeper issue with Supabase client library');
    }
    
  } catch (error) {
    console.error('❌ Fresh client test failed:', error);
    console.log('💡 Could not create fresh client - library import issue');
  }
};

testFreshClient(); 