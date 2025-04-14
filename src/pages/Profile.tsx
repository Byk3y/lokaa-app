
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/discover/LoadingSpinner";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileTabs from "@/components/profile/ProfileTabs";
import { toast } from "@/hooks/use-toast";

export default function Profile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [isCurrentUser, setIsCurrentUser] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        
        // Fetch user profile based on username
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('username', username)
          .single();
          
        if (error) {
          throw error;
        }

        setProfileData(data);
        setIsCurrentUser(user?.id === data.id);
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: "Error loading profile",
          description: "Could not load this user profile.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchUserProfile();
    }
  }, [username, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-2">User Not Found</h1>
        <p className="text-gray-600 mb-4">This user profile does not exist.</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header with close button */}
        <div className="flex items-center justify-between p-4 bg-white border-b">
          <h1 className="text-xl font-semibold">Profile</h1>
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-col md:flex-row">
          {/* Profile header */}
          <ProfileHeader 
            profileData={profileData} 
            isCurrentUser={isCurrentUser} 
          />

          {/* Profile tabs */}
          <ProfileTabs profileData={profileData} />
        </div>
      </div>
    </div>
  );
}
