// Simple script to test Supabase storage bucket access
import { createClient } from '@supabase/supabase-js';

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
      
      // List buckets to see what's available
      console.log('Listing all available buckets...');
      const { data: bucketsData, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error('Error listing buckets:', bucketsError);
      } else {
        console.log('Available buckets:', bucketsData);
        
        // Try to create the bucket if it doesn't exist
        if (!bucketsData.find(bucket => bucket.name === BUCKET_NAME)) {
          console.log('Attempting to create bucket:', BUCKET_NAME);
          const { data: createData, error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
            public: true, // Make the bucket public
            fileSizeLimit: 10485760 // 10MB
          });
          
          if (createError) {
            console.error('Error creating bucket:', createError);
          } else {
            console.log('Bucket created successfully:', createData);
          }
        } else {
          console.log('Bucket exists in the list but could not be accessed. This may be a permissions issue.');
        }
      }
    } else {
      console.log('Successfully accessed bucket:', bucketData);
      
      // Try to upload a test file to the bucket
      const testContent = 'Hello World! This is a test file.';
      const testFileName = `test-file-${Date.now()}.txt`;
      const testFilePath = `test/${testFileName}`;
      
      console.log('Attempting to upload test file to bucket...');
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(testFilePath, new Blob([testContent]), {
          contentType: 'text/plain',
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) {
        console.error('Error uploading test file:', uploadError);
      } else {
        console.log('Test file uploaded successfully:', uploadData);
        
        // Get the public URL for the uploaded file
        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(testFilePath);
        
        console.log('Test file public URL:', urlData.publicUrl);
        
        // Clean up - remove the test file
        console.log('Cleaning up - removing test file...');
        const { error: removeError } = await supabase.storage
          .from(BUCKET_NAME)
          .remove([testFilePath]);
        
        if (removeError) {
          console.error('Error removing test file:', removeError);
        } else {
          console.log('Test file removed successfully');
        }
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

// Run the test
testBucketAccess(); 