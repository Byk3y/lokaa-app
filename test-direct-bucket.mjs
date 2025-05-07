import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://nmddvthcsyppyjncqfsk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tZGR2dGhjc3lwcHlqbmNxZnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ0ODg4MTYsImV4cCI6MjA2MDA2NDgxNn0.NMzMDvaOD2vHfBfjRbuit05EIdi7QK9pC_ChzX3klG0';
const supabase = createClient(supabaseUrl, supabaseKey);

// Test direct access to the avatars bucket
async function testDirectBucketAccess() {
  try {
    console.log('Testing direct access to avatars bucket...');
    
    // Try to list files in the avatars bucket root
    const { data: filesRoot, error: errorRoot } = await supabase.storage
      .from('avatars')
      .list();
    
    if (errorRoot) {
      console.error('Error listing files in avatars bucket root:', errorRoot);
    } else {
      console.log('Files in avatars bucket root:', filesRoot);
    }
    
    // Try to list files in the profiles folder
    const { data: filesProfiles, error: errorProfiles } = await supabase.storage
      .from('avatars')
      .list('profiles');
    
    if (errorProfiles) {
      console.error('Error listing files in profiles folder:', errorProfiles);
    } else {
      console.log('Files in profiles folder:', filesProfiles);
    }
    
    // Try to get the public URL of a test path
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl('test.txt');
    
    console.log('Public URL format:', publicUrl);
    
    // Try to create a folder for profiles
    const testProfilesFolderId = 'test-user-' + Date.now();
    console.log(`Creating test profiles folder for ID: ${testProfilesFolderId}`);
    
    const { data: createData, error: createError } = await supabase.storage
      .from('avatars')
      .upload(`profiles/${testProfilesFolderId}/.folder`, new Uint8Array(0), {
        contentType: 'application/x-empty',
        upsert: true
      });
    
    if (createError) {
      console.error('Error creating test profiles folder:', createError);
    } else {
      console.log('✅ Successfully created test profiles folder');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testDirectBucketAccess(); 