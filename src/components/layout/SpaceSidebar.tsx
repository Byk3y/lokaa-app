import { log } from '@/utils/logger';
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Compass } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Separator } from "@/components/ui/separator";
import useSpacesData from "@/hooks/useSpacesData";
import { getSupabaseClient } from "@/integrations/supabase/client";
import LoadingIndicator from "@/components/LoadingIndicator";
import { SpaceData } from "@/contexts/SpaceContext";
import { SpaceAssetsUtils } from "@/shared/utils/space-assets-utils";

/**
 * SpaceSidebar component for space navigation
 * ✅ UPGRADED: Now uses unified SpaceAssetsUtils system
 */
export function SpaceSidebar() {
  const { joinedSpaces, loading } = useSpacesData();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userDetails } = useOptimizedAuth();
  const [ownedSpaces, setOwnedSpaces] = useState<SpaceData[]>([]);
  const [loadingOwned, setLoadingOwned] = useState(false);

  // Get the current space ID from the URL if available
  const currentSpaceId = location.pathname.startsWith('/space/') 
    ? location.pathname.split('/')[2] 
    : null;

  // Fetch owned spaces if user is a creator
  useEffect(() => {
    const fetchOwnedSpaces = async () => {
      if (!user || userDetails?.role !== 'creator') return;
      
      setLoadingOwned(true);
      try {
        const { data, error } = await getSupabaseClient()
          .from('spaces')
          .select('*')
          .eq('owner_id', user.id);
          
        if (error) throw error;
        setOwnedSpaces(data || []);
      } catch (error) {
        log.error('Component', 'Error fetching owned spaces:', error);
      } finally {
        setLoadingOwned(false);
      }
    };
    
    if (user && userDetails) {
      fetchOwnedSpaces();
    }
  }, [user, userDetails]);

  const goToSpace = (spaceId: string) => {
    navigate(`/space/${spaceId}`);
  };

  const goToDiscoverPage = () => {
    navigate("/discover");
  };

  const goToCreateSpace = () => {
    navigate("/create-space");
  };

  // If loading, show spinner
  if (loading || loadingOwned) {
    return (
      <div className="fixed inset-y-0 left-0 w-[72px] bg-white border-r border-gray-200 flex flex-col items-center justify-center z-50">
        <LoadingIndicator size="small" />
      </div>
    );
  }

  // Combined spaces list (owned ones first)
  const allSpaces = [...ownedSpaces];
  
  // Add joined spaces that aren't already in the list
  joinedSpaces.forEach(space => {
    if (!allSpaces.some(s => s.id === space.id)) {
      allSpaces.push(space);
    }
  });

  return (
    <div className="fixed inset-y-0 left-0 w-[72px] bg-white border-r border-gray-200 flex flex-col items-center py-4 z-50">
      {/* Workspace switcher section */}
      <div className="flex flex-col items-center space-y-4 w-full overflow-y-auto scrollbar-hide">
        {/* Only show Discover button if user has no spaces */}
        {allSpaces.length === 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="default"
                  className="rounded-full h-10 w-10 bg-gray-100 hover:bg-gray-200"
                  onClick={goToDiscoverPage}
                >
                  <Compass className="h-5 w-5 text-gray-700" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Discover Spaces</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Show owned spaces first with a special highlight */}
        {ownedSpaces.map((space) => {
          // 🚀 NEW: Use unified space assets system
          const assets = SpaceAssetsUtils.resolveSpaceAssets(space);
          
          return (
            <TooltipProvider key={`owned-${space.id}`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="default"
                    className={`rounded-full h-10 w-10 ${
                      currentSpaceId === space.id 
                        ? 'ring-2 ring-lokaa-600' 
                        : ''
                    }`}
                    onClick={() => goToSpace(space.id)}
                  >
                    <Avatar className="h-10 w-10 border-2 border-lokaa-200">
                      <AvatarImage 
                        src={space.cover_image} 
                        onError={(e) => {
                          log.debug('Component', `Failed to load avatar for space: ${space.name}`);
                        }}
                      />
                      <AvatarFallback 
                        className="bg-lokaa-100 text-lokaa-700"
                        style={{ 
                          backgroundColor: assets.backgroundColor + '20', // 20% opacity
                          color: assets.backgroundColor 
                        }}
                      >
                        {/* ✅ UPGRADED: Now uses unified initials */}
                        {assets.initials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <div>
                    <p>{space.name}</p>
                    <p className="text-xs text-gray-500">Owner</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}

        {/* Show joined spaces that aren't owned */}
        {joinedSpaces
          .filter(space => !ownedSpaces.some(s => s.id === space.id))
          .map((space) => {
            // 🚀 NEW: Use unified space assets system
            const assets = SpaceAssetsUtils.resolveSpaceAssets(space);
            
            return (
              <TooltipProvider key={`joined-${space.id}`}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="default"
                      className={`rounded-full h-10 w-10 ${
                        currentSpaceId === space.id 
                          ? 'ring-2 ring-lokaa-600' 
                          : ''
                      }`}
                      onClick={() => goToSpace(space.id)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage 
                          src={space.cover_image} 
                          onError={(e) => {
                            log.debug('Component', `Failed to load avatar for space: ${space.name}`);
                          }}
                        />
                        <AvatarFallback 
                          className="bg-lokaa-100 text-lokaa-700"
                          style={{ 
                            backgroundColor: assets.backgroundColor + '20', // 20% opacity
                            color: assets.backgroundColor 
                          }}
                        >
                          {/* ✅ UPGRADED: Now uses unified initials */}
                          {assets.initials}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{space.name}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
      </div>

      <div className="mt-auto">
        <Separator className="my-4 w-8" />
        
        {/* Discover spaces button for users who already have spaces */}
        {allSpaces.length > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="default"
                  className="rounded-full h-10 w-10 bg-gray-100 hover:bg-gray-200 mb-2"
                  onClick={goToDiscoverPage}
                >
                  <Compass className="h-5 w-5 text-gray-700" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Discover Spaces</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="default"
                className="rounded-full h-10 w-10 bg-gray-100 hover:bg-gray-200"
                onClick={goToCreateSpace}
              >
                <Plus className="h-5 w-5 text-gray-700" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Create Space</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
} 