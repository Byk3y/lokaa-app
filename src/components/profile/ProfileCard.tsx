import { log } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { Calendar, MessageSquare, Clock, Star, Link2, ExternalLink, Youtube, Linkedin, Instagram, Facebook, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FollowButton from './FollowButton';
import ChatButton from '@/components/chat/ChatButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getInitial } from '@/shared/utils/avatar-utils';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Link, useCompatRouter } from '@/utils/routerUtils';

// Custom X Logo component for X (formerly Twitter) social media
const XLogo = ({ className }: { className?: string }) => (
  <svg 
    className={className} 
    fill="currentColor" 
    viewBox="0 0 24 24" 
    aria-hidden="true"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

interface ProfileCardProps {
  id: string;
  name: string | null;
  avatar: string | null;
  role?: string | null;
  profileUrl?: string | null;
  bio?: string;
  username?: string;
  followers?: number;
  following?: number;
  contributions?: number;
  joinDate?: string;
  showMessageButton?: boolean;
  social_links?: {
    website?: string;
    instagram?: string;
    x?: string;
    youtube?: string;
    linkedin?: string;
    facebook?: string;
  } | null;
  level?: number;
  pointsToLevelUp?: number;
  isOnline?: boolean;
}

interface ConnectionInfo {
  connection_type: string;
  space_id?: string;
  space_name?: string;
  has_conversation?: boolean;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ 
  id, 
  name, 
  avatar, 
  role, 
  profileUrl, 
  bio = "Building Automations that actually work!",
  username,
  followers = 0,
  following = 0,
  contributions = 0,
  joinDate,
  showMessageButton = false,
  social_links = null,
  level = 1,
  pointsToLevelUp = 5,
  isOnline = true
}) => {
  const { user } = useOptimizedAuth();
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const formattedName = name || (id ? id.split('-')[0] : '') || 'User';
  const formattedUsername = username || (id ? `@${id.split('-')[0]}-${id.split('-')[1]}` : '@username');
  const profileHref = profileUrl || `/profile/${id}`;
  const isCurrentUser = user?.id === id;
  const formattedJoinDate = joinDate ? new Date(joinDate).toLocaleDateString('en-US', { 
    month: 'short',
    day: 'numeric', 
    year: 'numeric' 
  }) : 'Mar 7, 2023';
  
  useEffect(() => {
    // Only run on the client side
    if (typeof window === 'undefined' || !user || !id || user.id === id) return;
    
    const fetchConnectionInfo = async () => {
      try {
        setLoading(true);
        const { data, error } = await getSupabaseClient().rpc(
          'get_user_connection_context' as any,
          { user_id_1: user.id, user_id_2: id }
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
  
  // Ensure URLs have http/https prefix
  const ensureHttpPrefix = (url: string): string => {
    if (!url) return '';
    return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
  };

  return (
    <div className="w-full max-w-xs mx-auto overflow-hidden bg-white rounded-xl shadow-lg border border-gray-50 dark:bg-gray-800 dark:border-gray-700">
      {/* Profile Header - More compact */}
      <div className="flex flex-col items-center p-6 pb-4 relative">
        <div className="relative">
          <Avatar className="h-28 w-28 mb-2 rounded-full border-3 border-white shadow-[0_4px_20px_rgb(0,0,0,0.1)] transform transition-transform duration-300 hover:scale-105">
            <AvatarImage src={avatar || undefined} alt={formattedName} className="object-cover" />
            <AvatarFallback className="text-3xl bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700">{getInitial(formattedName)}</AvatarFallback>
          </Avatar>
          {/* Online indicator */}
          {isOnline && (
            <div className="absolute bottom-1 right-1 h-4 w-4 bg-green-500 border-2 border-white rounded-full"></div>
          )}
        </div>
          
        {/* Name and username - more compact spacing */}
        <div className="flex flex-col items-center mt-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 text-center leading-tight">
            {formattedName}
            {role === 'star' && <span className="ml-1 text-yellow-500">⭐</span>}
          </h2>
          <span className="text-gray-500 dark:text-gray-400 text-sm mt-0.5 hover:text-blue-500 transition-colors">{formattedUsername}</span>
          {bio && (
            <p className="text-gray-700 dark:text-gray-300 text-sm mt-2 text-center max-w-xs px-1 leading-relaxed">
              {bio}
            </p>
          )}
        </div>
      </div>

      {/* Stats - More prominent and compact */}
      <div className="grid grid-cols-3 gap-0 text-center bg-gradient-to-r from-gray-50 to-gray-50 dark:from-gray-750 dark:to-gray-750 border-y border-gray-100 dark:border-gray-700">
        <div className="py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 cursor-pointer">
          <p className="text-lg font-bold text-gray-800 dark:text-white">{contributions}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Contributions</p>
        </div>
        <div className="py-3 border-x border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 cursor-pointer">
          <p className="text-lg font-bold text-gray-800 dark:text-white">{followers.toLocaleString()}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Followers</p>
        </div>
        <div className="py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 cursor-pointer">
          <p className="text-lg font-bold text-gray-800 dark:text-white">{following}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Following</p>
        </div>
      </div>

      {/* Status and Join Date - More compact */}
      <div className="px-6 py-3 flex flex-col gap-1.5 bg-gray-50 dark:bg-gray-850">
        <div className="flex items-center text-gray-600 dark:text-gray-400 text-xs">
          <Clock className="h-3.5 w-3.5 mr-2 text-blue-500" />
          <span>{isOnline ? 'Online now' : 'Active 4h ago'}</span>
        </div>
        <div className="flex items-center text-gray-600 dark:text-gray-400 text-xs">
          <Calendar className="h-3.5 w-3.5 mr-2 text-blue-500" />
          <span>Joined {formattedJoinDate}</span>
        </div>
            </div>

      {/* Social Links - Move up before actions */}
      {social_links && Object.values(social_links).some(link => !!link) && (
        <div className="flex justify-center gap-4 px-6 py-3 border-t border-gray-100 dark:border-gray-700">
          {social_links.youtube && (
            <a href={ensureHttpPrefix(social_links.youtube)} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-red-600 dark:hover:text-red-500 transform transition-all hover:scale-110 hover:-translate-y-0.5">
              <Youtube className="h-4 w-4" />
            </a>
          )}
          {social_links.linkedin && (
            <a href={ensureHttpPrefix(social_links.linkedin)} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-700 dark:hover:text-blue-500 transform transition-all hover:scale-110 hover:-translate-y-0.5">
              <Linkedin className="h-4 w-4" />
            </a>
          )}
          {social_links.website && (
            <a href={ensureHttpPrefix(social_links.website)} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transform transition-all hover:scale-110 hover:-translate-y-0.5">
              <Globe className="h-4 w-4" />
            </a>
          )}
          {social_links.instagram && (
            <a href={ensureHttpPrefix(social_links.instagram)} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-500 dark:hover:text-pink-400 transform transition-all hover:scale-110 hover:-translate-y-0.5">
              <Instagram className="h-4 w-4" />
            </a>
          )}
          {social_links.x && (
            <a href={ensureHttpPrefix(social_links.x)} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-black dark:hover:text-white transform transition-all hover:scale-110 hover:-translate-y-0.5">
              <XLogo className="h-4 w-4" />
            </a>
          )}
          {social_links.facebook && (
            <a href={ensureHttpPrefix(social_links.facebook)} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-500 transform transition-all hover:scale-110 hover:-translate-y-0.5">
              <Facebook className="h-4 w-4" />
            </a>
          )}
        </div>
      )}

      {/* Actions - Only show if there are actual buttons to display */}
      {(!isCurrentUser || showMessageButton) && (
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex gap-2.5 justify-center">
          <FollowButton userId={id} variant="default" className="flex-1 shadow-sm hover:shadow transition-shadow text-sm" />
          {showMessageButton && (
            <ChatButton 
              variant="textButton" 
              targetUserId={id}
              className="flex-1 shadow-sm hover:shadow transition-shadow text-sm"
            />
          )}
        </div>
      )}

      {/* Powered by Lokaa footer */}
      <div className="w-full py-2 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700">
        Powered by{' '}
        <span style={{ color: '#14b8a6', fontWeight: 600 }}>Lokaa</span>
      </div>
    </div>
  );
};

export default ProfileCard; 