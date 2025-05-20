import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { updateLastJoinedSpace } from "@/utils/userSpaceUtils";

// Define a more specific type for setJoinedSpaces if possible,
// for now, using a generic function type.
type Space = {
  id: string;
  name: string;
  subdomain: string;
  // Add other relevant space properties if needed by the component using this hook
};

export default function useJoinSpace(setJoinedSpaces: (updater: (prevSpaces: Space[]) => Space[]) => void) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleJoinSpace = async (spaceId: string) => {
    if (!user) {
      navigate('/login');
      return; // Early return if no user
    }
    
    console.log(`[useJoinSpace] Attempting to join space ID: ${spaceId} for user ID: ${user.id}`);

    try {
      // Call the centralized RPC to handle joining logic
      const { data: rpcData, error: rpcError } = await supabase.rpc<
        'public_join_space',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { Args: { space_id_param: string }; Returns: any }
      >(
        'public_join_space',
        { space_id_param: spaceId }
      );

      if (rpcError) {
        console.error("[useJoinSpace] RPC public_join_space error:", rpcError);
        toast({
          title: "Error Joining Space",
          description: rpcError.message || "An unexpected error occurred during the join process.",
          variant: "destructive",
        });
        return; // Stop execution if RPC call itself errors
      }

      // Define an expected type for the RPC response for better clarity
      type JoinSpaceResponse = {
        success: boolean;
        message: string;
        space_id?: string;
        space_name?: string;
        subdomain?: string;
      };

      const rpcResponse = rpcData as JoinSpaceResponse;

      if (rpcResponse && rpcResponse.success) {
        console.log("[useJoinSpace] Successfully joined/reactivated space via RPC:", rpcResponse.message);
        toast({
          title: rpcResponse.message.includes("reactivated") ? "Membership Reactivated" : "Joined Space",
          description: rpcResponse.message,
        });

        // Update last_joined_space_id in the users table
        const { error: userUpdateError } = await supabase
          .from('users')
          .update({ last_joined_space_id: spaceId })
          .eq('id', user.id);
        
        if (userUpdateError) {
          console.error('[useJoinSpace] Error updating last_joined_space_id:', userUpdateError);
          // Log error but don't necessarily stop the success flow for joining
        } else {
          console.log('[useJoinSpace] Successfully updated last_joined_space_id in database');
        }
        
        const spaceName = rpcResponse.space_name;
        const subdomain = rpcResponse.subdomain;
        const effectiveSpaceId = rpcResponse.space_id || spaceId;

        if (spaceName && subdomain) {
          await updateLastJoinedSpace(
            effectiveSpaceId,
            spaceName,
            subdomain
          );
          
          const joinedSpaceData: Space = {
            id: effectiveSpaceId,
            name: spaceName,
            subdomain: subdomain,
          };
          setJoinedSpaces((prevSpaces) => [...prevSpaces, joinedSpaceData]);
        } else {
            // If RPC didn't return all space details, fetch them.
            console.warn("[useJoinSpace] RPC response did not include full space details. Fetching separately.");
            const { data: fetchedSpaceData, error: fetchError } = await supabase
                .from('spaces')
                .select('id, name, subdomain')
                .eq('id', effectiveSpaceId)
                .single();

            if (fetchError) {
                console.error("[useJoinSpace] Error fetching space details after join:", fetchError);
                // Still show a generic success toast as the join itself might have succeeded.
            } else if (fetchedSpaceData) {
                await updateLastJoinedSpace(
                    fetchedSpaceData.id,
                    fetchedSpaceData.name,
                    fetchedSpaceData.subdomain
                );
                setJoinedSpaces((prevSpaces) => [...prevSpaces, fetchedSpaceData as Space]);
            }
        }

      } else {
        // RPC returned success: false
        console.warn("[useJoinSpace] RPC public_join_space indicated failure:", rpcResponse?.message);
        toast({
          title: "Could Not Join Space",
          description: rpcResponse?.message || "The server denied the join request.",
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      console.error('[useJoinSpace] Outer catch error joining space:', error);
      const message = error instanceof Error ? error.message : String(error);
      toast({
        title: "Error Joining Space",
        description: message || "An unexpected client-side error occurred.",
        variant: "destructive"
      });
    }
  };

  return handleJoinSpace;
}
