import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { log } from '@/utils/logger';
import { getSupabaseClient } from '@/integrations/supabase/client';
import React from 'react';

interface ProfileImageState {
  profileImageUrl: string | null;
  isLoading: boolean;
  
  // Actions
  setProfileImageUrl: (url: string | null) => void;
  refreshProfileImage: () => Promise<void>;
  clearProfileImage: () => void;
  initializeProfileImage: () => Promise<void>;
}

export const useProfileImageStore = create<ProfileImageState>()(
  persist(
    (set, get) => ({
        // Initial state
        profileImageUrl: null,
        isLoading: false,
        
        // Actions
        setProfileImageUrl: (url: string | null) => {
          set({ profileImageUrl: url });
        },
        
        refreshProfileImage: async () => {
          try {
            set({ isLoading: true });
            const { data: { user } } = await getSupabaseClient().auth.getUser();
            
            if (user?.user_metadata?.avatar_url) {
              set({ 
                profileImageUrl: user.user_metadata.avatar_url,
                isLoading: false 
              });
            } else {
              set({ isLoading: false });
            }
          } catch (error) {
            log.error('ProfileImageStore', 'Error fetching profile image:', error);
            set({ isLoading: false });
          }
        },
        
        clearProfileImage: () => {
          set({ profileImageUrl: null });
        },
        
        initializeProfileImage: async () => {
          // This will be called once when the store is first used
          await get().refreshProfileImage();
        },
    }),
    {
      name: 'profile-image-store',
      partialize: (state) => ({ profileImageUrl: state.profileImageUrl }),
    }
  )
);

// Setup auth state listener (outside of the store to avoid hook issues)
if (typeof window !== 'undefined') {
  const { data: authListener } = getSupabaseClient().auth.onAuthStateChange((event) => {
    const store = useProfileImageStore.getState();
    
    if (event === 'USER_UPDATED' || event === 'SIGNED_IN') {
      store.refreshProfileImage();
    } else if (event === 'SIGNED_OUT') {
      store.clearProfileImage();
    }
  });
  
  // Note: In a real application, you might want to cleanup this listener
  // when the app unmounts, but for now we'll keep it global
}

// Convenience hook that matches the original useProfileImage interface
export function useProfileImageHook() {
  const store = useProfileImageStore();
  
  // Initialize on first use
  React.useEffect(() => {
    if (!store.profileImageUrl && !store.isLoading) {
      store.initializeProfileImage();
    }
  }, [store.profileImageUrl, store.isLoading, store.initializeProfileImage]);
  
  return {
    profileImageUrl: store.profileImageUrl,
    setProfileImageUrl: store.setProfileImageUrl,
    refreshProfileImage: store.refreshProfileImage,
  };
}
