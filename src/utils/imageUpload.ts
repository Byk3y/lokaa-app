import { log } from '@/utils/logger';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { processImageFile } from './imageCompression';
import { v4 as uuidv4 } from 'uuid';

// Storage constants
const STORAGE_BUCKET_NAME = 'media';

export interface ImageUploadResult {
  url: string;
  path: string;
  storageType: 'supabase' | 'localStorage';
}

export interface ImageUploadOptions {
  spaceId: string;
  type: 'icon' | 'cover';
  onProgress?: (progress: number) => void;
  enableLocalStorageFallback?: boolean;
}

/**
 * Manages localStorage storage for images with cleanup
 */
class LocalStorageImageManager {
  /**
   * Stores an image in localStorage with automatic cleanup of old images
   */
  static async storeImage(
    base64Data: string, 
    spaceId: string, 
    type: 'icon' | 'cover'
  ): Promise<string> {
    const storageKey = `space_${type}_${spaceId}_${Date.now()}`;
    
    try {
      localStorage.setItem(storageKey, base64Data);
      log.debug('ImageUpload', `Image stored in localStorage with key: ${storageKey}`);
      return storageKey;
    } catch (localStorageError) {
      log.error('ImageUpload', "localStorage error:", localStorageError);
      
      // Try to clear some space by removing old images
      try {
        const keysToRemove = this.findOldImages(spaceId, type, storageKey);
        
        if (keysToRemove.length > 0) {
          log.debug('ImageUpload', `Removing ${keysToRemove.length} old images to free up space`);
          keysToRemove.forEach(key => localStorage.removeItem(key));
          
          // Try storing again
          localStorage.setItem(storageKey, base64Data);
          log.debug('ImageUpload', `Successfully stored image after clearing space`);
          return storageKey;
        } else {
          throw new Error("No space available in localStorage");
        }
      } catch (retryError) {
        throw new Error("Insufficient storage space: Please try a smaller image or clear your browser cache");
      }
    }
  }
  
  /**
   * Finds old images with the same prefix for cleanup
   */
  private static findOldImages(spaceId: string, type: 'icon' | 'cover', excludeKey: string): string[] {
    const keysToRemove: string[] = [];
    const prefix = `space_${type}_${spaceId}_`;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix) && key !== excludeKey) {
        keysToRemove.push(key);
      }
    }
    
    return keysToRemove;
  }
}

/**
 * Updates all cache layers to prevent image disappearing on mobile
 */
export const updateImageCaches = async (
  spaceId: string,
  subdomain: string,
  field: 'icon_image' | 'cover_image',
  url: string,
  type: 'icon' | 'cover'
): Promise<void> => {
  try {
    // 1. Update lastActiveSpace cache (used by mobile recovery system)
    const lastActiveSpace = localStorage.getItem('lastActiveSpace');
    if (lastActiveSpace) {
      const parsed = JSON.parse(lastActiveSpace);
      parsed[field] = url;
      parsed.timestamp = Date.now();
      localStorage.setItem('lastActiveSpace', JSON.stringify(parsed));
      log.debug('ImageUpload', `🔄 [${type}Upload] Updated lastActiveSpace cache with new ${field}`);
    }
    
    // 2. Update space settings store cache
    try {
      const { enhancedSpaceCache } = await import('@/hooks/useSpaceSettingsStore');
      const cacheKey = subdomain;
      const cached = enhancedSpaceCache?.get(cacheKey);
      if (cached && cached.data) {
        cached.data[field] = url;
        cached.timestamp = Date.now();
        enhancedSpaceCache.set(cacheKey, cached);
        log.debug('ImageUpload', `🔄 [${type}Upload] Updated enhancedSpaceCache with new ${field}`);
      }
    } catch (importError) {
      log.warn('ImageUpload', `⚠️ [${type}Upload] Could not update space settings cache:`, importError);
    }
    
    // 3. Update fallback cache
    const fallbackKey = `space_fallback_${subdomain}`;
    const fallbackCache = localStorage.getItem(fallbackKey);
    if (fallbackCache) {
      const parsed = JSON.parse(fallbackCache);
      if (parsed.data) {
        parsed.data[field] = url;
        parsed.timestamp = Date.now();
        localStorage.setItem(fallbackKey, JSON.stringify(parsed));
        log.debug('ImageUpload', `🔄 [${type}Upload] Updated fallback cache with new ${field}`);
      }
    }
    
    // 4. Update sessionStorage cache
    const sessionKey = `space_data_${subdomain}`;
    const sessionCache = sessionStorage.getItem(sessionKey);
    if (sessionCache) {
      const parsed = JSON.parse(sessionCache);
      if (parsed.space) {
        parsed.space[field] = url;
        parsed.timestamp = Date.now();
        sessionStorage.setItem(sessionKey, JSON.stringify(parsed));
        log.debug('ImageUpload', `🔄 [${type}Upload] Updated sessionStorage cache with new ${field}`);
      }
    }
  } catch (error) {
    log.warn('ImageUpload', `⚠️ [${type}Upload] Failed to update cache:`, error);
  }
};

