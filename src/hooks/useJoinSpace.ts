import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function useJoinSpace(setJoinedSpaces) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleJoinSpace = async (spaceId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    try {
      const { data: existingAccess, error: checkError } = await supabase
        .from('space_access')
        .select('*')
        .eq('user_id', user.id)
        .eq('space_id', spaceId)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      if (existingAccess) {
        if (!existingAccess.is_active) {
          const { error: updateError } = await supabase
            .from('space_access')
            .update({ is_active: true })
            .eq('id', existingAccess.id);
          
          if (updateError) throw updateError;
        } else {
          toast({
            title: "Already a member",
            description: "You are already a member of this space.",
          });
          return;
        }
      } else {
        const { error: insertError } = await supabase
          .from('space_access')
          .insert({
            user_id: user.id,
            space_id: spaceId,
            is_active: true,
            amount_paid: 0,
            paid_at: new Date().toISOString()
          });
        
        if (insertError) throw insertError;
      }
      
      toast({
        title: "Joined space",
        description: "You have successfully joined this space.",
      });
      
      const { data: joinedData, error: joinedError } = await supabase
        .from('spaces')
        .select('*')
        .eq('id', spaceId)
        .single();
      
      if (joinedError) throw joinedError;
      
      setJoinedSpaces(prev => [...prev, joinedData]);
    } catch (error) {
      console.error('Error joining space:', error);
      toast({
        title: "Error joining space",
        description: "Could not join this space at this time.",
        variant: "destructive"
      });
    }
  };

  return handleJoinSpace;
}
