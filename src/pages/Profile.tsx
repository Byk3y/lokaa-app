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

export default function Profile() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          .select(`id, first_name, last_name, profile_url, avatar_url, bio, role, activity_score, social_links, created_at, followers, following, contributions`)
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

        console.log('Profile data retrieved:', data);
        
        // Use type assertion to address TypeScript warnings
        const profileData = data as any;
        setProfileData(profileData);
        
        if (profileData && typeof profileData === 'object' && 'id' in profileData) {
          setIsCurrentUser(user?.id === profileData.id);
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

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="max-w-4xl mx-auto py-10 px-4 flex flex-col md:flex-row gap-8">
        {/* Profile Card */}
        <div className="w-full md:w-1/3">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 flex flex-col items-center">
            <ProfileHeader profileData={profileData} isCurrentUser={isCurrentUser} />
            <div className="flex justify-between w-full mt-8 mb-2">
              <div className="flex flex-col items-center"><span className="font-bold text-lg">0</span><span className="text-xs text-gray-500">Contributions</span></div>
              <div className="flex flex-col items-center"><span className="font-bold text-lg">0</span><span className="text-xs text-gray-500">Followers</span></div>
              <div className="flex flex-col items-center"><span className="font-bold text-lg">4</span><span className="text-xs text-gray-500">Following</span></div>
            </div>
            {isCurrentUser && <Button className="w-full bg-[#00A389] hover:bg-[#008E78] text-white font-semibold rounded-lg py-2 mt-4">EDIT PROFILE</Button>}
          </div>
        </div>
        {/* Profile Tabs */}
        <div className="flex-1">
          <ProfileTabs profileData={profileData} />
        </div>
      </div>
    </div>
  );
}
