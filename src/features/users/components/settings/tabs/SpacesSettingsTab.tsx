import { log } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { Search, Eye, Settings, ChevronUp, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SettingsTabProps } from '../../../types/settings';
import { Space } from '@/types/space';
import { useMembershipStore } from '@/features/spaces/store/membership-store';
import { getSupabaseClient } from '@/integrations/supabase/client';
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import MemberSettingsModal from '@/components/modals/MemberSettingsModal';

// Pin icon component
const PinIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 13L15 16M9 9L7 7M15 8L17 6M8 15L6 17M12.5 7.5L16.5 11.5C17.7 12.7 17.7 14.5 16.5 15.7L15.7 16.5C14.5 17.7 12.7 17.7 11.5 16.5L7.5 12.5C6.3 11.3 6.3 9.5 7.5 8.3L8.3 7.5C9.5 6.3 11.3 6.3 12.5 7.5Z" stroke="#888888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

interface SpaceWithRole extends Space {
  userRole: 'owner' | 'admin' | 'member';
}

interface SpaceMemberRecord {
  space_id: string;
  role: string;
  spaces: Space | null;
}

export default function SpacesSettingsTab({ user }: SettingsTabProps) {
  const { refreshSpacesTrigger } = useMembershipStore();
  const navigate = useNavigate();
  const [spaceSearchQuery, setSpaceSearchQuery] = useState("");
  const [userSpaces, setUserSpaces] = useState<SpaceWithRole[]>([]);
  const [loadingSpaces, setLoadingSpaces] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  // State for member settings modal
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [selectedMemberSpace, setSelectedMemberSpace] = useState<SpaceWithRole | null>(null);
  
  // Cache management for preventing unnecessary refetches
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [lastUserId, setLastUserId] = useState<string | null>(null);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handler for opening settings modal (admin/owner)
  const handleOpenSpaceSettings = async (space: SpaceWithRole) => {
    if (!user?.id) {
      log.warn('Component', "User ID not available for opening space settings");
      return;
    }

    if (!space.subdomain) {
      log.error('Component', "Space subdomain not available for opening space settings");
      return;
    }

    log.debug('Component', `[SpacesSettingsTab] Opening space settings for space: ${space.name} (${space.userRole})`);
    
    try {
      const storeActions = useSpaceSettingsStore.getState();
      log.debug('Component', `[SpacesSettingsTab] Loading active space: ${space.subdomain} (${space.id})`);
      
      // Load the space context first
      await storeActions.loadActiveSpace({ 
        subdomain: space.subdomain, 
        spaceId: space.id 
      }, user.id, true);
      
      log.debug('Component', '[SpacesSettingsTab] Space loaded, opening modal');
      
      // Open the modal directly without navigation
      // This keeps the user on the settings page so back button works correctly
      storeActions.openModal();
      
      // Check if modal is actually open
      setTimeout(() => {
        const currentState = useSpaceSettingsStore.getState();
        log.debug('Component', `[SpacesSettingsTab] Modal state after opening: isOpen=${currentState.isOpen}, space=${currentState.space?.name}`);
        
        if (!currentState.isOpen) {
          log.error('Component', '[SpacesSettingsTab] Modal failed to open - isOpen is still false');
        }
      }, 100);
      
      log.debug('Component', '[SpacesSettingsTab] Space settings modal opened successfully');
    } catch (error) {
      log.error('Component', "Failed to open space settings:", error);
    }
  };

  // Handler for opening member settings modal
  const handleOpenMemberSettings = (space: SpaceWithRole) => {
    setSelectedMemberSpace(space);
    setMemberModalOpen(true);
  };

  // Main handler that determines which modal to show
  const handleSettingsClick = (space: SpaceWithRole) => {
    if (space.userRole === 'owner' || space.userRole === 'admin') {
      handleOpenSpaceSettings(space);
    } else {
      handleOpenMemberSettings(space);
    }
  };

  // Fetch user spaces
  useEffect(() => {
    const fetchUserSpaces = async () => {
      if (!user || !user.id) {
        setUserSpaces([]);
        setLoadingSpaces(false);
        setLastUserId(null);
        return;
      }

      // Smart cache check to prevent unnecessary refetches
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTime;
      const isSameUser = lastUserId === user.id;
      const isCacheValid = timeSinceLastFetch < CACHE_DURATION;
      const hasExistingData = userSpaces.length > 0;

      // Skip fetch if we have valid cached data and same user
      if (isSameUser && isCacheValid && hasExistingData && document.visibilityState === 'visible') {
        log.debug('Component', `[SpacesSettingsTab] Using cached spaces data (${Math.round(timeSinceLastFetch / 1000)}s old)`);
        setLoadingSpaces(false);
        return;
      }

      // Only show loading if we don't have existing data or user changed
      if (!hasExistingData || !isSameUser) {
        setLoadingSpaces(true);
      }

      try {
        // Fetch spaces owned by the user
        const { data: ownedSpaces, error: ownedError } = await getSupabaseClient()
          .from('spaces')
          .select('id, name, subdomain, owner_id, icon_image, member_count, description')
          .eq('owner_id', user.id);

        if (ownedError) {
          log.error('Component', 'Error fetching owned spaces:', ownedError);
        }

        // Fetch spaces the user has access to via space_members table
        const { data: memberRecords, error: memberError } = await getSupabaseClient()
          .from('space_members')
          .select(`
            space_id,
            role,
            spaces:space_id(id, name, subdomain, owner_id, icon_image, member_count, description)
          `)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .returns<SpaceMemberRecord[]>();

        if (memberError) {
          log.error('Component', 'Error fetching joined spaces:', memberError);
        }

        const ownedSpacesArray = ownedSpaces || [];
        const joinedSpaces = memberRecords
          ?.filter((record) => record.spaces !== null)
          .map((record) => ({
            ...record.spaces as Space,
            userRole: record.role as 'admin' | 'member'
          })) || [];

        // Combine and deduplicate spaces with role information
        const allSpacesMap = new Map<string, SpaceWithRole>();
        
        // Add owned spaces with 'owner' role
        ownedSpacesArray.forEach(space => 
          allSpacesMap.set(space.id, { ...space, userRole: 'owner' })
        );
        
        // Add joined spaces with their actual roles (admin/member)
        joinedSpaces.forEach(space => 
          allSpacesMap.set(space.id, space)
        );
        
        const allSpaces = Array.from(allSpacesMap.values());
        setUserSpaces(allSpaces);
        
        // Update cache metadata
        setLastFetchTime(Date.now());
        setLastUserId(user.id);
        log.debug('Component', `[SpacesSettingsTab] Fetched ${allSpaces.length} spaces and updated cache`);
      } catch (error) {
        log.error('Component', 'Error fetching user spaces:', error);
        setUserSpaces([]);
      } finally {
        setLoadingSpaces(false);
      }
    };

    // Debounce rapid consecutive calls (e.g., from visibility changes)
    const timeoutId = setTimeout(() => {
      fetchUserSpaces();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [user, refreshSpacesTrigger]);

  // Filter spaces based on search query
  const filteredSpaces = userSpaces.filter(space =>
    space.name.toLowerCase().includes(spaceSearchQuery.toLowerCase())
  );

  // Mobile layout - Skool style
  if (isMobile) {
    return (
      <div className="px-4 py-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Spaces
        </h1>
        
        {/* Search bar */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm"
            placeholder="Search spaces..."
            value={spaceSearchQuery}
            onChange={(e) => setSpaceSearchQuery(e.target.value)}
          />
        </div>

        {/* Spaces list */}
        <div className="space-y-3">
          {loadingSpaces ? (
            <div className="py-8 flex justify-center items-center">
              <div className="animate-spin h-6 w-6 rounded-full border-t-2 border-b-2 border-teal-500"></div>
            </div>
          ) : filteredSpaces.length > 0 ? (
            filteredSpaces.map((space) => (
              <div key={space.id} className="flex items-center justify-between bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold text-white overflow-hidden flex-shrink-0" 
                       style={{ backgroundColor: space.icon_image ? 'transparent' : '#74B9FF' }}>
                    {space.icon_image ? (
                      <img src={space.icon_image} alt={space.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{space.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{space.name}</div>
                    <div className="text-sm text-gray-500">
                      {space.member_count || 0} members • Free
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button 
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    onClick={() => handleSettingsClick(space)}
                    title="Settings"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    <ChevronUp className="h-4 w-4" />
                    <ChevronDown className="h-4 w-4 -mt-1" />
                  </button>
                </div>
              </div>
            ))
          ) : spaceSearchQuery ? (
            <div className="py-8 text-center text-gray-500">
              <p>No spaces found matching "{spaceSearchQuery}"</p>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              <p>You haven't joined any spaces yet.</p>
            </div>
          )}
        </div>

        {/* Member Settings Modal */}
        <MemberSettingsModal
          isOpen={memberModalOpen}
          onClose={() => {
            setMemberModalOpen(false);
            setSelectedMemberSpace(null);
          }}
          space={selectedMemberSpace ? {
            id: selectedMemberSpace.id,
            name: selectedMemberSpace.name,
            subdomain: selectedMemberSpace.subdomain || '',
            icon_image: selectedMemberSpace.icon_image,
            userRole: selectedMemberSpace.userRole
          } : null}
          user={user}
        />
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="spaces-card max-w-[760px] mx-auto bg-white rounded-[20px] py-8 px-6 shadow-[0px_4px_16px_rgba(0,0,0,0.08)]">
      <h1 className="text-[24px] font-semibold text-[#111111]" style={{ fontFamily: 'Inter, sans-serif' }}>
        Spaces
      </h1>
      <p className="text-[14px] text-[#777777] mt-2 mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
        Drag and drop to reorder, pin to sidebar, or hide.
      </p>
      
      {/* Search bar */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
          placeholder="Search spaces..."
          value={spaceSearchQuery}
          onChange={(e) => setSpaceSearchQuery(e.target.value)}
        />
      </div>

      {/* Spaces list */}
      <div className="space-y-3">
        {loadingSpaces ? (
          <div className="py-4 flex justify-center items-center">
            <div className="animate-spin h-6 w-6 rounded-full border-t-2 border-b-2 border-teal-500"></div>
          </div>
        ) : filteredSpaces.length > 0 ? (
          filteredSpaces.map((space) => (
            <div key={space.id} className="flex items-center justify-between bg-transparent">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-[10px] flex items-center justify-center text-lg font-bold text-white overflow-hidden" style={{ backgroundColor: '#74B9FF' }}>
                  {space.icon_image ? (
                    <img src={space.icon_image} alt={space.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{space.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <div className="font-bold text-[17px] text-[#111111]">{space.name}</div>
                  <div className="text-[14px] text-gray-500">{space.member_count || 0} members</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Show SETTINGS button for all users - different modals based on role */}
                <button 
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                  onClick={() => handleSettingsClick(space)}
                  title={
                    space.userRole === 'owner' || space.userRole === 'admin' 
                      ? `Space ${space.userRole === 'owner' ? 'Owner' : 'Admin'} - Access Settings`
                      : 'Member Settings - Manage your membership'
                  }
                >
                  SETTINGS
                </button>
                <button className="p-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <PinIcon />
                </button>
                <button className="p-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <Eye size={20} className="text-gray-500" />
                </button>
              </div>
            </div>
          ))
        ) : spaceSearchQuery ? (
          <div className="py-4 text-center text-gray-500">
            <p>No spaces found matching "{spaceSearchQuery}"</p>
          </div>
        ) : (
          <div className="py-4 text-center text-gray-500">
            <p>You haven't joined any spaces yet.</p>
          </div>
        )}
      </div>

      {/* Member Settings Modal */}
      <MemberSettingsModal
        isOpen={memberModalOpen}
        onClose={() => {
          setMemberModalOpen(false);
          setSelectedMemberSpace(null);
        }}
        space={selectedMemberSpace ? {
          id: selectedMemberSpace.id,
          name: selectedMemberSpace.name,
          subdomain: selectedMemberSpace.subdomain || '',
          icon_image: selectedMemberSpace.icon_image,
          userRole: selectedMemberSpace.userRole
        } : null}
        user={user}
      />
    </div>
  );
} 