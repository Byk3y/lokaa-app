
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { 
  Calendar, 
  Clock, 
  Copy, 
  Edit, 
  MapPin, 
  Trophy, 
  X
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/discover/LoadingSpinner";
import ProfilePosts from "@/components/profile/ProfilePosts";
import ProfileComments from "@/components/profile/ProfileComments";
import ProfileSpaces from "@/components/profile/ProfileSpaces";
import ProfileRewards from "@/components/profile/ProfileRewards";
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

  const handleCopyLink = () => {
    const profileUrl = window.location.href;
    navigator.clipboard.writeText(profileUrl);
    toast({
      title: "Link copied",
      description: "Profile link copied to clipboard!",
    });
  };

  const getInitials = (name) => {
    return name ? name.charAt(0).toUpperCase() : "U";
  };

  // Format dates
  const memberSince = profileData.created_at ? 
    format(new Date(profileData.created_at), "MMMM d, yyyy") : 
    "Unknown";

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
          {/* Left column - Profile header */}
          <div className="p-6 md:w-1/3 bg-amber-50">
            <div className="flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="h-28 w-28 bg-green-700 text-white text-4xl">
                  <AvatarImage src={profileData.avatar_url} alt={profileData.username} />
                  <AvatarFallback>{getInitials(profileData.full_name || profileData.username)}</AvatarFallback>
                </Avatar>
                {profileData.role === 'creator' && (
                  <span className="absolute bottom-0 right-0 bg-amber-300 text-amber-900 text-xs font-medium rounded-full h-6 w-6 flex items-center justify-center border-2 border-white">1</span>
                )}
              </div>

              {/* User name */}
              <h2 className="text-2xl font-semibold mt-4">{profileData.full_name || profileData.username}</h2>

              {/* Role badge */}
              {profileData.role === 'creator' && (
                <Badge variant="secondary" className="mt-1 bg-amber-100 text-amber-800">Creator</Badge>
              )}

              {/* Last seen */}
              <div className="flex items-center text-gray-500 mt-4">
                <Clock className="h-4 w-4 mr-1" />
                <span className="text-sm">Last seen 4 minutes ago</span>
              </div>

              {/* Member since */}
              <div className="flex items-center text-gray-500 mt-2">
                <Calendar className="h-4 w-4 mr-1" />
                <span className="text-sm">Member since {memberSince}</span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-6">
                {isCurrentUser && (
                  <Button variant="default" className="bg-blue-500 hover:bg-blue-600">
                    <Edit className="h-4 w-4 mr-1" /> Edit
                  </Button>
                )}
                <Button variant="outline" onClick={handleCopyLink}>
                  <Copy className="h-4 w-4 mr-1" />
                </Button>
              </div>
            </div>
          </div>

          {/* Right column - Tabs and content */}
          <div className="flex-1 p-4">
            <Tabs defaultValue="about">
              <TabsList className="w-full flex justify-between bg-white">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="comments">Comments</TabsTrigger>
                <TabsTrigger value="spaces">Spaces {profileData.role === 'creator' ? '4' : ''}</TabsTrigger>
                <TabsTrigger value="rewards">Rewards</TabsTrigger>
              </TabsList>

              <TabsContent value="about" className="mt-6">
                {/* Level and points info */}
                <div className="mb-6 flex items-center">
                  <div className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full flex items-center">
                    <Trophy className="h-4 w-4 mr-1" /> 
                    <span className="font-medium">Level 1</span>
                  </div>
                  <div className="ml-4 text-sm text-gray-500">
                    <span>{profileData.activity_score || 0} points</span> • <span>10 to level up</span>
                  </div>
                </div>

                {/* Biography */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Biography</h3>
                  <p className="text-gray-700">
                    {profileData.bio || "Want to start my own ai agency, can you be my mentor?"}
                  </p>
                </div>

                {/* Location */}
                {profileData.location && (
                  <div className="flex items-center text-gray-600 mb-4">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>Lagos Nigeria</span>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="posts">
                <ProfilePosts userId={profileData.id} />
              </TabsContent>

              <TabsContent value="comments">
                <ProfileComments userId={profileData.id} />
              </TabsContent>

              <TabsContent value="spaces">
                <ProfileSpaces userId={profileData.id} isCreator={profileData.role === 'creator'} />
              </TabsContent>

              <TabsContent value="rewards">
                <ProfileRewards userId={profileData.id} activityScore={profileData.activity_score || 0} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
