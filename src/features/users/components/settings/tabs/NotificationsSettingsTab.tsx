import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SettingsTabProps } from '../../../types/settings';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useUserSpacesNotificationPreferences } from '@/hooks/useSpaceNotificationPreferences';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import SpaceNotificationSettingsModal from '@/components/notifications/SpaceNotificationSettingsModal';
import { log } from '@/utils/logger';

export default function NotificationsSettingsTab({ user }: SettingsTabProps) {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  
  const { 
    preferences: globalPrefs, 
    isLoading: globalLoading, 
    updatePreference: updateGlobalPreference 
  } = useNotificationPreferences();
  
  const { 
    spacesWithPreferences, 
    isLoading: spacesLoading, 
    refresh: refreshSpaces 
  } = useUserSpacesNotificationPreferences();

  const [selectedSpaceModal, setSelectedSpaceModal] = useState<{
    spaceId: string;
    spaceName: string;
    userRole: 'owner' | 'admin' | 'member';
  } | null>(null);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-refresh spaces on mount
  useEffect(() => {
    if (user?.id) {
      refreshSpaces();
    }
  }, [user?.id, refreshSpaces]);

  const handleGlobalToggle = async (key: string, value: boolean) => {
    try {
      await updateGlobalPreference(key as any, value);
      toast({
        title: "Setting Updated",
        description: `${key.replace(/_/g, ' ')} ${value ? 'enabled' : 'disabled'}.`,
        duration: 2000
      });
    } catch (error) {
      log.error('NotificationsSettingsTab', 'Error updating global preference:', error);
      toast({
        title: "Update Failed",
        description: "Could not update setting. Please try again.",
        variant: "destructive",
        duration: 3000
      });
    }
  };

  const handleSpaceSettingsClick = (spaceId: string, spaceName: string, userRole: 'owner' | 'admin' | 'member') => {
    setSelectedSpaceModal({ spaceId, spaceName, userRole });
  };

  if (globalLoading || spacesLoading) {
    return (
      <div className={`${isMobile ? 'bg-white' : 'max-w-[760px] mx-auto bg-white rounded-[20px] shadow-[0px_4px_16px_rgba(0,0,0,0.08)]'} py-8 px-6`}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Loading notification preferences...</span>
        </div>
      </div>
    );
  }

  // Mobile layout matching Skool's design
  if (isMobile) {
    return (
      <div className="bg-white min-h-screen">
        {/* Mobile Tab Navigation - Skool style */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button 
              onClick={() => navigate('/settings/spaces')}
              className="flex-1 px-4 py-4 text-center text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Membership
            </button>
            <button 
              className="flex-1 px-4 py-4 text-center text-sm font-medium text-black border-b-2 border-black"
            >
              Notifications
            </button>
            <button 
              onClick={() => navigate('/settings/chat')}
              className="flex-1 px-4 py-4 text-center text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Chat
            </button>
            <button 
              className="flex-1 px-4 py-4 text-center text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Invite
            </button>
          </div>
        </div>

        {/* Mobile Content - Skool style */}
        <div className="px-6 py-6 space-y-6">
          {/* Digest email */}
          <div>
            <div className="text-lg font-medium text-black mb-1">Digest email</div>
            <div className="text-sm text-gray-500 mb-4">summary of popular posts</div>
            <select 
              value={globalPrefs?.email_enabled ? 'weekly' : 'never'}
              onChange={(e) => handleGlobalToggle('email_enabled', e.target.value !== 'never')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base"
            >
              <option value="weekly">Weekly (default)</option>
              <option value="daily">Daily</option>
              <option value="never">Never</option>
            </select>
          </div>

          {/* Notifications email */}
          <div>
            <div className="text-lg font-medium text-black mb-1">Notifications email</div>
            <div className="text-sm text-gray-500 mb-4">summary of unread notifications</div>
            <select 
              value={globalPrefs?.push_enabled ? 'hourly' : 'never'}
              onChange={(e) => handleGlobalToggle('push_enabled', e.target.value !== 'never')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base"
            >
              <option value="hourly">Hourly (default)</option>
              <option value="daily">Daily</option>
              <option value="never">Never</option>
            </select>
          </div>

          {/* Likes */}
          <div>
            <div className="text-lg font-medium text-black mb-1">Likes</div>
            <div className="text-sm text-gray-500 mb-4">when somebody likes my posts or comments</div>
            <select 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base"
            >
              <option value="notify">Notify me (default)</option>
              <option value="never">Never</option>
            </select>
          </div>

          {/* Admin announcements */}
          <div>
            <div className="text-lg font-medium text-black mb-1">Admin announcements</div>
            <div className="text-sm text-gray-500 mb-4">get email broadcasts sent by admins</div>
            <select 
              value={globalPrefs?.affiliate_updates ? 'yes' : 'no'}
              onChange={(e) => handleGlobalToggle('affiliate_updates', e.target.value === 'yes')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base"
            >
              <option value="yes">Yes (default)</option>
              <option value="no">No</option>
            </select>
          </div>

          {/* Event reminders */}
          <div>
            <div className="text-lg font-medium text-black mb-1">Event reminders</div>
            <div className="text-sm text-gray-500 mb-4">notify me of calendar events the day before they happen</div>
            <select 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base"
            >
              <option value="yes">Yes (default)</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="max-w-[760px] mx-auto bg-white rounded-[20px] py-8 px-6 shadow-[0px_4px_16px_rgba(0,0,0,0.08)]">
      <h1 className="text-[24px] font-semibold text-[#181818] mb-2">Notifications</h1>
      <div className="text-[15px] text-gray-700 mb-8">Choose what notifications you'd like to receive.</div>
      
      {/* Global Notification Settings - Skool minimalistic style */}
      <div className="space-y-0 mb-8">
        <div className="flex items-center justify-between py-2">
          <div className="text-[16px] font-medium text-gray-900">New follower email notification</div>
          <Switch
            checked={globalPrefs?.email_enabled || false}
            onCheckedChange={(checked) => handleGlobalToggle('email_enabled', checked)}
            className="data-[state=checked]:bg-[#00A389]"
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="text-[16px] font-medium text-gray-900">New affiliate referral email notification</div>
          <Switch
            checked={globalPrefs?.affiliate_updates || false}
            onCheckedChange={(checked) => handleGlobalToggle('affiliate_updates', checked)}
            className="data-[state=checked]:bg-[#00A389]"
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="text-[16px] font-medium text-gray-900">New customer ka-ching sound</div>
          <Switch
            checked={globalPrefs?.push_enabled || false}
            onCheckedChange={(checked) => handleGlobalToggle('push_enabled', checked)}
            className="data-[state=checked]:bg-[#00A389]"
          />
        </div>
      </div>

      {/* Space-specific notification settings - Skool minimalistic style */}
      <div className="space-y-0">
        {spacesWithPreferences.map((space) => (
          <div 
            key={space.id}
            className="flex items-center justify-between py-2"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm mr-4">
                {space.icon_image ? (
                  <img 
                    src={space.icon_image} 
                    alt={space.name}
                    className="w-full h-full rounded-lg object-cover"
                  />
                ) : (
                  space.name.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <div className="text-[16px] font-medium text-gray-900 mb-1">{space.name}</div>
                <div className="text-[14px] text-gray-500">
                  {space.effective_preferences.digest_email_frequency.charAt(0).toUpperCase() + 
                   space.effective_preferences.digest_email_frequency.slice(1)} digest • {' '}
                  {space.effective_preferences.notifications_email_frequency.charAt(0).toUpperCase() + 
                   space.effective_preferences.notifications_email_frequency.slice(1)} bundle
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSpaceSettingsClick(space.id, space.name, space.user_role)}
              className="text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 font-medium px-4 py-2 rounded-md"
            >
              CHANGE
            </Button>
          </div>
        ))}

        {spacesWithPreferences.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🔔</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No spaces found
            </h3>
            <p className="text-gray-600">
              Join some spaces to customize your notification preferences.
            </p>
          </div>
        )}
      </div>

      {/* Space Notification Settings Modal */}
      {selectedSpaceModal && (
        <SpaceNotificationSettingsModal
          isOpen={true}
          onClose={() => setSelectedSpaceModal(null)}
          spaceId={selectedSpaceModal.spaceId}
          spaceName={selectedSpaceModal.spaceName}
          userRole={selectedSpaceModal.userRole}
        />
      )}
    </div>
  );
} 