import { getSupabaseClient } from '@/integrations/supabase/client';

export interface ImageUploadResult {
  url: string;
  path: string;
  metadata: {
    size: number;
    type: string;
    width?: number;
    height?: number;
  };
}

export interface ImageUploadOptions {
  spaceId: string;
  lessonId?: string;
  courseId?: string;
  quality?: number;
}

/**
 * Upload an image for educational content
 */
export async function uploadEducationalContentImage(
  file: File,
  options: ImageUploadOptions
): Promise<ImageUploadResult> {
  const supabase = getSupabaseClient();
  
  // Generate unique filename
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${timestamp}-${randomId}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  
  // Create storage path
  const storagePath = [
    'spaces',
    options.spaceId,
    'educational-content',
    options.courseId && `courses/${options.courseId}`,
    options.lessonId && `lessons/${options.lessonId}`,
    'images',
    fileName
  ].filter(Boolean).join('/');

  try {
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('space-media')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('space-media')
      .getPublicUrl(storagePath);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL for uploaded image');
    }

    // Get image dimensions (optional)
    const dimensions = await getImageDimensions(file);

    return {
      url: urlData.publicUrl,
      path: storagePath,
      metadata: {
        size: file.size,
        type: file.type,
        width: dimensions.width,
        height: dimensions.height,
      }
    };

  } catch (error) {
    console.error('Image upload error:', error);
    throw error;
  }
}

/**
 * Get image dimensions from file
 */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for dimension calculation'));
    };
    
    img.src = url;
  });
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.'
    };
  }

  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File is too large. Please upload an image smaller than 5MB.'
    };
  }

  return { isValid: true };
}

/**
 * Create a thumbnail/preview URL for immediate display
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Clean up preview URL
 */
export function revokePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
} 