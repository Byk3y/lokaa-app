import React, { useState, memo } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useNavigate } from "react-router-dom";
import { useMembership } from "@/contexts/MembershipContext";
import { log } from '@/utils/logger';

interface SpaceMembershipActionsProps {
  /** Space data for join operations */
  spaceData: {
    id: string;
    name: string;
  };
  /** Whether user is currently a member */
  isMember: boolean;
  /** Whether membership status is loading */
  membershipLoading: boolean;
}

export const SpaceMembershipActions = memo(function SpaceMembershipActions({
  spaceData,
  isMember,
  membershipLoading
}: SpaceMembershipActionsProps) {
  const { user } = useOptimizedAuth();
  const navigate = useNavigate();
  const { joinSpace } = useMembership();
  
  // State for joining a space
  const [joiningSpace, setJoiningSpace] = useState(false);

  // Function to handle joining the space
  const handleJoinSpace = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (!spaceData?.id) {
      toast({
        title: "Error",
        description: "Space information is missing",
        variant: "destructive"
      });
      return;
    }
    
    setJoiningSpace(true);
    
    try {
      // Use the joinSpace function from MembershipContext
      const success = await joinSpace(spaceData.id);
      
      if (success) {
        toast({
          title: "Joined space",
          description: `You've successfully joined ${spaceData.name}.`,
        });
      }
    } catch (err) {
      log.error('Component', "Error joining space:", err);
      toast({
        title: "Error joining space",
        description: "Could not join this space at this time.",
        variant: "destructive"
      });
    } finally {
      setJoiningSpace(false);
    }
  };

  // Render join button if not a member
  const renderJoinButton = () => {
    if (membershipLoading) {
      return (
        <Button disabled className="w-full">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Checking membership...
        </Button>
      );
    }
    
    if (!isMember) {
      return (
        <Button 
          onClick={handleJoinSpace} 
          disabled={joiningSpace || !user}
          className="w-full"
        >
          {joiningSpace ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Joining...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              {user ? 'Join Space' : 'Login to Join'}
            </>
          )}
        </Button>
      );
    }
    
    return null;
  };

  // Only render if user is not a member
  if (isMember) {
    return null;
  }

  return (
    <div className="mb-4">
      {renderJoinButton()}
    </div>
  );
});

export default SpaceMembershipActions;