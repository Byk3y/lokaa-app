
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Compass } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { Separator } from "@/components/ui/separator";
import useCommunitiesData from "@/hooks/useCommunitiesData";
import { supabase } from "@/integrations/supabase/client";
import LoadingSpinner from "@/components/discover/LoadingSpinner";

export function CommunitySidebar() {
  const { joinedCommunities, loading } = useCommunitiesData();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userDetails } = useAuth();
  const [ownedCommunities, setOwnedCommunities] = useState<any[]>([]);
  const [loadingOwned, setLoadingOwned] = useState(false);

  // Get the current community ID from the URL if available
  const currentCommunityId = location.pathname.startsWith('/c/') 
    ? location.pathname.split('/')[2] 
    : null;

  // Fetch owned communities if user is a creator
  useEffect(() => {
    const fetchOwnedCommunities = async () => {
      if (!user || userDetails?.role !== 'creator') return;
      
      setLoadingOwned(true);
      try {
        const { data, error } = await supabase
          .from('communities')
          .select('*')
          .eq('owner_id', user.id);
          
        if (error) throw error;
        setOwnedCommunities(data || []);
      } catch (error) {
        console.error('Error fetching owned communities:', error);
      } finally {
        setLoadingOwned(false);
      }
    };
    
    if (user && userDetails) {
      fetchOwnedCommunities();
    }
  }, [user, userDetails]);

  // Helper function to get community initials for avatar fallback
  const getCommunityInitials = (name: string) => {
    if (!name) return "C";
    return name.charAt(0).toUpperCase();
  };

  const goToCommunity = (communityId: string) => {
    navigate(`/c/${communityId}`);
  };

  const goToDiscoverPage = () => {
    navigate("/discover");
  };

  const goToCreateCommunity = () => {
    navigate("/communities/create");
  };

  // If loading, show spinner
  if (loading || loadingOwned) {
    return (
      <div className="fixed inset-y-0 left-0 w-[72px] bg-white border-r border-gray-200 flex flex-col items-center justify-center z-50">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  // Combined communities list (owned ones first)
  let allCommunities = [...ownedCommunities];
  
  // Add joined communities that aren't already in the list
  joinedCommunities.forEach(community => {
    if (!allCommunities.some(c => c.id === community.id)) {
      allCommunities.push(community);
    }
  });

  return (
    <div className="fixed inset-y-0 left-0 w-[72px] bg-white border-r border-gray-200 flex flex-col items-center py-4 z-50">
      {/* Workspace switcher section */}
      <div className="flex flex-col items-center space-y-4 w-full overflow-y-auto scrollbar-hide">
        {/* Only show Discover button if user has no communities */}
        {allCommunities.length === 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full h-10 w-10 bg-gray-100 hover:bg-gray-200"
                  onClick={goToDiscoverPage}
                >
                  <Compass className="h-5 w-5 text-gray-700" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Discover Communities</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Show owned communities first with a special highlight */}
        {ownedCommunities.map((community) => (
          <TooltipProvider key={`owned-${community.id}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`rounded-full h-10 w-10 ${
                    currentCommunityId === community.id 
                      ? 'ring-2 ring-lokaa-600' 
                      : ''
                  }`}
                  onClick={() => goToCommunity(community.id)}
                >
                  <Avatar className="h-10 w-10 border-2 border-lokaa-200">
                    <AvatarImage src={community.cover_image} />
                    <AvatarFallback className="bg-lokaa-100 text-lokaa-700">
                      {getCommunityInitials(community.name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <div>
                  <p>{community.name}</p>
                  <p className="text-xs text-gray-500">Owner</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}

        {/* Show joined communities that aren't owned */}
        {joinedCommunities
          .filter(community => !ownedCommunities.some(c => c.id === community.id))
          .map((community) => (
            <TooltipProvider key={`joined-${community.id}`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`rounded-full h-10 w-10 ${
                      currentCommunityId === community.id 
                        ? 'ring-2 ring-lokaa-600' 
                        : ''
                    }`}
                    onClick={() => goToCommunity(community.id)}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={community.cover_image} />
                      <AvatarFallback className="bg-lokaa-100 text-lokaa-700">
                        {getCommunityInitials(community.name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{community.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
      </div>

      <div className="mt-auto">
        <Separator className="my-4 w-8" />
        
        {/* Discover communities button for users who already have communities */}
        {allCommunities.length > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full h-10 w-10 bg-gray-100 hover:bg-gray-200 mb-2"
                  onClick={goToDiscoverPage}
                >
                  <Compass className="h-5 w-5 text-gray-700" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Discover Communities</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full h-10 w-10 bg-gray-100 hover:bg-gray-200"
                onClick={goToCreateCommunity}
              >
                <Plus className="h-5 w-5 text-gray-700" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Create Community</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
