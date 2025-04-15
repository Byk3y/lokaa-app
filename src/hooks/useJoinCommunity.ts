
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function useJoinCommunity(setJoinedCommunities) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleJoinCommunity = async (communityId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    try {
      const { data: existingMembership, error: checkError } = await supabase
        .from('members')
        .select('*')
        .eq('user_id', user.id)
        .eq('community_id', communityId)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      if (existingMembership) {
        if (!existingMembership.is_active) {
          const { error: updateError } = await supabase
            .from('members')
            .update({ is_active: true })
            .eq('id', existingMembership.id);
          
          if (updateError) throw updateError;
        } else {
          toast({
            title: "Already a member",
            description: "You are already a member of this community.",
          });
          return;
        }
      } else {
        const { error: insertError } = await supabase
          .from('members')
          .insert({
            user_id: user.id,
            community_id: communityId,
            is_active: true
          });
        
        if (insertError) throw insertError;
      }
      
      toast({
        title: "Joined community",
        description: "You have successfully joined this community.",
      });
      
      const { data: joinedData, error: joinedError } = await supabase
        .from('communities')
        .select('*')
        .eq('id', communityId)
        .single();
      
      if (joinedError) throw joinedError;
      
      setJoinedCommunities(prev => [...prev, joinedData]);
    } catch (error) {
      console.error('Error joining community:', error);
      toast({
        title: "Error joining community",
        description: "Could not join this community at this time.",
        variant: "destructive"
      });
    }
  };

  return handleJoinCommunity;
}
