import { getSupabaseClient } from "@/integrations/supabase/client";

/**
 * Uploads a profile image to Supabase Storage and updates the user's metadata
 * @param file The image file to upload
 * @returns The public URL of the uploaded image or null if upload failed
 */
export const uploadProfileImage = async (file: File | Blob): Promise<string | null> => {
  try {
    // Get current user
    const { data: { user } } = await getSupabaseClient().auth.getUser();
    if (!user) {
      console.error("No authenticated user found");
      return null;
    }
    
    // Create a unique file path using user ID and timestamp
    const fileName = `${Date.now()}.jpg`;
    const filePath = `profiles/${user.id}/${fileName}`;
    
    // Upload the file to Supabase Storage
    const { data, error } = await getSupabaseClient().storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true, // Overwrite if file exists
        contentType: file instanceof File ? file.type : 'image/jpeg',
      });
    
    if (error) {
      console.error('Error uploading image:', error);
      return null;
    }
    
    // Get the public URL for the uploaded image
    const { data: { publicUrl } } = getSupabaseClient().storage
      .from('avatars')
      .getPublicUrl(filePath);
    
    if (!publicUrl) {
      console.error('Failed to get public URL for uploaded image');
      return null;
    }
    
    // Update user metadata with the new avatar URL
    const { error: updateError } = await getSupabaseClient().auth.updateUser({
      data: { 
        avatar_url: publicUrl,
        avatar_path: filePath,
        avatar_updated_at: new Date().toISOString(),
      }
    });
    
    // NEW: Update the users table with the avatar_url
    const { error: dbUpdateError } = await getSupabaseClient()
      .from('users')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id);
    if (dbUpdateError) {
      console.error('Error updating users table with avatar_url:', dbUpdateError);
    }
    
    return publicUrl;
  } catch (error) {
    console.error('Unexpected error in uploadProfileImage:', error);
    return null;
  }
};

/**
 * Gets the current user's profile image URL from their metadata
 * @returns The profile image URL or null if not found
 */
export const getProfileImageUrl = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await getSupabaseClient().auth.getUser();
    
    if (!user) {
      return null;
    }
    
    return user.user_metadata?.avatar_url || null;
  } catch (error) {
    console.error('Error getting profile image URL:', error);
    return null;
  }
};

/**
 * Deletes a user's profile image from Supabase Storage
 * @param imageUrl The URL of the image to delete (optional - if not provided, deletes based on user metadata)
 * @returns true if deletion was successful, false otherwise
 */
export const deleteProfileImage = async (imageUrl?: string): Promise<boolean> => {
  try {
    const { data: { user } } = await getSupabaseClient().auth.getUser();
    
    if (!user) {
      return false;
    }

    let filePath: string | null = null;
    
    // If we have the path stored in metadata, use that
    if (user.user_metadata?.avatar_path) {
      filePath = user.user_metadata.avatar_path;
    }
    // Otherwise try to extract it from the URL
    else if (imageUrl || user.user_metadata?.avatar_url) {
      const url = imageUrl || user.user_metadata?.avatar_url;
      if (!url) return false;
      
      try {
        // URL format: https://[project-ref].getSupabaseClient().co/storage/v1/object/public/avatars/profiles/[user-id]/[filename]
        const urlObj = new URL(url);
        const pathSegments = urlObj.pathname.split('/');
        const avatarsIndex = pathSegments.findIndex(segment => segment === 'avatars');
        
        if (avatarsIndex !== -1 && avatarsIndex < pathSegments.length - 1) {
          filePath = pathSegments.slice(avatarsIndex + 1).join('/');
        }
      } catch (e) {
        console.error('Error parsing image URL:', e);
        return false;
      }
    }
    
    if (!filePath) {
      console.error('Could not determine file path for deletion');
      return false;
    }
    
    // Delete the file
    const { error } = await getSupabaseClient().storage
      .from('avatars')
      .remove([filePath]);
    
    if (error) {
      console.error('Error deleting profile image:', error);
      return false;
    }
    
    // Update user metadata to remove the avatar URL
    const { error: updateError } = await getSupabaseClient().auth.updateUser({
      data: { 
        avatar_url: null,
        avatar_path: null,
      }
    });
    
    if (updateError) {
      console.error('Error updating user metadata:', updateError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Unexpected error in deleteProfileImage:', error);
    return false;
  }
};

/**
 * Creates a data URL from a file object
 * @param file The file to convert
 * @returns Promise that resolves with the data URL
 */
export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Creates an image element from a URL
 * @param url The URL to load
 * @returns Promise that resolves with an HTMLImageElement
 */
export const urlToImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};

/**
 * Convert an image to a JPEG blob with optional resizing
 * @param image The image element
 * @param maxWidth Maximum width to resize to (optional)
 * @param maxHeight Maximum height to resize to (optional)
 * @param quality JPEG quality (0-1, default 0.9)
 * @returns Promise that resolves with a Blob
 */
export const imageToJpegBlob = (
  image: HTMLImageElement,
  maxWidth?: number,
  maxHeight?: number,
  quality = 0.9
): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  let width = image.width;
  let height = image.height;
  
  // Resize if needed
  if (maxWidth && maxHeight && (width > maxWidth || height > maxHeight)) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.floor(width * ratio);
    height = Math.floor(height * ratio);
  }
  
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return Promise.reject(new Error('Could not get canvas context'));
  }
  
  ctx.drawImage(image, 0, 0, width, height);
  
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        throw new Error('Canvas to Blob conversion failed');
      }
    }, 'image/jpeg', quality);
  });
}; 