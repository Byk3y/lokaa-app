import React, { useState, useEffect, memo } from 'react';
import { Globe, Lock, Users, Settings, Edit3, ImageUp, UserPlus, Copy, Check, Image as ImageIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { resolveImageUrl } from "@/utils/preloadAssets";
// import useSpaceSettingsModal from "@/hooks/useSpaceSettingsModal"; // Removed old hook
import useSpaceSettingsStore from "@/hooks/useSpaceSettingsStore"; // Added new store
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth'; // Added for userId
import { Separator } from "@/components/ui/separator";
import { useMemberCounts } from "@/hooks/useMemberCounts"; // Import our new hook
import { getSupabaseClient } from "@/integrations/supabase/client";
import { createManagedInterval } from '@/utils/pageVisibilityManager';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";

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
}

const DEFAULT_COVER_IMAGE = '/default-space-cover.jpg';

const SpaceInfoSidebar = memo(function SpaceInfoSidebar({
  spaceName,
  spaceDescription,
  coverImage,
  memberCount: propMemberCount,
  adminCount: propAdminCount,
  onlineCount: propOnlineCount,
  canAccessSettings,
  subdomain,
  spaceId,
  isOwner,
  isMember,
  actionButtonText,
  onAction,
}: SpaceInfoSidebarProps) {
  // const openSpaceSettingsModal = useSpaceSettingsModal(state => state.open); // Removed old hook usage
  const { user } = useOptimizedAuth(); // Get user for userId
  const storeActions = useSpaceSettingsStore.getState(); // Get store actions
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);


  
  // FIXED: Always call the hook unconditionally, but don't use hardcoded fallback
  const effectiveSpaceId = spaceId; // Use actual space ID or undefined
  const { 
    totalMembers, 
    onlineMembers, 
    adminMembers, 
    loading: countsLoading 
  } = useMemberCounts(effectiveSpaceId);
  
  // FIXED: Simple fallback to prop values only when hook is loading or returns 0
  const displayMemberCount = totalMembers > 0 ? totalMembers : (propMemberCount || 0);
  const displayOnlineCount = onlineMembers > 0 ? onlineMembers : (propOnlineCount || 0);
  const displayAdminCount = adminMembers > 0 ? adminMembers : (propAdminCount || 0);
  
  // Member counts calculated and updated
  
  // Effect to check current user's online status and fix if needed
  useEffect(() => {
    if (!effectiveSpaceId || !user?.id) return;
    
    // Update the user's online status using the improved safe function
    const ensureUserOnline = async () => {
      try {
        const { data, error } = await (getSupabaseClient() as any).rpc('ensure_user_online_safe', {
          p_space_id: effectiveSpaceId,
          p_user_id: user.id
        });
        
        if (error) {
          console.warn('SpaceInfoSidebar heartbeat error:', error.message);
          return;
        }
        
        // data will be true if the user was successfully marked online
        // Heartbeat successful
      } catch (err) {
        console.warn('SpaceInfoSidebar heartbeat exception:', err);
      }
    };
    
    // Call once on mount
    ensureUserOnline();
    
    // Then set up a managed heartbeat to keep online status active (every 45 seconds)
    const cleanup = createManagedInterval(
      `space-heartbeat-${effectiveSpaceId}`,
      ensureUserOnline,
      45000,
      'heartbeat'
    );
    
    return cleanup;
  }, [effectiveSpaceId, user?.id]);
  


  // Determine default button text based on context
  // Show "Invite Friends" if user is a member (includes owners, admins, and regular members)
  const defaultActionButtonText = canAccessSettings || isOwner || isMember ? 'Invite Friends' : 'Join Space';
  const finalActionButtonText = actionButtonText || defaultActionButtonText;

  const handleOpenSettings = async () => {
    if (subdomain && effectiveSpaceId && user?.id) {
      // Ensure the store is loaded with the current space context before opening the modal
      await storeActions.loadActiveSpace({ subdomain, spaceId: effectiveSpaceId }, user.id, true);
      storeActions.openModal(); // Open modal using the new store
    } else {
      console.warn("Subdomain, SpaceId, or UserID not available for opening settings.");
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

  const resolvedCoverUrl = coverImage ? resolveImageUrl(coverImage, spaceName) : null;
  const spaceUrl = subdomain ? `lokaa.com/${subdomain}` : "lokaa.com/your-space";

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
      <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div 
          className={`aspect-video flex items-center justify-center text-xl font-medium relative 
                    ${!resolvedCoverUrl && canAccessSettings ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600' 
                                                              : 'bg-yellow-500 text-white'}`}
          onClick={!resolvedCoverUrl && canAccessSettings ? handleOpenSettings : undefined}
        >
          {resolvedCoverUrl ? (
            <img 
              src={resolvedCoverUrl} 
              alt={`${spaceName} cover photo`} 
              className="w-full h-full object-cover" 
            />
          ) : canAccessSettings ? (
            <div className="flex flex-col items-center p-8">
              <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center mb-3">
                <ImageIcon className="h-6 w-6 text-teal-600 dark:text-teal-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Add a cover photo</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-3">
                Make your space more welcoming with a custom cover image
              </p>
              <div className="flex items-center text-xs text-teal-600 dark:text-teal-400">
                <Edit3 className="h-3 w-3 mr-1" />
                Click to upload
              </div>
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
            <p className="text-gray-700 dark:text-gray-300 mb-4 text-sm">
              {spaceDescription}
            </p>
          ) : canAccessSettings ? (
            <div className="mb-4 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
              <p className="text-teal-700 dark:text-teal-300 text-xs font-medium mb-1">
                Add a description
              </p>
              <p className="text-teal-600 dark:text-teal-400 text-xs">
                Help visitors understand what your space is about
              </p>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm italic">
              No description available yet.
            </p>
          )}
          
          <Separator className="my-4 dark:bg-gray-700" />

          <div className="flex justify-around items-center text-center mb-5">
            <div className="px-2">
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {displayMemberCount}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Member{displayMemberCount !== 1 ? 's' : ''}</p>
            </div>
            <Separator orientation="vertical" className="h-10 dark:bg-gray-600" />
            <div className="px-2">
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {displayOnlineCount}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Online</p>
            </div>
            <Separator orientation="vertical" className="h-10 dark:bg-gray-600" />
            <div className="px-2">
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {displayAdminCount}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Admin{displayAdminCount !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {canAccessSettings ? (
            <Button 
              variant="outline" 
              className="w-full py-3 text-sm font-semibold border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              onClick={handleOpenSettings}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          ) : (
            <Button 
              variant="outline" 
              className="w-full py-3 text-sm font-semibold bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700 relative hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm"
              onClick={handleButtonClick}
            >
              <span className="relative z-10">{finalActionButtonText}</span>
              <span className="absolute inset-0 rounded-md ring-2 ring-teal-500 dark:ring-teal-400 ring-offset-1 ring-offset-white dark:ring-offset-gray-800"></span>
            </Button>
          )}
        </div>
        

        
        {/* Powered by Lokaa */}
        <div className="text-center py-3 border-t border-gray-200 dark:border-gray-700 mt-auto">
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
    </>
  );
});

export default SpaceInfoSidebar;