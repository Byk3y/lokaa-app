/**
 * Storage services index
 * Centralized exports for all storage-related services
 */

// Core storage operations
export {
  checkStorageAvailability,
  uploadFileToStorage,
  deleteFileFromStorage,
} from './media-storage';

// Migration services
export {
  fileToBase64,
  uploadFileWithFallback,
  migrateLocalMediaToStorage,
} from './media-migration';

// Validation and processing
export {
  extractVideoId,
  getVideoThumbnail,
  validateFileType,
  validateFileSize,
  getFileExtension,
  sanitizeFilename,
  generateUniqueFilename,
} from './media-validation';

// Types (re-exported for convenience)
export type {
  MediaItem,
  UploadProgressCallback,
  MigrationProgressCallback,
  StorageUploadResult,
  AddMediaRequest,
} from '@/shared/types/media';

// Config (re-exported for convenience)
export {
  STORAGE_CONFIG,
  STORAGE_BUCKET_NAME,
  MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_BYTES,
} from '@/shared/config/storage'; 