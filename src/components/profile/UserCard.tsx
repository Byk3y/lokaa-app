import { log } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { User, Building2, MoreHorizontal, MessageSquare } from 'lucide-react';
import { getInitial } from '@/shared/utils/avatar-utils';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Link, useCompatRouter } from '@/utils/routerUtils';

interface UserCardProps {
  id: string;
  name: string | null;
  avatar: string | null;
  role?: string | null;
  profileUrl?: string | null;
  spacesCount?: number;
  showMessageButton?: boolean;
  hideSpaceCount?: boolean;
}

interface ConnectionInfo {
  connection_type: string;
  space_id?: string;
  space_name?: string;
  space_icon?: string;
  space_subdomain?: string;
  has_conversation?: boolean;
}

export default function UserCard({ 
  id, 
  name, 
  avatar, 
  role, 
  profileUrl, 
  spacesCount,
  showMessageButton = false,
  hideSpaceCount = false
}: UserCardProps) {
  const { user } = useOptimizedAuth();
  const router = useCompatRouter();
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Try harder to get a user name, never use "Anonymous User"
  const formattedName = name || 
    (id ? id.split('-')[0] : '') || 
    'User';
  
  const profileHref = profileUrl || `/profile/${id}`;
  
  const isCurrentUser = user?.id === id;
  
  useEffect(() => {
    // Only run on the client side
    if (typeof window === 'undefined') return;
    
    if (!user || !id || user.id === id) {
      return;
    }
    
    const fetchConnectionInfo = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await getSupabaseClient().rpc(
          'get_user_connection_context' as any,
          {
            user_id_1: user.id,
            user_id_2: id
          }
        );

        if (error) throw error;
        setConnectionInfo(data as ConnectionInfo);
      } catch (err) {
        log.error('Component', 'Error fetching connection info:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConnectionInfo();
  }, [user, id]);
  
  const handleStartConversation = async () => {
    if (!user || !id) return;
    
    try {
      const { data, error } = await getSupabaseClient().rpc(
        'get_or_create_conversation' as any,
        {
          user1: user.id,
          user2: id
        }
      );
      
      if (error) throw error;
      
      // Use the chat modal instead of navigation
      // Open the modal by triggering a custom event
      const conversationId = data;
      const chatEvent = new CustomEvent('open-chat-modal', { 
        detail: { conversationId } 
      });
      window.dispatchEvent(chatEvent);
    } catch (err) {
      log.error('Component', 'Error starting conversation:', err);
    }
  };

  return (
    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-0">
        <div className="flex flex-col items-center p-4">
          <Avatar className="h-20 w-20 mb-3">
            <AvatarImage src={avatar || undefined} alt={formattedName} />
            <AvatarFallback className="text-2xl bg-gradient-to-br from-teal-50 to-teal-100 text-teal-600">{getInitial(formattedName)}</AvatarFallback>
          </Avatar>
          
          <Link href={profileHref} className="font-medium text-base text-center hover:underline">
            {formattedName}
          </Link>
          
          {role && (
            <p className="text-gray-500 text-sm mt-1">{role}</p>
          )}
          
          {!hideSpaceCount && typeof spacesCount !== 'undefined' && (
            <div className="mt-2 text-xs text-gray-500 flex items-center">
              <Building2 className="h-3 w-3 mr-1" />
              {spacesCount} {spacesCount === 1 ? 'space' : 'spaces'}
            </div>
          )}
          
          {connectionInfo && connectionInfo.connection_type === 'space' && (
            <div className="mt-3 text-xs bg-gray-50 rounded-full px-3 py-1 text-gray-600 flex items-center">
              <Building2 className="h-3 w-3 mr-1 text-teal-500" />
              Connected via {connectionInfo.space_name}
            </div>
          )}
        </div>
      </CardContent>
      
      {!isCurrentUser && (
        <CardFooter className="border-t p-3 flex gap-2 justify-center">
          <Link href={profileHref}>
            <Button variant="outline" size="sm" className="flex-1 text-xs">
              <User className="h-3.5 w-3.5 mr-1" />
              Profile
            </Button>
          </Link>
          
          {showMessageButton && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-xs"
              onClick={handleStartConversation}
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1" />
              Message
            </Button>
          )}
          
          <Button variant="ghost" size="sm" className="px-2">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
} 