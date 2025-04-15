
import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, PlusCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import useCommunitiesData from "@/hooks/useCommunitiesData";

interface SpacesSectionProps {
  closeMobileSidebar: () => void;
}

const SpacesSection = ({ closeMobileSidebar }: SpacesSectionProps) => {
  const [communitiesExpanded, setCommunitiesExpanded] = useState(true);
  const toggleCommunities = () => setCommunitiesExpanded(!communitiesExpanded);
  const { userDetails } = useAuth();
  const { joinedCommunities, loading } = useCommunitiesData();

  const isCreator = userDetails?.role === 'creator';

  // Helper function to get community initials
  const getCommunityInitials = (name: string) => {
    if (!name) return "C";
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="pt-4 pb-2">
      <button
        onClick={toggleCommunities}
        className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-100"
      >
        <span>Your Communities</span>
        {communitiesExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      {communitiesExpanded && (
        <div className="mt-1 pl-4 space-y-1">
          {!loading && joinedCommunities.length > 0 && (
            <div className="grid grid-cols-3 gap-2 px-2 mt-2">
              {joinedCommunities.slice(0, 6).map((community) => (
                <Link
                  key={community.id}
                  to={`/communities/${community.id}`}
                  className="flex flex-col items-center justify-center p-2 rounded-md hover:bg-gray-100"
                  onClick={closeMobileSidebar}
                >
                  <Avatar className="h-10 w-10 mb-1">
                    <AvatarImage src={community.cover_image} />
                    <AvatarFallback className="bg-lokaa-100 text-lokaa-700">
                      {getCommunityInitials(community.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-center truncate w-full">{community.name}</span>
                </Link>
              ))}
            </div>
          )}
          
          <Link
            to="/communities/create"
            className="flex items-center px-4 py-2 text-sm text-lokaa-600 rounded-md hover:bg-gray-100"
            onClick={closeMobileSidebar}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Community
          </Link>
        </div>
      )}
    </div>
  );
};

export default SpacesSection;
