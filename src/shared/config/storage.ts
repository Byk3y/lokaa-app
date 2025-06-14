/**
 * Storage configuration constants
 */

export const STORAGE_CONFIG = {
  BUCKET_NAME: 'media',
  MAX_FILE_SIZE_MB: 10,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
  CACHE_CONTROL: '3600',
} as const;

// Legacy exports for backward compatibility
export const STORAGE_BUCKET_NAME = STORAGE_CONFIG.BUCKET_NAME;
export const MAX_FILE_SIZE_MB = STORAGE_CONFIG.MAX_FILE_SIZE_MB;
export const MAX_FILE_SIZE_BYTES = STORAGE_CONFIG.MAX_FILE_SIZE_BYTES; 