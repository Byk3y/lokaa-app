/**
 * Space Types
 * 
 * This file exports all types for the Spaces feature.
 */

// Main Space types
/**
 * Space entity type
 */
export interface Space {
  id: string;
  name: string;
  description: string | null;
  about_description?: string | null;
  cover_image?: string | null;
  icon_image?: string | null;
  avatar?: string;
  cover?: string;
  isPrivate: boolean;
  is_private?: boolean; // Legacy field for compatibility
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  member_count?: number; // Legacy field for compatibility
  subdomain?: string;
  owner: {
    id: string;
    name: string;
    avatar_url?: string;
    avatar?: string;
  };
}

/**
 * Space member type
 */
export interface SpaceMember {
  id: string;
  userId: string;
  spaceId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
}

/**
 * Space creation payload
 */
export interface CreateSpacePayload {
  name: string;
  description: string;
  isPrivate: boolean;
  avatar?: File;
  cover?: File;
}

/**
 * Space update payload
 */
export interface UpdateSpacePayload {
  name?: string;
  description?: string;
  isPrivate?: boolean;
  avatar?: File;
  cover?: File;
}

/**
 * Space store state
 */
export interface SpaceState {
  spaces: Space[];
  currentSpace: Space | null;
  isLoading: boolean;
  error: string | null;
}

// Export membership types
export * from './membership'; 