import { log } from '@/utils/logger';
import React, { useState, useEffect, memo, useRef } from 'react';
import { Globe, Lock, Users, Settings, Edit3, ImageUp, UserPlus, Copy, Check, Image as ImageIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { resolveImageUrl } from "@/utils/preloadAssets";
// import useSpaceSettingsModal from "@/hooks/useSpaceSettingsModal"; // Removed old hook
import useSpaceSettingsStore from "@/hooks/useSpaceSettingsStore"; // Added new store
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth'; // Added for userId
import { Separator } from "@/components/ui/separator";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { createManagedInterval } from '@/utils/pageVisibilityManager';
import { OnlineAvatars } from "@/components/space/OnlineAvatars"; // Import online avatars component
import { useSimpleMemberCounts } from '@/hooks/useSimpleMemberCounts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { useSpace } from '@/contexts/SpaceContext';

interface SpaceInfoSidebarProps {
  spaceName: string;
  spaceIcon?: string | null;
  spaceDescription?: string | null;
  coverImage?: string | null;
  isPrivate?: boolean;
  memberCount?: number | null;
  adminCount?: number | null;
  onlineCount?: number | null;
  canAccessSettings?: boolean;
  subdomain?: string;
  spaceId?: string;
  isOwner?: boolean;
  isMember?: boolean;
  actionButtonText?: string;
  onAction?: () => void;
  className?: string;
  hideOnlineAvatars?: boolean;
}

const DEFAULT_COVER_IMAGE = '/default-space-cover.jpg';

const SpaceInfoSidebar = memo(function SpaceInfoSidebar({
  spaceName,
  spaceIcon,
  spaceDescription,
  coverImage,
  canAccessSettings,
  subdomain,
  spaceId,
  isOwner,
  isMember,
  actionButtonText,
  onAction,
  className = '',
  hideOnlineAvatars = false,
  memberCount,
  adminCount,
  onlineCount,
}: SpaceInfoSidebarProps) {
  // const openSpaceSettingsModal = useSpaceSettingsModal(state => state.open); // Removed old hook usage
  const { user } = useOptimizedAuth(); // Get user for userId
  const storeActions = useSpaceSettingsStore.getState(); // Get store actions
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Use only useSimpleMemberCounts for all counts
  const { totalMembers, adminMembers, onlineMembers, loading: countsLoading } = useSimpleMemberCounts(spaceId || '');

  const resolvedCoverUrl = coverImage ? resolveImageUrl(coverImage, spaceName) : null;
  const spaceUrl = subdomain ? `lokaa.app/${subdomain}/about` : "lokaa.app/your-space/about";

  // Use passed props for counts, fallback to hook data
  const displayMemberCount = memberCount ?? totalMembers ?? 0;
  const displayAdminCount = adminCount ?? adminMembers ?? 0;
  const displayOnlineCount = onlineCount ?? onlineMembers ?? 0;


  const handleOpenSettings = async () => {
    // SECURITY CHECK: Double-verify user has settings access (owner or admin)
    if (!canAccessSettings) {
      log.error('Component', "🚨 SECURITY VIOLATION: User without settings access attempted to open settings", {
        userId: user?.id,
        spaceId: spaceId,
        canAccessSettings,
        isOwner,
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (subdomain && spaceId && user?.id) {
      // Load space data without forcing if we already have it
      await storeActions.loadActiveSpace({ subdomain, spaceId: spaceId }, user.id, false);
      storeActions.openModal(); // Open modal using the new store
    } else {
      log.warn('Component', "Subdomain, SpaceId, or UserID not available for opening settings.");
      // Optionally, show a toast message to the user
    }
  };

  const handleOpenGeneralSettings = async () => {
    // SECURITY CHECK: Double-verify user has settings access (owner or admin)
    if (!canAccessSettings) {
      log.error('Component', "🚨 SECURITY VIOLATION: User without settings access attempted to open settings", {
        userId: user?.id,
        spaceId: spaceId,
        canAccessSettings,
        isOwner,
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (subdomain && spaceId && user?.id) {
      // Load space data without forcing if we already have it
      await storeActions.loadActiveSpace({ subdomain, spaceId: spaceId }, user.id, false);
      storeActions.openModalToTab("general"); // Open modal to the general tab specifically
    } else {
      log.warn('Component', "Subdomain, SpaceId, or UserID not available for opening settings.");
      // Optionally, show a toast message to the user
    }
  };

  const handleOpenInviteModal = () => {
    setIsInviteModalOpen(true);
  };

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(`https://${spaceUrl}`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleButtonClick = () => {
    if (finalActionButtonText === 'Invite Friends') {
      // Use invite behavior
      handleOpenInviteModal();
    } else if (onAction) {
      // Use custom action if provided
      onAction();
    }
  };

  // Determine default button text based on context
  // Only show invite for members who can't access settings, otherwise show join
  const defaultActionButtonText = (isMember && !canAccessSettings) ? 'Invite Friends' : 'Join Space';
  const finalActionButtonText = actionButtonText || defaultActionButtonText;

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        @keyframes shimmer-vertical {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100%);
          }
        }
      `}</style>
      <div className={`w-full bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden ${className}`}>
        <div 
          className={`aspect-video flex items-center justify-center text-xl font-medium relative 
                    ${!resolvedCoverUrl && canAccessSettings ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600' 
                                                              : 'bg-yellow-500 text-white'}`}
          onClick={!resolvedCoverUrl && canAccessSettings ? handleOpenGeneralSettings : undefined}
        >
          {resolvedCoverUrl ? (
            <img 
              src={resolvedCoverUrl} 
              alt={`${spaceName} cover photo`} 
              className="w-full h-full object-cover" 
            />
          ) : canAccessSettings ? (
            <div className="flex items-center justify-center w-full h-full px-2 py-1">
              <ImageIcon className="h-4 w-4 text-teal-600 dark:text-teal-400 mr-1" />
              <span className="text-xs font-medium text-teal-700 dark:text-teal-300 cursor-pointer select-none">Add cover</span>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800">
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-white dark:bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                  <ImageIcon className="h-6 w-6 text-gray-400 dark:text-gray-300" />
                </div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {spaceName}
                </h3>
              </div>
            </div>
          )}
        </div>

        <div className="p-5">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{spaceName}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{spaceUrl}</p>

          {spaceDescription ? (
            <p className="text-gray-700 dark:text-gray-300 mb-2 text-sm">
              {spaceDescription}
            </p>
          ) : canAccessSettings ? (
            <div className="flex items-center mb-2 cursor-pointer select-none" onClick={handleOpenGeneralSettings}>
              <Edit3 className="h-4 w-4 text-teal-600 dark:text-teal-400 mr-1" />
              <span className="text-xs font-medium text-teal-700 dark:text-teal-300">Add description</span>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 mb-2 text-sm italic">
              No description available yet.
            </p>
          )}

          {/* Incentive text for missing elements */}
          {canAccessSettings && (!spaceIcon || !resolvedCoverUrl || !spaceDescription) && (
            <div className="mb-4 p-3 bg-gradient-to-r from-teal-50 to-blue-50 dark:from-teal-900/20 dark:to-blue-900/20 border border-teal-100 dark:border-teal-800 rounded-lg">
              <p className="text-xs text-teal-700 dark:text-teal-300 font-medium mb-2">✨ Complete your space profile:</p>
              <div className="space-y-1">
                {!spaceIcon && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    • <span className="font-medium">Space icon</span> makes your space recognizable and professional
                  </p>
                )}
                {!resolvedCoverUrl && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    • <span className="font-medium">Cover image</span> helps visitors understand what your space is about
                  </p>
                )}
                {!spaceDescription && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    • <span className="font-medium">Description</span> increases engagement and helps with discovery
                  </p>
                )}
              </div>
              <p className="text-xs text-teal-600 dark:text-teal-400 mt-2 font-medium cursor-pointer hover:underline" onClick={handleOpenGeneralSettings}>
                Complete in Settings →
              </p>
            </div>
          )}
          
          {/* Member Stats */}
          <div className="border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-700">
              <div className="flex flex-col items-center justify-center py-2 px-2">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {displayMemberCount}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Members</div>
              </div>
              <div className="flex flex-col items-center justify-center py-2 px-2">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {displayOnlineCount}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Online</div>
              </div>
              <div className="flex flex-col items-center justify-center py-2 px-2">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {displayAdminCount}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Admin</div>
              </div>
            </div>

            {/* Online Member Avatars */}
            {!hideOnlineAvatars && spaceId && (
              <div className="px-4 py-1.5 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-start">
                  <OnlineAvatars 
                    spaceId={spaceId} 
                    maxDisplay={8}
                    className="flex gap-1"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Always show button immediately - no loading state */}
          {canAccessSettings ? (
            <Button 
              variant="outline" 
              className="w-full mt-1.5 py-3 text-sm font-semibold border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              onClick={handleOpenSettings}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          ) : (
            <Button 
              variant="outline" 
              className="w-full mt-1.5 py-3 text-sm font-semibold bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700 relative hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm"
              onClick={handleButtonClick}
            >
              <span className="relative z-10">{finalActionButtonText}</span>
              <span className="absolute inset-0 rounded-md ring-2 ring-teal-500 dark:ring-teal-400 ring-offset-1 ring-offset-white dark:ring-offset-gray-800"></span>
            </Button>
          )}

          {/* Powered by Lokaa */}
          <div className="text-center py-2 border-t border-gray-200 dark:border-gray-700 mt-2">
            <p className="text-xs text-gray-400 dark:text-gray-500">powered by <span className="font-semibold text-teal-600">Lokaa</span></p>
          </div>

          {/* Invite Modal */}
          <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Invite to {spaceName}</DialogTitle>
                <DialogDescription>
                  Share this link with people you want to invite to this space.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center space-x-2 mt-4">
                <div className="grid flex-1 gap-2">
                  <div className="flex items-center border rounded-md p-2 bg-gray-50">
                    <span className="text-sm text-gray-700 truncate">https://{spaceUrl}</span>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  size="sm" 
                  className="px-3 bg-teal-600 hover:bg-teal-700 text-white"
                  onClick={handleCopyInviteLink}
                >
                  {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span className="sr-only">Copy</span>
                </Button>
              </div>
              <DialogFooter className="sm:justify-start">
                <DialogClose asChild>
                  <Button type="button" variant="secondary">
                    Close
                  </Button>
                </DialogClose>
                <div className="flex-1 text-right text-sm text-gray-500">
                  {isCopied ? "Copied to clipboard!" : "Click to copy the invite link"}
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
});

export default SpaceInfoSidebar;
