import { log } from '@/utils/logger';
/**
 * Media migration service for localStorage to Supabase storage migration
 */

import type { MediaItem, MigrationProgressCallback } from '@/shared/types/media';
import { checkStorageAvailability, uploadFileToStorage } from './media-storage';

/**
 * Helper to convert file to base64 for fallback storage
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

/**
 * Upload file with fallback to base64 if storage unavailable
 */
export const uploadFileWithFallback = async (
  file: File,
  spaceId: string,
  onProgress?: (progress: number) => void
): Promise<{ url: string; path: string }> => {
  try {
    const storageAvailable = await checkStorageAvailability();
    
    if (storageAvailable) {
      // Use storage service
      const result = await uploadFileToStorage(file, spaceId, onProgress);
      if (result) {
        return result;
      }
    }
    
    // Fall back to base64 encoding for local storage
    onProgress?.(50);
    const base64Data = await fileToBase64(file);
    onProgress?.(100);
    
    return {
      url: base64Data,
      path: ''
    };
  } catch (error) {
    log.error('Service', 'Error in uploadFileWithFallback:', error);
    // Final fallback to base64
    onProgress?.(50);
    const base64Data = await fileToBase64(file);
    onProgress?.(100);
    
    return {
      url: base64Data,
      path: ''
    };
  }
};

/**
 * Migrate media items from localStorage to Supabase storage
 */
export const migrateLocalMediaToStorage = async (
  spaceId: string,
  onProgress?: MigrationProgressCallback
): Promise<MediaItem[]> => {
  try {
    // Get media items from localStorage
    const savedMedia = localStorage.getItem(`space_media_${spaceId}`);
    if (!savedMedia) return [];
    
    const mediaItems: MediaItem[] = JSON.parse(savedMedia);
    if (!Array.isArray(mediaItems) || mediaItems.length === 0) return [];
    
    // Check if storage is available
    const storageAvailable = await checkStorageAvailability();
    if (!storageAvailable) {
      log.debug('Service', 'Storage not available for migration');
      return mediaItems;
    }
    
    // Process each image item to migrate to storage
    const updatedItems: MediaItem[] = [];
    let processed = 0;
    
    for (const item of mediaItems) {
      // Skip items that are already in storage or are video links
      if (item.type === 'video' || (item.storagePath && item.storagePath.length > 0)) {
        updatedItems.push(item);
        processed++;
        onProgress?.(processed, mediaItems.length);
        continue;
      }
      
      // Check if the URL is a base64 data URL
      if (item.url.startsWith('data:')) {
        try {
          // Convert base64 to blob
          const res = await fetch(item.url);
          const blob = await res.blob();
          const file = new File([blob], `migrated-${item.id}.jpg`, { type: 'image/jpeg' });
          
          // Upload to storage
          const uploadResult = await uploadFileToStorage(file, spaceId);
          
          if (uploadResult) {
            updatedItems.push({
              ...item,
              url: uploadResult.url,
              storagePath: uploadResult.path
            });
          } else {
            // If upload fails, keep the original item
            updatedItems.push(item);
          }
        } catch (err) {
          log.error('Service', 'Error migrating media item:', err);
          updatedItems.push(item);
        }
      } else {
        // Not a base64 URL, just keep as is
        updatedItems.push(item);
      }
      
      processed++;
      onProgress?.(processed, mediaItems.length);
    }
    
    // Save the updated items back to localStorage
    localStorage.setItem(`space_media_${spaceId}`, JSON.stringify(updatedItems));
    
    return updatedItems;
  } catch (error) {
    log.error('Service', 'Error migrating media items:', error);
    return [];
  }
}; 