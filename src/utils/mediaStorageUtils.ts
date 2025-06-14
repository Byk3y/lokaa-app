/**
 * @deprecated Legacy mediaStorageUtils.ts
 * This file is maintained for backward compatibility.
 * New code should import from the organized service structure:
 * - @/shared/services/storage
 * - @/shared/types/media
 * - @/features/spaces/services
 */

// ============================================================================
// RE-EXPORTS FROM NEW SERVICE ARCHITECTURE
// ============================================================================

// Types
export type { 
  MediaItem,
  UploadProgressCallback,
  MigrationProgressCallback,
  StorageUploadResult,
  AddMediaRequest,
} from '@/shared/types/media';

// Constants (backward compatibility)
export {
  STORAGE_BUCKET_NAME,
  MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_BYTES,
} from '@/shared/config/storage';

// Core storage operations
export {
  checkStorageAvailability,
  uploadFileToStorage,
  deleteFileFromStorage,
} from '@/shared/services/storage/media-storage';

// Migration services
export {
  fileToBase64,
  migrateLocalMediaToStorage,
} from '@/shared/services/storage/media-migration';

// Validation and processing
export {
  extractVideoId,
  getVideoThumbnail,
} from '@/shared/services/storage/media-validation';

// Space media operations (localStorage)
export {
  getSpaceMediaItems,
  saveSpaceMediaItems,
} from '@/features/spaces/services/space-media';

// Space media database operations (Supabase)
export {
  fetchSpaceMediaFromSupabase,
  addMediaToSupabase,
  reorderSpaceMediaInSupabase,
  deleteMediaFromSupabase,
} from '@/features/spaces/services/space-media-db';

// ============================================================================
// ENHANCED UPLOAD FUNCTION WITH FALLBACK (backward compatibility)
// ============================================================================

/**
 * @deprecated Use uploadFileToStorage from @/shared/services/storage
 * Enhanced upload with fallback to base64 for legacy compatibility
 */
export const uploadFileToStorageWithFallback = async (
  file: File,
  spaceId: string,
  onProgress?: (progress: number) => void
): Promise<{ url: string; path: string } | null> => {
  console.warn('uploadFileToStorageWithFallback is deprecated. Use uploadFileWithFallback from @/shared/services/storage/media-migration');
  
  const { uploadFileWithFallback } = await import('@/shared/services/storage/media-migration');
  return uploadFileWithFallback(file, spaceId, onProgress);
}; 