import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, Plus, Globe, Search, Check } from 'lucide-react';
import LoadingIndicator from '@/components/LoadingIndicator';
import ModernDropdownTrigger from '@/components/ModernDropdownTrigger';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSpaceMembership } from '@/contexts/SpaceMembershipContext'; // Import the context hook

// Define the space interface
interface Space {
  id: string;
  name: string;
  subdomain: string;
  owner_id: string;
  icon_image?: string | null;
}

// Explicit type for the record fetched from space_members
interface SpaceMemberRecord {
  space_id: string;
  spaces: Space | null; // The nested space object, which can be null if join fails
}

interface SpaceSwitcherProps {
  currentSpaceSubdomain: string;
  currentSpaceName?: string;
  userId: string;
  hideTriggerLabel?: boolean;
}

// Function to properly capitalize each word in a string
const capitalizeWords = (str: string): string => {
  if (!str) return '';
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export default function SpaceSwitcher({
  currentSpaceSubdomain,
  currentSpaceName,
  userId,
  hideTriggerLabel
}: SpaceSwitcherProps) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const { refreshSpacesTrigger } = useSpaceMembership(); // Use the context hook

  // Fetch all spaces the user has access to
  useEffect(() => {
    const fetchUserSpaces = async () => {
      if (!userId) {
        // console.log('[SpaceSwitcher] fetchUserSpaces: No userId provided, skipping fetch.');
        setLoading(false);
        setSpaces([]);
        return;
      }

      // console.log(`[SpaceSwitcher] fetchUserSpaces: Starting fetch for userId: ${userId}, trigger: ${refreshSpacesTrigger}`);
      setLoading(true);

      try {
        // Fetch spaces owned by the user
        // console.log(`[SpaceSwitcher] Fetching owned spaces for userId: ${userId}`);
        const { data: ownedSpaces, error: ownedError } = await supabase
          .from('spaces')
          .select('id, name, subdomain, owner_id, icon_image')
          .eq('owner_id', userId);

        if (ownedError) {
          console.error('[SpaceSwitcher] Error fetching owned spaces:', ownedError);
        }
        // console.log(`[SpaceSwitcher] Owned spaces fetched:`, ownedSpaces);

        // Fetch spaces the user has access to (but doesn't own) via space_members table
        // console.log(`[SpaceSwitcher] Fetching joined spaces from 'space_members' for userId: ${userId}`);
        const { data: memberRecords, error: memberError } = await supabase
          .from('space_members') // Updated table name
          .select(`
            space_id,
            spaces:space_id(id, name, subdomain, owner_id, icon_image)
          `)
          .eq('user_id', userId)
          // No is_active filter needed, existence implies membership
          .returns<SpaceMemberRecord[]>(); // Explicitly define the return type

        if (memberError) {
          console.error('[SpaceSwitcher] Error fetching joined spaces from space_members:', memberError);
        }
        // console.log(`[SpaceSwitcher] Member records for joined spaces fetched from 'space_members':`, memberRecords);

        const ownedSpacesArray = ownedSpaces || [];
        const joinedSpaces = memberRecords
          ?.filter((record: SpaceMemberRecord) => record.spaces !== null)
          .map((record: SpaceMemberRecord) => record.spaces as Space) || [];
        
        // ---- REMOVE ADDED LOGS ----
        // console.log('[SpaceSwitcher] DEBUG: Owned Spaces Array Content:', JSON.stringify(ownedSpacesArray.map(s => ({id: s.id, name: s.name}))));
        // console.log('[SpaceSwitcher] DEBUG: Joined Spaces Array Content (from space_members):', JSON.stringify(joinedSpaces.map(s => ({id: s.id, name: s.name}))));
        // ---- END REMOVE ADDED LOGS ----

        const allSpacesMap = new Map<string, Space>();

        ownedSpacesArray.forEach(space => allSpacesMap.set(space.id, space));
        joinedSpaces.forEach(space => allSpacesMap.set(space.id, space));

        const allSpaces = Array.from(allSpacesMap.values());
        
        // console.log(`[SpaceSwitcher] Final allSpaces after merging:`, allSpaces);

        setSpaces(allSpaces);
      } catch (error) {
        console.error('[SpaceSwitcher] General error in fetchUserSpaces:', error);
        setSpaces([]);
      } finally {
        setLoading(false);
        // console.log('[SpaceSwitcher] fetchUserSpaces: Fetch attempt completed.');
      }
    };

    fetchUserSpaces();
  }, [userId, refreshSpacesTrigger]); // Add refreshSpacesTrigger to dependency array

  const handleSpaceSelect = (subdomain: string) => {
    // Store the selected space information for other pages like Profile
    const selectedSpace = spaces.find(space => space.subdomain === subdomain);
    if (selectedSpace) {
      const spaceInfo = {
        id: selectedSpace.id,
        name: selectedSpace.name,
        subdomain: selectedSpace.subdomain,
        owner_id: selectedSpace.owner_id
      };
      try {
        sessionStorage.setItem('navigatedFromSpace', JSON.stringify(spaceInfo));
        console.log('Space context saved for navigation:', spaceInfo.name);
      } catch (e) {
        console.error('Error storing space context:', e);
      }
    }
    
    navigate(`/${subdomain}/space/feed`);
    setIsDropdownOpen(false); // Close dropdown on selection
  };

  // Get the actual selected space subdomain when in profile page with '_profile_'
  const getEffectiveSelectedSubdomain = () => {
    // If we're not on a special page (like profile), use the current space subdomain
    if (currentSpaceSubdomain !== '_profile_') {
      return currentSpaceSubdomain;
    }
    
    // We're on a special page, try to get the real space from navigatedFromSpace
    try {
      const navigationSpaceData = sessionStorage.getItem('navigatedFromSpace');
      if (navigationSpaceData) {
        const parsedSpace = JSON.parse(navigationSpaceData);
        if (parsedSpace && parsedSpace.subdomain) {
          return parsedSpace.subdomain;
        }
      }
    } catch (e) {
      console.error('Error retrieving space from navigation context in SpaceSwitcher:', e);
    }
    
    // Fallback to the passed subdomain
    return currentSpaceSubdomain;
  };
  
  const effectiveSelectedSubdomain = getEffectiveSelectedSubdomain();

  const handleDiscoverSpaces = () => {
    // Make sure to set the userWantsDiscover flag for the AuthContext
    sessionStorage.setItem('userWantsDiscover', 'true');
    
    // Store the current effective space for later if needed
    if (effectiveSelectedSubdomain && effectiveSelectedSubdomain !== '_profile_' && 
        effectiveSelectedSubdomain !== currentSpaceSubdomain) {
      // We're on profile but have a real space from navigation context
      try {
        console.log('Preserving space context before navigating to discover:', effectiveSelectedSubdomain);
        // Keep the existing navigatedFromSpace in case of return to profile
      } catch (e) {
        console.error('Error preserving space context:', e);
      }
    }
    
    navigate('/discover');
    setIsDropdownOpen(false); // Close dropdown
  };

  const currentSpaceDetails = spaces.find(space => space.subdomain === currentSpaceSubdomain);
  const displayName = currentSpaceName || currentSpaceDetails?.name || currentSpaceSubdomain;
  const formattedDisplayName = capitalizeWords(displayName);
  const currentIcon = currentSpaceDetails?.icon_image;

  return (
    <TooltipProvider>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger className="flex items-center outline-none hover:text-teal-600 transition-colors">
              {!hideTriggerLabel && (
                <>
                  {currentIcon ? (
                    <img 
                      src={currentIcon} 
                      alt={formattedDisplayName} 
                      className="h-10 w-10 rounded-lg mr-2"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg mr-2 bg-slate-700 dark:bg-slate-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                      {formattedDisplayName?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </>
              )}
              {!hideTriggerLabel && (
                <span className="font-bold text-xl mr-2 text-gray-800 tracking-tight truncate max-w-[150px] sm:max-w-[200px]">
                  {loading && spaces.length === 0 ? '...' : formattedDisplayName}
                </span>
              )}
              <ModernDropdownTrigger open={isDropdownOpen} />
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Switch between your spaces</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" className="w-72 max-h-[70vh] overflow-y-auto">
          <DropdownMenuLabel>Your Spaces</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {loading ? (
            <div className="flex justify-center items-center py-4">
              <LoadingIndicator size="small" />
            </div>
          ) : spaces.length > 0 ? (
            spaces.map((space) => (
              <DropdownMenuItem
                key={space.id}
                className={`
                  p-3 flex items-center space-x-3 rounded-md
                  hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer
                  focus:bg-slate-100 dark:focus:bg-slate-700 focus:outline-none
                  ${space.subdomain === effectiveSelectedSubdomain ? 'bg-slate-100 dark:bg-slate-700 font-semibold text-teal-600 dark:text-teal-400' : 'text-slate-800 dark:text-slate-200'}
                `}
                onClick={() => handleSpaceSelect(space.subdomain)}
                data-space-id={space.id}
                data-space-name={space.name}
                data-space-subdomain={space.subdomain}
              >
                {space.icon_image ? (
                  <img
                    src={space.icon_image}
                    alt={space.name}
                    className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-slate-700 dark:bg-slate-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                    {space.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-grow overflow-hidden">
                  <span className="block text-base truncate">{capitalizeWords(space.name)}</span>
                </div>
                {space.subdomain === effectiveSelectedSubdomain && (
                  <Check className="h-5 w-5 text-teal-600 dark:text-teal-400 ml-auto flex-shrink-0" />
                )}
              </DropdownMenuItem>
            ))
          ) : (
            <div className="px-2 py-4 text-sm text-gray-500 text-center">
              No spaces found.
            </div>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="p-3 cursor-pointer flex items-center space-x-3" onClick={handleDiscoverSpaces}>
            <Globe className="h-5 w-5 mr-2" />
            Discover spaces
          </DropdownMenuItem>
          {/* Optionally add Create Space button here if desired */}
          {/* <DropdownMenuSeparator />
          <DropdownMenuItem className="p-3 cursor-pointer flex items-center space-x-3" onClick={() => { navigate('/create-space'); setIsDropdownOpen(false); }}>
            <Plus className="h-5 w-5 mr-2" />
            Create new space
          </DropdownMenuItem> */}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}