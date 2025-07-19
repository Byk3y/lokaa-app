import { log } from '@/utils/logger';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/contexts/AuthContext';
import { useSpace } from '@/contexts/SpaceContext';
import { toast } from '@/hooks/use-toast';
import { migrationAdapter } from '@/utils/indexeddb/migration/MigrationAdapter';

// Type definitions
export type MemberRole = 'owner' | 'admin' | 'member';
export type MemberStatus = 'active' | 'cancelling' | 'churned' | 'banned';

export interface MembershipState {
  isMember: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  role: MemberRole | null;
  status: MemberStatus | null;
  loading: boolean;
  error: Error | null;
}

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

export interface MembershipContextValue extends MembershipState {
  // Core membership operations
  joinSpace: (spaceId: string) => Promise<boolean>;
  leaveSpace: (spaceId: string) => Promise<boolean>;
  changeMemberRole: (spaceId: string, userId: string, role: MemberRole) => Promise<boolean>;
  removeMember: (spaceId: string, userIdOfMemberToRemove: string) => Promise<boolean>;
  
  // Member listing and management
  fetchMembers: (spaceId: string, options?: {
    status?: MemberStatus,
    searchQuery?: string,
    limit?: number,
    page?: number
  }) => Promise<SpaceMember[]>;
  
  // Utility functions
  refreshMembership: () => void;
  clearCache: () => void;
}

// Cache for membership state
interface MembershipCache {
  [spaceId: string]: {
    state: MembershipState;
    timestamp: number;
    members?: SpaceMember[];
  };
}

// Define types for Supabase responses
interface SpaceAccessRecord {
  id: string;
  user_id: string;
  space_id: string;
  role: string;
  is_active: boolean;
  created_at: string | null;
}

interface UserRecord {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

// Define a JsonValue type for better RPC return typing
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

// Specific type for public_join_space RPC response
interface JoinSpaceRpcResponse {
  success: boolean;
  message: string;
  space_id?: string;
}

// Type for raw data from space_members joined with users
interface RawFetchedSpaceMember {
  id: string;
  user_id: string;
  space_id: string;
  role: string; // Raw role from DB
  joined_at: string;
  status: string; // Raw status from DB
  is_online: boolean;
  last_active_at: string | null;
  users: UserRecord | { error: unknown; [key: string]: any } | null; // Accommodate Supabase error for joins
}

// Cache TTL in milliseconds (30 seconds)
const CACHE_TTL = 30 * 1000;

// Global in-memory cache to persist across component unmounts
const globalMembershipCache: MembershipCache = {};

// Create the context
const MembershipContext = createContext<MembershipContextValue | null>(null);

// Provider component
export function MembershipProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useOptimizedAuth();
  const { space: spaceData, loading: spaceContextLoading } = useSpace();
  const [membershipState, setMembershipState] = useState<MembershipState>({
    isMember: false,
    isOwner: false,
    isAdmin: false,
    role: null,
    status: null,
    loading: true,
    error: null
  });
  
  const [localCache, setLocalCache] = useState<MembershipCache>(globalMembershipCache);
  const ongoingRequests = useMemo(() => new Map<string, Promise<void>>(), []);
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        log.debug('Context', '[MembershipContext] Tab became visible. Clearing ongoingRequests.');
        if (ongoingRequests.size > 0) {
          ongoingRequests.clear();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [ongoingRequests]);
  
