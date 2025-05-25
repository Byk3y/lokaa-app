import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/discover/LoadingSpinner";
import { useUserProfile } from "@/contexts/UserProfileContext";
import ProfileCard from '@/components/profile/ProfileCard';
import ActivityBarChart from '@/components/profile/ActivityBarChart';
import OwnedSpacesList from '@/components/profile/OwnedSpacesList';
import MembershipSpacesList from '@/components/profile/MembershipSpacesList';
import FollowersModal from '@/components/profile/FollowersModal';
import { SpaceData } from '@/contexts/SpaceContext';
import { Header } from '@/components/layout/SpaceLayout';
import Rewards from '@/components/profile/ProfileRewards';

// Profile component
export default function Profile() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [space, setSpace] = useState<SpaceData | null>(null);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const spaceLoadAttempted = useRef(false);
  
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

  // Fetch profile data when slug changes
  useEffect(() => {
    if (slug) {
      fetchProfileBySlug(slug);
      // Reset space loading flag when slug changes
      spaceLoadAttempted.current = false;
    }
  }, [slug, fetchProfileBySlug]);

  // Debug logging for slug parameter - only in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Profile component: Current slug param:', {
        slug,
        pathname: location.pathname,
        urlStructure: location.pathname.split('/')
      });
    }
  }, [slug, location.pathname]);

  // Function to fetch header space context - wrapped in useCallback
  const fetchHeaderSpaceContext = useCallback(async (profileData: any) => {
    if (!profileData || spaceLoadAttempted.current) return null;
    
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Profile: Starting header space context fetch for user:', profileData.id);
    }
    
    spaceLoadAttempted.current = true;
    
    let headerSpace: SpaceData | null = null;

    try {
      // Attempt 0: First try to get the space the user navigated from (stored in sessionStorage)
      const lastNavigatedFromSpace = sessionStorage.getItem('navigatedFromSpace');
      if (lastNavigatedFromSpace) {
        try {
          const parsedSpace = JSON.parse(lastNavigatedFromSpace);
          
          // Only attempt to verify space if we have a valid ID
          if (parsedSpace && parsedSpace.id && parsedSpace.id !== 'undefined') {
            // Verify the space still exists and user has access
            const { data: spaceData, error: spaceError } = await supabase
              .from('spaces')
              .select('*')
              .eq('id', parsedSpace.id)
              .single();
              
            if (!spaceError && spaceData) {
              if (process.env.NODE_ENV === 'development') {
                console.log(`Profile: Successfully verified navigated-from space: ${spaceData.name}`);
              }
              headerSpace = spaceData as SpaceData;
            }
          } else if (parsedSpace && parsedSpace.subdomain) {
            // Try to look up by subdomain instead
            const { data: spaceData, error: spaceError } = await supabase
              .from('spaces')
              .select('*')
              .eq('subdomain', parsedSpace.subdomain)
              .single();
              
            if (!spaceError && spaceData) {
              headerSpace = spaceData as SpaceData;
            }
          }
        } catch (e) {
          console.error('Profile: Error parsing navigated-from space:', e);
        }
      }

      // Attempt 1: If no space from navigation context, try last_joined_space_id
      if (!headerSpace && profileData?.last_joined_space_id) {
        const { data, error } = await supabase
          .from('spaces')
          .select('*')
          .eq('id', profileData.last_joined_space_id)
          .single();
        if (!error && data) {
          headerSpace = data as SpaceData;
        }
      }

      // Attempt 2: If still no space, try first owned space of the profile user
      if (!headerSpace && profileData) {
        const { data: ownedSpaceData, error: ownedError } = await supabase
          .from('spaces')
          .select('*')
          .eq('owner_id', profileData.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .single();

        if (!ownedError && ownedSpaceData) {
          headerSpace = ownedSpaceData as SpaceData;
        }
      }
      
      return headerSpace;
    } catch (err) {
      console.error('Profile: Error in fetchHeaderSpaceContext:', err);
      return null;
    }
  }, []);

  // Effect to set space when profile changes - with proper dependency handling
  useEffect(() => {
    let isMounted = true;
    
    if (profile && !spaceLoadAttempted.current) {
      fetchHeaderSpaceContext(profile).then(headerSpace => {
        if (!isMounted) return;
        
        if (headerSpace) {
          setSpace(headerSpace);
        } else if (space !== null) {
          setSpace(null);
        }
      });
    } else if (!profile && space !== null) {
      setSpace(null);
    }
    
    return () => {
      isMounted = false;
    };
  }, [profile, fetchHeaderSpaceContext]);

  // Determine if we're in the initial loading state
  const isInitialLoading = isLoading && !profile;

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

  // Ensure stable rendering even during transitions
  return (
    <div className="min-h-screen bg-[#F9FAFB]" key={`profile-${profile.id}`}>
      {/* Use the same header as the space page */}
      <Header user={user} space={space} />
      <div className="max-w-6xl mx-auto py-10 px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card (Sidebar) */}
        <div className="md:col-span-1">
          <ProfileCard 
            profileData={profile} 
            isCurrentUser={isCurrentUser} 
            onShowFollowers={() => setShowFollowersModal(true)} 
            onShowFollowing={() => setShowFollowingModal(true)}
            level={userLevel}
            pointsToNext={points}
            progress={progressToNextLevel}
          />
        </div>
        {/* Main Content */}
        <div className="md:col-span-2 flex flex-col gap-y-6">
          {/* Activity Bar Chart */}
          <ActivityBarChart userId={profile.id} />
          
          {/* Owned Spaces */}
          <OwnedSpacesList userId={profile.id} />

          {/* Membership Spaces */}
          <MembershipSpacesList userId={profile.id} />

          {/* Rewards Section */}
          <Rewards userId={profile.id} activityScore={profile.activity_score ?? 0} />
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
