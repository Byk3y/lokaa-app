// Advanced Supabase storage test with auth diagnostics
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://nmddvthcsyppyjncqfsk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tZGR2dGhjc3lwcHlqbmNxZnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ0ODg4MTYsImV4cCI6MjA2MDA2NDgxNh0.NMzMDvaOD2vHfBfjRbuit05EIdi7QK9pC_ChzX3klG0";
const BUCKET_NAME = 'media';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function runAdvancedStorageTest() {
  console.log('Advanced Supabase Storage Diagnostic Test');
  console.log('=======================================\n');
  
  // 1. Check authentication status (anon vs authenticated)
  console.log('1. Checking authentication status...');
  const { data: sessionData } = await supabase.auth.getSession();
  const isAuthenticated = !!sessionData?.session?.user;
  console.log(`Authentication status: ${isAuthenticated ? 'AUTHENTICATED' : 'ANONYMOUS'}`);
  if (isAuthenticated) {
    console.log(`User ID: ${sessionData.session.user.id}`);
    console.log(`Email: ${sessionData.session.user.email}`);
  } else {
    console.log('Using anonymous access (many storage operations will be blocked)');
  }
  console.log('');
  
  // 2. Check available buckets
  console.log('2. Checking available buckets...');
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  if (bucketsError) {
    console.error('Error listing buckets:', bucketsError);
    console.log('This typically indicates a permissions issue. The user may not have storage.buckets read permission.');
  } else {
    console.log(`Found ${buckets.length} buckets:`);
    buckets.forEach(bucket => {
      console.log(`- ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
    });
    
    // Check if our target bucket exists
    const targetBucket = buckets.find(b => b.name === BUCKET_NAME);
    if (targetBucket) {
      console.log(`✅ Target bucket '${BUCKET_NAME}' exists and is ${targetBucket.public ? 'public' : 'private'}`);
    } else {
      console.log(`❌ Target bucket '${BUCKET_NAME}' NOT FOUND in the available buckets list`);
    }
  }
  console.log('');
  
  // 3. Try to get specific bucket info
  console.log(`3. Getting info for bucket '${BUCKET_NAME}'...`);
  const { data: bucketInfo, error: bucketError } = await supabase.storage.getBucket(BUCKET_NAME);
  if (bucketError) {
    console.error(`Error getting bucket info: ${bucketError.message} (${bucketError.status})`);
    console.log('This could be due to:');
    console.log('- The bucket doesn\'t exist (seems unlikely based on the UI screenshot)');
    console.log('- RLS policies prevent bucket access');
    console.log('- The authenticated user doesn\'t have permission to access this bucket');
  } else {
    console.log('Bucket info:', bucketInfo);
  }
  console.log('');
  
  // 4. Try a direct upload test
  console.log('4. Testing file upload to bucket...');
  const testContent = `Test content ${Date.now()}`;
  const testFilePath = `test-permission/test-${Date.now()}.txt`;
  
  // Testing upload
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(testFilePath, new Blob([testContent]), {
      contentType: 'text/plain',
      upsert: true
    });
  
  if (uploadError) {
    console.error(`Upload error: ${uploadError.message} (${uploadError.status})`);
    console.log('Likely causes:');
    console.log('- RLS policy issue: Check that there\'s an INSERT policy for authenticated users');
    console.log('- Bucket doesn\'t exist or is inaccessible');
    console.log('- Authentication issue (anonymous users blocked)');
  } else {
    console.log('✅ Upload successful:', uploadData);
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(testFilePath);
    console.log('File URL:', urlData.publicUrl);
    
    // Test file listing
    console.log('\nTesting file listing...');
    const { data: listData, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list('test-permission');
    
    if (listError) {
      console.error(`List error: ${listError.message}`);
    } else {
      console.log(`Found ${listData.length} files in test directory:`);
      listData.forEach(file => console.log(`- ${file.name}`));
    }
    
    // Clean up test file
    console.log('\nCleaning up test file...');
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([testFilePath]);
    
    if (deleteError) {
      console.error(`Delete error: ${deleteError.message}`);
      console.log('This suggests DELETE policy issues');
    } else {
      console.log('✅ Test file deletion successful');
    }
  }
  
  console.log('\n5. Diagnosing RLS policy issues...');
  console.log('Common issues:');
  console.log('- The RLS policy might be using a column that doesn\'t match the actual upload params');
  console.log('- There might be a typo in the bucket_id condition');
  console.log('- The policy might be applied incorrectly');
  console.log('- Check if the user is properly authenticated');
  
  console.log('\nRecommended fixes:');
  console.log('1. Verify RLS policies in Supabase dashboard');
  console.log('2. Try creating a simpler policy like:');
  console.log('   CREATE POLICY "Allow all storage access" ON storage.objects FOR ALL USING (bucket_id = \'media\');');
  console.log('3. Check if upsert: true is causing issues (try without it)');
  console.log('4. Ensure the user is properly authenticated');
}

// Run the test
runAdvancedStorageTest(); 