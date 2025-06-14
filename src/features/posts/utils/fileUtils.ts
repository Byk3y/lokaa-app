import { v4 as uuidv4 } from 'uuid';
import { Attachment } from '../types/postTypes';

/**
 * Checks if a URL points to an image based on URL extension or file type
 * 
 * @param url URL to check
 * @param fileType Optional MIME type to help determine if it's an image
 * @returns Boolean indicating whether the URL is likely an image
 */
export function isImageUrl(url: string, fileType?: string): boolean {
  // Check based on file type if provided
  if (fileType && fileType.startsWith('image/')) {
    return true;
  }
  
  // Check based on URL extension
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  return imageExtensions.some(ext => url.toLowerCase().endsWith(ext));
}

/**
 * Formats file size in bytes to human-readable format
 * 
 * @param bytes File size in bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null) return '';
  
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

/**
 * Returns an appropriate icon name based on file type
 * 
 * @param fileType MIME type of the file
 * @param attachmentType Type of attachment
 * @returns String indicating which icon to use
 */
export function getFileIcon(fileType?: string, attachmentType?: Attachment['type']): string {
  if (fileType?.startsWith('image/')) {
    return 'image';
  } else if (fileType?.startsWith('video/')) {
    return 'video';
  } else if (fileType?.startsWith('audio/')) {
    return 'audio';
  } else if (attachmentType === 'video') {
    return 'video';
  } else if (attachmentType === 'link') {
    return 'link';
  } else {
    return 'file';
  }
}

/**
 * Generates a storage path for a file within a post
 * 
 * @param spaceId The ID of the space
 * @param userId The ID of the user
 * @param fileName Original file name
 * @returns Storage path string
 */
export function generateStoragePath(spaceId: string, userId: string, fileName: string): string {
  // Sanitize the filename to remove special characters
  const sanitizedBaseName = fileName
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[^a-zA-Z0-9_-]/g, '_') // Replace special chars with underscore
    .substring(0, 50); // Limit length
  
  // Get file extension
  const fileExtension = fileName.includes('.') 
    ? fileName.substring(fileName.lastIndexOf('.')) 
    : '';
  
  // Create unique filename with timestamp and UUID
  const timestamp = Date.now();
  const uniqueId = uuidv4().substring(0, 8); // Shorter UUID for cleaner paths
  const uniqueFileName = `${timestamp}-${uniqueId}-${sanitizedBaseName}${fileExtension}`;
  
  return `spaces/${spaceId}/posts/${userId}/${uniqueFileName}`;
}

/**
 * Creates a preview URL for a file (blob URL for temporary preview)
 * This should ONLY be used for UI previews, never for storage
 * 
 * @param file The File object to create preview for
 * @returns Blob URL for preview (must be revoked after use)
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Validates if a file is acceptable for upload
 * 
 * @param file The file to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateFile(file: File): { isValid: boolean; error?: string } {
  // Check file size (50MB limit)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size must be less than 50MB' };
  }
  
  // Check if file has a name
  if (!file.name || file.name.trim() === '') {
    return { isValid: false, error: 'File must have a name' };
  }
  
  return { isValid: true };
} 