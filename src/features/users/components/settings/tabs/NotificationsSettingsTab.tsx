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

  // Mobile layout matching Skool's design exactly
  if (isMobile) {
    return (
      <div className="bg-white min-h-screen">
        {/* Mobile Content - Skool style */}
        <div className="px-6 py-6 space-y-6">
          {/* General Notifications Section */}
          <div>
            <h2 className="text-lg font-bold text-black mb-4">Notifications</h2>
            
            {/* New follower email notification */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-base text-black">New follower email notification</div>
              <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-green-500 transition-colors">
                <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
              </button>
            </div>

            {/* New affiliate referral email notification */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-base text-black">New affiliate referral email notification</div>
              <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-green-500 transition-colors">
                <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
              </button>
          </div>

            {/* New customer ka-ching sound */}
            <div className="flex items-center justify-between mb-6">
              <div className="text-base text-black">New customer ka-ching sound</div>
              <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-green-500 transition-colors">
                <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
              </button>
            </div>
          </div>

          {/* Spaces/Communities Section */}
          <div>
            <h2 className="text-lg font-bold text-black mb-4">Spaces</h2>
            
                        {/* Space items */}
            {spacesWithPreferences?.map((space) => (
              <div key={space.id} className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center flex-1">
                  {/* Space icon/avatar */}
                  <div className="w-10 h-10 rounded-lg mr-3 flex items-center justify-center overflow-hidden">
                    {space.icon_image ? (
                      <img 
                        src={space.icon_image} 
                        alt={space.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-sm font-bold text-white">
                          {space.name?.charAt(0)?.toUpperCase() || 'S'}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Space info */}
                  <div className="flex-1">
                    <div className="text-base font-bold text-black">{space.name}</div>
                    <div className="text-sm text-gray-500">
                      {space.effective_preferences.digest_email_frequency.charAt(0).toUpperCase() + 
                       space.effective_preferences.digest_email_frequency.slice(1)} digest • {' '}
                      {space.effective_preferences.notifications_email_frequency.charAt(0).toUpperCase() + 
                       space.effective_preferences.notifications_email_frequency.slice(1)} bundle
                    </div>
                  </div>
                </div>
                
                {/* Change button */}
                <button 
                  onClick={() => handleSpaceSettingsClick(space.id, space.name, space.user_role)}
                  className="bg-gray-200 text-gray-600 font-bold rounded px-3 py-1 text-sm"
                >
                  CHANGE
                </button>
              </div>
            ))}

            {/* Show message if no spaces */}
            {(!spacesWithPreferences || spacesWithPreferences.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <p>No spaces found</p>
              </div>
            )}
          </div>
        </div>

        {/* Space settings modal */}
        {selectedSpaceModal && (
          <SpaceNotificationSettingsModal
            isOpen={!!selectedSpaceModal}
            onClose={() => setSelectedSpaceModal(null)}
            spaceId={selectedSpaceModal.spaceId}
            spaceName={selectedSpaceModal.spaceName}
            userRole={selectedSpaceModal.userRole}
          />
        )}
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
            checked={globalPrefs?.affiliate_updates ?? false}
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