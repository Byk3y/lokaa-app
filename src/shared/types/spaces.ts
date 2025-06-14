/**
 * Shared space types and interfaces
 */

// Space data structure for redirection and caching
export interface SpaceRedirectData {
  id: string;
  subdomain: string;
  name?: string;
  owner_id?: string;
  created_at?: string;
}

// Basic space information
export interface SpaceInfo {
  id: string;
  subdomain: string;
  name: string | null;
}

// User space counts
export interface UserSpaceCounts {
  ownedCount: number;
  joinedCount: number;
  totalCount: number;
}

// Space with basic details for user queries
export interface UserSpaceInfo {
  id: string;
  subdomain: string;
  name?: string;
}

// Nested space information for database queries
export interface NestedSpaceInfo {
  id: string;
  subdomain: string;
  name: string | null;
}

// Space access record with nested space details
export interface SpaceAccessRecordWithDetails {
  space_id: string;
  spaces: NestedSpaceInfo | null;
}

// Space access record with space data for queries
export interface UserAccessRecordWithSpace {
  id: string;
  space_id: string;
  spaces: UserAccessSpaceData | null;
}

// User access space data
export interface UserAccessSpaceData {
  id: string;
  name: string | null;
  subdomain: string;
}

// Cache entry for space preferences
export interface SpaceCacheEntry {
  id: string;
  name?: string;
  subdomain: string;
  timestamp?: string;
  joinedAt?: string;
  owner_id?: string;
  created_at?: string;
} 