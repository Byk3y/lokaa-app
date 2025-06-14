import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitial } from '@/shared/utils/avatar-utils';
import { Building2, Users, UserRoundCheck, UserRoundPlus, Loader2 } from 'lucide-react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { getSupabaseClient } from '@/integrations/supabase/client';

interface UserProfileCardProps {
  user: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    profile_url?: string | null;
  };
  isSelected?: boolean;
  onClick?: () => void;
}

interface ConnectionInfo {
  connection_type: string;
  space_id?: string;
  space_name?: string;
  space_icon?: string;
  space_subdomain?: string;
  has_conversation?: boolean;
}

export default function UserProfileCard({ user, isSelected = false, onClick }: UserProfileCardProps) {
  const { user: currentUser } = useOptimizedAuth();
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only run on the client side
    if (typeof window === 'undefined') return;
    
    if (!currentUser || !user.id) {
      setLoading(false);
      return;
    }

    const fetchConnectionInfo = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await getSupabaseClient().rpc(
          'get_user_connection_context' as any,
          {
            user_id_1: currentUser.id,
            user_id_2: user.id
          }
        );

        if (error) throw error;
        setConnectionInfo(data as ConnectionInfo);
      } catch (err) {
        console.error('Error fetching connection info:', err);
        setConnectionInfo(null);
      } finally {
        setLoading(false);
      }
    };

    fetchConnectionInfo();
  }, [currentUser, user.id]);

  return (
    <div 
      className={`px-4 py-3 flex items-start hover:bg-gray-50 cursor-pointer ${
        isSelected ? 'bg-teal-50' : ''
      }`}
      onClick={onClick}
    >
      <Avatar className="h-10 w-10 mr-3 mt-0.5">
        <AvatarImage src={user.avatar_url || ''} />
        <AvatarFallback className="bg-gradient-to-br from-teal-50 to-teal-100 text-teal-600">
          {getInitial(user.full_name || 'User')}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {user.full_name}
        </p>
        
        {loading ? (
          <div className="flex items-center text-xs text-gray-500 mt-0.5">
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
            <span>Loading connection...</span>
          </div>
        ) : connectionInfo?.connection_type === 'space' ? (
          <div className="flex items-center text-xs text-gray-500 mt-0.5">
            <Building2 className="h-3 w-3 mr-1" />
            <span className="truncate">
              Connected via <span className="font-medium text-gray-600">{connectionInfo.space_name}</span>
            </span>
          </div>
        ) : connectionInfo?.connection_type === 'unknown' ? (
          <div className="flex items-center text-xs text-gray-500 mt-0.5">
            <Users className="h-3 w-3 mr-1" />
            <span>No shared spaces</span>
          </div>
        ) : null}
        
        {connectionInfo?.has_conversation && (
          <div className="mt-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-800">
              <UserRoundCheck className="h-3 w-3 mr-1" />
              Already in conversation
            </span>
          </div>
        )}
      </div>
      
      <div className="ml-2">
        {isSelected ? (
          <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-400 hover:bg-gray-100">
            <UserRoundPlus className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
    </div>
  );
} 