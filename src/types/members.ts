/**
 * Type definitions for space members and related models
 */

// Member role type from database
export type MemberRole = 'owner' | 'admin' | 'member';

// Member status type from our database enum
export type MemberStatus = 'active' | 'cancelling' | 'churned' | 'banned';

/**
 * Interface for a member in a space
 * Maps to the space_members_view in database
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
  
  // User fields
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  
  // Space fields
  space_name?: string;
  space_subdomain?: string;
  
  // UI display helpers
  formattedJoinDate?: string;
}

/**
 * Interface for member stats displayed in pills
 */
export interface MemberStats {
  totalMembers: number;
  onlineMembers: number;
  adminCount: number;
}

/**
 * Member filter and search options
 */
export interface MemberFilterOptions {
  status: MemberStatus;
  searchQuery: string;
  role?: MemberRole;
}

/**
 * Hook parameters for fetching members
 */
export interface UseMembersParams {
  spaceId: string;
  status?: MemberStatus;
  searchQuery?: string;
  limit?: number;
  page?: number;
} 