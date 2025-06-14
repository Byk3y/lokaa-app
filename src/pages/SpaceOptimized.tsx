import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Bell, MessageSquare, User, LogOut, ChevronDown, Search, Settings, Users, Calendar, BookOpen, X, Trophy, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import SpaceSwitcher from "@/components/spaces/SpaceSwitcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import Confetti from 'react-confetti';
import SpaceSettingsModal from "@/components/modals/SpaceSettingsModal";
import { useSpace, SpaceProvider } from "@/contexts/SpaceContext";
import SpaceLoadingSkeleton from "@/components/space/SpaceLoadingSkeleton";
import { Link } from "react-router-dom";
import AboutTab from "@/components/space/AboutTab";
import FeedTab from "@/components/space/FeedTab";
import CalendarTab from "@/components/space/CalendarTab";
import MembersTab from "@/components/space/MembersTab";
import LeaderboardsTab from "@/components/space/LeaderboardsTab";
import ClassroomTab from "@/components/space/ClassroomTab";
import ProfileDropdown from "@/components/common/ProfileDropdown";


// Helper function to resolve image URLs that might be stored in localStorage
const resolveImageUrl = (imageUrl: string | null, fallbackUrl: string = '/default-cover.jpg'): string => {
  if (!imageUrl) return fallbackUrl;
  
  // If the URL starts with 'local:', retrieve from localStorage
  if (imageUrl.startsWith('local:')) {
    const storageKey = imageUrl.replace('local:', '');
    const storedImage = localStorage.getItem(storageKey);
    return storedImage || fallbackUrl;
  }
  
  // Otherwise, use the URL directly
  return imageUrl;
};

// Add interface for component props
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface SpaceProps {
  // initialTab?: string; // Removed initialTab
}

/**
 * Space wrapper component that provides context
 */
export default function SpaceWrapper(_props: SpaceProps) { // Removed empty destructuring, added _props
  return (
    <SpaceProvider /*initialTab={initialTab}*/> {/* Removed initialTab */}
      <SpaceContent />
    </SpaceProvider>
  );
}

/**
 * Space content component that consumes the context
 */
