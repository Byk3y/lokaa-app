import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Globe, Search, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import LoadingIndicator from '@/components/LoadingIndicator';
import { useMembershipStore } from '@/features/spaces/store/membership-store';
import { useUserSpacesStore } from '@/hooks/useUserSpacesStore';

// Define the space interface (re-use the one from the store)
interface Space {
  id: string;
  name: string;
  subdomain: string;
  owner_id: string;
  icon_image?: string | null;
}

interface MobileSpaceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentSpaceSubdomain: string;
  userId: string;
}

// Function to properly capitalize each word in a string
const capitalizeWords = (str: string): string => {
  if (!str) return '';
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export default function MobileSpaceDrawer({
  isOpen,
  onClose,
  currentSpaceSubdomain,
  userId
}: MobileSpaceDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { refreshSpacesTrigger } = useMembershipStore();
  
  // Use the new cached store
  const { 
    spaces, 
    loading, 
    error, 
    fetchUserSpaces, 
    isStale 
  } = useUserSpacesStore();

  // Fetch user spaces when drawer opens or when refresh is triggered
  useEffect(() => {
    if (isOpen && userId) {
      fetchUserSpaces(userId);
    }
  }, [isOpen, userId, fetchUserSpaces]);

  // Handle membership store refresh trigger (when user joins/leaves spaces)
  useEffect(() => {
    if (userId && refreshSpacesTrigger > 0) {
      console.log('🔄 [MobileSpaceDrawer] Membership changed, refreshing spaces');
      fetchUserSpaces(userId, true); // Force refresh
    }
  }, [refreshSpacesTrigger, userId, fetchUserSpaces]);

  // Background refresh if data is stale and drawer is open
  useEffect(() => {
    if (isOpen && userId && isStale()) {
      console.log('🔄 [MobileSpaceDrawer] Data is stale, triggering background refresh');
      fetchUserSpaces(userId);
    }
  }, [isOpen, userId, isStale, fetchUserSpaces]);

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
      } catch (e) {
        console.error('Error storing space context:', e);
      }
    }
    
    navigate(`/${subdomain}/space`);
    onClose();
  };

  const handleDiscoverSpaces = () => {
    sessionStorage.setItem('userWantsDiscover', 'true');
    navigate('/discover');
    onClose();
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
      console.error('Error retrieving space from navigation context:', e);
    }
    
    // Fallback to the passed subdomain
    return currentSpaceSubdomain;
  };
  
  const effectiveSelectedSubdomain = getEffectiveSelectedSubdomain();

  // Filter spaces based on search query
  const filteredSpaces = searchQuery.trim() === ""
    ? spaces
    : spaces.filter(space => 
        space.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 z-50 sm:hidden" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-[85vw] max-w-xs bg-white shadow-lg z-50 sm:hidden flex flex-col">
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-base font-semibold mb-2">Your Spaces</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Search Bar */}
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                type="search" 
                placeholder="Search" 
                className="pl-9 pr-4" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          {/* Spaces List */}
          <div className="p-2 overflow-y-auto max-h-[60vh]">
            {loading && spaces.length === 0 ? (
              <div className="flex justify-center items-center py-4">
                <LoadingIndicator size="small" />
              </div>
            ) : error && spaces.length === 0 ? (
              <div className="px-2 py-4 text-sm text-red-500 text-center">
                {error}
              </div>
            ) : filteredSpaces.length > 0 ? (
              filteredSpaces.map((space) => (
                <button
                  key={space.id}
                  className={`
                    w-full p-3 flex items-center space-x-3 rounded-md text-left
                    hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer
                    focus:bg-slate-100 dark:focus:bg-slate-700 focus:outline-none
                    ${space.subdomain === effectiveSelectedSubdomain ? 'bg-slate-100 dark:bg-slate-700 font-semibold text-teal-600 dark:text-teal-400' : 'text-slate-800 dark:text-slate-200'}
                  `}
                  onClick={() => handleSpaceSelect(space.subdomain)}
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
                </button>
              ))
            ) : (
              <div className="px-2 py-4 text-sm text-gray-500 text-center">
                {searchQuery.trim() !== "" ? "No matching spaces found." : "No spaces found."}
              </div>
            )}
          </div>
          
          {/* Divider */}
          <div className="px-2">
            <div className="border-t my-3"></div>
          </div>
          
          {/* Create & Discover Buttons */}
          <div className="px-2">
            <Button 
              variant="ghost" 
              className="w-full justify-start mb-1 p-3 text-sm font-medium text-gray-700"
              onClick={() => { navigate('/create-space'); onClose(); }}
            >
              <Plus className="h-5 w-5 mr-3" />
              Create a space
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start p-3 text-sm font-medium text-gray-700"
              onClick={handleDiscoverSpaces}
            >
              <Globe className="h-5 w-5 mr-3" />
              Discover spaces
            </Button>
          </div>
        </div>
      </div>
    </>
  );
} 