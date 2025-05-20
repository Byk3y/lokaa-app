import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { PostgrestError } from '@supabase/supabase-js';

interface JoinSpaceResponse {
  success: boolean;
  message: string;
}

export function useJoinSpaceViaHook() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joinSpace = async (spaceId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: rawData, error: rpcError } = await supabase.rpc<
        'public_join_space',
        { 
          Args: { space_id_param: string }; 
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Returns: any; // Using any as Json type is not directly importable
        }
      >('public_join_space', { 
        space_id_param: spaceId, 
      });
      
      const data: unknown = rawData; // Explicitly type rawData as unknown before casting
      const response = data as JoinSpaceResponse | null;

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

      if (response && !response.success) {
        console.warn('Join space attempt not successful:', response.message);
        setError(response.message);
        toast({
          title: "Join Space Information", 
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
    } catch (err: unknown) { 
      console.error('Exception joining space:', err);
      let errorMessage = 'Unknown error';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      setError(errorMessage);
      toast({
        title: "Join Error",
        description: "An unexpected error occurred while trying to join the space.",
        variant: "destructive"
      });
      return { success: false, message: errorMessage };
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