function SpaceContent() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const { user, signOut } = useOptimizedAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get space data from context - ALIGN WITH SpaceContextValue
  const { 
    spaceData,      // Renamed from space
    loading,        // Renamed from isLoading
    error,          // error is provided
    fetchSpaceData, // fetchSpaceData is provided
    // isOwner, activeTab, navigateToTab ARE NOT directly from this context based on SpaceContext.tsx
  } = useSpace();

  // Local state for tab management, since it's not in SpaceContextValue
  const [activeTab, setActiveTab] = useState(location.pathname.split('/').pop() || 'community');

  const navigateToTab = useCallback((tab: string) => {
    setActiveTab(tab);
    const path = `/${subdomain}/space/${tab === 'community' ? 'feed' : tab}`;
    navigate(path);
  }, [navigate, subdomain]);
  
  // Derived state for isOwner
  const isOwner = spaceData?.owner_id === user?.id;
  
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationShown, setNotificationShown] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiSource, setConfettiSource] = useState({ x: 0, y: 0 });

  // Preload space images when space data is loaded
  useEffect(() => {
    if (spaceData) {
      const imagesToPreload = [
        spaceData.cover_image,
        spaceData.icon_image
      ].filter(Boolean) as string[];
      
      // TODO: Implement image preloading when needed
    }
  }, [spaceData]);

  // Check if this is a newly created space and show notification
  useEffect(() => {
    // Check if we should show the space creation notification
    const checkForNewSpace = () => {
      try {
        const lastCreatedSpace = localStorage.getItem('lastCreatedSpace');
        if (!lastCreatedSpace) return;
        
        const spaceData = JSON.parse(lastCreatedSpace);
        
        // If this is the same space as the current one and was created recently (within the last minute)
        if (spaceData && spaceData.subdomain === subdomain) {
          const createdAt = new Date(spaceData.created_at);
          const now = new Date();
          const timeDiffMs = now.getTime() - createdAt.getTime();
          const timeDiffSec = timeDiffMs / 1000;
          
          // If space was created in the last 60 seconds and notification hasn't been shown yet
          if (timeDiffSec < 60) {
            const notificationShownBefore = localStorage.getItem(`space_${spaceData.id}_notification_shown`);
            
            if (!notificationShownBefore) {
              // Mark that we've shown the notification for this space
              localStorage.setItem(`space_${spaceData.id}_notification_shown`, 'true');
              setNotificationShown(true);
              
              // Auto-dismiss after 5 seconds
              setTimeout(() => {
                setNotificationShown(false);
              }, 5000);
            }
          }
        }
      } catch (error) {
        console.error('Error checking for new space:', error);
      }
    };
    
    checkForNewSpace();
  }, [subdomain]);

  // Handle sign out
  const handleSignOut = async () => {
    try {
      console.log('Space page: Starting sign out process');
      
      // Call the signOut function from AuthContext
      await signOut();
      
      // Add Safari-specific fix with a safety timeout
      console.log('Space page: Adding fallback redirect for Safari');
      setTimeout(() => {
        // Check if we're still on a space page after signOut
        if (window.location.pathname.includes('/space/')) {
          console.log('Space page: Still on space page after signOut, forcing hard redirect');
          // Force a cache-busting redirect
          window.location.replace(`/?from=space&t=${Date.now()}`);
        }
      }, 1000);
    } catch (error) {
      console.error('Space page: Sign out error:', error);
      // Force a hard redirect on error
      window.location.replace('/');
    }
  };
  
  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search
    console.log("Searching for:", searchQuery);
  };

  // Handle close notification
  const handleCloseNotification = () => {
    setNotificationShown(false);
  };

  // Toggle profile dropdown
  const toggleProfileDropdown = () => {
    setProfileDropdownOpen(!profileDropdownOpen);
  };

  // Close profile dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (profileDropdownOpen && !target.closest('.profile-dropdown-container')) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownOpen]);

  // Use modern tab styles for navigation
  const renderTabButton = (tab: string, icon: React.ReactNode, label: string) => {
    const isActive = activeTab === tab;
    // Map 'community' tab to 'feed' URL path

    // navigateToTab now handles navigation, so direct url construction might not be needed here for the button itself
    
    return (
      <button 
        onClick={() => navigateToTab(tab)}
        className={`inline-flex items-center px-16 py-3 border-b-2 text-sm font-medium whitespace-nowrap ${
          isActive
            ? 'border-[#1A8A7E] text-[#111827] dark:text-white dark:border-white'
            : 'border-transparent text-[#4B5563] hover:text-gray-700 hover:border-gray-300 dark:text-gray-300 dark:hover:text-white dark:hover:border-gray-600'
        }`}
        aria-current={isActive ? 'page' : undefined}
      >
        <span className="mr-2">{icon}</span>
        {label}
      </button>
    );
  };

  // While loading, show the skeleton
  if (loading || !user) { // Use loading
    return <SpaceLoadingSkeleton activeTab={activeTab} />;
  }

  // If there's an error or no space data, show error UI
  if (!spaceData || error) { // Use spaceData and error from context
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-2">Space Not Found</h1>
          <p className="text-gray-600 mb-4">The space you're looking for doesn't exist or you don't have access.</p>
          <div className="flex flex-col gap-3 items-center">
            <Button onClick={() => navigate("/discover")}>
              Go to Discover
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate("/create-space")}
              className="mt-2"
            >
              Create a Space
            </Button>
            <Button 
              variant="link"
              onClick={() => window.location.href = "/"}
              className="text-gray-500"
            >
              Return to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <motion.div 
        className="min-h-screen bg-white flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {showConfetti && 
          <Confetti 
            recycle={false} 
            numberOfPieces={200} 
            gravity={0.1} 
            initialVelocityX={5}
            initialVelocityY={20}
            confettiSource={confettiSource}
            width={window.innerWidth}
            height={window.innerHeight}
          />
        }
        {/* Top Navigation */}
        <header className="bg-white border-b py-3 sticky top-0 z-50 shadow-sm">
          <div className="max-w-6xl mx-auto flex items-center justify-between px-4">
            {/* Left - Space Logo and Name with Switch Button */}
            <div className="flex items-center">
              <div className="h-10 w-10 bg-[#1A8A7E] rounded-lg flex items-center justify-center text-white font-bold mr-3 shadow-sm relative overflow-hidden">
                {spaceData?.icon_image ? ( // Use spaceData
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="absolute inset-0 w-full h-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${resolveImageUrl(spaceData.icon_image)})` }} // Use spaceData
                  />
                ) : (
                <span>{spaceData?.name?.charAt(0).toUpperCase()}</span> // Use spaceData
                )}
              </div>
              <div className="flex flex-col justify-center">
                <div className="flex items-center">
                  <SpaceSwitcher 
                    currentSpaceSubdomain={subdomain || ''} 
                    currentSpaceName={spaceData?.name} // Use spaceData
                    userId={user?.id || ''}
                  />
                </div>
              </div>
            </div>
            
            {/* Center - Search */}
            <div className="flex-1 max-w-xl mx-8">
              <div className="relative">
                <Search 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" 
                />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#F5F6F7] rounded-full border border-[#E1E4E8] focus:outline-none focus:ring-0 focus:border-[#1A8A7E] focus:border-2 text-sm text-[#37474F] placeholder-[#9CA3AF] transition-all"
                />
              </div>
            </div>
            
            {/* Right - User Controls */}
            <div className="flex items-center space-x-6">
            {/* Messages */}
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="text-[#4B5563] hover:text-[#1A8A7E] transition-colors"
              >
                <MessageSquare className="h-5 w-5" />
              </motion.button>
            
            {/* Notifications */}
              <div className="relative">
                <div className="h-5 w-5 bg-[#FF6F61] rounded-full flex items-center justify-center text-white text-xs absolute -top-1.5 -right-1.5 font-medium shadow-sm">
                  1
                </div>
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-[#4B5563] hover:text-[#1A8A7E] transition-colors"
                >
                  <Bell className="h-5 w-5" />
                </motion.button>
              </div>
              
              {/* Profile */}
              <div className="relative">
                <ProfileDropdown variant="animation" size="md" />
              </div>
            </div>
          </div>
        </header>

        {/* Space Navigation */}
        <nav className="bg-white border-b sticky top-16 z-40">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex overflow-x-auto">
              {renderTabButton("community", <MessageSquare className="h-4 w-4" />, "Feed")}
              {renderTabButton("classroom", <GraduationCap className="h-4 w-4" />, "Classroom")}
              {renderTabButton("calendar", <Calendar className="h-4 w-4" />, "Calendar")}
              {renderTabButton("members", <Users className="h-4 w-4" />, "Members")}
              {renderTabButton("leaderboard", <Trophy className="h-4 w-4" />, "Leaderboards")}
              {renderTabButton("about", <BookOpen className="h-4 w-4" />, "About")}
            </div>
          </div>
        </nav>
          
        {/* Main Content */}
        <main className="flex-grow py-2">
          <div className="max-w-6xl mx-auto px-4">
          {activeTab === "about" ? (
            <AboutTab 
              onSpaceUpdate={(updatedSpace) => {
                // TODO: Use updateSpaceInCache from context
                // Consider calling fetchSpaceData(subdomain, true) if AboutTab updates space significantly
              }}
            />
          ) : activeTab === "calendar" ? (
            <CalendarTab space={{ id: spaceData.id, name: spaceData.name }} />
          ) : activeTab === "members" ? (
            <MembersTab />
          ) : activeTab === "leaderboard" ? (
            <LeaderboardsTab space={{ id: spaceData.id, name: spaceData.name }} />
          ) : activeTab === "classroom" ? (
            <ClassroomTab space={spaceData} />
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Content Area */}
              <div className="md:col-span-2">
                <FeedTab user={user} isOwner={isOwner} isAdmin={isOwner} />
              </div>
              
              {/* Right Sidebar */}
              <div className="space-y-3">
                {/* Cover Photo/Space Info - Adjusted layout */}
                <motion.div 
                  whileHover={{ boxShadow: "0 6px 12px rgba(0, 0, 0, 0.15)" }}
                  className="bg-white rounded-lg overflow-hidden shadow-sm border border-[#E0F2F1] transition-all duration-300"
                >
                  {/* Cover Image Area */}
                  <div 
                    className="h-36 bg-[#26A69A] flex items-center justify-center relative cursor-pointer"
                  >
                    {spaceData?.cover_image ? ( // Use spaceData
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="absolute inset-0 w-full h-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${resolveImageUrl(spaceData.cover_image, '/default-space-cover.jpg')})` }} // Use spaceData
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-white">
                        <span className="text-base font-medium">No cover photo</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Space Info Content */}
                  <div className="p-4">
                    <h2 className="text-lg font-bold text-[#37474F] mb-1">{spaceData?.name}</h2> // Use spaceData
                    {/* Display Subdomain URL */}
                    <p className="text-sm text-[#78909C] mb-3">lokaa.com/{spaceData?.subdomain || 'your-subdomain'}</p> // Use spaceData
                  </div>
                </motion.div>
                
                {/* Space Stats */}
                <div className="grid grid-cols-3 gap-3 border border-[#E0F2F1] rounded-lg overflow-hidden bg-white">
                  <div className="text-center p-3 bg-white">
                    <div className="text-xl font-bold text-[#26A69A]">1</div>
                    <div className="text-xs text-[#78909C]">Members</div>
                  </div>
                  <div className="text-center p-3 bg-white">
                    <div className="text-xl font-bold text-[#26A69A]">0</div>
                    <div className="text-xs text-[#78909C]">Online</div>
                  </div>
                  <div className="text-center p-3 bg-white">
                    <div className="text-xl font-bold text-[#26A69A]">1</div>
                    <div className="text-xs text-[#78909C]">Admin</div>
                  </div>
                </div>
                
                {/* Settings Button - Only for owners */}
                {isOwner && (
                  <Button 
                    className="w-full py-3 bg-[#26A69A] hover:bg-[#1E8E7E] rounded-lg flex items-center justify-center font-medium text-white transition-colors text-base uppercase"
                  >
                    <Settings className="h-5 w-5 mr-2" />
                    SETTINGS
                  </Button>
                )}
                
                {/* Powered By */}
                <div className="text-center text-[#78909C] text-xs py-2">
                  powered by <span className="font-semibold text-[#37474F]">Lokaa</span>
                </div>
              </div>
            </div>
          )}
          </div>
        </main>
        
        {/* Space Settings Modal */}
        <SpaceSettingsModal />
        
        {/* Creation Success Notification */}
        {notificationShown && (
          <div className="fixed bottom-4 right-4 w-auto bg-gray-900 text-white px-5 py-3 rounded-lg shadow-lg flex items-center justify-between">
            <div className="text-sm mr-4">Space was created</div>
            <button 
              onClick={handleCloseNotification}
              className="text-white hover:text-gray-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
    </motion.div>
    </TooltipProvider>
  );
} 