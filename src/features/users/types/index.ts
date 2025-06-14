/**
 * User Types
 * 
 * This file defines the types used throughout the Users feature.
 */

/**
 * User entity type
 */
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  bio?: string;
  profile?: {
    id: string;
    first_name?: string;
    last_name?: string;
    country?: string;
    timezone?: string;
    hide_from_search?: boolean;
    social_links?: Record<string, string>;
  };
}

/**
 * Authentication state
 */
export interface AuthState {
  user: User | null;
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  } | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

/**
 * User profile update payload
 */
export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  bio?: string;
  country?: string;
  timezone?: string;
  hideFromSearch?: boolean;
  socialLinks?: Record<string, string>;
}

/**
 * Auth credentials
 */
export interface AuthCredentials {
  email: string;
  password: string;
} 