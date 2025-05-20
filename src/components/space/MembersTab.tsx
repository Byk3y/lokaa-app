import { useState, useEffect, useCallback, useMemo } from "react";
import { useSpace } from "@/contexts/SpaceContext";
import { useMembership, MemberRole } from "@/contexts/MembershipContext";
import { Loader2, Search, UserPlus, Link as LinkIcon, Users, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import MemberCard from "./members/MemberCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LeadershipDisplay } from './members/LeadershipDisplay';

export type DisplayMember = {
  id: string;
  user_id: string;
  space_id: string;
  role: MemberRole;
  joined_at: string;
  status: string;
  is_online?: boolean;
  last_active_at: string | null;
  full_name: string | null;
  avatar_url: string | null;
  profile_url: string | null;
  activity_score: number;
  bio: string | null;
};

type UserProfileData = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  profile_url: string | null;
  activity_score: number;
  bio: string | null;
};

type SpaceMembershipRecord = {
  id: string; 
  user_id: string;
  role: MemberRole;
  joined_at: string;
  last_active_at: string | null;
  status: string;
  is_online?: boolean;
};

export default function MembersTab() {
  const { spaceData } = useSpace();
  const { user } = useAuth();
  const {
    changeMemberRole,
    leaveSpace,
    refreshMembership,
    removeMember
  } = useMembership();
  
  const [members, setMembers] = useState<DisplayMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(timerId);
    };
  }, [searchQuery]);

  const directFetchMembers = useCallback(async (spaceId: string): Promise<DisplayMember[]> => {
    if (!user || !spaceData) return [];
    try {
      const { data: spaceMembersData, error: spaceMembersError } = await supabase
        .from('space_members')
        .select('id, user_id, role, joined_at, last_active_at, status, is_online')
        .eq('space_id', spaceId)
        .eq('status', 'active');

      if (spaceMembersError) throw spaceMembersError;
      if (!spaceMembersData || spaceMembersData.length === 0) return [];
      
      const typedSpaceMembers = spaceMembersData as SpaceMembershipRecord[];
      const userIds = typedSpaceMembers.map(sm => sm.user_id).filter(id => !!id);
      if (userIds.length === 0) return [];

      const { data: profilesData, error: profilesError } = await supabase
        .from('users')
        .select('id, full_name, avatar_url, profile_url, activity_score, bio')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map<string, UserProfileData>();
      if (profilesData) {
        (profilesData as UserProfileData[]).forEach(profile => {
          profilesMap.set(profile.id, { ...profile, activity_score: profile.activity_score || 0, bio: profile.bio || null });
        });
      }

      const combinedMembers: DisplayMember[] = typedSpaceMembers.map(sm => {
        const profile = profilesMap.get(sm.user_id);
        let authoritativeRole = sm.role;
        if (spaceData.owner_id === sm.user_id) {
            authoritativeRole = 'owner' as MemberRole;
        }
        return {
          id: sm.id,
          user_id: sm.user_id,
          space_id: spaceId,
          role: authoritativeRole,
          joined_at: sm.joined_at,
          status: sm.status,
          is_online: sm.is_online,
          last_active_at: sm.last_active_at,
          full_name: profile?.full_name || null,
          avatar_url: profile?.avatar_url || null,
          profile_url: profile?.profile_url || null,
          activity_score: profile?.activity_score || 0,
          bio: profile?.bio || null,
        };
      });
      return combinedMembers;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during member fetch.";
      setError(errorMessage);
      console.error("directFetchMembers error:", err);
      return [];
    }
  }, [user, spaceData]);
  
  useEffect(() => {
    const loadMembers = async () => {
      if (!spaceData?.id) { setLoading(false); return; }
      setLoading(true); setError(null);
      try {
        const fetchedDisplayMembers = await directFetchMembers(spaceData.id);
        setMembers(fetchedDisplayMembers);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message || "An unknown error occurred while loading members.");
        console.error("loadMembers error:", e);
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };
    loadMembers();
  }, [spaceData, directFetchMembers, refreshMembership]);
  
  const handleChangeRole = useCallback(async (memberToUpdate: DisplayMember, newRole: MemberRole) => {
    if (!spaceData?.id) return;
    try {
      if (memberToUpdate.user_id === spaceData.owner_id) {
        toast({title: "Action Not Allowed", description: "The space owner's role cannot be changed.", variant: "destructive"});
        return;
      }
      const success = await changeMemberRole(spaceData.id, memberToUpdate.user_id, newRole);
      if (success) {
        toast({title: "Success", description: `${memberToUpdate.full_name || 'Member'}'s role updated to ${newRole}.`});
        const fetched = await directFetchMembers(spaceData.id); 
        setMembers(fetched);
        
        if(refreshMembership) {
          refreshMembership();
        }
      } else {
        toast({title: "Error", description: "Failed to update member role.", variant: "destructive"});
      }
    } catch (err) {
      console.error("Error changing member role:", err);
      toast({title: "Error", description: "An unexpected error occurred while changing role.", variant: "destructive"});
    }
  }, [spaceData, changeMemberRole, directFetchMembers, refreshMembership, toast]);

  const handleRemoveMemberAction = useCallback(async (memberToRemove: DisplayMember) => {
    if (!spaceData?.id || !user || !removeMember) return;
    if (memberToRemove.user_id === spaceData.owner_id) {
        toast({ title: "Action Not Allowed", description: "The space owner cannot be removed.", variant: "destructive" });
        return;
    }
    if (memberToRemove.user_id === user.id) {
        toast({ title: "Action Not Allowed", description: "You cannot remove yourself using this action. Use 'Leave Space'.", variant: "destructive" });
        return;
    }
    
    try {
      const success = await removeMember(spaceData.id, memberToRemove.user_id);
      if (success) {
        toast({ title: "Member Removed", description: `${memberToRemove.full_name || 'Member'} has been removed.` });
        const fetched = await directFetchMembers(spaceData.id);
        setMembers(fetched);
        if (refreshMembership) {
          refreshMembership(); // Refresh general membership state if needed
        }
      } else {
        // The removeMember function in context already shows a toast on failure
      }
    } catch (err) {
      console.error("Error removing member:", err);
      toast({ title: "Error", description: "An unexpected error occurred while removing member.", variant: "destructive" });
    }
  }, [spaceData, user, removeMember, directFetchMembers, refreshMembership, toast]);

  const handleLeaveSpaceAction = useCallback(async () => {
    if(!spaceData?.id || !user) return;
    if(user.id === spaceData.owner_id){
        toast({title: "Action Not Allowed", description: "Space owner cannot leave. Transfer ownership first.", variant: "destructive"});
        return;
    }
    try {
        const success = await leaveSpace(spaceData.id);
        if (success) {
            toast({title: "Success", description: "You have left the space.",});
            if(refreshMembership) refreshMembership();
            // Potentially redirect or update UI further after leaving
        } else {
            toast({title: "Error", description: "Failed to leave space.", variant: "destructive"});
        }
    } catch (err) {
        console.error("Error leaving space:", err);
        toast({title: "Error", description: "An unexpected error occurred while trying to leave.", variant: "destructive"});
    }
  }, [spaceData, user, leaveSpace, refreshMembership, toast]);

  const filteredMembers = useMemo(() => {
    if (!debouncedSearchQuery) return members;
    return members.filter(member =>
      member.full_name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
  }, [members, debouncedSearchQuery]);

  const adminAndOwnerMembers = useMemo(() => {
    return filteredMembers.filter(member => member.role === 'owner' || member.role === 'admin').sort((a,b) => {
        if (a.role === 'owner' && b.role !== 'owner') return -1;
        if (a.role !== 'owner' && b.role === 'owner') return 1;
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        return (a.full_name || '').localeCompare(b.full_name || '');
    });
  }, [filteredMembers]);

  const spaceOwner = useMemo(() => {
    return adminAndOwnerMembers.find(member => member.role === 'owner');
  }, [adminAndOwnerMembers]);

  const otherAdmins = useMemo(() => {
    return adminAndOwnerMembers.filter(member => member.role === 'admin');
  }, [adminAndOwnerMembers]);

  const regularMembers = useMemo(() => {
    return filteredMembers.filter(member => member.role !== 'owner' && member.role !== 'admin').sort((a,b) => (a.full_name || '').localeCompare(b.full_name || ''));
  }, [filteredMembers]);
  
  const currentUserRoleInSpace: MemberRole = useMemo(() => {
    if (!user || !spaceData) return 'member'; 
    if (spaceData.owner_id === user.id) return 'owner';
    const currentUserMemberInfo = members.find(m => m.user_id === user.id);
    return currentUserMemberInfo?.role || 'member';
  }, [user, spaceData, members]);

  const inviteLink = useMemo(() => {
    if (!spaceData?.subdomain) return "";
    const baseUrl = import.meta.env.VITE_APP_URL || "https://lokaa.com";
    return `${baseUrl}/${spaceData.subdomain}`;
  }, [spaceData?.subdomain]);

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink)
      .then(() => toast({ title: "Copied!", description: "Invite link copied to clipboard." }))
      .catch(() => toast({ title: "Error", description: "Failed to copy invite link.", variant: "destructive" }));
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading members...</span></div>;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button onClick={() => { 
            if(refreshMembership) refreshMembership(); 
            else if(spaceData?.id) directFetchMembers(spaceData.id).then(setMembers); 
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
          spaceOwnerId={spaceData?.owner_id}
          onChangeRole={handleChangeRole}
          onRemoveMember={handleRemoveMemberAction}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
            {regularMembers.map(member => (
              <MemberCard
                key={member.id}
                avatar_url={member.avatar_url}
                full_name={member.full_name}
                bio={member.bio}
                joined_at={member.joined_at}
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