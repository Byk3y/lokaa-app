import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type ProfileImageContextType = {
  profileImageUrl: string | null;
  setProfileImageUrl: (url: string | null) => void;
  refreshProfileImage: () => Promise<void>;
};

const ProfileImageContext = createContext<ProfileImageContextType | undefined>(undefined);

export function ProfileImageProvider({ children }: { children: React.ReactNode }) {
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  // Initialize from localStorage and then from Supabase
  useEffect(() => {
    const storedImageUrl = localStorage.getItem('lokaa_profile_image');
    if (storedImageUrl) {
      setProfileImageUrl(storedImageUrl);
    }
    
    // Also fetch the latest from Supabase
    refreshProfileImage();

    // Listen for auth state changes to update the profile image
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'USER_UPDATED' || event === 'SIGNED_IN') {
        refreshProfileImage();
      } else if (event === 'SIGNED_OUT') {
        setProfileImageUrl(null);
        localStorage.removeItem('lokaa_profile_image');
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Update localStorage when the profileImageUrl changes
  useEffect(() => {
    if (profileImageUrl) {
      localStorage.setItem('lokaa_profile_image', profileImageUrl);
    }
  }, [profileImageUrl]);

  // Function to fetch the latest profile image from Supabase
  const refreshProfileImage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.avatar_url) {
        setProfileImageUrl(user.user_metadata.avatar_url);
      }
    } catch (error) {
      console.error('Error fetching profile image:', error);
    }
  };

  return (
    <ProfileImageContext.Provider value={{ profileImageUrl, setProfileImageUrl, refreshProfileImage }}>
      {children}
    </ProfileImageContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProfileImage() {
  const context = useContext(ProfileImageContext);
  if (context === undefined) {
    throw new Error('useProfileImage must be used within a ProfileImageProvider');
  }
  return context;
} 