import { log } from '@/utils/logger';
import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, PlusCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import useSpacesData from "@/hooks/useSpacesData";
import { SpaceAssetsUtils } from '@/shared/utils/space-assets-utils';

interface SpacesSectionProps {
  closeMobileSidebar: () => void;
}

const SpacesSection = ({ closeMobileSidebar }: SpacesSectionProps) => {
  const [spacesExpanded, setSpacesExpanded] = useState(true);
  const toggleSpaces = () => setSpacesExpanded(!spacesExpanded);
  const { userDetails } = useOptimizedAuth();
  const { joinedSpaces = [], loading = false } = useSpacesData() || {};

  const isCreator = userDetails?.role === 'creator';

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
          {!loading && joinedSpaces?.length > 0 && (
            <div className="grid grid-cols-3 gap-2 px-2 mt-2">
              {joinedSpaces.slice(0, 6).map((space) => {
                const spaceAssets = SpaceAssetsUtils.resolveSpaceAssets(space);
                
                return (
                  <Link
                    key={space.id}
                    to={`/space/${space.subdomain}`}
                    className="flex flex-col items-center justify-center p-2 rounded-md hover:bg-gray-100"
                    onClick={closeMobileSidebar}
                  >
                    <Avatar className="h-10 w-10 mb-1">
                      <AvatarImage 
                        src={space.cover_image} 
                        onError={(e) => {
                          log.debug('Component', `Failed to load avatar for space: ${space.name}`);
                        }}
                      />
                      <AvatarFallback 
                        className="font-semibold"
                        style={{ 
                          backgroundColor: spaceAssets.backgroundColor,
                          color: spaceAssets.textColor 
                        }}
                      >
                        {spaceAssets.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-center truncate w-full">{space.name}</span>
                  </Link>
                );
              })}
            </div>
          )}
          
          <Link
            to="/create-space"
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
