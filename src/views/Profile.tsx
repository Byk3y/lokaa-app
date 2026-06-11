import { log } from '@/utils/logger';
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { X, Bell, MessageSquare, Search, Plus, Compass, Menu, MoreHorizontal, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import LoadingIndicator from "@/components/LoadingIndicator";
import { useUserProfile } from "@/contexts/UserProfileContext";
import ProfileCard from '@/components/profile/ProfileCard';
import ActivityBarChart from '@/components/profile/ActivityBarChart';
import OwnedSpacesList from '@/components/profile/OwnedSpacesList';
import MembershipSpacesList from '@/components/profile/MembershipSpacesList';
import FollowersModal from '@/components/profile/FollowersModal';
import Rewards from '@/components/profile/ProfileRewards';
import BottomNav from "@/components/mobile/BottomNav";
import MobileSpaceDrawer from '@/components/mobile/MobileSpaceDrawer';
import ChatButton from '@/components/chat/ChatButton';
import ProfileDropdown from "@/components/common/ProfileDropdown";
import ModernDropdownTrigger from "@/components/ModernDropdownTrigger";
import SpaceContextBanner from '@/components/profile/SpaceContextBanner';
import { MobileSearchOverlay } from '@/features/search';
import { useSearchHook as useSearch } from '@/features/search/store/search-store';

import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import { Space } from "@/types/space";
import { SpaceAssetsUtils } from '@/shared/utils/space-assets-utils';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials, getAvatarColor } from '@/shared/utils/avatar-utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { getCurrentSpaceContext } from '@/utils/spaceContextUtils';

