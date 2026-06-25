import { log } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { Search, Eye, Settings, ChevronUp, ChevronDown } from 'lucide-react';
import { SettingsTabProps } from '../../../types/settings';
import { useMembershipStore } from '@/features/spaces/store/membership-store';
import { useUserSpacesStore, UserSpace } from '@/hooks/useUserSpacesStore';
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import MemberSettingsModal from '@/components/modals/MemberSettingsModal';
import SpaceIcon from '@/components/spaces/SpaceIcon';

// Pin icon component
const PinIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 13L15 16M9 9L7 7M15 8L17 6M8 15L6 17M12.5 7.5L16.5 11.5C17.7 12.7 17.7 14.5 16.5 15.7L15.7 16.5C14.5 17.7 12.7 17.7 11.5 16.5L7.5 12.5C6.3 11.3 6.3 9.5 7.5 8.3L8.3 7.5C9.5 6.3 11.3 6.3 12.5 7.5Z" stroke="#888888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Capitalize each word so names render consistently with the space switcher dropdown.
const capitalizeWords = (str: string): string =>
  !str
    ? ''
    : str
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

export default function SpacesSettingsTab({ user }: SettingsTabProps) {
  const { refreshSpacesTrigger } = useMembershipStore();
  // 🔗 Single source of truth for the user's spaces (shared with the space switcher
  // dropdown and the mobile drawer) — no more duplicate fetch/cache logic here.
  const { spaces: userSpaces, loading, fetchUserSpaces } = useUserSpacesStore();
  const [spaceSearchQuery, setSpaceSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  // State for member settings modal
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [selectedMemberSpace, setSelectedMemberSpace] = useState<UserSpace | null>(null);

  const hasCachedSpaces = userSpaces.length > 0;
  const loadingSpaces = loading && !hasCachedSpaces;

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initial load (store handles its own caching / dedupe).
  useEffect(() => {
    if (user?.id) {
      fetchUserSpaces(user.id, false);
    }
  }, [user?.id, fetchUserSpaces]);

  // Refresh when membership changes (join/leave/role change).
  useEffect(() => {
    if (user?.id && refreshSpacesTrigger > 0) {
      fetchUserSpaces(user.id, true);
    }
  }, [refreshSpacesTrigger, user?.id, fetchUserSpaces]);

  // Handler for opening settings modal (admin/owner)
  const handleOpenSpaceSettings = async (space: UserSpace) => {
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
  const handleOpenMemberSettings = (space: UserSpace) => {
    setSelectedMemberSpace(space);
    setMemberModalOpen(true);
  };

  // Main handler that determines which modal to show
  const handleSettingsClick = (space: UserSpace) => {
    if (space.userRole === 'owner' || space.userRole === 'admin') {
      handleOpenSpaceSettings(space);
    } else {
      handleOpenMemberSettings(space);
    }
  };

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
                  <SpaceIcon
                    name={space.name}
                    iconImage={space.icon_image}
                    subdomain={space.subdomain}
                    size={48}
                    className="text-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{capitalizeWords(space.name)}</div>
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
                <SpaceIcon
                  name={space.name}
                  iconImage={space.icon_image}
                  subdomain={space.subdomain}
                  size={48}
                  className="text-lg"
                />
                <div>
                  <div className="font-bold text-[17px] text-[#111111]">{capitalizeWords(space.name)}</div>
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
