import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Supabase client
const supabaseUrl = 'https://nmddvthcsyppyjncqfsk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tZGR2dGhjc3lwcHlqbmNxZnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ0ODg4MTYsImV4cCI6MjA2MDA2NDgxNn0.NMzMDvaOD2vHfBfjRbuit05EIdi7QK9pC_ChzX3klG0';
const supabase = createClient(supabaseUrl, supabaseKey);

// Test the storage configuration
async function testAvatarStorage() {
  try {
    console.log('Testing Supabase avatar storage...');
    
    // 1. Check if we can list buckets
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return;
    }
    
    console.log('Available buckets:', buckets.map(b => b.name).join(', '));
    
    // Check if avatars bucket exists
    const avatarsBucket = buckets.find(b => b.name === 'avatars');
    if (!avatarsBucket) {
      console.error('Error: avatars bucket not found');
      return;
    }
    
    console.log('✅ Found avatars bucket');
    
    // 2. Sign in (required to test upload)
    // Use either an existing user or the admin key if you have it
    // This part depends on your authentication setup
    console.log('Attempting to sign in to test uploads...');
    
    // For testing purposes, try to get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      console.log(`✅ Authenticated as user: ${user.id}`);

      // 3. Try to upload a test image
      // For testing, we'll create a simple text file
      const testFilePath = path.join(__dirname, 'test-avatar.txt');
      await fs.writeFile(testFilePath, 'This is a test file simulating an image upload');
      
      const filePath = `profiles/${user.id}/test-avatar-${Date.now()}.txt`;
      
      console.log(`Uploading test file to ${filePath}...`);
      
      // Upload the file
      const fileBuffer = await fs.readFile(testFilePath);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, fileBuffer, {
          contentType: 'text/plain',
          upsert: true,
        });
      
      // Delete the temporary file
      await fs.unlink(testFilePath);
      
      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        return;
      }
      
      console.log('✅ Successfully uploaded test file');
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      console.log('Public URL:', publicUrl);
      
      // 4. Try to list files
      const { data: files, error: listError } = await supabase.storage
        .from('avatars')
        .list(`profiles/${user.id}`);
      
      if (listError) {
        console.error('Error listing files:', listError);
      } else {
        console.log('Files in user directory:', files.map(f => f.name).join(', '));
      }
      
      // 5. Clean up - delete the test file
      console.log('Deleting test file...');
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([filePath]);
      
      if (deleteError) {
        console.error('Error deleting file:', deleteError);
      } else {
        console.log('✅ Successfully deleted test file');
      }
    } else {
      console.log('⚠️ Not authenticated. Sign in is required to test upload functionality.');
      console.log('This is expected behavior if you are testing without authentication.');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testAvatarStorage(); 