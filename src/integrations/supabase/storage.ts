import { log } from '@/utils/logger';
import { getSupabaseClient } from './client';

/**
 * Supabase Storage Module - Lazy loaded for file upload features
 * This module is only loaded when storage operations are needed
 */

export interface StorageUploadOptions {
  cacheControl?: string;
  contentType?: string;
  upsert?: boolean;
}

export interface StorageError {
  message: string;
  statusCode?: string;
}

export interface StorageUploadResult {
  data: { path: string } | null;
  error: StorageError | null;
}

export interface StorageUrlResult {
  data: { publicUrl: string };
}

/**
 * Upload a file to storage
 */
export async function uploadFile(
  bucketName: string,
  path: string,
  file: File | Blob,
  options?: StorageUploadOptions
): Promise<StorageUploadResult> {
  return getSupabaseClient().storage
    .from(bucketName)
    .upload(path, file, options);
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(bucketName: string, path: string): StorageUrlResult {
  return getSupabaseClient().storage
    .from(bucketName)
    .getPublicUrl(path);
}

/**
 * Download a file
 */
export async function downloadFile(
  bucketName: string,
  path: string
): Promise<{ data: Blob | null; error: StorageError | null }> {
  return getSupabaseClient().storage
    .from(bucketName)
    .download(path);
}

/**
 * Delete files
 */
export async function deleteFiles(
  bucketName: string,
  paths: string[]
): Promise<{ data: any; error: StorageError | null }> {
  return getSupabaseClient().storage
    .from(bucketName)
    .remove(paths);
}

/**
 * List files in a folder
 */
export async function listFiles(
  bucketName: string,
  path: string,
  options?: {
    limit?: number;
    offset?: number;
    sortBy?: { column: string; order: 'asc' | 'desc' };
  }
): Promise<{ data: any[] | null; error: StorageError | null }> {
  return getSupabaseClient().storage
    .from(bucketName)
    .list(path, options);
}

/**
 * Move a file
 */
export async function moveFile(
  bucketName: string,
  fromPath: string,
  toPath: string
): Promise<{ error: StorageError | null }> {
  return getSupabaseClient().storage
    .from(bucketName)
    .move(fromPath, toPath);
}

/**
 * Copy a file
 */
export async function copyFile(
  bucketName: string,
  fromPath: string,
  toPath: string
): Promise<{ error: StorageError | null }> {
  return getSupabaseClient().storage
    .from(bucketName)
    .copy(fromPath, toPath);
}

/**
 * Create a signed URL for temporary access
 */
export async function createSignedUrl(
  bucketName: string,
  path: string,
  expiresIn: number
): Promise<{ data: { signedUrl: string } | null; error: StorageError | null }> {
  return getSupabaseClient().storage
    .from(bucketName)
    .createSignedUrl(path, expiresIn);
}

/**
 * Helper function for common image upload pattern
 */
export async function uploadImage(
  file: File,
  bucketName: string,
  folderPath: string,
  fileName?: string
): Promise<{ url: string | null; path: string | null; error: StorageError | null }> {
  try {
    const finalFileName = fileName || `${Date.now()}-${file.name}`;
    const filePath = `${folderPath}/${finalFileName}`;
    
    const { data, error } = await uploadFile(bucketName, filePath, file, {
      cacheControl: '3600',
      upsert: true
    });
    
    if (error) {
      return { url: null, path: null, error };
    }
    
    const { data: urlData } = getPublicUrl(bucketName, filePath);
    
    return {
      url: urlData.publicUrl,
      path: filePath,
      error: null
    };
  } catch (error) {
    log.error('Storage', 'Image upload error:', error);
    return {
      url: null,
      path: null,
      error: { message: error instanceof Error ? error.message : 'Upload failed' }
    };
  }
}

log.debug('Supabase', '📦 Storage module loaded');
