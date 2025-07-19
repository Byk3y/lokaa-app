import { log } from '@/utils/logger';
import { getSupabaseClient } from "@/integrations/supabase/client";

/**
 * Uploads a profile image to Supabase Storage and updates user metadata
 * @param file The image file to upload
 * @returns The public URL of the uploaded image or null if there was an error
 */
export async function uploadProfileImage(file: File): Promise<string | null> {
  try {
    // Get current user
    const { data: { user } } = await getSupabaseClient().auth.getUser();
    if (!user) {
      log.error('Utils', "User not authenticated");
      return null;
    }
    
    // Create a unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}_${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      log.error('Utils', "Invalid file type. Only JPEG, PNG, GIF, and WEBP are allowed.");
      return null;
    }
    
    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      log.error('Utils', "File too large. Maximum size is 2MB.");
      return null;
    }
    
    // Upload file to Supabase Storage
    const { data, error } = await getSupabaseClient().storage
      .from('profiles')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true, // Overwrite if exists
        contentType: file.type,
      });
      
    if (error) {
      log.error('Utils', 'Error uploading image:', error);
      return null;
    }
    
    // Get the public URL
    const { data: { publicUrl } } = getSupabaseClient().storage
      .from('profiles')
      .getPublicUrl(filePath);
    
    // Update user metadata with the new avatar URL
    const { error: updateError } = await getSupabaseClient().auth.updateUser({
      data: { 
        avatar_url: publicUrl,
        avatar_path: filePath // Store path for future reference
      }
    });
    
    if (updateError) {
      log.error('Utils', 'Error updating user metadata:', updateError);
      // Even if metadata update fails, return the URL
    }
    
    return publicUrl;
  } catch (error) {
    log.error('Utils', 'Error in uploadProfileImage:', error);
    return null;
  }
}

/**
 * Deletes an old profile image from Supabase Storage
 * @param filePath The path of the file to delete
 */
export async function deleteOldProfileImage(filePath: string): Promise<void> {
  try {
    if (!filePath) return;
    
    const { error } = await getSupabaseClient().storage
      .from('profiles')
      .remove([filePath]);
      
    if (error) {
      log.error('Utils', 'Error deleting old image:', error);
    }
  } catch (error) {
    log.error('Utils', 'Error in deleteOldProfileImage:', error);
  }
}

/**
 * Gets the current profile image URL from user metadata
 * @returns The profile image URL or null if not found
 */
export async function getProfileImageUrl(): Promise<string | null> {
  try {
    const { data: { user } } = await getSupabaseClient().auth.getUser();
    if (!user) return null;
    
    return user.user_metadata?.avatar_url || null;
  } catch (error) {
    log.error('Utils', 'Error in getProfileImageUrl:', error);
    return null;
  }
} 