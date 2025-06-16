import { useState, useEffect, useRef, useMemo } from 'react';
import { useMembersCache } from './useMembersCache';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useSpacePresence } from '@/hooks/useUnifiedPresence';
import type { CachedMemberType } from './useMembersCache';
import type { MemberRole } from '@/contexts/MembershipContext';

// Re-export the type for convenience
export type { CachedMemberType };

interface UseCachedMembersReturn {
  members: CachedMemberType[];
  loading: boolean;
  error: string | null;
  refetch: (forceRefresh?: boolean) => Promise<void>;
  
  // Action handlers
  handleMemberAdded: (member: CachedMemberType) => void;
  handleMemberUpdated: (memberId: string, updates: Partial<CachedMemberType>) => void;
  handleMemberRemoved: (memberId: string) => void;
  handleMemberRoleChanged: (userId: string, newRole: MemberRole) => void;
  
  // Utility functions
  getAdminAndOwnerMembers: () => CachedMemberType[];
  getRegularMembers: () => CachedMemberType[];
  getSpaceOwner: () => CachedMemberType | undefined;
}

export const useCachedMembers = (spaceId: string | undefined): UseCachedMembersReturn => {
  const { user, loading: authLoading } = useOptimizedAuth();
  const { onlineUsers } = useSpacePresence(spaceId || ''); // Get real-time online users
  const {
    fetchMembers,
    getMembers,
    isLoading,
    getError,
    addMember,
    updateMember,
    removeMember,
    updateMemberRole,
  } = useMembersCache();

  // Auto-fetch members when spaceId changes
  useEffect(() => {
    if (spaceId && !authLoading) {
      fetchMembers(spaceId);
    }
  }, [spaceId, fetchMembers, authLoading]);

  // Get current data from cache with safety checks
  const rawMembers = spaceId ? getMembers(spaceId) : [];
  const members = Array.isArray(rawMembers) ? rawMembers : [];
  const loading = authLoading || (spaceId ? isLoading(spaceId) : !spaceId);
  const error = spaceId ? getError(spaceId) : null;

  // Memoize members with real-time online status
  const membersWithRealTimePresence = useMemo(() => {
    return members.map(member => ({
      ...member,
      is_online: onlineUsers.includes(member.user_id) // Override with real-time presence
    }));
  }, [members, onlineUsers]);

  // Refetch function
  const refetch = async (forceRefresh = false) => {
    if (spaceId) {
      await fetchMembers(spaceId, forceRefresh);
    }
  };

  // Action handlers
  const handleMemberAdded = (member: CachedMemberType) => {
    if (spaceId) {
      addMember(spaceId, member);
    }
  };

  const handleMemberUpdated = (memberId: string, updates: Partial<CachedMemberType>) => {
    if (spaceId) {
      updateMember(spaceId, memberId, updates);
    }
  };

  const handleMemberRemoved = (memberId: string) => {
    if (spaceId) {
      removeMember(spaceId, memberId);
    }
  };

  const handleMemberRoleChanged = (userId: string, newRole: MemberRole) => {
    if (spaceId) {
      updateMemberRole(spaceId, userId, newRole);
    }
  };

  // Utility functions with safety checks
  const getAdminAndOwnerMembers = (members: CachedMemberType[]): CachedMemberType[] => {
    if (!Array.isArray(members)) return [];
    return members
      .filter(member => member && (member.role === 'owner' || member.role === 'admin'))
      .sort((a, b) => {
        if (a.role === 'owner' && b.role !== 'owner') return -1;
        if (a.role !== 'owner' && b.role === 'owner') return 1;
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        return (a.full_name || '').localeCompare(b.full_name || '');
      });
  };

  const getRegularMembers = (members: CachedMemberType[]): CachedMemberType[] => {
    if (!Array.isArray(members)) return [];
    return members
      .filter(member => member && member.role !== 'owner' && member.role !== 'admin')
      .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  };

  const getSpaceOwner = (members: CachedMemberType[]): CachedMemberType | undefined => {
    if (!Array.isArray(members)) return undefined;
    return members.find(member => member && member.role === 'owner');
  };

  return {
    members: membersWithRealTimePresence,
    loading,
    error,
    refetch,
    handleMemberAdded,
    handleMemberUpdated,
    handleMemberRemoved,
    handleMemberRoleChanged,
    getAdminAndOwnerMembers: () => getAdminAndOwnerMembers(membersWithRealTimePresence),
    getRegularMembers: () => getRegularMembers(membersWithRealTimePresence),
    getSpaceOwner: () => getSpaceOwner(membersWithRealTimePresence),
  };
} 