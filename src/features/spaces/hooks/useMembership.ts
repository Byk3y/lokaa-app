/**
 * Membership Hook
 * 
 * This hook provides a convenient interface for space membership operations.
 * It wraps the useMembershipStore with more domain-specific methods.
 */

import { useCallback, useEffect } from 'react';
import { useMembershipStore } from '../store/membership-store';
import { MemberRole, FetchMembersOptions, SpaceMember } from '../types/membership';

interface UseMembershipOptions {
  /**
   * Space ID to check membership for
   */
  spaceId?: string;
  
  /**
   * Owner ID for the space (if known)
   */
  ownerId?: string;
  
  /**
   * Disable automatic initialization
   */
  disableAutoInit?: boolean;
}

/**
 * Hook for working with space membership
 * FIXED: Converted to const export for React Fast Refresh compatibility
 */
export const useMembership = (options: UseMembershipOptions = {}) => {
  const { spaceId, ownerId, disableAutoInit = false } = options;
  
  const {
    // State
    isMember,
    isOwner,
    isAdmin,
    role,
    status,
    loading,
    error,
    currentSpaceId,
    
    // Actions
    initializeSpace,
    checkMembershipStatus,
    joinSpace,
    leaveSpace,
    changeMemberRole,
    removeMember,
    fetchMembers,
    refreshMembership,
    clearCache,
    setCurrentSpaceId,
    setError,
  } = useMembershipStore();
  
  // Initialize membership data when spaceId is provided
  useEffect(() => {
    if (spaceId && !disableAutoInit) {
      initializeSpace(spaceId, ownerId);
    }
  }, [spaceId, ownerId, disableAutoInit, initializeSpace]);
  
  /**
   * Join the current space
   */
  const join = useCallback(async () => {
    if (!spaceId && !currentSpaceId) {
      throw new Error('No space ID provided for join operation');
    }
    return joinSpace(spaceId || currentSpaceId!);
  }, [spaceId, currentSpaceId, joinSpace]);
  
  /**
   * Leave the current space
   */
  const leave = useCallback(async () => {
    if (!spaceId && !currentSpaceId) {
      throw new Error('No space ID provided for leave operation');
    }
    return leaveSpace(spaceId || currentSpaceId!);
  }, [spaceId, currentSpaceId, leaveSpace]);
  
  /**
   * Change a user's role in the current space
   */
  const changeRole = useCallback(async (userId: string, role: MemberRole) => {
    if (!spaceId && !currentSpaceId) {
      throw new Error('No space ID provided for role change operation');
    }
    return changeMemberRole(spaceId || currentSpaceId!, userId, role);
  }, [spaceId, currentSpaceId, changeMemberRole]);
  
  /**
   * Remove a user from the current space
   */
  const removeMemberFromSpace = useCallback(async (userId: string) => {
    if (!spaceId && !currentSpaceId) {
      throw new Error('No space ID provided for member removal');
    }
    return removeMember(spaceId || currentSpaceId!, userId);
  }, [spaceId, currentSpaceId, removeMember]);
  
  /**
   * Get members of the current space
   */
  const getMembers = useCallback(async (options: FetchMembersOptions = {}) => {
    if (!spaceId && !currentSpaceId) {
      throw new Error('No space ID provided for fetching members');
    }
    return fetchMembers(spaceId || currentSpaceId!, options);
  }, [spaceId, currentSpaceId, fetchMembers]);
  
  /**
   * Refresh membership data
   */
  const refresh = useCallback(() => {
    if (spaceId) {
      checkMembershipStatus(spaceId, ownerId);
    } else {
      refreshMembership();
    }
  }, [spaceId, ownerId, checkMembershipStatus, refreshMembership]);
  
  /**
   * Check if user has specific permissions in the space
   */
  const hasPermission = useCallback((requiredRole: MemberRole) => {
    if (requiredRole === 'owner') {
      return isOwner;
    }
    if (requiredRole === 'admin') {
      return isOwner || isAdmin;
    }
    return isMember;
  }, [isMember, isOwner, isAdmin]);
  
  /**
   * Clear any membership errors
   */
  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);
  
  return {
    // State
    isMember,
    isOwner,
    isAdmin,
    role,
    status,
    loading,
    error,
    currentSpaceId,
    
    // Simplified actions
    join,
    leave,
    changeRole,
    removeMemberFromSpace,
    getMembers,
    refresh,
    hasPermission,
    clearError,
    
    // Original store methods for advanced use cases
    initializeSpace,
    checkMembershipStatus,
    joinSpace,
    leaveSpace,
    changeMemberRole,
    removeMember,
    fetchMembers,
    refreshMembership,
    clearCache,
    setCurrentSpaceId,
  };
} 