// Modified Header component for Profile page to show Lokaa logo instead of space
function ProfileHeader({ user }: { user: any }) {
  const navigate = useNavigate();
  const { user: currentUser } = useOptimizedAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [spaceSwitcherOpen, setSpaceSwitcherOpen] = useState(false);
  const [userSpaces, setUserSpaces] = useState<Space[]>([]);
  const [spaceSearchQuery, setSpaceSearchQuery] = useState("");
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Fetch user spaces when needed
  useEffect(() => {
    const fetchUserSpaces = async () => {
      if (!currentUser) return;
      
      setLoadingSpaces(true);
      try {
        const { data: spaceMemberships, error } = await getSupabaseClient()
          .from('space_members')
          .select(`
            space_id,
            spaces:spaces!inner(
              id,
              name,
              subdomain,
              icon_image
            )
          `)
          .eq('user_id', currentUser.id);

        if (error) {
          log.error('Page', 'Error fetching user spaces:', error);
          return;
        }

        const spaces = spaceMemberships
          ?.flatMap(membership => membership.spaces || [])
          .filter(space => space !== null)
          .map(space => ({
            id: space.id,
            name: space.name,
            subdomain: space.subdomain,
            icon_image: space.icon_image,
            description: '',
            is_private: false,
            created_at: '',
            owner_id: ''
          } as Space)) || [];
        
        setUserSpaces(spaces);
      } catch (error) {
        log.error('Page', 'Error fetching user spaces:', error);
      } finally {
        setLoadingSpaces(false);
      }
    };

    if (spaceSwitcherOpen && userSpaces.length === 0 && !loadingSpaces) {
      fetchUserSpaces();
    }
  }, [spaceSwitcherOpen, currentUser, userSpaces.length, loadingSpaces]);

  // Handle click outside for dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSpaceSwitcherOpen(false);
      }
    }

    if (spaceSwitcherOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [spaceSwitcherOpen]);

  // Only show header on desktop - hide on mobile for clean Skool-style experience
  const isDesktop = useMediaQuery('(min-width: 1024px)'); // lg breakpoint
  
  // Don't render header on mobile at all - but do this AFTER all hooks are called
  if (!isDesktop) {
    return null;
  }
  
  return (
    <>
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center">
            {/* Space Switcher Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center cursor-pointer" onClick={() => setSpaceSwitcherOpen(!spaceSwitcherOpen)}>
                <h1 className="text-4xl font-bold leading-none text-[#14b8a6]">Lokaa</h1>
                <span className="ml-2"><ModernDropdownTrigger open={spaceSwitcherOpen} /></span>
              </div>
              
              {/* Dropdown menu */}
              {spaceSwitcherOpen && (
                <div
                  className="absolute top-14 left-0 bg-white rounded-2xl shadow-2xl w-[300px] z-20 border border-gray-100 max-h-[80vh] overflow-y-auto transition-all duration-200"
                  style={{ minWidth: 240, opacity: spaceSwitcherOpen ? 1 : 0, transform: spaceSwitcherOpen ? 'translateY(0)' : 'translateY(-8px)' }}
                >
                  {/* Search bar */}
                  <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Search spaces"
                        value={spaceSearchQuery}
                        onChange={(e) => setSpaceSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 bg-white"
                      />
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="p-4 flex flex-col gap-2 border-b border-gray-100 bg-white">
                    <button 
                      onClick={() => {navigate('/create-space'); setSpaceSwitcherOpen(false);}}
                      className="flex items-center px-3 py-2 rounded-lg hover:bg-[#E6F7F1] text-gray-800 font-medium transition"
                    >
                      <Plus className="h-5 w-5 text-gray-500 mr-3" />
                      Create a space
                    </button>
                    <button
                      onClick={() => {navigate('/discover'); setSpaceSwitcherOpen(false);}}
                      className="flex items-center px-3 py-2 rounded-lg hover:bg-[#E6F7F1] text-gray-800 font-medium transition"
                    >
                      <Compass className="h-5 w-5 text-gray-500 mr-3" />
                      Discover spaces
                    </button>
                  </div>

                  {/* User spaces */}
                  <div className="py-2 bg-white">
                    {currentUser ? (
                      <>
                        {Array.isArray(userSpaces) && userSpaces.length > 0 ? (
                          userSpaces
                            .filter(space => !spaceSearchQuery || space.name.toLowerCase().includes(spaceSearchQuery.toLowerCase()))
                            .map((space) => (
                              <button
                                key={space.id}
                                onClick={() => { navigate(`/${space.subdomain}/space`); setSpaceSwitcherOpen(false); }}
                                className="flex items-center px-4 py-2 w-full hover:bg-gray-50 rounded-lg transition group focus:ring-2 focus:ring-[#00A389]"
                              >
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center mr-3 overflow-hidden bg-gray-100 group-hover:ring-2 group-hover:ring-[#00A389]">
                                  {space.icon_image ? (
                                    <img src={space.icon_image} alt={space.name} className="w-full h-full object-cover" />
                                  ) : (
                                    (() => {
                                      const spaceAssets = SpaceAssetsUtils.resolveSpaceAssets(space);
                                      return (
                                        <span 
                                          className="text-base font-bold"
                                          style={{ color: spaceAssets.textColor }}
                                        >
                                          {spaceAssets.initials}
                                        </span>
                                      );
                                    })()
                                  )}
                                </div>
                                <span className="text-sm font-medium">{space.name}</span>
                              </button>
                            ))
                        ) : (
                          <div className="px-4 py-3 text-center text-gray-500 text-sm">
                            {loadingSpaces ? "Loading spaces..." : "No spaces available"}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="px-4 py-4">
                        <button 
                          onClick={() => navigate('/login')}
                          className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 text-gray-800 text-sm font-medium mb-2"
                        >
                          Sign in
                        </button>
                        <button
                          onClick={() => navigate('/signup')}
                          className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 text-gray-800 text-sm font-medium"
                        >
                          Sign up
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Clean simple buttons matching main space page */}
            {/* Chat Button */}
            <ChatButton 
              variant="icon" 
              className="text-gray-500 p-2"
            />
            
            {/* Bell Icon */}
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-gray-500"
              aria-label="Notifications"
            >
              <Bell className="h-7 w-7" />
            </Button>
            
            {/* Profile Dropdown */}
            <div className="relative">
              <ProfileDropdown variant="default" size="md" />
            </div>
          </div>
        </div>
      </header>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 fixed left-0 right-0 z-40 top-16">
          <div className="px-4 space-y-3 py-4">
            <div className="flex items-center w-full justify-start text-gray-700 hover:bg-gray-50 px-4 py-3 rounded-xl transition-all duration-200 border border-gray-100 bg-white">
              <MessageSquare className="h-6 w-6 mr-4 text-gray-600" />
              <span className="font-medium">Messages</span>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-gray-50 px-4 py-3 rounded-xl transition-all duration-200 border border-gray-100 bg-white"
              aria-label="Notifications"
            >
              <Bell className="h-6 w-6 mr-4 text-gray-600" />
              <span className="font-medium">Notifications</span>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

// Profile component
export default function Profile() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useOptimizedAuth();
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [spaceDrawerOpen, setSpaceDrawerOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const { setGlobalSearch, setSpaceSearch } = useSearch();

  // Detect mobile vs desktop from the *live* viewport width so the layout reacts
  // when the user switches between mobile and desktop view. The previous user-agent
  // detection was cached once per session and left the mobile layout stretched on
  // desktop after a view switch.
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // Get space data from store for mobile header icon (must be at top level)
  const { space: storeSpace, loadActiveSpace } = useSpaceSettingsStore();
  
  // Use our context
  const { 
    profile, 
    isLoading, 
    error, 
    isCurrentUser,
    fetchProfileBySlug,
    calculateLevel,
    calculateProgress,
    pointsToNextLevel
  } = useUserProfile();

  log.debug('Page', 'Profile component: Rendering with slug:', slug);

  // Load space data when we have space context
  useEffect(() => {
    const spaceContext = getCurrentSpaceContext();
    if (spaceContext?.subdomain && user?.id) {
      // Only load if we don't already have this space data
      const hasMatchingSpaceData = storeSpace && storeSpace.subdomain === spaceContext.subdomain;
      
      if (!hasMatchingSpaceData) {
        log.debug('Page', `🔍 [Profile] Loading space data for context: ${spaceContext.subdomain}`);
        loadActiveSpace({ subdomain: spaceContext.subdomain }, user.id, false);
      }
    }
  }, [user?.id, loadActiveSpace, storeSpace?.subdomain]);

  // Fetch profile data when slug changes
  useEffect(() => {
    if (slug) {
      log.debug('Page', `Profile component: Fetching profile for slug: ${slug}`);
      fetchProfileBySlug(slug)
        .then(() => {
          log.debug('Page', `Profile component: Finished initial fetch for ${slug}`);
          setIsInitialLoading(false);
        })
        .catch(err => {
          log.error('Page', `Profile component: Error fetching profile for ${slug}:`, err);
          setIsInitialLoading(false);
        });
    } else {
      log.error('Page', 'Profile component: No slug provided');
      setIsInitialLoading(false);
    }
  }, [slug, fetchProfileBySlug]);

  // Debug logging for component state
  useEffect(() => {
    log.debug('Page', 'Profile component: State update', {
      hasProfile: !!profile,
      isLoading,
      error,
      isCurrentUser,
      slug
    });
  }, [profile, isLoading, error, isCurrentUser, slug]);

  // Check for any issues with the profile URL
  useEffect(() => {
    if (!isLoading && error) {
      log.error('Page', `Profile component: Error loading profile: ${error}`);
    }
    
    if (!isLoading && !error && !profile && !isInitialLoading) {
      log.error('Page', 'Profile component: No profile data loaded but no error reported');
    }
  }, [isLoading, error, profile, isInitialLoading]);

  // Show loading state only for initial load, not for refreshes
  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F9FAFB]">
        <LoadingIndicator />
      </div>
    );
  }

  // Show error state - but only if we're not still loading and there's a real error
  if (error && !isLoading && !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#F9FAFB]">
        <h1 className="text-2xl font-bold mb-2 text-[#111]">User Not Found</h1>
        <p className="text-gray-600 mb-4">{error || "This user profile does not exist."}</p>
        <Button onClick={() => navigate(-1)} className="bg-[#00A389] hover:bg-[#008E78] text-white">Go Back</Button>
      </div>
    );
  }

  // Wait for profile data before rendering anything
  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F9FAFB]">
        <LoadingIndicator />
      </div>
    );
  }

  // Calculate metrics for display
  const activityScore = profile?.activity_score ?? profile?.contributions ?? 0;
  const userLevel = calculateLevel(activityScore);
  const progressToNextLevel = calculateProgress(activityScore);
  const points = pointsToNextLevel(activityScore);

  // Mobile Layout (Skool-style)
  if (isMobile) {
    // Get current space context for header
    const spaceContext = getCurrentSpaceContext();
    const headerTitle = spaceContext?.name || 'Lokaa';
    
    // Get the actual space subdomain - prioritize space context over default
    const currentSpaceSubdomain = spaceContext?.subdomain || '';
    
    // Debug logging to understand space data flow
    log.debug('Page', '🔍 [Profile Mobile Header] Space data:', {
      spaceContext,
      storeSpace: storeSpace?.name,
      storeSpaceSubdomain: storeSpace?.subdomain,
      currentSpaceSubdomain,
      storeSpaceIcon: storeSpace?.icon_image
    });
    
    return (
      <div className="min-h-screen flex flex-col bg-white">
        {/* Mobile Header - Consistent with SpaceHeader styling */}
        <div className="bg-white border-b border-gray-200 py-1.5 sm:py-2.5 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto flex items-center justify-between px-4">
            {/* Left: Hamburger Menu + Space Icon + Name */}
            <div className="flex items-center">
              <button className="p-2 text-gray-600 hover:bg-gray-100" onClick={() => setSpaceDrawerOpen(true)}>
                <Menu className="h-5 w-5" />
              </button>
              
              {/* Space Icon + Name positioned after hamburger */}
              {spaceContext && (() => {
                // Use the same logic as SpaceSwitcher - prioritize store space icon when subdomain matches
                const currentIcon = storeSpace?.subdomain === currentSpaceSubdomain 
                  ? storeSpace?.icon_image 
                  : null;
                
                const spaceAssets = SpaceAssetsUtils.resolveSpaceAssets({
                  name: headerTitle,
                  icon_image: currentIcon,
                  subdomain: currentSpaceSubdomain
                });
                
                log.debug('Page', '🎨 [Profile Mobile Header] SpaceAssets result:', {
                  hasIcon: spaceAssets.hasIcon,
                  iconUrl: spaceAssets.iconUrl,
                  initials: spaceAssets.initials,
                  backgroundColor: spaceAssets.backgroundColor,
                  currentIcon
                });
                
                return (
                  <div className="flex items-center ml-2">
                    {spaceAssets.hasIcon && spaceAssets.iconUrl ? (
                      <img 
                        src={spaceAssets.iconUrl} 
                        alt={spaceContext.name} 
                        className="h-7 w-7 rounded-lg mr-2 object-cover"
                      />
                    ) : (
                      <div 
                        className="h-7 w-7 rounded-lg mr-2 flex items-center justify-center font-bold text-xs"
                        style={{ 
                          backgroundColor: spaceAssets.backgroundColor,
                          color: spaceAssets.textColor 
                        }}
                      >
                        {spaceAssets.initials}
                      </div>
                    )}
                    <h1 className="text-sm font-semibold text-gray-900 truncate">
                      {headerTitle}
                    </h1>
                  </div>
                );
              })()}
            </div>
            
            {/* Right: Search and Menu */}
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-600 hover:bg-gray-100" onClick={() => setMobileSearchOpen(true)}>
                <Search className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <MobileSearchOverlay
          isOpen={mobileSearchOpen}
          onClose={() => setMobileSearchOpen(false)}
          spaceId={storeSpace?.id || spaceContext?.id}
          onSearch={(query) => {
            setMobileSearchOpen(false);
            const targetSubdomain = currentSpaceSubdomain || storeSpace?.subdomain || spaceContext?.subdomain;

            if (storeSpace?.id) {
              setSpaceSearch(storeSpace.id, query);
            } else {
              setGlobalSearch(query);
            }

            if (targetSubdomain) {
              navigate(`/${targetSubdomain}/space`);
            }
          }}
        />

        {/* Mobile Profile Content */}
        <div className="flex-1 bg-gray-50">
          {/* Space Context Banner for mobile (hidden by SpaceContextBanner component itself) */}
          <SpaceContextBanner />
          
          {/* Profile Section */}
          <div className="bg-white">
            <div className="px-4 py-6 text-center">
              {/* Avatar and Level Badge */}
              <div className="relative inline-block mb-1">
                <div className="w-32 h-32 mx-auto mb-2">
                  {profile.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt={profile.full_name} 
                      className="w-full h-full rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center border-4 border-white shadow-lg">
                      <span className="text-white text-2xl font-bold">
                        {(profile.full_name || profile.first_name || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                {/* Level Badge like Skool - positioned slightly to the right */}
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 translate-x-3">
                  <div className="bg-blue-500 text-white text-sm font-bold px-3 py-1 rounded-full border-4 border-white shadow-lg">
                    {userLevel}
                  </div>
                </div>
              </div>

              {/* Level Display like Skool */}
              <h3 className="text-base font-bold text-teal-600 mb-0">Level {userLevel}</h3>
              <p className="text-xs text-gray-500 mb-2">{points} points to level up</p>

              {/* Name and Username */}
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim()}
              </h1>
              <p className="text-gray-500 mb-2">
                @{profile.profile_url || 'user'}
              </p>

              {/* Bio */}
              {profile.bio && (
                <p className="text-gray-700 mb-4 max-w-sm mx-auto">
                  {profile.bio}
                </p>
              )}

              {/* Edit Profile Button for current user */}
              {isCurrentUser && (
                <Button 
                  variant="outline" 
                  className="w-full max-w-sm mx-auto mb-4"
                  onClick={() => {
                    navigate('/settings');
                  }}
                >
                  Edit Profile
                </Button>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-3 border-t border-b border-gray-200 py-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-900">{activityScore}</div>
                  <div className="text-sm text-gray-500">Contributions</div>
                </div>
                <div className="text-center border-l border-r border-gray-200">
                  <div className="text-xl font-bold text-gray-900">{profile.followers || 0}</div>
                  <div className="text-sm text-gray-500">Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-900">{profile.following || 0}</div>
                  <div className="text-sm text-gray-500">Following</div>
                </div>
              </div>

              {/* Status and Join Date - Skool Style (Left Aligned) */}
              <div className="py-6 space-y-4 text-left">
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="h-4 w-4 mr-3 text-gray-400" />
                  <span>Active 11m ago</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-3 text-gray-400" />
                  <span>
                    Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Section - Similar to Skool's calendar */}
          <div className="bg-white mt-2">
            <h3 className="text-2xl font-semibold text-gray-900 px-4 pt-4 pb-2">Activity</h3>
            <div className="p-4">
              <ActivityBarChart userId={profile.id} />
            </div>
          </div>

          {/* Memberships Section */}
          <div className="bg-white mt-2 pb-20">
            <h3 className="text-2xl font-semibold text-gray-900 px-4 pt-4 pb-2">Memberships</h3>
            <div className="p-4">
              <MembershipSpacesList userId={profile.id} />
            </div>
          </div>
        </div>

        {/* Mobile Space Drawer */}
        <MobileSpaceDrawer 
          isOpen={spaceDrawerOpen}
          onClose={() => setSpaceDrawerOpen(false)}
          currentSpaceSubdomain={spaceContext?.subdomain || ''}
          userId={user?.id || ''}
        />

        {/* Mobile bottom navigation */}
        <BottomNav />
        
        {/* Followers/Following Modals */}
        <FollowersModal 
          open={showFollowersModal} 
          onClose={() => setShowFollowersModal(false)} 
          type="followers" 
          userId={profile.id} 
        />
        
        <FollowersModal 
          open={showFollowingModal} 
          onClose={() => setShowFollowingModal(false)} 
          type="following" 
          userId={profile.id} 
        />
      </div>
    );
  }

  // Desktop Layout (Original)
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header area with potential space context */}
      <ProfileHeader user={user} />
      
      {/* Main profile content */}
      <div className="container max-w-6xl mx-auto px-4 py-8 flex-1">
        {/* Space Context Banner */}
        <SpaceContextBanner />
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-24">
          {/* Left sidebar */}
          <div className="lg:col-span-1">
            <div className="flex flex-col space-y-8">
              {/* Profile card */}
              <div className="bg-white rounded-xl shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] overflow-hidden transition-all duration-300 hover:shadow-[0_20px_50px_rgba(8,_112,_184,_0.13)]">
          <ProfileCard 
                  id={profile.id}
                  name={profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim()}
                  avatar={profile.avatar_url}
                  role={profile.role || 'member'}
                  profileUrl={profile.profile_url ? `/profile/${profile.profile_url}` : undefined}
                  bio={profile.bio || undefined}
                  username={profile.profile_url ? `@${profile.profile_url}` : undefined}
                  followers={profile.followers || 0}
                  following={profile.following || 0}
                  contributions={activityScore || 0}
                  joinDate={profile.created_at}
                  showMessageButton={!isCurrentUser}
                  social_links={profile.social_links}
          />
        </div>
            </div>
          </div>
          
          {/* Main content area */}
          <div className="flex flex-col gap-8">
            {/* Activity chart */}
            <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,_0,_0,_0.06)] p-6 transform transition-all duration-300 hover:translate-y-[-5px]">
              <h3 className="text-lg font-medium mb-3 text-gray-800">Activity Score</h3>
          <ActivityBarChart userId={profile.id} />
            </div>
          
            {/* Owned Spaces card (only if user owns spaces) */}
            {profile.role === 'creator' && (
              <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,_0,_0,_0.06)] p-6 transform transition-all duration-300 hover:translate-y-[-5px]">
                <h3 className="text-lg font-medium mb-4 text-gray-800">Owned Spaces</h3>
                <OwnedSpacesList userId={profile.id} />
              </div>
            )}

            {/* Memberships card */}
            <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,_0,_0,_0.06)] p-6 transform transition-all duration-300 hover:translate-y-[-5px]">
              <h3 className="text-lg font-medium mb-4 text-gray-800">Memberships</h3>
              <MembershipSpacesList userId={profile.id} />
            </div>

            {/* Rewards section */}
            <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,_0,_0,_0.06)] p-6 transform transition-all duration-300 hover:translate-y-[-5px]">
              <h3 className="text-lg font-medium mb-4 text-gray-800">Rewards & Badges</h3>
              <Rewards userId={profile.id} activityScore={activityScore} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Followers/Following Modals */}
      <FollowersModal 
        open={showFollowersModal} 
        onClose={() => setShowFollowersModal(false)} 
        type="followers" 
        userId={profile.id} 
      />
      
      <FollowersModal 
        open={showFollowingModal} 
        onClose={() => setShowFollowingModal(false)} 
        type="following" 
        userId={profile.id} 
      />
      
    </div>
  );
}
