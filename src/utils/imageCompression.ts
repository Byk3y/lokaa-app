import { log } from '@/utils/logger';

// Constants for image processing
export const IMAGE_CONSTANTS = {
  MAX_ICON_SIZE_MB: 2,
  MAX_COVER_SIZE_MB: 8,
  ICON_MAX_DIMENSION: 128,
  COVER_MAX_DIMENSION: 800,
  ICON_QUALITY: 0.9,
  COVER_QUALITY: 0.7,
} as const;

export const MAX_ICON_SIZE_BYTES = IMAGE_CONSTANTS.MAX_ICON_SIZE_MB * 1024 * 1024;
export const MAX_COVER_SIZE_BYTES = IMAGE_CONSTANTS.MAX_COVER_SIZE_MB * 1024 * 1024;

/**
 * Compresses an image file to optimize storage and performance
 * @param file - The image file to compress
 * @param maxWidthHeight - Maximum dimension (width or height) for the image
 * @param quality - Compression quality (0-1, where 1 is highest quality)
 * @returns Promise that resolves to the compressed image as a Blob
 */
export const compressImage = async (
  file: File, 
  maxWidthHeight: number, 
  quality: number = 0.7
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        // Create a canvas element
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions while maintaining aspect ratio
        if (width > height && width > maxWidthHeight) {
          height = Math.round((height * maxWidthHeight) / width);
          width = maxWidthHeight;
        } else if (height > maxWidthHeight) {
          width = Math.round((width * maxWidthHeight) / height);
          height = maxWidthHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw image on canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas to Blob conversion failed'));
            }
          },
          file.type,
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Image loading error'));
    };
    
    reader.onerror = () => reject(new Error('File reading error'));
  });
};

/**
 * Validates image file size and type
 * @param file - The file to validate
 * @param type - The image type ('icon' or 'cover')
 * @returns true if valid, false otherwise
 */
export const validateImageFile = (file: File, type: 'icon' | 'cover'): boolean => {
  const maxSize = type === 'icon' ? MAX_ICON_SIZE_BYTES : MAX_COVER_SIZE_BYTES;
  
  // Validate file size
  if (file.size > maxSize) {
    return false;
  }
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    return false;
  }
  
  return true;
};

/**
 * Converts a blob to base64 for localStorage fallback
 * @param blob - The blob to convert
 * @returns Promise that resolves to base64 string
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
};

/**
 * Gets compression settings for different image types
 * @param type - The image type ('icon' or 'cover')
 * @returns Compression settings object
 */
export const getCompressionSettings = (type: 'icon' | 'cover') => {
  return {
    maxDimension: type === 'icon' ? IMAGE_CONSTANTS.ICON_MAX_DIMENSION : IMAGE_CONSTANTS.COVER_MAX_DIMENSION,
    quality: type === 'icon' ? IMAGE_CONSTANTS.ICON_QUALITY : IMAGE_CONSTANTS.COVER_QUALITY,
    maxSizeBytes: type === 'icon' ? MAX_ICON_SIZE_BYTES : MAX_COVER_SIZE_BYTES,
    maxSizeMB: type === 'icon' ? IMAGE_CONSTANTS.MAX_ICON_SIZE_MB : IMAGE_CONSTANTS.MAX_COVER_SIZE_MB,
  };
};

/**
 * Comprehensive image processing function
 * @param file - The image file to process
 * @param type - The image type ('icon' or 'cover')
 * @returns Promise that resolves to processed image data
 */
export const processImageFile = async (
  file: File, 
  type: 'icon' | 'cover'
): Promise<{ compressedBlob: Blob; originalSize: number; compressedSize: number; base64: string }> => {
  // Validate file first
  if (!validateImageFile(file, type)) {
    const settings = getCompressionSettings(type);
    throw new Error(`Invalid ${type} file. Must be an image less than ${settings.maxSizeMB}MB`);
  }
  
  const settings = getCompressionSettings(type);
  
  log.debug('ImageCompression', `Processing ${type} image:`, {
    name: file.name,
    originalSize: `${(file.size / 1024).toFixed(2)}KB`,
    maxDimension: settings.maxDimension,
    quality: settings.quality
  });
  
  // Compress the image
  const compressedBlob = await compressImage(file, settings.maxDimension, settings.quality);
  
  // Convert to base64 for fallback storage
  const base64 = await blobToBase64(compressedBlob);
  
  log.debug('ImageCompression', `Compression complete:`, {
    originalSize: `${(file.size / 1024).toFixed(2)}KB`,
    compressedSize: `${(compressedBlob.size / 1024).toFixed(2)}KB`,
    compressionRatio: `${((1 - compressedBlob.size / file.size) * 100).toFixed(1)}%`
  });
  
  return {
    compressedBlob,
    originalSize: file.size,
    compressedSize: compressedBlob.size,
    base64
  };
};