/**
 * Updates the database with the new image URL
 */
export const updateDatabaseImage = async (
  spaceId: string,
  field: 'icon_image' | 'cover_image',
  url: string
): Promise<void> => {
  const { error: dbError } = await getSupabaseClient()
    .from('spaces')
    .update({ [field]: url })
    .eq('id', spaceId);
    
  if (dbError) {
    log.error('ImageUpload', `Failed to update database with ${field}:`, dbError);
    throw dbError;
  }
  
  log.debug('ImageUpload', `✅ Database updated successfully with new ${field}`);
};

/**
 * Uploads an image file with compression and fallback support
 */
export const uploadImage = async (
  file: File,
  options: ImageUploadOptions
): Promise<ImageUploadResult> => {
  const { spaceId, type, onProgress, enableLocalStorageFallback = true } = options;
  
  onProgress?.(10);
  
  try {
    log.debug('ImageUpload', `Starting upload for ${type} image:`, file.name);
    
    // Process and compress the image
    const { compressedBlob, base64 } = await processImageFile(file, type);
    onProgress?.(30);
    
    // Try to upload to Supabase storage first
    try {
      // Create a new File object from the compressed blob
      const compressedFile = new File([compressedBlob], file.name, { type: file.type });
      
      // Generate file path
      const filePath = `spaces/${spaceId}/${type}/${uuidv4()}-${file.name.replace(/\s+/g, '-')}`;
      log.debug('ImageUpload', "Uploading compressed image to path:", filePath);
      
      onProgress?.(50);
      
      const { data: uploadData, error: uploadError } = await getSupabaseClient().storage
        .from(STORAGE_BUCKET_NAME)
        .upload(filePath, compressedFile, {
          cacheControl: '3600',
          upsert: true
        });
        
      if (uploadError) {
        log.error('ImageUpload', "Upload error:", uploadError);
        throw uploadError;
      }
      
      log.debug('ImageUpload', "Upload successful:", uploadData);
      onProgress?.(80);
      
      // Get public URL
      const { data: urlData } = getSupabaseClient().storage
        .from(STORAGE_BUCKET_NAME)
        .getPublicUrl(filePath);
      
      const publicUrl = urlData.publicUrl;
      log.debug('ImageUpload', "Public URL:", publicUrl);
      
      onProgress?.(100);
      
      return {
        url: publicUrl,
        path: filePath,
        storageType: 'supabase'
      };
      
    } catch (storageError) {
      log.warn('ImageUpload', "Supabase storage upload failed:", storageError);
      
      if (!enableLocalStorageFallback) {
        throw storageError;
      }
      
      // Fallback to localStorage
      onProgress?.(70);
      
      const storageKey = await LocalStorageImageManager.storeImage(base64, spaceId, type);
      const localUrl = `local:${storageKey}`;
      
      log.debug('ImageUpload', "Fallback to localStorage successful");
      onProgress?.(100);
      
      return {
        url: localUrl,
        path: storageKey,
        storageType: 'localStorage'
      };
    }
    
  } catch (error: unknown) {
    log.error('ImageUpload', `Error uploading ${type}:`, error);
    throw error;
  }
};

/**
 * Comprehensive image upload with database update and cache management
 */
export const uploadImageComplete = async (
  file: File,
  options: ImageUploadOptions & {
    subdomain: string;
    onSuccess?: (result: ImageUploadResult) => void;
    onError?: (error: Error) => void;
  }
): Promise<ImageUploadResult> => {
  const { spaceId, subdomain, type, onSuccess, onError, ...uploadOptions } = options;
  
  try {
    // Upload the image
    const result = await uploadImage(file, { spaceId, type, ...uploadOptions });
    
    // Update database
    const field = type === 'icon' ? 'icon_image' : 'cover_image';
    await updateDatabaseImage(spaceId, field, result.url);
    
    // Update all caches
    await updateImageCaches(spaceId, subdomain, field, result.url, type);
    
    // Show success message
    const storageMessage = result.storageType === 'localStorage' 
      ? "Image saved locally" 
      : "Upload successful";
    
    toast({
      title: storageMessage,
      description: `${type === 'icon' ? 'Icon' : 'Cover'} image has been updated.`
    });
    
    onSuccess?.(result);
    return result;
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    toast({
      title: "Upload failed",
      description: errorMessage || `Could not upload ${type} image.`,
      variant: "destructive"
    });
    
    const finalError = error instanceof Error ? error : new Error(errorMessage);
    onError?.(finalError);
    throw finalError;
  }
};
