/**
 * Profile Store
 * 
 * This store manages user profile state using Zustand.
 * It will replace the React Context-based profile management system.
 */

import { create } from 'zustand';
import { UpdateProfilePayload, User } from '../types';

/**
 * Profile state
 */
interface ProfileState {
  profile: User | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Actions for the profile store
 */
interface ProfileActions {
  /**
   * Fetch the current user's profile
   */
  fetchProfile: (userId: string) => Promise<void>;
  
  /**
   * Update the user's profile
   */
  updateProfile: (userId: string, payload: UpdateProfilePayload) => Promise<void>;
  
  /**
   * Set the profile directly
   */
  setProfile: (profile: User | null) => void;
  
  /**
   * Set the loading state
   */
  setLoading: (isLoading: boolean) => void;
  
  /**
   * Set the error state
   */
  setError: (error: string | null) => void;
  
  /**
   * Reset the profile state
   */
  reset: () => void;
}

/**
 * Combined store type
 */
export type ProfileStore = ProfileState & ProfileActions;

/**
 * Initial state
 */
const initialState: ProfileState = {
  profile: null,
  isLoading: false,
  error: null,
};

/**
 * Store for managing user profile state
 */
export const useProfileStore = create<ProfileStore>((set, get) => ({
  // Initial state
  ...initialState,
  
  // Actions
  fetchProfile: async (userId) => {
    set({ isLoading: true, error: null });
    
    try {
      // Will be implemented during migration
      // const { data, error } = await getSupabaseClient()
      //   .from('profiles')
      //   .select('*')
      //   .eq('id', userId)
      //   .single();
      
      // Mock implementation
      const mockProfile: User = {
        id: userId,
        email: 'user@example.com',
        name: 'Test User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        bio: 'This is a test bio',
        profile: {
          id: userId,
          first_name: 'Test',
          last_name: 'User',
          country: 'Nigeria',
          timezone: 'Africa/Lagos',
          hide_from_search: false,
          social_links: {
            twitter: 'https://twitter.com/testuser',
            linkedin: 'https://linkedin.com/in/testuser',
          },
        },
      };
      
      set({ profile: mockProfile, isLoading: false });
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch profile'
      });
    }
  },
  
  updateProfile: async (userId, payload) => {
    set({ isLoading: true, error: null });
    
    try {
      // Will be implemented during migration
      // const { data, error } = await getSupabaseClient()
      //   .from('profiles')
      //   .update({
      //     first_name: payload.firstName,
      //     last_name: payload.lastName,
      //     bio: payload.bio,
      //     country: payload.country,
      //     timezone: payload.timezone,
      //     hide_from_search: payload.hideFromSearch,
      //     social_links: payload.socialLinks,
      //   })
      //   .eq('id', userId);
      
      // Mock implementation - update the current profile with the new values
      const { profile } = get();
      
      if (profile) {
        const updatedProfile = {
          ...profile,
          bio: payload.bio ?? profile.bio,
          profile: {
            ...profile.profile,
            first_name: payload.firstName ?? profile.profile?.first_name,
            last_name: payload.lastName ?? profile.profile?.last_name,
            country: payload.country ?? profile.profile?.country,
            timezone: payload.timezone ?? profile.profile?.timezone,
            hide_from_search: payload.hideFromSearch ?? profile.profile?.hide_from_search,
            social_links: payload.socialLinks ?? profile.profile?.social_links,
          },
        };
        
        set({ profile: updatedProfile, isLoading: false });
      } else {
        throw new Error('No profile to update');
      }
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to update profile'
      });
    }
  },
  
  setProfile: (profile) => {
    set({ profile });
  },
  
  setLoading: (isLoading) => {
    set({ isLoading });
  },
  
  setError: (error) => {
    set({ error });
  },
  
  reset: () => {
    set(initialState);
  },
})); 