  const checkMembershipStatus = useCallback(async (spaceId: string) => {
    if (!user || !spaceId) {
      setMembershipState(prev => ({
        ...prev,
        isMember: false, isOwner: false, isAdmin: false,
        role: null, status: null, loading: false, error: null
      }));
      return;
    }
    
    const requestKey = `check_${spaceId}_${user.id}`;
    if (ongoingRequests.has(requestKey)) return;
    
    setMembershipState(prev => ({ ...prev, loading: true, error: null }));
    
    const requestPromise = (async () => {
      try {
        const now = Date.now();
        const cachedData = localCache[spaceId];
        
        if (cachedData && now - cachedData.timestamp < CACHE_TTL) {
          setMembershipState(cachedData.state);
          return;
        }
        
        if (spaceData && spaceData.id === spaceId && user && spaceData.owner_id === user.id) {
          const newState: MembershipState = {
            isMember: true, isOwner: true, isAdmin: true,
            role: 'owner', status: 'active', loading: false, error: null
          };
          setMembershipState(newState);
          globalMembershipCache[spaceId] = { state: newState, timestamp: now };
          setLocalCache(prevCache => ({ ...prevCache, [spaceId]: globalMembershipCache[spaceId] }));
          return;
        }
        
        const { data: memberData, error: dbError } = await getSupabaseClient()
          .from('space_members')
          .select('role, status')
          .eq('user_id', user.id)
          .eq('space_id', spaceId)
          .eq('status', 'active')
          .maybeSingle();

        if (dbError && dbError.code !== 'PGRST116') {
          throw new Error(dbError.message);
        }

        let newState: MembershipState;
        if (memberData) {
          const typedMemberData = memberData as { role: MemberRole; status: MemberStatus };
          newState = {
            isMember: typedMemberData.status === 'active',
            isOwner: false,
            isAdmin: typedMemberData.role === 'admin',
            role: typedMemberData.role,
            status: typedMemberData.status,
            loading: false, error: null
          };
        } else {
          newState = {
            isMember: false, isOwner: false, isAdmin: false,
            role: null, status: null, loading: false, error: null
          };
        }
        setMembershipState(newState);
        globalMembershipCache[spaceId] = { state: newState, timestamp: now };
        setLocalCache(prevCache => ({ ...prevCache, [spaceId]: globalMembershipCache[spaceId] }));
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to check membership";
        setMembershipState(prev => ({ ...prev, loading: false, error: new Error(errorMessage) }));
      } finally {
        ongoingRequests.delete(requestKey);
      }
    })();
    ongoingRequests.set(requestKey, requestPromise);
  }, [user, spaceData, localCache, ongoingRequests, setLocalCache]);
  
  useEffect(() => {
    if (authLoading || spaceContextLoading) {
      setMembershipState({
        isMember: false, isOwner: false, isAdmin: false,
        role: null, status: null, loading: true, error: null
      });
      return;
    }
    if (!user || !spaceData) {
      setMembershipState({
        isMember: false, isOwner: false, isAdmin: false,
        role: null, status: null, loading: false, error: null
      });
      return;
    }
    checkMembershipStatus(spaceData.id);
  }, [user, spaceData, authLoading, spaceContextLoading, checkMembershipStatus]);
  
