/**
 * Profile Hook
 * 
 * This hook provides a convenient interface for user profile operations.
 * It wraps the useProfileStore with more domain-specific methods.
 */

import { useCallback } from 'react';
import { useProfileStore } from '../store';
import type { UpdateProfilePayload, User } from '../types';

/**
 * Hook that provides profile utilities
 */
export function useProfile() {
  const {
    profile,
    isLoading,
    error,
    fetchProfile,
    updateProfile,
    setProfile,
    setError,
    reset
  } = useProfileStore();

  /**
   * Load a user's profile by ID
   */
  const loadProfile = useCallback(async (userId: string) => {
    return fetchProfile(userId);
  }, [fetchProfile]);

  /**
   * Update the current profile
   */
  const updateUserProfile = useCallback(async (
    userId: string,
    updates: {
      firstName?: string;
      lastName?: string;
      bio?: string;
      country?: string;
      timezone?: string;
      hideFromSearch?: boolean;
      socialLinks?: Record<string, string>;
    }
  ) => {
    return updateProfile(userId, updates);
  }, [updateProfile]);

  /**
   * Set profile data directly (useful for integration with other parts of the app)
   */
  const setProfileData = useCallback((profileData: User | null) => {
    setProfile(profileData);
  }, [setProfile]);

  /**
   * Clear any profile errors
   */
  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  /**
   * Get the user's full name
   */
  const getFullName = useCallback(() => {
    if (!profile?.profile) return profile?.name || '';
    
    const { first_name, last_name } = profile.profile;
    
    if (first_name && last_name) {
      return `${first_name} ${last_name}`;
    } else if (first_name) {
      return first_name;
    } else if (last_name) {
      return last_name;
    }
    
    return profile.name || '';
  }, [profile]);

  /**
   * Get the user's avatar URL
   */
  const getAvatarUrl = useCallback(() => {
    return profile?.avatar_url || '';
  }, [profile]);

  return {
    // State
    profile,
    isLoading,
    error,
    
    // Computed values
    fullName: getFullName(),
    avatarUrl: getAvatarUrl(),
    
    // Actions
    loadProfile,
    updateUserProfile,
    setProfileData,
    clearError,
    getFullName,
    getAvatarUrl,
    
    // Original store methods for advanced use cases
    reset,
  };
} 