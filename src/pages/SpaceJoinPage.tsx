import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMembership } from "@/contexts/MembershipContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { updateLastJoinedSpace } from "@/utils/userSpaceUtils";
import { Button } from "@/components/ui/button";

export default function SpaceJoinPage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { joinSpace } = useMembership();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [space, setSpace] = useState<{ id: string; subdomain: string; name: string } | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // If no spaceId or user, redirect to discover
    if (!spaceId || !user) {
      navigate('/discover');
      return;
    }

    const performJoinSpace = async () => {
      try {
        setLoading(true);
        setError(null);

        // First fetch the space details to get the subdomain
        const { data: spaceData, error: spaceError } = await supabase
          .from("spaces")
          .select("id, name, subdomain")
          .eq("id", spaceId)
          .single();

        if (spaceError) {
          console.error("[SpaceJoinPage] Error fetching space details:", spaceError);
          setError(spaceError.message || "Failed to load space details.");
          toast({ title: "Error", description: "Could not load space details. Please try again.", variant: "destructive" });
          setLoading(false);
          return;
        }

        if (!spaceData) {
          console.error("[SpaceJoinPage] Space not found during fetch for ID:", spaceId);
          setError("Space not found. It may have been removed or the link is incorrect.");
          toast({ title: "Space Not Found", description: "The requested space could not be found.", variant: "destructive" });
          setLoading(false);
          return;
        }

        setSpace(spaceData);

        console.log("[SpaceJoinPage] Attempting to join space via MembershipContext for space ID:", spaceId);
        const success = await joinSpace(spaceId);
        
        if (success) {
          console.log("[SpaceJoinPage] joinSpace from context reported success for space ID:", spaceId);
          await updateLastJoinedSpace(
            spaceData.id,
            spaceData.name,
            spaceData.subdomain
          );
          localStorage.setItem(`joined_space_${spaceId}`, "true");
          sessionStorage.setItem(`can_post_in_${spaceId}`, "true");
          
          // A general success toast here is okay, as context might give specifics of join/reactivate.
          toast({
            title: "Successfully Joined Space",
            description: `You are now a member of ${spaceData.name}. Redirecting...`,
          });
          
          navigate(`/${spaceData.subdomain}/space/feed`, { replace: true });
        } else {
          // If joinSpace from context returns false, it implies an issue (e.g., RPC error, success:false from RPC).
          // It should have already shown a specific error toast.
          console.error("[SpaceJoinPage] joinSpace from context reported failure for space ID:", spaceId);
          setError("Failed to join the space. Please check for specific error messages or try again.");
          // No redundant toast here; rely on MembershipContext for RPC/specific failure toasts.
        }
      } catch (err: unknown) {
        // This catch block is for unexpected errors in SpaceJoinPage itself (e.g., during spaceData fetch, navigation)
        console.error('[SpaceJoinPage] Unexpected error in performJoinSpace for space ID:', spaceId, err);
        const message = err instanceof Error ? err.message : "An unexpected error occurred.";
        setError(message);
        toast({
            title: "Unexpected Error",
            description: message,
            variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    performJoinSpace();
  }, [spaceId, user, navigate, joinSpace, isRetrying]);

  const handleRetry = () => {
    setIsRetrying(true);
    setError(null);
    setLoading(true);
    
    // The useEffect will run again because isRetrying changed
    setTimeout(() => {
      setIsRetrying(false);
    }, 100);
  };

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full text-center">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-medium mb-2 text-red-700">Unable to join space</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={handleRetry}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Button
              onClick={() => navigate('/discover')}
              className="bg-[#26A69A] hover:bg-[#1A8A7E] text-white"
            >
              Return to Discover
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5FAFA]">
      <div className="bg-white rounded-xl shadow-md p-8 max-w-md w-full text-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#26A69A] mx-auto mb-4" />
        <h2 className="text-xl font-medium mb-2">Joining {space?.name || 'Space'}...</h2>
        <p className="text-gray-500">You'll be redirected in a moment</p>
      </div>
    </div>
  );
} 