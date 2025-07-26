import { log } from '@/utils/logger';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useMembership, type MemberRole } from '@/contexts/MembershipContext';
import { useSpace } from '@/hooks/useSpace';
import useSpaceSettingsStore from "@/hooks/useSpaceSettingsStore";
import { useToast } from "@/hooks/use-toast";
import { useCachedMembers, type CachedMemberType } from '@/hooks/useCachedMembers';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronDown, Users, Search, Copy, Settings, UserMinus, LogOut, Loader2, AlertTriangle, UserPlus, X, Link as LinkIcon } from "lucide-react";
import EmergencyDatabaseRecovery from '@/utils/emergencyDatabaseRecovery';
import { getSpaceFallbackData } from '@/utils/spaceDataFallback';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import MemberCard from "./members/MemberCard";
import MemberListItem from "./members/MemberListItem";
import { LeadershipDisplay } from './members/LeadershipDisplay';
import { MemberProfileModal } from './members/MemberProfileModal';
import { useConversations } from '@/features/chat';
import ChatModal from '@/components/chat/ChatModal';
import { setPendingChatNavigation } from '@/utils/scrollPositionManager';

// Use CachedMemberType from the hook as our DisplayMember type
export type DisplayMember = CachedMemberType;

export default function MembersTab() {
  const { user } = useOptimizedAuth();
  const { space: spaceData } = useSpace();
  const { 
    space: storeSpace, 
    permissions: storePermissions 
  } = useSpaceSettingsStore();
  const { toast } = useToast();
  const { startDirectConversation } = useConversations();
  
  // Use same fallback pattern as AboutTab and FeedTab with enhanced fallback  
  const currentSpaceData = storeSpace || (spaceData as any) || null;
  
  // CRITICAL FIX: Type-safe and comprehensive effectiveSpaceData logic
  const effectiveSpaceData = useMemo(() => {
    // PRIORITY 1: Use storeSpace if available
    if (storeSpace && storeSpace.id) {
      return storeSpace;
    }
    
    // PRIORITY 2: Use spaceData with explicit type casting
    if (spaceData && typeof spaceData === 'object') {
      const typedSpaceData = spaceData as any;
      if (typedSpaceData?.id && typedSpaceData?.name) {
        return typedSpaceData;
      }
    }
    
    // PRIORITY 3: Use currentSpaceData (fallback from storeSpace || spaceData)
    if (currentSpaceData && currentSpaceData.id) {
      return currentSpaceData;
    }
    
    // EMERGENCY FALLBACK: Use space fallback data based on current subdomain
    const currentSubdomain = window.location.pathname.split('/')[1] || 'nextpath-ai';
    const fallbackData = getSpaceFallbackData(currentSubdomain);
    
    if (fallbackData) {
      return {
        id: fallbackData.id,
        name: fallbackData.name,
        subdomain: fallbackData.subdomain,
        description: fallbackData.description || 'Community space',
        owner_id: fallbackData.owner_id,
        is_private: false,
        icon_image: '🏗️',
        cover_image: '',
        member_count: fallbackData.member_count || 1,
        created_at: fallbackData.created_at || new Date().toISOString(),
        primary_color: '#2563eb',
        secondary_color: '#3b82f6'
      };
    }
    
    // Final fallback if no space data available
    return null;
  }, [storeSpace, spaceData, currentSpaceData]);
  
  // Removed debug logging to prevent console spam
  
  const { 
    refreshMembership, 
    changeMemberRole, 
    removeMember, 
    leaveSpace, 
  } = useMembership();
  
  // Use cached members instead of local state
  const {
    members,
    loading,
    error,
    refetch,
    handleMemberRemoved,
    handleMemberRoleChanged,
    getAdminAndOwnerMembers,
    getRegularMembers,
    getSpaceOwner,
  } = useCachedMembers(effectiveSpaceData?.id);
  
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState<boolean>(false);
  const [selectedMember, setSelectedMember] = useState<DisplayMember | null>(null);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState<boolean>(false);
  
  // Chat modal state
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isStartingChat, setIsStartingChat] = useState(false);
  
  // Simple debounce for search
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("");
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleMemberCardClick = useCallback((member: DisplayMember) => {
    setSelectedMember(member);
    setIsMemberModalOpen(true);
  }, []);

  const handleCloseMemberModal = useCallback(() => {
    setIsMemberModalOpen(false);
    setSelectedMember(null);
  }, []);

  const handleMemberChatClick = useCallback(async (member: DisplayMember) => {
    if (!member.user_id || isStartingChat) return;
    
    // ✅ CRITICAL FIX: Set pending chat navigation to prevent scroll resets
    setPendingChatNavigation(true);
    console.log('🔍 [MembersTab] Set pending chat navigation - member chat clicked');
    
    setIsStartingChat(true);
    try {
      const conversationId = await startDirectConversation(member.user_id);
      setSelectedConversationId(conversationId);
      setIsChatModalOpen(true);
    } catch (error) {
      log.error('Component', 'Error starting chat:', error);
      toast({
        title: "Error",
        description: "Failed to start chat. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsStartingChat(false);
    }
  }, [startDirectConversation, toast, isStartingChat]);

  const handleCloseChatModal = useCallback(() => {
    setIsChatModalOpen(false);
    setSelectedConversationId(null);
  }, []);
  
  const handleChangeRole = useCallback(async (memberToUpdate: DisplayMember, newRole: MemberRole) => {
    if (!currentSpaceData?.id) return;
    try {
      if (memberToUpdate.user_id === currentSpaceData.owner_id) {
        toast({title: "Action Not Allowed", description: "The space owner's role cannot be changed.", variant: "destructive"});
        return;
      }
      
      // Optimistic update
      handleMemberRoleChanged(memberToUpdate.user_id, newRole);
      
      const success = await changeMemberRole(currentSpaceData.id, memberToUpdate.user_id, newRole);
      if (success) {
        toast({title: "Success", description: `${memberToUpdate.full_name || 'Member'}'s role updated to ${newRole}.`});
        
        if(refreshMembership) {
          refreshMembership();
        }
      } else {
        // Revert optimistic update on failure
        handleMemberRoleChanged(memberToUpdate.user_id, memberToUpdate.role);
        toast({title: "Error", description: "Failed to update member role.", variant: "destructive"});
      }
    } catch (err) {
      // Revert optimistic update on error
      handleMemberRoleChanged(memberToUpdate.user_id, memberToUpdate.role);
      log.error('Component', "Error changing member role:", err);
      toast({title: "Error", description: "An unexpected error occurred while changing role.", variant: "destructive"});
    }
  }, [currentSpaceData, changeMemberRole, handleMemberRoleChanged, refreshMembership, toast]);

  const handleRemoveMemberAction = useCallback(async (memberToRemove: DisplayMember) => {
    if (!currentSpaceData?.id || !user || !removeMember) return;
    if (memberToRemove.user_id === currentSpaceData.owner_id) {
        toast({ title: "Action Not Allowed", description: "The space owner cannot be removed.", variant: "destructive" });
        return;
    }
    if (memberToRemove.user_id === user.id) {
        toast({ title: "Action Not Allowed", description: "You cannot remove yourself using this action. Use 'Leave Space'.", variant: "destructive" });
        return;
    }
    
    log.debug('Component', `🗑️ [MembersTab] Removing member from cache: ${memberToRemove.user_id}`);
    log.debug('Component', `🗑️ [MembersTab] Member details:`, {
      id: memberToRemove.id,
      user_id: memberToRemove.user_id,
      full_name: memberToRemove.full_name,
      role: memberToRemove.role
    });
    
    try {
      // Optimistic update
      handleMemberRemoved(memberToRemove.id);
      
      log.debug('Component', `🔄 [MembersTab] Calling removeMember for space: ${currentSpaceData.id}`);
      const success = await removeMember(currentSpaceData.id, memberToRemove.user_id);
      
      log.debug('Component', `📊 [MembersTab] Remove member result: ${success ? 'SUCCESS' : 'FAILED'}`);
      
      if (success) {
        toast({ title: "Member Removed", description: `${memberToRemove.full_name || 'Member'} has been removed.` });
        if (refreshMembership) {
          refreshMembership(); // Refresh general membership state if needed
        }
        // Close modal if the removed member was selected
        if (selectedMember?.id === memberToRemove.id) {
          handleCloseMemberModal();
        }
      } else {
        log.debug('Component', `🔄 [MembersTab] Fetching members from Supabase for space: ${currentSpaceData.id}`);
        // Revert optimistic update on failure - refetch to get accurate state
        refetch(true);
        // The removeMember function in context already shows a toast on failure
      }
    } catch (err) {
      log.error('Component', `🚨 [MembersTab] Exception during member removal:`, err);
      // Revert optimistic update on error - refetch to get accurate state
      refetch(true);
      log.error('Component', "Error removing member:", err);
      toast({ title: "Error", description: "An unexpected error occurred while removing member.", variant: "destructive" });
    }
  }, [currentSpaceData, user, removeMember, handleMemberRemoved, refetch, refreshMembership, toast, selectedMember, handleCloseMemberModal]);

  const handleLeaveSpaceAction = useCallback(async () => {
    if(!currentSpaceData?.id || !user) return;
    if(user.id === currentSpaceData.owner_id){
        toast({title: "Action Not Allowed", description: "Space owner cannot leave. Transfer ownership first.", variant: "destructive"});
        return;
    }
    try {
        const success = await leaveSpace(currentSpaceData.id);
        if (success) {
            toast({title: "Success", description: "You have left the space.",});
            if(refreshMembership) refreshMembership();
            // Close modal after leaving
            handleCloseMemberModal();
            // Potentially redirect or update UI further after leaving
        } else {
            toast({title: "Error", description: "Failed to leave space.", variant: "destructive"});
        }
    } catch (err) {
        log.error('Component', "Error leaving space:", err);
        toast({title: "Error", description: "An unexpected error occurred while trying to leave.", variant: "destructive"});
    }
  }, [currentSpaceData, user, leaveSpace, refreshMembership, toast, handleCloseMemberModal]);

  const filteredMembers = useMemo(() => {
    if (!debouncedSearchQuery) return members;
    return members.filter(member =>
      member.full_name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
  }, [members, debouncedSearchQuery]);

  const adminAndOwnerMembers = useMemo(() => {
    const allAdminOwner = getAdminAndOwnerMembers();
    if (!debouncedSearchQuery) return allAdminOwner;
    return allAdminOwner.filter(member =>
      member.full_name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
  }, [getAdminAndOwnerMembers, debouncedSearchQuery]);

  const spaceOwner = useMemo(() => {
    return getSpaceOwner();
  }, [getSpaceOwner]);

  const otherAdmins = useMemo(() => {
    return adminAndOwnerMembers.filter(member => member.role === 'admin');
  }, [adminAndOwnerMembers]);

  const regularMembers = useMemo(() => {
    const allRegular = getRegularMembers();
    if (!debouncedSearchQuery) return allRegular;
    return allRegular.filter(member =>
      member.full_name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
  }, [getRegularMembers, debouncedSearchQuery]);
  
  const currentUserRoleInSpace: MemberRole = useMemo(() => {
    if (!user || !effectiveSpaceData) return 'member'; 
    if (effectiveSpaceData.owner_id === user.id) return 'owner';
    const currentUserMemberInfo = members.find(m => m.user_id === user.id);
    return currentUserMemberInfo?.role || 'member';
  }, [user, effectiveSpaceData, members]);

  const inviteLink = useMemo(() => {
    if (!effectiveSpaceData?.subdomain) return "";
    const baseUrl = import.meta.env.VITE_APP_URL || "https://lokaa.app";
    return `${baseUrl}/${effectiveSpaceData.subdomain}`;
  }, [effectiveSpaceData?.subdomain]);

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink)
      .then(() => toast({ title: "Copied!", description: "Invite link copied to clipboard." }))
      .catch(() => toast({ title: "Error", description: "Failed to copy invite link.", variant: "destructive" }));
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading members...</span></div>;
  }

  // Add safety check for space data
  if (!effectiveSpaceData?.id) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading space...</span></div>;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button onClick={() => { 
            if(refreshMembership) refreshMembership(); 
            else refetch(true); 
          }} variant="link" className="ml-2 p-0 h-auto text-destructive-foreground hover:text-destructive-foreground/80">
            Try reloading.
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <div className="mb-6 md:mb-8 text-center">
        <h2 className="text-3xl font-semibold text-foreground">
          The Team
        </h2>
      </div>

      {(spaceOwner || otherAdmins.length > 0) && (
        <LeadershipDisplay 
          owner={spaceOwner}
          admins={otherAdmins}
          currentUserId={user?.id}
                  currentUserRoleInSpace={currentUserRoleInSpace}
        spaceOwnerId={effectiveSpaceData?.owner_id}
          onChangeRole={handleChangeRole}
          onRemoveMember={handleRemoveMemberAction}
          onMemberClick={handleMemberCardClick}
          onChatClick={handleMemberChatClick}
        />
      )}

      <div className="my-6 md:my-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="relative flex-grow md:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search members by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        { (currentUserRoleInSpace === 'owner' || currentUserRoleInSpace === 'admin') && (
          <Button onClick={() => setIsInviteModalOpen(true)} className="w-full md:w-auto">
            <UserPlus className="mr-2 h-4 w-4" /> Invite Member
          </Button>
        )}
      </div>

      {regularMembers.length > 0 && (
        <>
          <h3 className="text-xl font-medium mb-4 text-foreground">Space Members ({regularMembers.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {regularMembers.map(member => (
              <MemberListItem
                key={member.id}
                avatar_url={member.avatar_url}
                full_name={member.full_name}
                profile_url={member.profile_url}
                bio={member.bio}
                joined_at={member.joined_at}
                is_online={member.is_online}
                onClick={() => handleMemberCardClick(member)}
                onChatClick={() => handleMemberChatClick(member)}
                currentUserId={user?.id}
                userId={member.user_id}
              />
            ))}
          </div>
        </>
      )}

      {filteredMembers.length === 0 && !loading && (
        <div className="text-center py-10">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-medium text-foreground">No members found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchQuery ? "Try adjusting your search." : "This space doesn\'t have any members yet, or they couldn\'t be loaded."}
          </p>
          { (currentUserRoleInSpace === 'owner' || currentUserRoleInSpace === 'admin') && !searchQuery && (
            <Button onClick={() => setIsInviteModalOpen(true)} className="mt-4">
                <UserPlus className="mr-2 h-4 w-4" /> Invite Member
            </Button>
          )}
        </div>
      )}

      {/* Member Profile Modal */}
      <MemberProfileModal
        member={selectedMember}
        isOpen={isMemberModalOpen}
        onClose={handleCloseMemberModal}
        currentUserId={user?.id}
        currentUserRoleInSpace={currentUserRoleInSpace}
        spaceOwnerId={effectiveSpaceData?.owner_id}
        onChangeRole={handleChangeRole}
        onRemoveMember={handleRemoveMemberAction}
        onLeaveSpace={handleLeaveSpaceAction}
      />

      {/* Chat Modal */}
      <ChatModal
        isOpen={isChatModalOpen}
        onClose={handleCloseChatModal}
        initialConversationId={selectedConversationId || undefined}
      />

      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-md relative">
            <Button
              variant="ghost"
              className="absolute top-3 right-3 h-8 w-8 p-0"
              onClick={() => setIsInviteModalOpen(false)}
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
            <h3 className="text-lg font-semibold mb-1">Invite Members to {spaceData?.name || 'this space'}</h3>
            <p className="text-sm text-muted-foreground mb-4">Share this link with anyone you want to invite to this space.</p>
            <div className="flex items-center space-x-2 mb-4">
              <Input 
                id="invite-link" 
                readOnly 
                value={inviteLink} 
                className="flex-1"
                aria-label="Invite link"
              />
              <Button onClick={copyInviteLink} variant="outline" size="sm">
                <LinkIcon className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Anyone with this link will be able to join this space.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Note: Removed old duplicated/global scope functions like getInitials, formatJoinDate etc. 
// as they are now correctly defined within the MembersTab component scope.
// Removed old directFetchMembers and useEffect definitions.
// Removed old type definitions for SpaceMember as DisplayMember is now primary.

// CSS for modal animations (should be in a global CSS file or Tailwind config)
/*
@keyframes modalFadeInContainer {
  to { opacity: 1; }
}
.animate-modalFadeInContainer {
  opacity: 0;
  animation: modalFadeInContainer forwards;
}

@keyframes modalFadeInContent {
  to { opacity: 1; transform: scale(1); }
}
.animate-modalFadeInContent {
  opacity: 0;
  transform: scale(0.95);
  animation: modalFadeInContent forwards;
}
*/ 