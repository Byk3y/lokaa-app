import { log } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { X } from 'lucide-react';
import { shouldEnableMobileFeatures } from '@/utils/mobileDetection';
import { useSpaceNotificationPreferences } from '@/hooks/useSpaceNotificationPreferences';
import { DigestEmailFrequency, NotificationsEmailFrequency } from '@/types/notification';
import { leaveSpace } from '@/features/spaces/services';
import { toast } from '@/hooks/use-toast';

export type MemberSettingsTabKey = "membership" | "notifications" | "chat" | "invite";

interface MemberSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  space: {
    id: string;
    name: string;
    subdomain: string;
    icon_image?: string;
    userRole?: 'owner' | 'admin' | 'member';
  } | null;
  user: {
    id: string;
  } | null;
}

export default function MemberSettingsModal({ isOpen, onClose, space, user }: MemberSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<MemberSettingsTabKey>("membership");
  const [isMobile, setIsMobile] = useState(false);

  // Space notification preferences (also covers the chat_enabled toggle).
  const {
    effectivePreferences,
    isLoading: notificationLoading,
    updatePreference,
  } = useSpaceNotificationPreferences(space?.id || '');

  // chat_enabled defaults TRUE until effective preferences load.
  const chatEnabled = effectivePreferences?.chat_enabled ?? true;

  const navigate = useNavigate();
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const isOwner = space?.userRole === 'owner';

  const handleLeaveConfirm = async () => {
    if (!space?.id || !user?.id || isOwner) return;
    setIsLeaving(true);
    try {
      const ok = await leaveSpace(space.id, user.id);
      if (!ok) {
        toast({
          title: "Couldn't leave this group",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Left group",
        description: `You've left ${space.name}.`,
      });
      setLeaveConfirmOpen(false);
      onClose();
      // Route home — if they were viewing the space they just left, the
      // space shell would reject them on the next render anyway.
      navigate('/', { replace: true });
    } catch (err) {
      log.error('Component', 'Leave group failed:', err);
      toast({
        title: "Couldn't leave this group",
        description: err instanceof Error ? err.message : 'Unexpected error.',
        variant: "destructive",
      });
    } finally {
      setIsLeaving(false);
    }
  };

  useEffect(() => {
    setIsMobile(shouldEnableMobileFeatures());
  }, []);

  // Prevent body scroll when modal is open on mobile
  useEffect(() => {
    if (isOpen && isMobile) {
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, isMobile]);

  const renderTabContent = () => {
    switch (activeTab) {
      case "membership":
        return (
          <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
            {!isMobile && <h3 className="text-lg font-semibold mb-4">Membership</h3>}
            <div className="space-y-4">
              <p className={`${isMobile ? 'text-base' : 'text-sm'} text-gray-600`}>
                You've been a member of {space?.name} since <span className="font-semibold text-gray-900">03/16/2025</span>.
              </p>
              <div className={`${isMobile ? 'mt-8' : 'mt-6'}`}>
                {isOwner ? (
                  <p className={`${isMobile ? 'text-base' : 'text-sm'} text-gray-500 italic`}>
                    As the owner of this group, you can't leave. Transfer
                    ownership first if you want to step away.
                  </p>
                ) : (
                  <Button
                    variant="destructive"
                    className={`bg-red-500 hover:bg-red-600 text-white font-semibold ${
                      isMobile ? 'w-full py-4 text-base' : ''
                    }`}
                    onClick={() => setLeaveConfirmOpen(true)}
                    disabled={isLeaving}
                  >
                    {isLeaving ? 'LEAVING...' : 'LEAVE THIS GROUP'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      case "notifications":
        if (notificationLoading) {
          return (
            <div className={`${isMobile ? 'p-4' : 'p-6'} flex items-center justify-center`}>
              <div className="animate-spin h-6 w-6 rounded-full border-t-2 border-b-2 border-gray-400"></div>
              <span className="ml-2 text-sm text-gray-500">Loading...</span>
            </div>
          );
        }

        return (
          <div className={`${isMobile ? 'p-4 pb-16' : 'p-6'} space-y-6`}>
            {!isMobile && <h3 className="text-lg font-semibold mb-4">Notifications</h3>}
            
            {/* Digest email frequency */}
            <div>
              <div className="text-lg font-medium text-black mb-1">Digest email</div>
              <div className="text-sm text-gray-500 mb-4">summary of popular posts</div>
              <select 
                value={effectivePreferences?.digest_email_frequency || 'weekly'}
                onChange={(e) => updatePreference('digest_email_frequency', e.target.value as DigestEmailFrequency)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base"
              >
                <option value="weekly">Weekly (default)</option>
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
                <option value="never">Never</option>
              </select>
            </div>

            {/* Notifications email frequency */}
            <div>
              <div className="text-lg font-medium text-black mb-1">Notifications email</div>
              <div className="text-sm text-gray-500 mb-4">summary of unread notifications</div>
              <select 
                value={effectivePreferences?.notifications_email_frequency || 'hourly'}
                onChange={(e) => updatePreference('notifications_email_frequency', e.target.value as NotificationsEmailFrequency)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base"
              >
                <option value="immediate">Immediately</option>
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
                value={effectivePreferences?.likes ? 'notify' : 'never'}
                onChange={(e) => updatePreference('likes', e.target.value === 'notify')}
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
                value={effectivePreferences?.admin_announcements ? 'yes' : 'no'}
                onChange={(e) => updatePreference('admin_announcements', e.target.value === 'yes')}
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
                value={effectivePreferences?.event_reminders ? 'yes' : 'no'}
                onChange={(e) => updatePreference('event_reminders', e.target.value === 'yes')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base"
              >
                <option value="yes">Yes (default)</option>
                <option value="no">No</option>
              </select>
            </div>

            {/* New customer emails - only for owners/admins */}
            {(space?.userRole === 'owner' || space?.userRole === 'admin') && (
              <div>
                <div className="text-lg font-medium text-black mb-1">New customer emails</div>
                <div className="text-sm text-gray-500 mb-4">notify me when my group gets a new customer</div>
                <select 
                  value={effectivePreferences?.new_customers ? 'yes' : 'no'}
                  onChange={(e) => updatePreference('new_customers', e.target.value === 'yes')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base"
                >
                  <option value="yes">Yes (default)</option>
                  <option value="no">No</option>
                </select>
              </div>
            )}
          </div>
        );
      case "chat":
        return (
          <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
            {!isMobile && <h3 className="text-lg font-semibold mb-6">Chat</h3>}
            <p className={`${isMobile ? 'text-base' : 'text-sm'} text-gray-600 ${isMobile ? 'mb-4' : 'mb-6'}`}>
              Choose whether members of this group can message you or not.
            </p>
            
            {/* Space Chat Setting */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {space?.icon_image ? (
                  <img 
                    src={space.icon_image} 
                    alt={space.name} 
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                    {space?.name?.charAt(0)?.toUpperCase() || 'S'}
                  </div>
                )}
                <span className="font-medium text-gray-900">
                  {space?.name || 'This Space'}
                </span>
              </div>
              
              {/* Toggle Switch */}
              <div className="flex items-center gap-2">
                <span className={`text-sm ${!chatEnabled ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                  OFF
                </span>
                <button
                  disabled={notificationLoading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-60 ${
                    chatEnabled
                      ? 'bg-teal-500 hover:bg-teal-600'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                  onClick={() => {
                    void updatePreference('chat_enabled', !chatEnabled);
                  }}
                  aria-label={`${chatEnabled ? 'Disable' : 'Enable'} chat messages from ${space?.name} members`}
                >
                  <span 
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                      chatEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`} 
                  />
                </button>
                <span className={`text-sm ${chatEnabled ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                  ON
                </span>
              </div>
            </div>
            
            {/* Help Text */}
            <p className="text-xs text-gray-500 mt-3">
              {chatEnabled 
                ? `Members of ${space?.name || 'this space'} can send you direct messages.`
                : `Members of ${space?.name || 'this space'} cannot send you direct messages.`
              }
            </p>
          </div>
        );
      case "invite":
        return (
          <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
            {!isMobile && <h3 className="text-lg font-semibold mb-6">Invite</h3>}
            <p className={`${isMobile ? 'text-base' : 'text-sm'} text-gray-600 ${isMobile ? 'mb-4' : 'mb-6'}`}>
              Share a link to {space?.name || 'this space'} with your friends.
            </p>
            
            {/* Invite Link Section */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={`https://lokaa.app/${space?.subdomain || 'space'}/about?ref=${user?.id?.slice(0, 8) || 'invite'}`}
                readOnly
                className="flex-1 px-3 py-2 text-sm bg-blue-50 border border-blue-200 rounded-md text-blue-700 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onClick={(e) => e.currentTarget.select()}
              />
              <button
                onClick={async () => {
                  const inviteUrl = `https://lokaa.app/${space?.subdomain || 'space'}/about?ref=${user?.id?.slice(0, 8) || 'invite'}`;
                  try {
                    await navigator.clipboard.writeText(inviteUrl);
                    // TODO: Add visual feedback for successful copy
                    log.debug('Component', 'Invite link copied:', inviteUrl);
                  } catch (error) {
                    log.error('Component', 'Failed to copy invite link:', error);
                    // Fallback: select the text for manual copy
                    const input = document.querySelector('input[readonly]') as HTMLInputElement;
                    if (input) {
                      input.select();
                      document.execCommand('copy');
                    }
                  }
                }}
                className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-semibold text-sm rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
              >
                COPY
              </button>
            </div>
            
            {/* Optional: Additional invite info */}
            <p className="text-xs text-gray-500 mt-3">
              Anyone with this link can view the about page for {space?.name || 'this space'}.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  const tabs = [
    { key: "membership" as MemberSettingsTabKey, label: "Membership" },
    { key: "notifications" as MemberSettingsTabKey, label: "Notifications" },
    { key: "chat" as MemberSettingsTabKey, label: "Chat" },
    { key: "invite" as MemberSettingsTabKey, label: "Invite" },
  ];

  const leaveConfirmDialog = (
    <AlertDialog open={leaveConfirmOpen} onOpenChange={setLeaveConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave {space?.name || 'this group'}?</AlertDialogTitle>
          <AlertDialogDescription>
            You'll lose access to posts, members, and content in this group.
            You can rejoin later if the group is still open to you.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLeaving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void handleLeaveConfirm();
            }}
            disabled={isLeaving}
            className="bg-red-500 hover:bg-red-600"
          >
            {isLeaving ? 'Leaving…' : 'Leave group'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // Mobile: Full-screen layout, Desktop: Modal layout
  if (isMobile) {
    return (
      <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogPortal>
          <div className="fixed inset-0 z-[200] h-screen w-screen flex flex-col bg-white overflow-hidden" style={{ zIndex: 200 }}>
            {/* Hidden accessibility elements */}
            <DialogTitle className="sr-only">Settings</DialogTitle>
            <DialogDescription className="sr-only">
              Membership settings for {space?.name || 'this space'}
            </DialogDescription>
            
            {/* Mobile Header - Skool Style */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-white shrink-0">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onClose} 
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </Button>
                {space?.icon_image ? (
                  <img 
                    src={space.icon_image} 
                    alt={space.name} 
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-white font-bold text-sm">
                    {space?.name?.charAt(0)?.toUpperCase() || 'S'}
                  </div>
                )}
                <span className="font-semibold text-gray-900 text-base">Settings</span>
              </div>
            </div>

            {/* Mobile Tab Navigation */}
            <div className="flex border-b bg-white overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Mobile Content */}
            <div className="flex-grow bg-white overflow-y-auto pb-32">
              {renderTabContent()}
            </div>
          </div>
        </DialogPortal>
      </Dialog>
      {leaveConfirmDialog}
      </>
    );
  }

  // Desktop layout (unchanged)
  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[700px] flex flex-col p-0 gap-0 [&>button]:hidden">
        <DialogHeader className="px-6 py-4 border-b flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            {space?.icon_image ? (
              <img 
                src={space.icon_image} 
                alt={space.name} 
                className="w-10 h-10 rounded-lg object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold">
                {space?.name?.charAt(0)?.toUpperCase() || 'S'}
              </div>
            )}
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-800">
                {space?.name || 'Space Settings'}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500">
                Membership settings
              </DialogDescription>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose} 
            className="rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>

        <div className="flex flex-grow overflow-hidden min-h-[500px]">
          {/* Left Sidebar */}
          <div className="w-48 border-r bg-gray-50 flex-shrink-0">
            <nav className="p-4 space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-teal-100 text-teal-800 font-semibold'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-grow bg-white overflow-y-auto">
            {renderTabContent()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
    {leaveConfirmDialog}
    </>
  );
}