  const joinSpace = useCallback(async (spaceId: string): Promise<boolean> => {
    if (!user) {
      toast({ title: "Login required", description: "You need to be logged in to join a space." });
      return false;
    }
    setMembershipState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await getSupabaseClient().rpc<
        'public_join_space',
        { Args: { p_space_id: string }; Returns: Record<string, JsonValue>; }
      >('public_join_space', { p_space_id: spaceId });

      if (error) {
        toast({ title: "Error Joining Space", description: error.message, variant: "destructive" });
        setMembershipState(prev => ({ ...prev, loading: false, error }));
        return false;
      }
      const response = data as unknown as JoinSpaceRpcResponse;
      if (response && response.success) {
        toast({ title: response.message.includes("reactivated") ? "Membership Reactivated" : "Joined Space", description: response.message });
        if ((spaceData && spaceData.id === spaceId) || (response.space_id && response.space_id === spaceData?.id)) {
          await checkMembershipStatus(spaceId); 
        }
        setMembershipState(prev => ({ ...prev, loading: false }));
        return true;
      } else {
        toast({ title: "Could Not Join Space", description: response?.message || "Join failed.", variant: "destructive" });
        setMembershipState(prev => ({ ...prev, loading: false, error: new Error(response?.message || "Join failed") }));
        return false;
      }
    } catch (rpcCatchError: unknown) {
      const message = rpcCatchError instanceof Error ? rpcCatchError.message : String(rpcCatchError);
      toast({ title: "RPC Exception", description: message, variant: "destructive" });
      setMembershipState(prev => ({ ...prev, loading: false, error: new Error(message) }));
      return false;
    }
  }, [user, spaceData, checkMembershipStatus, setMembershipState]);
  
  const leaveSpace = useCallback(async (spaceId: string): Promise<boolean> => {
    if (!user) {
      toast({ title: "Login Required", description: "You must be logged in to leave a space.", variant: "destructive" });
      return false;
    }
    if (membershipState.isOwner) {
      toast({ title: "Cannot Leave Space", description: "As the owner, you cannot leave. Transfer ownership first.", variant: "destructive" });
      return false;
    }
    try {
      const { error } = await getSupabaseClient()
        .from('space_members')
        .delete()
        .match({ user_id: user.id, space_id: spaceId });
      
      if (error) throw error;
      
      setMembershipState(prev => ({
        ...prev, isMember: false, isAdmin: false, role: null, status: null
      }));
      const updatedCache = {...localCache};
      if (updatedCache[spaceId]) {
        delete updatedCache[spaceId];
        setLocalCache(updatedCache);
        delete globalMembershipCache[spaceId];
      }
      toast({ title: "Left Space", description: "You have successfully left this space." });
      log.debug('Context', '[Membership] Successfully deleted from space_members. Corresponding space_access update handled by backend if necessary.');
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Error Leaving Space", description: message, variant: "destructive" });
      return false;
    }
  }, [user, membershipState.isOwner, localCache, setLocalCache, setMembershipState]);
  
  const changeMemberRole = useCallback(async (
    spaceId: string, userId: string, role: 'admin' | 'member'
  ): Promise<boolean> => {
    if (!user) return false;
    try {
      if (!membershipState.isOwner && !membershipState.isAdmin) {
        toast({ title: "Permission denied", description: "Not allowed to change roles.", variant: "destructive" });
        return false;
      }
      if (membershipState.isAdmin && !membershipState.isOwner) {
        // CRITICAL FIX: Use bridge instead of direct call to prevent mobile blocking
        const result = await migrationAdapter.getSpaceMembers(spaceId, { 
          userId, 
          forceNetwork: false 
        });
        
        const targetUser = result.data?.find((member: any) => member.user_id === userId);
        const memberRole = targetUser?.role as MemberRole | undefined;
        if (memberRole && (memberRole === 'admin' || memberRole === 'owner')) {
          toast({ title: "Permission denied", description: "Admins cannot modify other admins or owner.", variant: "destructive" });
          return false;
        }
      }
      const { error } = await getSupabaseClient().from('space_members').update({ role }).eq('user_id', userId).eq('space_id', spaceId);
      if (error) throw error;
      if (userId === user.id) {
        const isAdmin = role === 'admin';
        setMembershipState(prev => ({ ...prev, isAdmin, role }));
        // Simplified cache update for self-role change
        const now = Date.now();
        if (localCache[spaceId]) {
            const updatedState = { ...localCache[spaceId].state, isAdmin, role };
            globalMembershipCache[spaceId] = { ...localCache[spaceId], state: updatedState, timestamp: now };
            setLocalCache(prev => ({ ...prev, [spaceId]: globalMembershipCache[spaceId]}));
        }
      }
      toast({ title: "Role updated", description: `Member role updated to ${role}.` });
      // Record history (optional, can be trigger-based)
      // try { ... getSupabaseClient().from('membership_history').insert ... } catch {}
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Error updating role", description: message, variant: "destructive" });
      return false;
    }
  }, [user, membershipState, localCache, setLocalCache, setMembershipState]);
  
  const removeMember = useCallback(async (
    spaceId: string, userIdOfMemberToRemove: string
  ): Promise<boolean> => {
    if (!user || !spaceData) return false;
    
    log.debug('Context', `🔧 [MembershipContext] Starting member removal:`, {
      spaceId,
      userIdOfMemberToRemove,
      currentUserId: user.id,
      spaceName: spaceData.name,
      isOwner: membershipState.isOwner,
      isAdmin: membershipState.isAdmin
    });
    
    try {
      if (!membershipState.isOwner && !membershipState.isAdmin) {
        const errorMsg = "No permission to remove members.";
        log.error('Context', `🚨 [MembershipContext] Permission denied:`, errorMsg);
        toast({ title: "Permission Denied", description: errorMsg, variant: "destructive" });
        return false;
      }
      if (userIdOfMemberToRemove === spaceData.owner_id) {
        const errorMsg = "Owner cannot be removed.";
        log.error('Context', `🚨 [MembershipContext] Cannot remove owner:`, errorMsg);
        toast({ title: "Action Not Allowed", description: errorMsg, variant: "destructive" });
        return false;
      }
      if (userIdOfMemberToRemove === user.id) {
        const errorMsg = "Use 'Leave Space' for yourself.";
        log.error('Context', `🚨 [MembershipContext] Cannot remove self:`, errorMsg);
        toast({ title: "Action Not Allowed", description: errorMsg, variant: "destructive" });
        return false;
      }
      if (membershipState.isAdmin && !membershipState.isOwner) {
        log.debug('Context', `🔍 [MembershipContext] Admin attempting removal - checking target user role...`);
        // CRITICAL FIX: Use bridge instead of direct call to prevent mobile blocking
        const result = await migrationAdapter.getSpaceMembers(spaceId, { 
          userId: userIdOfMemberToRemove, 
          forceNetwork: false 
        });
        
        const targetUser = result.data?.find((member: any) => member.user_id === userIdOfMemberToRemove);
        log.debug('Context', `🔍 [MembershipContext] Target user check result:`, { targetUser, error: result.error });
        
        if (result.error) {
          log.error('Context', `🚨 [MembershipContext] Error checking target user:`, result.error);
          throw result.error;
        }
        if (targetUser?.role === 'admin') {
          const errorMsg = "Admins cannot remove other admins.";
          log.error('Context', `🚨 [MembershipContext] Admin cannot remove admin:`, errorMsg);
          toast({ title: "Permission Denied", description: errorMsg, variant: "destructive" });
          return false;
        }
      }
      
      log.debug('Context', `🗑️ [MembershipContext] Executing DELETE operation...`);
      const { error: deleteError } = await getSupabaseClient()
        .from('space_members')
        .delete()
        .eq('user_id', userIdOfMemberToRemove)
        .eq('space_id', spaceId);
      
      if (deleteError) {
        log.error('Context', `🚨 [MembershipContext] DELETE operation failed:`, {
          error: deleteError,
          code: deleteError.code,
          message: deleteError.message,
          details: deleteError.details,
          hint: deleteError.hint
        });
        throw deleteError;
      }
      
      log.debug('Context', `✅ [MembershipContext] Member removal successful`);
      toast({ title: "Member Removed", description: "The member has been removed from the space." });
      // Cache invalidation for member lists would happen in components using fetchMembers/directFetchMembers
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not remove member.";
      const errorDetails = err instanceof Error ? {
        name: err.name,
        message: err.message,
        stack: err.stack
      } : { error: err };
      
      log.error('Context', `🚨 [MembershipContext] Member removal failed:`, {
        ...errorDetails,
        spaceId,
        userIdOfMemberToRemove
      });
      
      toast({ 
        title: "Error Removing Member", 
        description: `${message} Please check console for details.`, 
        variant: "destructive" 
      });
      return false;
    }
  }, [user, spaceData, membershipState.isOwner, membershipState.isAdmin]);
  
  const fetchMembers = useCallback(async (
    spaceId: string,
    options: { status?: MemberStatus, searchQuery?: string, limit?: number, page?: number } = {}
  ): Promise<SpaceMember[]> => {
    const { status: filterStatus = 'active', searchQuery = '', limit = 50, page = 1 } = options;
    if (!user) return [];
    try {
      // CRITICAL FIX: Use bridge instead of direct call to prevent mobile blocking
      const result = await migrationAdapter.getSpaceMembers(spaceId, {
        status: options.status || 'active',
        forceNetwork: false // Allow cache-first on mobile
      });
      
      if (result.error) throw result.error;
      const spaceMembersData = result.data || [];

      const transformedMembers: SpaceMember[] = spaceMembersData.map((sm: any) => {
        let authoritativeRole = sm.role as MemberRole;
        if (spaceData && sm.user_id === spaceData.owner_id) {
          authoritativeRole = 'owner';
        }
        
        // Handle user data from bridge response
        const userDetails = sm.users || null;

        return {
          id: sm.id, 
          user_id: sm.user_id, 
          space_id: sm.space_id,
          role: authoritativeRole,
          joined_at: sm.joined_at || new Date().toISOString(),
          status: sm.status as MemberStatus,
          is_online: sm.is_online || false,
          last_active_at: sm.last_active_at || null,
          full_name: userDetails?.full_name || null,
          username: userDetails?.username || null,
          avatar_url: userDetails?.avatar_url || null,
        };
      });
      
      // Apply search filtering and pagination on client side
      let filteredMembers = searchQuery
        ? transformedMembers.filter(member => 
            member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.username?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : transformedMembers;

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      return filteredMembers.slice(startIndex, endIndex);
    } catch (err) {
      log.error('Context', '[MembershipContext] Error fetching space members:', err);
      toast({ title: "Error Fetching Members", description: err instanceof Error ? err.message : "Could not retrieve list.", variant: "destructive"});
      return [];
    }
  }, [user, spaceData]);
  
  const refreshMembership = useCallback(() => {
    if (spaceData) {
      checkMembershipStatus(spaceData.id);
    }
  }, [spaceData, checkMembershipStatus]);
  
  const clearCache = useCallback(() => {
    setLocalCache({});
    Object.keys(globalMembershipCache).forEach(key => delete globalMembershipCache[key]);
  }, [setLocalCache]);
  
  const contextValue: MembershipContextValue = {
    ...membershipState,
    joinSpace,
    leaveSpace,
    changeMemberRole,
    removeMember,
    fetchMembers,
    refreshMembership,
    clearCache
  };
  
  return (
    <MembershipContext.Provider value={contextValue}>
      {children}
    </MembershipContext.Provider>
  );
}

// FIXED: Named function for Fast Refresh compatibility
export function useMembership() {
  const context = useContext(MembershipContext);
  if (!context) {
    throw new Error('useMembership must be used within a MembershipProvider');
  }
  return context;
}
