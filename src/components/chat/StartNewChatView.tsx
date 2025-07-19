import { log } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, UserPlus, X, Info, Check } from 'lucide-react';
import { getInitial } from '@/shared/utils/avatar-utils';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { Conversation } from './ChatModal';
import UserProfileCard from './UserProfileCard';

interface User {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  profile_url: string | null;
}

interface StartNewChatViewProps {
  onBack: () => void;
  onConversationCreated: (conversation: Conversation) => void;
}

export default function StartNewChatView({ onBack, onConversationCreated }: StartNewChatViewProps) {
  const { user: currentUser } = useOptimizedAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [recentlyContacted, setRecentlyContacted] = useState<User[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  
  // Load recently contacted users on initial load
  useEffect(() => {
    // Only run on the client side
    if (typeof window === 'undefined') return;
    
    if (!currentUser) return;
    
    const fetchRecentlyContacted = async () => {
      setLoadingRecent(true);
      try {
        // First try to get recent conversation users
        const { data: userConversationsData, error: userConversationsError } = await getSupabaseClient()
          .from('user_conversations')
          .select('other_participants')
          .eq('user_id', currentUser.id)
          .order('last_message_at', { ascending: false })
          .limit(5);
        
        if (userConversationsError) {
          log.error('Component', 'Error fetching recent conversations:', userConversationsError);
          setRecentlyContacted([]);
          return;
        }
        
        // Extract users from conversations
        const recentUsers: User[] = [];
        const userIds = new Set<string>();
        
        userConversationsData?.forEach(conversation => {
          let participants = [];
          try {
            if (Array.isArray(conversation.other_participants)) {
              participants = conversation.other_participants;
            } else if (typeof conversation.other_participants === 'string') {
              participants = JSON.parse(conversation.other_participants);
            } else if (conversation.other_participants && typeof conversation.other_participants === 'object') {
              participants = [conversation.other_participants];
            }
            
            participants.forEach((participant: any) => {
              if (participant && participant.user_id && !userIds.has(participant.user_id)) {
                userIds.add(participant.user_id);
                recentUsers.push({
                  id: participant.user_id,
                  full_name: participant.full_name || 'Unknown User',
                  avatar_url: participant.avatar_url || null,
                  profile_url: participant.profile_url || null
                });
              }
            });
          } catch (err) {
            log.error('Component', 'Error parsing other_participants:', err);
          }
        });
        
        setRecentlyContacted(recentUsers);
      } catch (error) {
        log.error('Component', 'Error fetching recently contacted users:', error);
        setRecentlyContacted([]);
      } finally {
        setLoadingRecent(false);
      }
    };
    
    fetchRecentlyContacted();
  }, [currentUser]);
  
  // Search for users when query changes
  useEffect(() => {
    // Only run on the client side
    if (typeof window === 'undefined') return;
    
    const searchUsers = async () => {
      if (!searchQuery.trim() || !currentUser) return;
      
      setLoading(true);
      try {
        const { data, error } = await getSupabaseClient()
          .from('users')
          .select('id, full_name, avatar_url, profile_url')
          .neq('id', currentUser.id) // Exclude current user
          .ilike('full_name', `%${searchQuery}%`)
          .limit(10);
          
        if (error) throw error;
        
        setUsers(data || []);
      } catch (error) {
        log.error('Component', 'Error searching users:', error);
      } finally {
        setLoading(false);
      }
    };
    
    // Debounce search
    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, currentUser]);
  
  // Create a new conversation
  const handleCreateConversation = async () => {
    if (selectedUsers.length === 0 || !currentUser || creating) return;
    
    setCreating(true);
    try {
      if (selectedUsers.length === 1) {
        // For 1:1 conversation, use stored procedure
        const { data, error } = await getSupabaseClient().rpc(
          'get_or_create_conversation' as any,
          {
            user1: currentUser.id,
            user2: selectedUsers[0].id
          }
        );
        
        if (error) throw error;
        
        // Now fetch the conversation details
        const conversationId = data;
        const { data: conversationData, error: fetchError } = await getSupabaseClient()
          .from('user_conversations')
          .select('*')
          .eq('conversation_id', conversationId)
          .eq('user_id', currentUser.id)
          .single();
          
        if (fetchError) throw fetchError;
        
        // Parse other_participants safely
        let otherParticipants = [];
        try {
          if (Array.isArray(conversationData.other_participants)) {
            otherParticipants = conversationData.other_participants;
          } else if (typeof conversationData.other_participants === 'string') {
            otherParticipants = JSON.parse(conversationData.other_participants);
          } else if (typeof conversationData.other_participants === 'object' && conversationData.other_participants !== null) {
            otherParticipants = Array.isArray(conversationData.other_participants) 
              ? conversationData.other_participants 
              : [conversationData.other_participants];
          }
        } catch (err) {
          log.error('Component', 'Error parsing other_participants:', err);
          otherParticipants = [];
        }
        
        // Transform to Conversation type
        const conversation: Conversation = {
          conversation_id: conversationData.conversation_id || '',
          conversation_name: conversationData.conversation_name,
          is_group: conversationData.is_group || false,
          created_at: conversationData.created_at || new Date().toISOString(),
          last_message_at: conversationData.last_message_at,
          latest_message_content: conversationData.latest_message_content,
          latest_message_time: conversationData.latest_message_time,
          unread_count: conversationData.unread_count || 0,
          other_participants: otherParticipants
        };
        
        // Pass conversation to parent
        onConversationCreated(conversation);
      } else {
        // For group conversations - handle in a future implementation
        // ...
      }
    } catch (error) {
      log.error('Component', 'Error creating conversation:', error);
    } finally {
      setCreating(false);
    }
  };
  
  // Toggle user selection
  const toggleUserSelection = (user: User) => {
    if (selectedUsers.some(selected => selected.id === user.id)) {
      // Remove user from selection
      setSelectedUsers(selectedUsers.filter(selected => selected.id !== user.id));
    } else {
      // Add user to selection
      setSelectedUsers([...selectedUsers, user]);
    }
  };
  
  // Remove user from selection
  const removeSelectedUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(selected => selected.id !== userId));
  };
  
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack} 
            className="mr-2 h-8 w-8 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-base font-medium text-gray-900 dark:text-gray-200">New Conversation</h2>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          disabled={selectedUsers.length === 0 || creating}
          onClick={handleCreateConversation}
          className={`h-8 px-3 ${selectedUsers.length > 0 ? 'bg-teal-50 border-teal-200 text-teal-600 hover:bg-teal-100 dark:bg-teal-900/20 dark:border-teal-800 dark:text-teal-400' : ''}`}
        >
          {creating ? 'Creating...' : selectedUsers.length === 1 ? 'Start Chat' : 'Create Group'}
        </Button>
      </div>
      
      {selectedUsers.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 flex items-center flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
          {selectedUsers.map(user => (
            <div 
              key={user.id} 
              className="flex items-center bg-white dark:bg-gray-700 rounded-full border border-gray-200 dark:border-gray-600 pl-1 pr-2 py-1"
            >
              <Avatar className="h-5 w-5 mr-1.5">
                <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || ''} />
                <AvatarFallback className="text-xs bg-teal-500 text-white">{getInitial(user.full_name || '')}</AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{user.full_name}</span>
              <button
                onClick={() => removeSelectedUser(user.id)}
                className="ml-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search for people..."
            className="w-full pl-9 h-9 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus-visible:ring-teal-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-500"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        {searchQuery.trim() ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <div className="p-8 flex justify-center items-center">
                <div className="animate-spin h-5 w-5 border-t-2 border-b-2 border-teal-500 rounded-full"></div>
              </div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="text-sm">No users found matching "{searchQuery}"</p>
              </div>
            ) : (
              users.map(user => (
                <UserListItem
                  key={user.id}
                  user={user}
                  isSelected={selectedUsers.some(u => u.id === user.id)}
                  onToggle={() => toggleUserSelection(user)}
                />
              ))
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800">
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400">RECENTLY CONTACTED</h3>
            </div>
            
            {loadingRecent ? (
              <div className="p-8 flex justify-center items-center">
                <div className="animate-spin h-5 w-5 border-t-2 border-b-2 border-teal-500 rounded-full"></div>
              </div>
            ) : recentlyContacted.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <p className="text-sm">No recent contacts</p>
              </div>
            ) : (
              recentlyContacted.map(user => (
                <UserListItem
                  key={user.id}
                  user={user}
                  isSelected={selectedUsers.some(u => u.id === user.id)}
                  onToggle={() => toggleUserSelection(user)}
                />
              ))
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface UserListItemProps {
  user: User;
  isSelected: boolean;
  onToggle: () => void;
}

function UserListItem({ user, isSelected, onToggle }: UserListItemProps) {
  return (
    <div 
      className={`flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${isSelected ? 'bg-teal-50 dark:bg-teal-900/20' : ''}`}
      onClick={onToggle}
    >
      <Avatar className="h-10 w-10 mr-3 flex-shrink-0 border border-gray-100 dark:border-gray-700 shadow-sm">
        <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || ''} />
        <AvatarFallback className="bg-gradient-to-br from-teal-400 to-teal-600 text-white">{getInitial(user.full_name || '')}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
          {user.full_name || 'Unknown User'}
        </p>
      </div>
      <div className={`h-5 w-5 rounded-full flex items-center justify-center border ${isSelected ? 'bg-teal-500 border-teal-500' : 'border-gray-300 dark:border-gray-600'}`}>
        {isSelected && <Check className="h-3 w-3 text-white" />}
      </div>
    </div>
  );
} 