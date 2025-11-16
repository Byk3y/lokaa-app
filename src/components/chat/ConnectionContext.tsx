import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { ChatAvatar } from '@/components/ui/OptimizedAvatar';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { RefreshCw } from 'lucide-react';
import { log } from '@/utils/logger';

interface ConnectionContextProps {
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar: string | null;
  onLoadingStateChange?: (isLoading: boolean) => void;
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
  otherUserAvatar,
  onLoadingStateChange
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

  // Notify parent component about loading state changes
  useEffect(() => {
    onLoadingStateChange?.(loading);
  }, [loading, onLoadingStateChange]);

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
    log.debug('ConnectionContext', 'Rendering: loading state - showing placeholder');
    // ✅ FIX: Return placeholder while loading to reserve space and maintain visual order
    return (
      <div className="flex flex-col items-center justify-center py-8 px-2 text-center">
        <div className="flex items-center justify-center mb-6">
          <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <span className="mx-4 flex items-center justify-center">
            <RefreshCw className="h-7 w-7 text-gray-300 dark:text-gray-600 animate-spin" />
          </span>
          <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
        <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
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
        <ChatAvatar
          user={{
            id: user?.id || '',
            full_name: avatarData.currentUserFullName,
            avatar_url: avatarData.currentUserAvatar
          }}
        />
        <span className="mx-4 flex items-center justify-center">
          <RefreshCw className="h-7 w-7 text-gray-400" />
        </span>
        <ChatAvatar
          user={{
            id: otherUserId,
            full_name: avatarData.otherName,
            avatar_url: avatarData.otherAvatar
          }}
        />
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