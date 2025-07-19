import { log } from '@/utils/logger';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/hooks/use-toast';

const STORAGE_BUCKET_NAME = 'space-media';
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Uploads a course cover image to Supabase Storage
 * @param file The image file to upload
 * @param spaceId The space ID for organizing files
 * @returns The public URL of the uploaded image or null if upload failed
 */
export const uploadCourseImage = async (
  file: File,
  spaceId: string
): Promise<string | null> => {
  try {
    // Validate file
    if (!file || !file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select a valid image file.",
        variant: "destructive"
      });
      return null;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({
        title: "File too large",
        description: `Maximum file size is ${MAX_FILE_SIZE_MB}MB. Please select a smaller file.`,
        variant: "destructive"
      });
      return null;
    }

    // Generate a unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `course-cover-${uuidv4()}.${fileExt}`;
    const filePath = `${spaceId}/courses/${fileName}`;

    // Upload the file to Supabase Storage
    const { data, error } = await getSupabaseClient().storage
      .from(STORAGE_BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      log.error('Utils', 'Error uploading course image:', error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
      return null;
    }

    // Get the public URL of the uploaded file
    const { data: { publicUrl } } = getSupabaseClient().storage
      .from(STORAGE_BUCKET_NAME)
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    log.error('Utils', 'Unexpected error in uploadCourseImage:', error);
    toast({
      title: "Upload failed",
      description: error instanceof Error ? error.message : "An unexpected error occurred",
      variant: "destructive"
    });
    return null;
  }
};

/**
 * Validates if a file meets the requirements for course cover images
 * @param file The file to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export const validateCourseImage = (file: File): { isValid: boolean; error?: string } => {
  if (!file) {
    return { isValid: false, error: "No file selected" };
  }

  if (!file.type.startsWith('image/')) {
    return { isValid: false, error: "Please select a valid image file" };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { isValid: false, error: `Maximum file size is ${MAX_FILE_SIZE_MB}MB` };
  }

  return { isValid: true };
};

/**
 * Converts a file to base64 (fallback for when storage is not available)
 * @param file The file to convert
 * @returns Promise that resolves to base64 string
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}; 