import { log } from '@/utils/logger';
/**
 * Core media storage service for Supabase operations
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import { STORAGE_CONFIG } from '@/shared/config/storage';
import type { UploadProgressCallback, StorageUploadResult } from '@/shared/types/media';

// Storage is available if the user has a session. The previous version
// additionally did a `.list()` probe against the bucket, but that required a
// broad public SELECT policy on storage.objects (advisor warning
// public_bucket_allows_listing). Probing gave no useful signal beyond what
// the session check already gives — the actual upload failure surfaces with
// a clearer error anyway.
export const checkStorageAvailability = async (): Promise<boolean> => {
  try {
    const { data: session } = await getSupabaseClient().auth.getSession();
    if (!session.session) {
      log.debug('Service', 'User not logged in - storage unavailable');
      return false;
    }
    return true;
  } catch (err) {
    log.error('Service', 'Failed to check storage availability:', err);
    return false;
  }
};

/**
 * Upload a file to Supabase storage with standardized path
 */
export const uploadFileToStorage = async (
  file: File,
  spaceId: string,
  onProgress?: UploadProgressCallback
): Promise<StorageUploadResult | null> => {
  if (!file) return null;

  // Check file size
  if (file.size > STORAGE_CONFIG.MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size must be less than ${STORAGE_CONFIG.MAX_FILE_SIZE_MB}MB.`);
  }

  // Use simpler path format: spaces/[spaceId]/[timestamp]-[filename]
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `spaces/${spaceId}/${Date.now()}-${sanitizedFileName}`;

  try {
    // Check if storage is available
    const storageAvailable = await checkStorageAvailability();
    
    if (!storageAvailable) {
      throw new Error('Storage is not available');
    }

    // Storage is available, upload to Supabase
    onProgress?.(30);
    
    const { data, error } = await getSupabaseClient().storage
      .from(STORAGE_CONFIG.BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: STORAGE_CONFIG.CACHE_CONTROL,
        upsert: true
      });

    if (error) {
      log.error('Service', 'Supabase storage upload failed:', error);
      throw error;
    }

    onProgress?.(90);

    // Get the public URL
    const { data: { publicUrl } } = getSupabaseClient().storage
      .from(STORAGE_CONFIG.BUCKET_NAME)
      .getPublicUrl(filePath);

    onProgress?.(100);

    return {
      url: publicUrl,
      path: filePath
    };
  } catch (error) {
    log.error('Service', 'Error uploading file:', error);
    throw error;
  }
};

/**
 * Delete a file from Supabase storage
 */
export const deleteFileFromStorage = async (storagePath: string): Promise<boolean> => {
  if (!storagePath) return false;

  try {
    const storageAvailable = await checkStorageAvailability();
    
    if (!storageAvailable) {
      log.warn('Service', 'Storage not available for deletion');
      return false;
    }

    const { error } = await getSupabaseClient().storage
      .from(STORAGE_CONFIG.BUCKET_NAME)
      .remove([storagePath]);

    if (error) {
      log.error('Service', 'Failed to delete file from storage:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    log.error('Service', 'Error deleting file:', error);
    return false;
  }
}; 