/**
 * Auth Hook
 * 
 * This hook provides a convenient interface for authentication operations.
 * It wraps the useOptimizedAuthStore with more domain-specific methods.
 */

import { useCallback } from 'react';
import { useOptimizedAuthStore } from '../store';
import type { AuthCredentials, User } from '../types';

/**
 * Hook that provides authentication utilities
 * FIXED: Renamed to avoid conflict with main AuthContext hook
 */
export const useFeatureAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    signIn,
    signOut,
    signUp,
    refreshSession,
    setUser,
    setError,
    reset
  } = useOptimizedAuthStore();

  /**
   * Login with email and password
   */
  const login = useCallback(async (email: string, password: string) => {
    return signIn({ email, password });
  }, [signIn]);

  /**
   * Register a new user with email and password
   */
  const register = useCallback(async (email: string, password: string) => {
    return signUp({ email, password });
  }, [signUp]);

  /**
   * Logout the current user
   */
  const logout = useCallback(async () => {
    return signOut();
  }, [signOut]);

  /**
   * Update the current user's information
   */
  const updateUser = useCallback((user: User | null) => {
    setUser(user);
  }, [setUser]);

  /**
   * Check if the session is valid and refresh if needed
   */
  const checkSession = useCallback(async () => {
    return refreshSession();
  }, [refreshSession]);

  /**
   * Clear any authentication errors
   */
  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    
    // Actions
    login,
    register,
    logout,
    updateUser,
    checkSession,
    clearError,
    
    // Original store methods for advanced use cases
    reset,
  };
} 