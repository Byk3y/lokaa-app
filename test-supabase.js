// Simple script to test Supabase connection
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Replace with your actual project URL and anon key (public key)
const supabaseUrl = 'https://lokaa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbnZ1c2Jtcmh3Y254cHltb2poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTQ0MzEwMDcsImV4cCI6MjAyOTc4OTQwN30.8mVAi40mG3eClXlGn3EMYQSaC_pjg0-Sm4c-GmcvG_Y';

// Initialize the Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Management API token (your latest access token)
const managementToken = 'sbp_a64cee358a673d20ad5b8d70a5bc023502e6a458';

async function testConnection() {
  try {
    console.log('Testing Supabase connection to your project database...');
    
    // Test a simple query to your spaces table
    const { data, error } = await supabase
      .from('spaces')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase query failed:', error.message);
    } else {
      console.log('✅ Supabase connection to database successful!');
      console.log('Data retrieved:', data);
    }
    
    // Test management API with access token
    console.log('\nTesting management API with the latest access token...');
    try {
      const response = await fetch('https://api.supabase.com/v1/projects', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${managementToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const apiData = await response.json();
      if (response.ok) {
        console.log('✅ Management API connection successful!');
        console.log('Projects:', apiData.map(p => p.name || p.id).join(', '));
    } else {
        console.log('❌ Management API connection failed:', apiData.message || apiData.error || 'Unknown error');
        console.log('Full response:', JSON.stringify(apiData, null, 2));
      }
    } catch (apiError) {
      console.error('Error connecting to management API:', apiError.message);
    }
  } catch (error) {
    console.error('Error testing Supabase connection:', error.message);
  }
}

testConnection(); 