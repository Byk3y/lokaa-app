import { getSupabaseClient } from '@/integrations/supabase/client';
import { generateStoragePath } from './fileUtils';

/**
 * Test utilities for validating file upload functionality
 * This should only be used for testing/debugging purposes
 */

/**
 * Test if the storage bucket is accessible and we can generate proper paths
 */
export async function testStorageAccess(spaceId: string, userId: string): Promise<{
  success: boolean;
  error?: string;
  publicUrl?: string;
}> {
  try {
    // Test path generation
    const testPath = generateStoragePath(spaceId, userId, 'test-file.txt');
    console.log('Generated test path:', testPath);
    
    // Test public URL generation
    const { data: { publicUrl } } = getSupabaseClient().storage
      .from('post-attachments')
      .getPublicUrl(testPath);
      
    console.log('Generated public URL:', publicUrl);
    
    // Test if we can list buckets (permission check)
    const { data: buckets, error: bucketsError } = await getSupabaseClient().storage.listBuckets();
    
    if (bucketsError) {
      return { success: false, error: `Cannot access storage: ${bucketsError.message}` };
    }
    
    const postAttachmentsBucket = buckets?.find(b => b.name === 'post-attachments');
    if (!postAttachmentsBucket) {
      return { success: false, error: 'post-attachments bucket not found' };
    }
    
    return { 
      success: true, 
      publicUrl,
      error: `Storage access OK. Bucket: ${postAttachmentsBucket.name}, Public: ${postAttachmentsBucket.public}`
    };
    
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Test file validation functions
 */
export function testFileValidation() {
  // Test different file types
  const testFiles = [
    { name: 'test.jpg', size: 1024 * 1024, type: 'image/jpeg' },
    { name: 'large-file.pdf', size: 100 * 1024 * 1024, type: 'application/pdf' }, // 100MB - should fail
    { name: '', size: 1024, type: 'text/plain' }, // No name - should fail
    { name: 'valid-doc.pdf', size: 5 * 1024 * 1024, type: 'application/pdf' }, // 5MB - should pass
  ];
  
  console.log('File validation tests:');
  testFiles.forEach((file, index) => {
    const mockFile = new File(['test'], file.name, { type: file.type });
    Object.defineProperty(mockFile, 'size', { value: file.size });
    
    console.log(`Test ${index + 1}:`, {
      file: { name: file.name, size: file.size, type: file.type },
      // Add validation once we implement it
    });
  });
}

/**
 * Log the current implementation status
 */
export function logImplementationStatus() {
  console.log('🔧 File Upload Implementation Status:');
  console.log('✅ Blob URL creation removed from main flow');
  console.log('✅ Upload-first approach implemented');
  console.log('✅ Error handling and loading states added');
  console.log('✅ Proper storage path generation');
  console.log('✅ Upload progress indicators');
  console.log('✅ Submit button disabled during uploads');
  console.log('✅ Storage cleanup on attachment removal');
  console.log('🎯 Next: Test actual file upload flow');
}

// Add to window for browser console testing
if (typeof window !== 'undefined') {
  (window as any).uploadTestUtils = {
    testStorageAccess,
    testFileValidation,
    logImplementationStatus
  };
} 