import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/discover/LoadingSpinner";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileTabs from "@/components/profile/ProfileTabs";
import { toast } from "@/hooks/use-toast";
import ProfileCard from '@/components/profile/ProfileCard';
import ContributionCalendar from '@/components/profile/ContributionCalendar';
import OwnedSpacesList from '@/components/profile/OwnedSpacesList';
import MembershipSpacesList from '@/components/profile/MembershipSpacesList';
import FollowersModal from '@/components/profile/FollowersModal';
import { SpaceData } from '@/contexts/SpaceContext';
import { User } from '@/contexts/AuthContext';
import { useState as useReactState } from 'react';
import SpaceLayout from '@/components/layout/SpaceLayout';
import { Header } from '@/components/layout/SpaceLayout';
import ActivityBarChart from '@/components/profile/ActivityBarChart';
import Rewards from '@/components/profile/ProfileRewards';

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profile_url: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: "member" | "creator" | null;
  activity_score: number | null;
  social_links: Record<string, string> | null; // Assuming JSON object for social_links
  created_at: string;
  followers: number | null; // Assuming these are counts or arrays of IDs
  following: number | null;
  contributions: number | null;
  country: string | null;
  full_name: string | null;
  last_joined_space_id: string | null;
  location: string | null;
  updated_at: string | null; // Added based on linter feedback
  wallet_balance: number | null; // Added back based on linter feedback
}

