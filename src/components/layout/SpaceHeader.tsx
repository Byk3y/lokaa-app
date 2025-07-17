import { ReactNode, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, MessageSquare, Search, Menu, X, MoreHorizontal } from 'lucide-react';
import SpaceSwitcher from '@/components/spaces/SpaceSwitcher';
import ProfileDropdown from '@/components/common/ProfileDropdown';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileSpaceDrawer from '@/components/mobile/MobileSpaceDrawer';
import ChatModal from '@/components/chat/ChatModal';
import ChatListPopover from '@/components/chat/ChatListPopover';
import ChatButton from '@/components/chat/ChatButton';
import HeaderActions from '@/components/common/HeaderActions';
import MemberSettingsModal from '@/components/modals/MemberSettingsModal';

interface SpaceHeaderProps {
  subdomain: string | undefined;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
}

export default function SpaceHeader({
  subdomain,
  searchQuery,
  onSearchQueryChange,
}: SpaceHeaderProps) {
  const { user } = useOptimizedAuth();
  const { space: storeSpace } = useSpaceSettingsStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [spaceDrawerOpen, setSpaceDrawerOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const navigate = useNavigate();
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);
  const [memberSettingsOpen, setMemberSettingsOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showMobileSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showMobileSearch]);

  const handleOpenChatModal = () => {
    console.log('Opening chat modal directly from SpaceHeader');
    setIsChatModalOpen(true);
  };

  const handleCloseChatModal = () => {
    setIsChatModalOpen(false);
    setSelectedConversationId(null);
  };
  
  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setIsChatModalOpen(true);
    setIsPopoverOpen(false);
  };

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 py-1.5 sm:py-2.5 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4">
        {/* Left - Logo, Space Name, Switcher */}
        <div className="flex items-center gap-3">
          {/* Mobile Menu Toggle - Appears on smaller screens */}
          <Button
            variant="ghost"
            className="sm:hidden text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 p-2"
            onClick={() => setSpaceDrawerOpen(true)}
            aria-label="Toggle space drawer"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* SpaceSwitcher - includes logo and name, hidden on mobile */}
          <div className="hidden md:block">
            <SpaceSwitcher
              currentSpaceSubdomain={subdomain || ''}
              currentSpaceName={storeSpace?.name}
              userId={user?.id || ''}
            />
          </div>
        </div>

        {/* Center - Search (Hidden on small screens, shown on medium and up) */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 
                         text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500
                         focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 focus:border-transparent shadow-sm"
            />
          </div>
        </div>

        {/* Right - Icons and Profile (Hidden on small screens, shown on medium and up) */}
        <div className="hidden lg:flex items-center gap-4">
          <HeaderActions variant="elevated" />
        </div>
        
        {/* Mobile Right Section - Search and More Menu (Skool style) */}
        <div className="lg:hidden flex items-center gap-2">
          <Button
            variant="ghost"
            className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 p-2"
            onClick={() => setShowMobileSearch(true)}
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 p-2"
            onClick={() => setShowMobileMore(v => !v)}
            aria-label="More options"
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
          {/* Mobile More Modal */}
          {showMobileMore && (
            <div className="absolute right-4 top-14 z-50 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 flex flex-col text-left animate-fade-in">
              <button
                className="px-4 py-3 text-gray-900 text-base font-semibold text-left hover:bg-gray-50"
                onClick={() => {
                  setShowMobileMore(false);
                  // TODO: Implement invite people action
                }}
              >
                Invite people
              </button>
              <button
                className="px-4 py-3 text-gray-900 text-base font-semibold text-left hover:bg-gray-50"
                onClick={() => {
                  setShowMobileMore(false);
                  setMemberSettingsOpen(true);
                }}
              >
                Group settings
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Mobile Search Overlay */}
      {showMobileSearch && (
        <div className="fixed inset-0 z-50 bg-white flex items-start pt-4 px-4 lg:hidden">
          <div className="flex w-full items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search group"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-full bg-gray-100 border-gray-200 text-base"
              />
            </div>
            <button
              className="ml-3 text-gray-500 font-semibold text-base"
              onClick={() => {
                setShowMobileSearch(false);
                onSearchQueryChange('');
              }}
            >
              CANCEL
            </button>
          </div>
        </div>
      )}

      {/* Mobile Menu - Dropdown with Search and Actions */}
      {!showMobileSearch && mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
          <div className="px-4 space-y-3 pb-4">
            {/* Search Bar for Mobile */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-md bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 
                           text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500
                           focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 focus:border-transparent"
              />
            </div>
            
            {/* Mobile Actions - Chat, Notifications, Profile */}
            <HeaderActions showLabels={true} onMobileMenuClose={() => setMobileMenuOpen(false)} />
            
            {/* Profile Section */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Account</span>
                <ProfileDropdown variant="default" size="md" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Space Drawer */}
      <MobileSpaceDrawer 
        isOpen={spaceDrawerOpen}
        onClose={() => setSpaceDrawerOpen(false)}
        currentSpaceSubdomain={subdomain || ''}
        userId={user?.id || ''}
      />

      {/* Chat Modal */}
      <ChatModal 
        isOpen={isChatModalOpen} 
        onClose={handleCloseChatModal} 
        initialConversationId={selectedConversationId}
      />

      {/* Member Settings Modal */}
      <MemberSettingsModal
        isOpen={memberSettingsOpen}
        onClose={() => setMemberSettingsOpen(false)}
        space={storeSpace ? {
          id: storeSpace.id,
          name: storeSpace.name,
          subdomain: storeSpace.subdomain,
          icon_image: storeSpace.icon_image,
          userRole: 'member'
        } : null}
        user={user}
      />
    </header>
  );
} 