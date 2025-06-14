/**
 * Media validation and processing utilities
 */

/**
 * Extract YouTube video ID from URL
 */
export const extractVideoId = (url: string): string | null => {
  const youtubeRegex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
  const match = url.match(youtubeRegex);
  return match ? match[1] : null;
};

/**
 * Get YouTube thumbnail URL from video ID
 */
export const getVideoThumbnail = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};

/**
 * Validate file type for upload
 */
export const validateFileType = (file: File): boolean => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return allowedTypes.includes(file.type);
};

/**
 * Validate file size
 */
export const validateFileSize = (file: File, maxSizeMB: number): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

/**
 * Sanitize filename for storage
 */
export const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
};

/**
 * Generate unique filename with timestamp
 */
export const generateUniqueFilename = (originalFilename: string): string => {
  const sanitized = sanitizeFilename(originalFilename);
  const timestamp = Date.now();
  return `${timestamp}-${sanitized}`;
}; 