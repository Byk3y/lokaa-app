import { log } from '@/utils/logger';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Globe, Check } from 'lucide-react';
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
import { useMembershipStore } from '@/features/spaces/store/membership-store';
import { useUserSpacesStore } from '@/hooks/useUserSpacesStore';
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import { useSpace } from '@/hooks/useSpace';
import { clearAllSpaceData } from '@/utils/spaceDataCleaner'; // Import comprehensive cleaner
import SpaceIcon from '@/components/spaces/SpaceIcon'; // 🔗 Unified space avatar

interface SpaceSwitcherProps {
  currentSpaceSubdomain: string;
  currentSpaceName?: string;
  userId: string;
  hideTriggerLabel?: boolean;
  /**
   * Horizontal offset (px) for the dropdown relative to the trigger's start edge.
   * Negative shifts it left. Used when the trigger is only the chevron (e.g. the
   * settings header) but the dropdown should align under a separate logo to its left.
   */
  dropdownAlignOffset?: number;
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
  hideTriggerLabel,
  dropdownAlignOffset = 0
}: SpaceSwitcherProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const navigate = useNavigate();
  const { space: contextSpace, clearCache } = useSpace();
  const { space: settingsSpace } = useSpaceSettingsStore();
  const { refreshSpacesTrigger } = useMembershipStore();

  // 🔗 Single source of truth for the user's spaces (shared with the settings
  // spaces tab and the mobile drawer) — replaces the previous inline fetch + cache.
  const { spaces, loading, fetchUserSpaces } = useUserSpacesStore();

  // Initial load (store handles caching / dedupe / background refresh).
  useEffect(() => {
    if (userId) {
      fetchUserSpaces(userId, false);
    }
  }, [userId, fetchUserSpaces]);

  // Refresh when membership changes (join/leave/role change).
  useEffect(() => {
    if (userId && refreshSpacesTrigger > 0) {
      fetchUserSpaces(userId, true);
    }
  }, [refreshSpacesTrigger, userId, fetchUserSpaces]);

  const handleSpaceSelect = async (subdomain: string) => {
    // REDUCED LOGGING: Only log when actually switching (not just clicking same space)
    const isActualSwitch = subdomain !== currentSpaceSubdomain;
    if (isActualSwitch) {
      log.debug('Component', `[SpaceSwitcher] Switching to ${subdomain}`);

      // **CRITICAL FIX**: Get current and target space data for comprehensive cleanup
      const selectedSpace = spaces.find(space => space.subdomain === subdomain);
      const currentSpace = spaces.find(space => space.subdomain === currentSpaceSubdomain);

      // **PHASE 1**: Comprehensive space data cleanup BEFORE navigation
      try {
        await clearAllSpaceData(
          currentSpace?.id,
          selectedSpace?.id,
          false // Only clear current space, not all
        );

        log.debug('Component', `✅ [SpaceSwitcher] Cleanup completed for space switch`);
      } catch (error) {
        log.error('Component', `❌ [SpaceSwitcher] Cleanup failed, proceeding anyway:`, error instanceof Error ? error : new Error(String(error)));
      }

      // ENHANCED: Clear SpaceContext cache
      clearCache();

      // ENHANCED: Pre-cache the target space info for faster loading
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

          log.debug('Component', `[SpaceSwitcher] Pre-cached space data for ${subdomain}`);
        } catch (e) {
          log.error('Component', 'Error pre-caching space context:', e instanceof Error ? e : new Error(String(e)));
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
      log.error('Component', 'Error retrieving space from navigation context in SpaceSwitcher:', e instanceof Error ? e : new Error(String(e)));
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
        log.debug('Component', 'Preserving space context before navigating to discover:', effectiveSelectedSubdomain);
        // Keep the existing navigatedFromSpace in case of return to profile
      } catch (e) {
        log.error('Component', 'Error preserving space context:', e instanceof Error ? e : new Error(String(e)));
      }
    }

    navigate('/discover');
    setIsDropdownOpen(false); // Close dropdown
  };

  const currentSpaceDetails = spaces.find(space => space.subdomain === currentSpaceSubdomain);
  const displayName = currentSpaceName || currentSpaceDetails?.name || currentSpaceSubdomain;
  const formattedDisplayName = capitalizeWords(displayName);

  // Prioritize freshly saved icon from settings store, then SpaceContext, then fetched list
  const currentIcon =
    (settingsSpace?.subdomain === currentSpaceSubdomain && settingsSpace?.icon_image) ||
    (contextSpace?.subdomain === currentSpaceSubdomain && contextSpace?.icon_image) ||
    currentSpaceDetails?.icon_image;

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
                <SpaceIcon
                  name={formattedDisplayName}
                  iconImage={currentIcon}
                  subdomain={currentSpaceSubdomain}
                  size={40}
                  rounded="rounded-lg"
                  className="mr-2 text-base"
                />
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
        <DropdownMenuContent align="start" alignOffset={dropdownAlignOffset} className="w-72 max-h-[70vh] overflow-y-auto">
          <DropdownMenuLabel>Your Spaces</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {loading && spaces.length === 0 ? (
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
                <SpaceIcon
                  name={space.name}
                  iconImage={space.icon_image}
                  subdomain={space.subdomain}
                  size={40}
                  rounded="rounded-lg"
                  className="text-base"
                />
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
          <DropdownMenuSeparator />
          <DropdownMenuItem className="p-3 cursor-pointer flex items-center space-x-3" onClick={handleCreateSpace}>
            <Plus className="h-5 w-5 mr-2" />
            Create a space
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
