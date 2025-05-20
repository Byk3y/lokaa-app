import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Define the response type, similar to useJoinSpaceViaHook.ts
interface JoinSpaceResponse {
  success: boolean;
  message: string;
}

export function useJoinSpaceViaHook() { // Note: Hook name might be different if file is truly useUserSelfJoinPolicy.ts
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joinSpace = async (spaceId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc<
        'public_join_space',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { Args: { space_id_param: string }; Returns: any } // Typed RPC
      >('public_join_space', { 
        space_id_param: spaceId // Corrected arg name
      });
      
      const response = rpcData as JoinSpaceResponse | null; // Cast the response

      if (rpcError) {
        console.error('Error joining space:', rpcError);
        setError(rpcError.message);
        toast({
          title: "Failed to Join Space",
          description: rpcError.message || "Could not join the space. Please try again later.",
          variant: "destructive"
        });
        return { success: false, message: rpcError.message };
      }

      if (response && !response.success) { // Use the casted response
        console.warn('Join space attempt not successful:', response.message);
        setError(response.message);
        toast({
          title: "Failed to Join Space", // Or "Join Space Information" based on other hook
          description: response.message || "Could not complete the join process.",
          variant: "default"
        });
        return { success: false, message: response.message };
      }
      
      toast({
        title: "Space Joined Successfully",
        description: response?.message || "You have successfully joined the space.",
      });
      return { success: true, message: response?.message || "Successfully joined." };
    } catch (err: unknown) { // Changed to unknown
      console.error('Exception joining space:', err);
      const message = err instanceof Error ? err.message : String(err); // Handle message safely
      setError(message || 'Unknown error');
      toast({
        title: "Join Error",
        description: message || "An unexpected error occurred while trying to join the space.",
        variant: "destructive"
      });
      return { success: false, message: message || 'Unknown error' };
    } finally {
      setLoading(false);
    }
  };

  return { 
    loading, 
    error, 
    joinSpace
  };
} 