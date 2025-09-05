import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { getInitial } from '@/shared/utils/avatar-utils';
import { RefreshCw } from 'lucide-react';
import { log } from '@/utils/logger';

interface ConnectionContextProps {
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar: string | null;
}

interface ConnectionInfo {
  connection_type: 'space' | 'direct' | 'unknown';
  space_id?: string;
  space_name?: string;
  space_icon?: string;
  other_user_timezone?: string;
}

// Global cache for connection data
const connectionCache = new Map<string, {
  data: ConnectionInfo;
  timestamp: number;
  expiresAt: number;
}>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const getCacheKey = (user1Id: string, user2Id: string): string => {
  const sortedIds = [user1Id, user2Id].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
};
const isCacheValid = (cacheEntry: { timestamp: number; expiresAt: number }): boolean => {
  return Date.now() < cacheEntry.expiresAt;
};

const ConnectionContext = React.memo<ConnectionContextProps>(({ 
  otherUserId,
  otherUserName,
  otherUserAvatar
}) => {
  // --- All hooks must be called unconditionally at the top ---
  const { user } = useOptimizedAuth();
  const [loading, setLoading] = useState(true);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = useMemo(() => {
    if (!user?.id || !otherUserId) return null;
    return getCacheKey(user.id, otherUserId);
  }, [user?.id, otherUserId]);

  const fetchConnectionInfo = useCallback(async () => {
    if (!user?.id || !otherUserId || !cacheKey) {
      setLoading(false);
      return;
    }
    const cachedData = connectionCache.get(cacheKey);
    if (cachedData && isCacheValid(cachedData)) {
      log.debug('ConnectionContext', 'Using cached data for:', cacheKey);
      setConnectionInfo(cachedData.data);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    log.debug('ConnectionContext', 'Fetching fresh data for users:', { user1: user.id, user2: otherUserId });
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const { data, error: rpcError } = await getSupabaseClient().rpc(
        'get_user_connection_context' as any,
        { user_id_1: user.id, user_id_2: otherUserId }
      );
      if (rpcError) throw rpcError;
      const connectionData = data as unknown as ConnectionInfo;
      log.debug('ConnectionContext', 'Fresh data loaded:', connectionData);
      connectionCache.set(cacheKey, {
        data: connectionData,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_DURATION
      });
      setConnectionInfo(connectionData);
    } catch (err: any) {
      log.error('ConnectionContext', 'Error loading:', err);
      setError('Unable to load connection details.');
    } finally {
      setLoading(false);
      log.debug('ConnectionContext', 'Loading completed, loading state:', false);
    }
  }, [user?.id, otherUserId, cacheKey]);

  useEffect(() => {
    if (typeof window === 'undefined' || !user || !otherUserId) {
      setLoading(false);
      return;
    }
    fetchConnectionInfo();
  }, [fetchConnectionInfo, user, otherUserId]);

  const shouldRender = useMemo(() => {
    return !loading && !error && connectionInfo && connectionInfo.connection_type !== 'unknown';
  }, [loading, error, connectionInfo]);

  const avatarData = useMemo(() => ({
    currentUserFullName: user?.user_metadata?.full_name || 'You',
    currentUserAvatar: user?.user_metadata?.avatar_url,
    otherAvatar: otherUserAvatar,
    otherName: otherUserName,
    spaceIcon: connectionInfo?.space_icon,
    spaceName: connectionInfo?.space_name
  }), [user?.user_metadata?.full_name, user?.user_metadata?.avatar_url, otherUserAvatar, otherUserName, connectionInfo?.space_icon, connectionInfo?.space_name]);

  // --- Only now do conditional returns ---
  if (loading) {
    log.debug('ConnectionContext', 'Rendering: loading state');
    return null;
  }
  if (error || !connectionInfo || connectionInfo.connection_type === 'unknown') {
    log.debug('ConnectionContext', 'Rendering: error or no connection', { error, connectionInfo });
    return null;
  }
  if (!shouldRender) {
    return null;
  }
  log.debug('ConnectionContext', 'Rendering: showing connection context', connectionInfo);
  return (
    <div className="flex flex-col items-center justify-center py-8 px-2 text-center">
      {/* Logo at the top */}
      {avatarData.spaceIcon && (
        <img
          src={avatarData.spaceIcon}
          alt={avatarData.spaceName || 'Space'}
          className="w-10 h-10 rounded-xl mb-6 mx-auto object-cover"
        />
      )}
      {/* Avatars and connector */}
      <div className="flex items-center justify-center mb-6">
        <Avatar className="h-12 w-12">
          <AvatarImage src={avatarData.currentUserAvatar || undefined} alt={avatarData.currentUserFullName} />
          <AvatarFallback className="text-base">{getInitial(avatarData.currentUserFullName)}</AvatarFallback>
        </Avatar>
        <span className="mx-4 flex items-center justify-center">
          <RefreshCw className="h-7 w-7 text-gray-400" />
        </span>
        <Avatar className="h-12 w-12">
          <AvatarImage src={avatarData.otherAvatar || undefined} alt={avatarData.otherName} />
          <AvatarFallback className="text-base">{getInitial(avatarData.otherName)}</AvatarFallback>
        </Avatar>
      </div>
      {/* Text below */}
      <div className="text-gray-500 text-xs font-normal">
        You and {avatarData.otherName} know each other from
      </div>
      {avatarData.spaceName && (
        <div className="text-gray-500 text-xs font-normal mt-1">
          {avatarData.spaceName}
        </div>
      )}
    </div>
  );
});
ConnectionContext.displayName = 'ConnectionContext';
export default ConnectionContext; 