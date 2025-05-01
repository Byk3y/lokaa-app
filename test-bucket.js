// Simple script to test Supabase storage bucket access
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://nmddvthcsyppyjncqfsk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tZGR2dGhjc3lwcHlqbmNxZnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ0ODg4MTYsImV4cCI6MjA2MDA2NDgxNn0.NMzMDvaOD2vHfBfjRbuit05EIdi7QK9pC_ChzX3klG0";
const BUCKET_NAME = 'media';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function testBucketAccess() {
  console.log('Testing access to Supabase storage bucket:', BUCKET_NAME);
  
  try {
    // Try to get bucket info
    console.log('Attempting to get bucket info...');
    const { data: bucketData, error: bucketError } = await supabase.storage.getBucket(BUCKET_NAME);
    
    console.log('Bucket info result:', { data: bucketData, error: bucketError });
    
    if (bucketError) {
      console.error('Error accessing bucket:', bucketError);
    } else {
      console.log('Successfully accessed bucket:', bucketData);
      
      // List buckets to confirm what's available
      console.log('Listing all available buckets...');
      const { data: bucketsData, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error('Error listing buckets:', bucketsError);
      } else {
        console.log('Available buckets:', bucketsData);
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testBucketAccess(); 