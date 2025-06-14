import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '@/integrations/supabase/client';
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
import { useMembershipStore } from '@/features/spaces/store/membership-store'; // Import the store hook
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import { useSpace } from '@/hooks/useSpace';

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
  const [loading, setLoading] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const navigate = useNavigate();
  const { spaceData: storeSpace, clearCache } = useSpace();
  const { refreshSpacesTrigger } = useMembershipStore(); // Use the store hook
  
  // 🔧 PERFORMANCE FIX: Fast check for users without spaces using cache
  const shouldSkipSpaceLoad = useMemo(() => {
    if (!userId) return true; // Skip if no user ID
    
    try {
      const cacheKey = `fast_path_spaces_${userId}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        const now = Date.now();
        const isExpired = now - parsedCache.timestamp > (5 * 60 * 1000); // 5 minutes
        
        if (!isExpired && Array.isArray(parsedCache.spaces)) {
          // If user has no spaces, skip loading entirely
          if (parsedCache.spaces.length === 0) {
            console.log('[SpaceSwitcher] User has no spaces (cached) - skipping load');
            setSpaces([]);
            setLoading(false); // Ensure loading is false
            return true;
          }
          // If user has spaces in cache, still fetch to ensure fresh data
          // but don't set timeout since we have cached data to fall back on
        }
      }
    } catch (error) {
      // Only log actual errors, not normal cache misses
      console.warn('[SpaceSwitcher] Cache check error:', error);
    }
    return false;
  }, [userId]);

  // Optimized timeout with shorter duration for better UX
  useEffect(() => {
    if (shouldSkipSpaceLoad) {
      return; // Don't set timeout if we're skipping space load
    }

    // Only set timeout if we're actually loading spaces
    if (!loading) {
      return; // Don't set timeout if not loading
    }

    // Reduced timeout from 10s to 5s for better UX
    const switcherTimeout = setTimeout(() => {
      console.warn('[SpaceSwitcher] Space loading timeout');
      if (loading) {
        setLoading(false);
      }
    }, 5000);
    
    return () => clearTimeout(switcherTimeout);
  }, [loading, shouldSkipSpaceLoad]);
    
  useEffect(() => {
    if (shouldSkipSpaceLoad) {
      return; // Skip loading if user has no spaces
    }

    const fetchUserSpaces = async () => {
      if (!userId) {
        setLoading(false);
        setSpaces([]);
        return;
      }

      setLoading(true);

      try {
        // 🚀 PERFORMANCE: Use fast path cache first
        const cacheKey = `fast_path_spaces_${userId}`;
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
          try {
            const parsedCache = JSON.parse(cached);
            const now = Date.now();
            const isExpired = now - parsedCache.timestamp > (5 * 60 * 1000);
            
            if (!isExpired && Array.isArray(parsedCache.spaces)) {
              // REDUCED LOGGING: Only log when using cache with significant data
              if (parsedCache.spaces.length > 0) {
                console.log('[SpaceSwitcher] Using cached spaces:', parsedCache.spaces.length);
              }
              setSpaces(parsedCache.spaces);
              setLoading(false);
              return;
            }
          } catch (cacheError) {
            // Only log actual parsing errors
            console.warn('[SpaceSwitcher] Cache parsing error:', cacheError);
          }
        }

        // Fetch spaces owned by the user
        const { data: ownedSpaces, error: ownedError } = await getSupabaseClient()
          .from('spaces')
          .select('id, name, subdomain, owner_id, icon_image')
          .eq('owner_id', userId);

        if (ownedError) {
          console.error('[SpaceSwitcher] Error fetching owned spaces:', ownedError);
        }

        // Fetch spaces the user has access to (but doesn't own) via space_members table
        const { data: memberRecords, error: memberError } = await getSupabaseClient()
          .from('space_members')
          .select(`
            space_id,
            spaces:space_id(id, name, subdomain, owner_id, icon_image)
          `)
          .eq('user_id', userId)
          .returns<SpaceMemberRecord[]>();

        if (memberError) {
          console.error('[SpaceSwitcher] Error fetching joined spaces from space_members:', memberError);
        }

        const ownedSpacesArray = ownedSpaces || [];
        const joinedSpaces = memberRecords
          ?.filter((record: SpaceMemberRecord) => record.spaces !== null)
          .map((record: SpaceMemberRecord) => record.spaces as Space) || [];
        
        const allSpacesMap = new Map<string, Space>();

        // Safely add owned spaces to the map
        if (Array.isArray(ownedSpacesArray)) {
          ownedSpacesArray.forEach(space => {
            if (space && space.id) {
              allSpacesMap.set(space.id, space);
            }
          });
        }

        // Safely add joined spaces to the map
        if (Array.isArray(joinedSpaces)) {
          joinedSpaces.forEach(space => {
            if (space && space.id) {
              allSpacesMap.set(space.id, space);
            }
          });
        }

        const allSpaces = Array.from(allSpacesMap.values());
        
        // 🚀 PERFORMANCE: Update cache for next time
        try {
          const cacheData = {
            spaces: allSpaces,
            timestamp: Date.now()
          };
          localStorage.setItem(cacheKey, JSON.stringify(cacheData));
          // REDUCED LOGGING: Only log significant cache updates
          if (allSpaces.length > 0) {
            console.log('[SpaceSwitcher] Cached', allSpaces.length, 'spaces');
          }
        } catch (cacheError) {
          console.warn('[SpaceSwitcher] Cache update failed:', cacheError);
        }
        
        setSpaces(allSpaces);
      } catch (error) {
        console.error('[SpaceSwitcher] General error in fetchUserSpaces:', error);
        setSpaces([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserSpaces();
  }, [userId, refreshSpacesTrigger, shouldSkipSpaceLoad]);

  const handleSpaceSelect = (subdomain: string) => {
    // REDUCED LOGGING: Only log when actually switching (not just clicking same space)
    const isActualSwitch = subdomain !== currentSpaceSubdomain;
    if (isActualSwitch) {
      console.log(`[SpaceSwitcher] Switching to ${subdomain}`);
      
      // ENHANCED: Clear cache and prepare for new space data
      clearCache();
      
      // ENHANCED: Pre-cache the target space info for faster loading
      const selectedSpace = spaces.find(space => space.subdomain === subdomain);
      if (selectedSpace) {
        try {
          // Store space info for session context
          const spaceInfo = {
            id: selectedSpace.id,
            name: selectedSpace.name,
            subdomain: selectedSpace.subdomain,
            owner_id: selectedSpace.owner_id
          };
          sessionStorage.setItem('navigatedFromSpace', JSON.stringify(spaceInfo));
          
          // Pre-cache space data for instant access detection
          const lastActiveSpace = {
            id: selectedSpace.id,
            name: selectedSpace.name,
            subdomain: selectedSpace.subdomain,
            timestamp: Date.now(),
            userId: userId
          };
          localStorage.setItem('lastActiveSpace', JSON.stringify(lastActiveSpace));
          
          // Set ownership flag if user owns the space
          if (selectedSpace.owner_id === userId) {
            localStorage.setItem(`user_owns_space_${subdomain}`, 'true');
          }
          
          console.log(`[SpaceSwitcher] Pre-cached space data for ${subdomain}`);
        } catch (e) {
          console.error('Error pre-caching space context:', e);
        }
      }
    }
    
    // Navigate to the new space
    navigate(`/${subdomain}/space`);
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
  
  // Prioritize icon from the store for the current space to ensure freshness
  const currentIcon = storeSpace?.subdomain === currentSpaceSubdomain 
    ? storeSpace?.icon_image 
    : currentSpaceDetails?.icon_image;

  const handleCreateSpace = () => {
    navigate('/create-space');
    setIsDropdownOpen(false);
  };

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