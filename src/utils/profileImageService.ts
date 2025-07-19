import { log } from '@/utils/logger';
import { getSupabaseClient } from "@/integrations/supabase/client";

/**
 * Uploads a profile image to Supabase Storage and updates user metadata
 * @param file The image file to upload
 * @param cropInfo Optional cropping information
 * @returns The public URL of the uploaded image
 */
export async function uploadProfileImage(
  file: File | Blob,
  cropInfo?: { width: number; height: number }
): Promise<string | null> {
  try {
    // Get current user
    const { data: { user } } = await getSupabaseClient().auth.getUser();
    
    if (!user) {
      log.error('Utils', "No authenticated user found");
      return null;
    }
    
    // Create a unique file path
    const fileName = `${Date.now()}.jpg`;
    const filePath = `profiles/${user.id}/${fileName}`;
    
    // Upload the file to Supabase Storage
    const { data: uploadData, error: uploadError } = await getSupabaseClient().storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/jpeg',
      });
    
    if (uploadError) {
      log.error('Utils', 'Error uploading image to Supabase Storage:', uploadError);
      return null;
    }
    
    // Get the public URL of the uploaded image
    const { data: { publicUrl } } = getSupabaseClient().storage
      .from('avatars')
      .getPublicUrl(filePath);
    
    if (!publicUrl) {
      log.error('Utils', 'Failed to get public URL for uploaded image');
      return null;
    }
    
    // Update user metadata with new avatar URL
    const { error: updateError } = await getSupabaseClient().auth.updateUser({
      data: { 
        avatar_url: publicUrl,
        // Store the last update timestamp
        avatar_updated_at: new Date().toISOString(),
      }
    });
    
    if (updateError) {
      log.error('Utils', 'Error updating user metadata with avatar URL:', updateError);
      // Still return the URL even if metadata update fails
    }
    
    log.debug('Utils', 'Profile image uploaded successfully:', publicUrl);
    return publicUrl;
  } catch (error) {
    log.error('Utils', 'Unexpected error in uploadProfileImage:', error);
    return null;
  }
}

/**
 * Deletes a profile image from Supabase Storage
 * @param url The URL of the image to delete
 */
export async function deleteProfileImage(url: string): Promise<boolean> {
  try {
    // Extract the file path from the URL
    const urlObject = new URL(url);
    const pathParts = urlObject.pathname.split('/');
    const filePath = pathParts.slice(pathParts.indexOf('avatars') + 1).join('/');
    
    // Delete the file from Supabase Storage
    const { error } = await getSupabaseClient().storage
      .from('avatars')
      .remove([filePath]);
    
    if (error) {
      log.error('Utils', 'Error deleting profile image:', error);
      return false;
    }
    
    log.debug('Utils', 'Profile image deleted successfully');
    return true;
  } catch (error) {
    log.error('Utils', 'Unexpected error in deleteProfileImage:', error);
    return false;
  }
}

/**
 * Gets the current user's profile image URL
 * @returns The profile image URL or null
 */
export async function getProfileImageUrl(): Promise<string | null> {
  try {
    const { data: { user } } = await getSupabaseClient().auth.getUser();
    
    if (!user) {
      return null;
    }
    
    return user.user_metadata?.avatar_url || null;
  } catch (error) {
    log.error('Utils', 'Error getting profile image URL:', error);
    return null;
  }
} 