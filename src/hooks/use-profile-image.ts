import { log } from '@/utils/logger';
import { useState, useEffect } from 'react';
import { 
  uploadProfileImage, 
  getProfileImageUrl, 
  deleteProfileImage 
} from '@/utils/profileImageUtils';
import { getSupabaseClient } from '@/integrations/supabase/client';

/**
 * Hook for managing profile images
 * @returns Object with profile image state and functions
 */
export function useProfileImage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the profile image URL on mount
  useEffect(() => {
    let isMounted = true;

    const loadProfileImage = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const url = await getProfileImageUrl();
        if (isMounted) {
          setImageUrl(url);
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to load profile image');
          log.error('Hook', err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Set up auth state change listener to update image when user changes
    const { data: { subscription } } = getSupabaseClient().auth.onAuthStateChange(() => {
      loadProfileImage();
    });

    loadProfileImage();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Upload a new profile image
   * @param file The file to upload
   * @returns The URL of the uploaded image or null if failed
   */
  const uploadImage = async (file: File | Blob): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = await uploadProfileImage(file);
      if (url) {
        setImageUrl(url);
        return url;
      } else {
        setError('Failed to upload image');
        return null;
      }
    } catch (err) {
      setError('Error uploading image');
      log.error('Hook', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Delete the current profile image
   * @returns true if successfully deleted, false otherwise
   */
  const deleteImage = async (): Promise<boolean> => {
    if (!imageUrl) return false;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await deleteProfileImage(imageUrl);
      if (success) {
        setImageUrl(null);
        return true;
      } else {
        setError('Failed to delete image');
        return false;
      }
    } catch (err) {
      setError('Error deleting image');
      log.error('Hook', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh the profile image URL
   */
  const refreshImage = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = await getProfileImageUrl();
      setImageUrl(url);
    } catch (err) {
      setError('Failed to refresh profile image');
      log.error('Hook', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    imageUrl,
    isLoading,
    error,
    uploadImage,
    deleteImage,
    refreshImage,
  };
} 