export default function Profile() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [space, setSpace] = useState<SpaceData | null>(null);

  useEffect(() => {
    // Enhanced logging for slug parameter
    console.log('Profile component: Current slug param:', {
      slug,
      pathname: location.pathname,
      urlStructure: location.pathname.split('/')
    });
    
    const fetchUserProfile = async () => {
      if (!slug) {
        console.error('Profile: No slug parameter provided');
        setError('No profile identifier found');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Remove @ prefix if present
        const cleanSlug = slug.startsWith('@') ? slug.substring(1) : slug;
        
        console.log('Fetching profile for:', cleanSlug);
        
        // Fetch user profile based on profile_url (slug)
        const { data, error } = await supabase
          .from('users')
          .select(`id, first_name, last_name, profile_url, avatar_url, bio, role, activity_score, social_links, created_at, followers, following, contributions, country, full_name, last_joined_space_id, location, updated_at, wallet_balance`)
          .eq('profile_url', cleanSlug)
          .single();
          
        if (error) {
          console.error('Supabase error fetching profile:', error);
          throw error;
        }

        if (!data) {
          console.error('No profile data found for slug:', cleanSlug);
          setError('Profile not found');
          setLoading(false);
          return;
        }

        // Fetch contributions count from user_activity_log
        const { count: contributionsCount, error: contribError } = await supabase
          .from('user_activity_log')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', data.id);
        if (contribError) {
          console.error('Error fetching contributions count:', contribError);
        }

        // Use type assertion to address TypeScript warnings
        setProfileData({ ...data, contributions: contributionsCount ?? 0 } as UserProfile);
        
        if (data && typeof data === 'object' && 'id' in data) {
          setIsCurrentUser(user?.id === data.id);
        } else {
          console.log('No profile data found or invalid format');
          setIsCurrentUser(false);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Could not load user profile');
        toast({
          title: "Error loading profile",
          description: "Could not load this user profile.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [slug, user, location.pathname]);

  useEffect(() => {
    const fetchHeaderSpaceContext = async () => {
      let headerSpace: SpaceData | null = null;

      // Attempt 0: First try to get the space the user navigated from (stored in sessionStorage)
      const lastNavigatedFromSpace = sessionStorage.getItem('navigatedFromSpace');
      if (lastNavigatedFromSpace) {
        try {
          const parsedSpace = JSON.parse(lastNavigatedFromSpace);
          console.log(`Profile Page: Checking navigated-from space:`, parsedSpace);
          
          // Only attempt to verify space if we have a valid ID
          if (parsedSpace && parsedSpace.id && parsedSpace.id !== 'undefined') {
            // Verify the space still exists and user has access
            const { data: spaceData, error: spaceError } = await supabase
              .from('spaces')
              .select('*')
              .eq('id', parsedSpace.id)
              .single();
              
            if (!spaceError && spaceData) {
              console.log(`Profile Page: Successfully verified navigated-from space: ${spaceData.name}`);
              headerSpace = spaceData as SpaceData;
            } else {
              console.log(`Profile Page: Could not verify navigated-from space, error:`, spaceError);
            }
          } else if (parsedSpace && parsedSpace.subdomain) {
            // Try to look up by subdomain instead
            console.log(`Profile Page: No valid ID, looking up space by subdomain: ${parsedSpace.subdomain}`);
            const { data: spaceData, error: spaceError } = await supabase
              .from('spaces')
              .select('*')
              .eq('subdomain', parsedSpace.subdomain)
              .single();
              
            if (!spaceError && spaceData) {
              console.log(`Profile Page: Successfully found space by subdomain: ${spaceData.name}`);
              headerSpace = spaceData as SpaceData;
            } else {
              console.log(`Profile Page: Could not find space by subdomain, error:`, spaceError);
            }
          }
        } catch (e) {
          console.error('Profile Page: Error parsing navigated-from space:', e);
        }
      }

      // Attempt 1: If no space from navigation context, try last_joined_space_id
      if (!headerSpace && profileData?.last_joined_space_id) {
        console.log(`Profile Page: Attempting to fetch last_joined_space by ID: ${profileData.last_joined_space_id}`);
        const { data, error } = await supabase
          .from('spaces')
          .select('*')
          .eq('id', profileData.last_joined_space_id)
          .single();
        if (!error && data) {
          console.log(`Profile Page: Successfully fetched last_joined_space: ${data.name}`);
          headerSpace = data as SpaceData;
        } else {
          console.log(`Profile Page: Failed to fetch last_joined_space by ID ${profileData.last_joined_space_id}:`, error);
        }
      } else if (!headerSpace) {
        console.log(`Profile Page: No space from navigation context or last_joined_space_id for user ${profileData?.id}`);
      }

      // Attempt 2: If still no space, try first owned space of the profile user
      if (!headerSpace && profileData) {
        console.log(`Profile Page: Attempting to fetch an owned space for header for user ${profileData.id}`);
        const { data: ownedSpaceData, error: ownedError } = await supabase
          .from('spaces')
          .select('*')
          .eq('owner_id', profileData.id)
          .order('created_at', { ascending: true }) // Get the first created one, or any preferred order
          .limit(1)
          .single();

        if (!ownedError && ownedSpaceData) {
          console.log(`Profile Page: Found owned space "${ownedSpaceData.name}" for header.`);
          headerSpace = ownedSpaceData as SpaceData;
        } else {
          console.log(`Profile Page: No owned space found for user ${profileData.id} for header, or error:`, ownedError);
        }
      }
      
      if (space?.id !== headerSpace?.id) { // Only update if the space is different
        setSpace(headerSpace);
      }
    };

    if (profileData) {
      fetchHeaderSpaceContext();
    } else {
      if (space !== null) { // Only update if space is not already null
         setSpace(null); // Clear space if profileData is not available
      }
    }
  }, [profileData]); // Dependency only on profileData. Internal logic handles avoiding unnecessary setSpace calls.

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F9FAFB]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#F9FAFB]">
        <h1 className="text-2xl font-bold mb-2 text-[#111]">User Not Found</h1>
        <p className="text-gray-600 mb-4">{error || "This user profile does not exist."}</p>
        <Button onClick={() => navigate(-1)} className="bg-[#00A389] hover:bg-[#008E78] text-white">Go Back</Button>
      </div>
    );
  }

  // Calculate level, points to next, and progress for ProfileCard
  const activityScore = profileData?.activity_score ?? profileData?.contributions ?? 0;
  const calculateLevel = (score: number) => Math.floor(score / 100) + 1;
  const calculateProgress = (score: number) => {
    const currentLevel = calculateLevel(score);
    const pointsForCurrentLevel = (currentLevel - 1) * 100;
    const progress = ((score - pointsForCurrentLevel) / 100);
    return Math.min(progress, 1);
  };
  const pointsToNextLevel = () => {
    const currentLevel = calculateLevel(activityScore);
    const nextLevelPoints = currentLevel * 100;
    return nextLevelPoints - activityScore;
  };
  const userLevel = calculateLevel(activityScore);
  const progressToNextLevel = calculateProgress(activityScore);

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Use the same header as the space page */}
      <Header user={user} space={space} />
      <div className="max-w-6xl mx-auto py-10 px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card (Sidebar) */}
        <div className="md:col-span-1">
          <ProfileCard 
            profileData={profileData} 
            isCurrentUser={isCurrentUser} 
            onShowFollowers={() => {}} 
            onShowFollowing={() => {}}
            level={userLevel}
            pointsToNext={pointsToNextLevel()}
            progress={progressToNextLevel}
          />
        </div>
        {/* Main Content */}
        <div className="md:col-span-2 flex flex-col gap-y-6">
          {/* Activity Bar Chart */}
          <ActivityBarChart userId={profileData.id} />
          {/* Owned Spaces */}
          <OwnedSpacesList userId={profileData.id} />

          {/* Membership Spaces */}
          <MembershipSpacesList userId={profileData.id} />

          {/* Rewards Section */}
          <Rewards userId={profileData.id} activityScore={profileData.activity_score ?? 0} />
        </div>
      </div>
      {/* Followers/Following Modal (stub) */}
      <FollowersModal open={false} onClose={() => {}} type="followers" userId={profileData.id} />
    </div>
  );
}
