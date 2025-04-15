
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function useJoinCommunity(setJoinedCommunities: React.Dispatch<React.SetStateAction<any[]>>) {
  const { user } = useAuth();
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();

  const handleJoinCommunity = async (communityId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to join communities.",
        variant: "destructive"
      });
      navigate("/login");
      return;
    }

    setJoining(true);

    try {
      // Check if already a member
      const { data: existingMembership, error: checkError } = await supabase
        .from('members')
        .select('*')
        .eq('user_id', user.id)
        .eq('community_id', communityId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // Real error, not just "no rows returned"
        throw checkError;
      }

      if (existingMembership) {
        // Already a member, just reactivate if needed
        if (!existingMembership.is_active) {
          const { error: updateError } = await supabase
            .from('members')
            .update({ is_active: true })
            .eq('id', existingMembership.id);

          if (updateError) throw updateError;
        }
      } else {
        // Not a member, create new membership
        const { error: insertError } = await supabase
          .from('members')
          .insert({
            user_id: user.id,
            community_id: communityId,
            is_active: true
          });

        if (insertError) throw insertError;
      }

      // Get the community data to add to the joined communities state
      const { data: communityData, error: communityError } = await supabase
        .from('communities')
        .select('*')
        .eq('id', communityId)
        .single();

      if (communityError) throw communityError;

      // Update state with the new community
      setJoinedCommunities(prev => {
        // Check if already in the list
        const exists = prev.some(community => community.id === communityId);
        if (exists) return prev;
        return [...prev, communityData];
      });

      toast({
        title: "Joined successfully",
        description: "You have joined the community.",
      });

      // Redirect to the community page
      navigate(`/c/${communityId}`);

    } catch (error) {
      console.error('Error joining community:', error);
      toast({
        title: "Error joining community",
        description: "Could not join the community at this time.",
        variant: "destructive"
      });
    } finally {
      setJoining(false);
    }
  };

  return handleJoinCommunity;
}
