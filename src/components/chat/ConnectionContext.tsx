import React, { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { getInitial } from '@/shared/utils/avatar-utils';
import { RefreshCw } from 'lucide-react';

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

export default function ConnectionContext({ 
  otherUserId,
  otherUserName,
  otherUserAvatar
}: ConnectionContextProps) {
  const { user } = useOptimizedAuth();
  const [loading, setLoading] = useState(true);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !user || !otherUserId) {
      setLoading(false);
      return;
    }

    const fetchConnectionInfo = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch connection data
        const { data, error: rpcError } = await getSupabaseClient().rpc(
          'get_user_connection_context' as any,
          { user_id_1: user.id, user_id_2: otherUserId }
        );
        if (rpcError) throw rpcError;
        setConnectionInfo(data as unknown as ConnectionInfo);
      } catch (err: any) {
        setError('Unable to load connection details.');
      } finally {
        setLoading(false);
      }
    };
    fetchConnectionInfo();
  }, [user, otherUserId]);

  if (loading) {
    return null;
  }
  if (error || !connectionInfo || connectionInfo.connection_type === 'unknown') {
    return null;
  }

  // Avatars
  const currentUserFullName = user?.user_metadata?.full_name || 'You';
  const currentUserAvatar = user?.user_metadata?.avatar_url;
  const otherAvatar = otherUserAvatar;
  const otherName = otherUserName;
  const spaceIcon = connectionInfo.space_icon;
  const spaceName = connectionInfo.space_name;

  return (
    <div className="flex flex-col items-center justify-center py-8 px-2 text-center">
      {/* Logo at the top */}
      {spaceIcon && (
        <img
          src={spaceIcon}
          alt={spaceName || 'Space'}
          className="w-10 h-10 rounded-xl mb-6 mx-auto object-cover"
        />
      )}
      {/* Avatars and connector */}
      <div className="flex items-center justify-center mb-6">
        <Avatar className="h-12 w-12">
          <AvatarImage src={currentUserAvatar || undefined} alt={currentUserFullName} />
          <AvatarFallback className="text-base">{getInitial(currentUserFullName)}</AvatarFallback>
        </Avatar>
        <span className="mx-4 flex items-center justify-center">
          <RefreshCw className="h-7 w-7 text-gray-400" />
        </span>
        <Avatar className="h-12 w-12">
          <AvatarImage src={otherAvatar || undefined} alt={otherName} />
          <AvatarFallback className="text-base">{getInitial(otherName)}</AvatarFallback>
        </Avatar>
      </div>
      {/* Text below */}
      <div className="text-gray-500 text-xs font-normal">
        You and {otherName} know each other from
      </div>
      {spaceName && (
        <div className="text-gray-500 text-xs font-normal mt-1">
          {spaceName}
        </div>
      )}
    </div>
  );
} 