/**
 * Space Membership Types
 * 
 * This file defines the types used for space membership functionality.
 */

/**
 * Member role in a space
 */
export type MemberRole = 'owner' | 'admin' | 'member';

/**
 * Status of a member in a space
 */
export type MemberStatus = 'active' | 'cancelling' | 'churned' | 'banned';

/**
 * Membership state
 */
export interface MembershipState {
  isMember: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  role: MemberRole | null;
  status: MemberStatus | null;
  loading: boolean;
  error: string | null;
}

/**
 * Space member entity
 */
export interface SpaceMember {
  id: string;
  space_id: string;
  user_id: string;
  joined_at: string;
  role: MemberRole;
  status: MemberStatus;
  is_online: boolean;
  last_active_at: string | null;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
}

/**
 * Options for fetching space members
 */
export interface FetchMembersOptions {
  status?: MemberStatus;
  searchQuery?: string;
  limit?: number;
  page?: number;
}

/**
 * Membership cache
 */
export interface MembershipCache {
  [spaceId: string]: {
    state: MembershipState;
    timestamp: number;
    members?: SpaceMember[];
  };
}

/**
 * Join space API response
 */
export interface JoinSpaceResponse {
  success: boolean;
  message: string;
  space_id?: string;
} 