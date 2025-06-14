// Test direct network connectivity to Supabase
console.log('🌐 Testing direct network connectivity to Supabase...');

const testDirectNetwork = async () => {
  try {
    // Test 1: Basic connectivity to Supabase API
    console.log('🔍 Test 1: Basic connectivity to Supabase API...');
    
    const basicResponse = await fetch('https://nmddvthcsyppyjncqfsk.supabase.co/rest/v1/', {
      method: 'GET',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tZGR2dGhjc3lwcHlqbmNxZnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ0ODg4MTYsImV4cCI6MjA2MDA2NDgxNn0.NMzMDvaOD2vHfBfjRbuit05EIdi7QK9pC_ChzX3klG0',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Basic API response:', basicResponse.status, basicResponse.statusText);
    
    // Test 2: Auth endpoint specifically
    console.log('🔍 Test 2: Auth endpoint connectivity...');
    
    const authResponse = await fetch('https://nmddvthcsyppyjncqfsk.supabase.co/auth/v1/user', {
      method: 'GET',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tZGR2dGhjc3lwcHlqbmNxZnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ0ODg4MTYsImV4cCI6MjA2MDA2NDgxNn0.NMzMDvaOD2vHfBfjRbuit05EIdi7QK9pC_ChzX3klG0',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Auth endpoint response:', authResponse.status, authResponse.statusText);
    
    // Test 3: Simple database query
    console.log('🔍 Test 3: Direct database query...');
    
    const dbResponse = await fetch('https://nmddvthcsyppyjncqfsk.supabase.co/rest/v1/spaces?select=id,name,subdomain&subdomain=eq.nocode-architects&limit=1', {
      method: 'GET',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tZGR2dGhjc3lwcHlqbmNxZnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ0ODg4MTYsImV4cCI6MjA2MDA2NDgxNn0.NMzMDvaOD2vHfBfjRbuit05EIdi7QK9pC_ChzX3klG0',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    });
    
    console.log('✅ Database query response:', dbResponse.status, dbResponse.statusText);
    
    if (dbResponse.ok) {
      const data = await dbResponse.json();
      console.log('🎉 Database data:', data);
      
      if (data && data.length > 0) {
        console.log('🎉 SUCCESS! Direct network connectivity is working perfectly!');
        console.log('💡 The issue is with the Supabase client configuration, not network connectivity');
        
        // Test 4: Check localStorage for corrupted auth data
        console.log('🔍 Test 4: Checking localStorage for corrupted auth data...');
        
        const authKeys = Object.keys(localStorage).filter(key => key.includes('supabase'));
        console.log('📋 Supabase localStorage keys:', authKeys);
        
        authKeys.forEach(key => {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              const parsed = JSON.parse(value);
              console.log(`📋 ${key}:`, {
                hasAccessToken: !!parsed.access_token,
                hasRefreshToken: !!parsed.refresh_token,
                hasUser: !!parsed.user,
                expiresAt: parsed.expires_at ? new Date(parsed.expires_at * 1000).toISOString() : 'No expiry'
              });
            }
          } catch (e) {
            console.warn(`⚠️ Failed to parse ${key}:`, e);
          }
        });
        
        console.log('💡 SOLUTION: Try clearing localStorage and re-authenticating');
        console.log('💡 Run: localStorage.clear(); then reload and login again');
        
      } else {
        console.warn('⚠️ Database query returned empty results');
      }
    } else {
      console.error('❌ Database query failed');
    }
    
  } catch (error) {
    console.error('❌ Network test failed:', error);
    console.log('💡 This indicates a network-level issue:');
    console.log('- Check if you\'re behind a corporate firewall');
    console.log('- Check if browser extensions are blocking requests');
    console.log('- Try in incognito mode');
    console.log('- Check DNS settings');
  }
};

testDirectNetwork(); 