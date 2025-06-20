import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { X, Bell, MessageSquare, Search, Plus, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/discover/LoadingSpinner";
import { useUserProfile } from "@/contexts/UserProfileContext";
import ProfileCard from '@/components/profile/ProfileCard';
import ActivityBarChart from '@/components/profile/ActivityBarChart';
import OwnedSpacesList from '@/components/profile/OwnedSpacesList';
import MembershipSpacesList from '@/components/profile/MembershipSpacesList';
import FollowersModal from '@/components/profile/FollowersModal';
import Rewards from '@/components/profile/ProfileRewards';
import BottomNav from "@/components/mobile/BottomNav";
import ChatButton from '@/components/chat/ChatButton';
import ProfileDropdown from "@/components/common/ProfileDropdown";
import ModernDropdownTrigger from "@/components/ModernDropdownTrigger";
import SpaceContextBanner from '@/components/profile/SpaceContextBanner';
import { Space } from "@/types/space";
import { SpaceAssetsUtils } from '@/shared/utils/space-assets-utils';

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
          console.error('Error fetching user spaces:', error);
          return;
        }

        const spaces = spaceMemberships
          ?.map(membership => membership.spaces)
          .filter(space => space !== null) as Space[] || [];
        
        setUserSpaces(spaces);
      } catch (error) {
        console.error('Error fetching user spaces:', error);
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
            {/* Modern Icon Buttons with elevated design */}
            <div className="flex items-center space-x-3">
              {/* Chat Button */}
              <div className="relative">
                <ChatButton 
                  variant="icon" 
                  className="h-10 w-10 bg-white/80 backdrop-blur-sm hover:bg-white border border-gray-200/70 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl hover:scale-105 [&_svg]:w-5 [&_svg]:h-5 [&_button]:h-10 [&_button]:w-10 [&_button]:rounded-xl [&_button]:shadow-lg [&_button]:border-gray-200/70"
                />
              </div>
              
              {/* Bell Icon */}
        <Button
          variant="ghost"
                size="sm" 
                className="relative h-10 w-10 p-0 bg-white/80 backdrop-blur-sm hover:bg-white border border-gray-200/70 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl hover:scale-105"
        >
                <Bell size={20} className="text-gray-700 hover:text-gray-900 transition-colors duration-200" />
        </Button>
      </div>
      
            <div className="ml-3">
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

  console.log('Profile component: Rendering with slug:', slug);

  // Fetch profile data when slug changes
  useEffect(() => {
    if (slug) {
      console.log(`Profile component: Fetching profile for slug: ${slug}`);
      fetchProfileBySlug(slug)
        .then(() => {
          console.log(`Profile component: Finished initial fetch for ${slug}`);
          setIsInitialLoading(false);
        })
        .catch(err => {
          console.error(`Profile component: Error fetching profile for ${slug}:`, err);
          setIsInitialLoading(false);
        });
    } else {
      console.error('Profile component: No slug provided');
      setIsInitialLoading(false);
    }
  }, [slug, fetchProfileBySlug]);

  // Debug logging for component state
  useEffect(() => {
    console.log('Profile component: State update', {
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
      console.error(`Profile component: Error loading profile: ${error}`);
    }
    
    if (!isLoading && !error && !profile && !isInitialLoading) {
      console.error('Profile component: No profile data loaded but no error reported');
    }
  }, [isLoading, error, profile, isInitialLoading]);

  // Show loading state only for initial load, not for refreshes
  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F9FAFB]">
        <LoadingSpinner />
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
        <LoadingSpinner />
      </div>
    );
  }

  // Calculate metrics for display
  const activityScore = profile?.activity_score ?? profile?.contributions ?? 0;
  const userLevel = calculateLevel(activityScore);
  const progressToNextLevel = calculateProgress(activityScore);
  const points = pointsToNextLevel(activityScore);

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
      
      {/* Mobile bottom navigation */}
      <div className="lg:hidden">
        <BottomNav />
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
