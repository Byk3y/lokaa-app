import { log } from '@/utils/logger';
/**
 * Hook for checking user permissions within a space
 * Provides boolean flags for various permission levels based on user role
 */
import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/contexts/AuthContext';

/**
 * Permission result object returned by the hook
 */
interface SpacePermissionsResult {
  /** True if user is the owner of the space */
  isOwner: boolean;
  /** True if user is an admin of the space */
  isAdmin: boolean;
  /** True if user can edit space details (owner or admin) */
  canEditSpace: boolean;
  /** True if user can manage members (owner or admin) */
  canManageMembers: boolean;
  /** True if user can create content (any active member) */
  canCreateContent: boolean;
  /** True if user can access settings (owner only) */
  canAccessSettings: boolean;
  /** True while permissions are being loaded */
  loading: boolean;
  /** Error object if permission check fails */
  error: Error | null;
  /** Manually refresh permissions */
  refresh: () => void;
}

// Define an interface for the space_members table row
interface SpaceMemberRow {
  id: string;
  space_id: string;
  user_id: string;
  role: 'admin' | 'member' | string; 
  status: 'active' | 'cancelling' | 'churned' | 'banned' | string;
}

// Cache for storing permission results by spaceId and userId
const permissionsCache = new Map<string, SpacePermissionsResult>();

/**
 * FIXED: Converted to const export for React Fast Refresh compatibility
 */
export const useSpacePermissions = (spaceId: string): SpacePermissionsResult => {
  const { user } = useOptimizedAuth();
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isMember, setIsMember] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Generate cache key based on spaceId and userId
  const cacheKey = `${spaceId}:${user?.id || 'anonymous'}`;

  // Function to refresh permissions
  const refresh = useCallback(() => {
    // Clear cache for this space/user
    permissionsCache.delete(cacheKey);
    // Trigger re-fetch
    setRefreshTrigger(prev => prev + 1);
  }, [cacheKey]);

  useEffect(() => {
    // If no user or no spaceId, set default no-permission state
    if (!user || !spaceId) {
      setIsOwner(false);
      setIsAdmin(false);
      setIsMember(false);
      setLoading(false);
      setError(null);
      return;
    }

    // Check if we have cached results
    if (permissionsCache.has(cacheKey)) {
      const cachedResult = permissionsCache.get(cacheKey);
      if (cachedResult) {
        setIsOwner(cachedResult.isOwner);
        setIsAdmin(cachedResult.isAdmin);
        setIsMember(cachedResult.canCreateContent); // Use canCreateContent as it reflects membership
        setLoading(false);
        setError(null);
        return;
      }
    }

    async function checkPermissions() {
      setLoading(true);
      setError(null);

      try {
        // First check if user is the owner
        const { data: spaceData, error: spaceError } = await getSupabaseClient()
          .from('spaces')
          .select('owner_id')
          .eq('id', spaceId)
          .maybeSingle();

        if (spaceError) throw spaceError;

        const userIsOwner = spaceData?.owner_id === user.id;
        setIsOwner(userIsOwner);

        // If user is owner, they're automatically an admin and member
        if (userIsOwner) {
          setIsAdmin(true);
          setIsMember(true);
        } else {
          // If not owner, check space_members for role and membership
          try {
            const { data, error: accessError } = await getSupabaseClient()
              .from('space_members')
              .select('*')
              .eq('space_id', spaceId)
              .eq('user_id', user.id)
              .eq('status', 'active')
              .maybeSingle();

            if (accessError) {
              if (accessError.code === 'PGRST116') {
                // No rows, not an error - user is just not a member
                setIsAdmin(false);
                setIsMember(false);
              } else {
                throw accessError;
              }
            } else if (data) {
              // Using any type to work around TypeScript limitations with dynamic data
              const memberData = data as SpaceMemberRow | null;
              // Check if role is admin
              const userIsAdmin = memberData && memberData.role === 'admin';
              setIsAdmin(userIsAdmin);
              // If they have active membership, they're a member
              setIsMember(true);
            } else {
              setIsAdmin(false);
              setIsMember(false);
            }
          } catch (accessErr) {
            log.error('Hook', 'Error checking membership status:', accessErr);
            setIsAdmin(false);
            setIsMember(false);
          }
        }
      } catch (err) {
        log.error('Hook', 'Error checking space permissions:', err);
        setError(err instanceof Error ? err : new Error('Failed to check permissions'));
        setIsOwner(false);
        setIsAdmin(false);
        setIsMember(false);
      } finally {
        setLoading(false);
      }
    }

    checkPermissions();
  }, [user, spaceId, cacheKey, refreshTrigger]);

  // Compute derived permissions
  const canEditSpace = isOwner || isAdmin;
  const canManageMembers = isOwner || isAdmin;
  const canCreateContent = isMember; // Changed: Any member can create content
  const canAccessSettings = isOwner || isAdmin;

  // Prepare result object
  const result: SpacePermissionsResult = {
    isOwner,
    isAdmin,
    canEditSpace,
    canManageMembers,
    canCreateContent,
    canAccessSettings,
    loading,
    error,
    refresh
  };

  // Cache the results
  if (!loading && !error) {
    permissionsCache.set(cacheKey, result);
  }

  return result;
} 