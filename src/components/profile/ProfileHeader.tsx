import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Edit, Clock, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import ProfileImageUploader from "./ProfileImageUploader";

interface ProfileHeaderProps {
  profileData: any;
  isCurrentUser: boolean;
}

export default function ProfileHeader({ profileData, isCurrentUser }: ProfileHeaderProps) {
  const navigate = useNavigate();
  const [profileImage, setProfileImage] = useState<string | null>(profileData.avatar_url || null);
  
  // Extract data with fallbacks for potentially missing fields
  const userData = {
    username: profileData.username || profileData.profile_url || 'User',
    fullName: profileData.full_name || `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || profileData.profile_url || 'User',
    avatarUrl: profileData.avatar_url,
    role: profileData.role || 'member',
    createdAt: profileData.created_at || new Date().toISOString()
  };
  
  const handleCopyLink = () => {
    const profileUrl = window.location.href;
    navigator.clipboard.writeText(profileUrl);
    toast({
      title: "Link copied",
      description: "Profile link copied to clipboard!",
    });
  };

  const handleEditProfile = () => {
    navigate("/settings/profile");
  };

  const getInitials = (name: string | null) => {
    return name ? name.charAt(0).toUpperCase() : "U";
  };

  // Format dates
  const memberSince = userData.createdAt ? 
    format(new Date(userData.createdAt), "MMMM d, yyyy") : 
    "Unknown";

  const handleImageUploaded = (url: string) => {
    setProfileImage(url);
    // If needed, update the profileData or state in parent component
  };

  return (
    <div className="w-full flex flex-col items-center text-center">
      {/* Avatar */}
      <div className="relative">
        {isCurrentUser ? (
          <ProfileImageUploader 
            currentImageUrl={profileImage} 
            onImageUploaded={handleImageUploaded}
            size="lg"
            userInitials={getInitials(userData.fullName)}
          />
        ) : (
          <Avatar className="h-28 w-28 bg-green-700 text-white text-4xl">
            <AvatarImage src={profileImage} alt={userData.username} />
            <AvatarFallback>{getInitials(userData.fullName)}</AvatarFallback>
          </Avatar>
        )}
        
        {userData.role === 'creator' && (
          <span className="absolute bottom-0 right-0 bg-amber-300 text-amber-900 text-xs font-medium rounded-full h-6 w-6 flex items-center justify-center border-2 border-white">1</span>
        )}
      </div>

      {/* User name */}
      <h2 className="text-2xl font-semibold mt-4">{userData.fullName}</h2>

      {/* Role badge */}
      {userData.role === 'creator' && (
        <Badge variant="secondary" className="mt-1 bg-amber-100 text-amber-800">Creator</Badge>
      )}

      {/* Last seen */}
      <div className="flex items-center text-gray-500 mt-4">
        <Clock className="h-4 w-4 mr-1" />
        <span className="text-sm">Last seen recently</span>
      </div>

      {/* Member since */}
      <div className="flex items-center text-gray-500 mt-2">
        <Calendar className="h-4 w-4 mr-1" />
        <span className="text-sm">Member since {memberSince}</span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-6">
        {isCurrentUser && (
          <Button variant="default" className="bg-blue-500 hover:bg-blue-600" onClick={handleEditProfile}>
            <Edit className="h-4 w-4 mr-1" /> Edit
          </Button>
        )}
        <Button variant="outline" onClick={handleCopyLink}>
          <Copy className="h-4 w-4 mr-1" />
        </Button>
      </div>
    </div>
  );
}
