
import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, PlusCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import useSpacesData from "@/hooks/useSpacesData";

interface SpacesSectionProps {
  closeMobileSidebar: () => void;
}

const SpacesSection = ({ closeMobileSidebar }: SpacesSectionProps) => {
  const [spacesExpanded, setSpacesExpanded] = useState(true);
  const toggleSpaces = () => setSpacesExpanded(!spacesExpanded);
  const { userDetails } = useAuth();
  const { joinedSpaces, loading } = useSpacesData();

  const isCreator = userDetails?.role === 'creator';

  // Helper function to get space initials
  const getSpaceInitials = (name: string) => {
    if (!name) return "S";
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="pt-4 pb-2">
      <button
        onClick={toggleSpaces}
        className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-100"
      >
        <span>Your Spaces</span>
        {spacesExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      {spacesExpanded && (
        <div className="mt-1 pl-4 space-y-1">
          {!loading && joinedSpaces.length > 0 && (
            <div className="grid grid-cols-3 gap-2 px-2 mt-2">
              {joinedSpaces.slice(0, 6).map((space) => (
                <Link
                  key={space.id}
                  to={`/spaces/${space.id}`}
                  className="flex flex-col items-center justify-center p-2 rounded-md hover:bg-gray-100"
                  onClick={closeMobileSidebar}
                >
                  <Avatar className="h-10 w-10 mb-1">
                    <AvatarImage src={space.logo_url} />
                    <AvatarFallback className="bg-lokaa-100 text-lokaa-700">
                      {getSpaceInitials(space.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-center truncate w-full">{space.name}</span>
                </Link>
              ))}
            </div>
          )}
          
          <Link
            to="/spaces/create"
            className="flex items-center px-4 py-2 text-sm text-lokaa-600 rounded-md hover:bg-gray-100"
            onClick={closeMobileSidebar}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Space
          </Link>
        </div>
      )}
    </div>
  );
};

export default SpacesSection;
