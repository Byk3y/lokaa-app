
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Compass } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { Separator } from "@/components/ui/separator";
import useCommunitiesData from "@/hooks/useCommunitiesData";

export function CommunitySidebar() {
  const { joinedCommunities, loading } = useCommunitiesData();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Get the current community ID from the URL if available
  const currentCommunityId = location.pathname.startsWith('/c/') 
    ? location.pathname.split('/')[2] 
    : null;

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

  return (
    <div className="fixed inset-y-0 left-0 w-[72px] bg-white border-r border-gray-200 flex flex-col items-center py-4 z-50">
      {/* Workspace switcher section */}
      <div className="flex flex-col items-center space-y-4 w-full overflow-y-auto scrollbar-hide">
        {!loading && joinedCommunities.length === 0 && (
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

        {!loading && joinedCommunities.map((community) => (
          <TooltipProvider key={community.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`rounded-full h-10 w-10 ${currentCommunityId === community.id ? 'ring-2 ring-lokaa-600' : ''}`}
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
