import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Edit, Clock, Calendar, MapPin, Link as LinkIcon, Twitter, Linkedin, Github } from "lucide-react";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import ProfileImageUploader from "./ProfileImageUploader";
import { Database } from "@/types/supabase";

interface ProfileHeaderProps {
  profileData: Database['public']['Tables']['users']['Row'];
  isCurrentUser: boolean;
}

// Helper to get social icon
const getSocialIcon = (platform: string) => {
  const lcPlatform = platform.toLowerCase();
  if (lcPlatform.includes('twitter')) return <Twitter className="h-5 w-5" />;
  if (lcPlatform.includes('linkedin')) return <Linkedin className="h-5 w-5" />;
  if (lcPlatform.includes('github')) return <Github className="h-5 w-5" />;
  return <LinkIcon className="h-5 w-5" />;
};

export default function ProfileHeader({ profileData, isCurrentUser }: ProfileHeaderProps) {
  const navigate = useNavigate();
  const [profileImage, setProfileImage] = useState<string | null>(profileData.avatar_url || null);
  
  // Extract data with fallbacks for potentially missing fields
  const userData = {
    username: profileData.profile_url || profileData.full_name || 'User',
    fullName: profileData.full_name || `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || profileData.profile_url || 'User',
    avatarUrl: profileData.avatar_url,
    role: profileData.role || 'member',
    createdAt: profileData.created_at || new Date().toISOString(),
    socialLinks: profileData.social_links,
    location: profileData.location || profileData.country,
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
      <div className="relative mb-4">
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
      </div>

      {/* User name */}
      <h2 className="text-2xl font-semibold">{userData.fullName}</h2>
      {userData.username && <p className="text-sm text-gray-500">@{userData.username}</p>}

      {/* Role badge */}
      {userData.role === 'creator' && (
        <Badge variant="secondary" className="mt-2 bg-amber-100 text-amber-800">Creator</Badge>
      )}

      {/* Location */}
      {userData.location && (
        <div className="flex items-center text-gray-500 mt-3 text-sm">
          <MapPin className="h-4 w-4 mr-1.5" />
          <span>{userData.location}</span>
        </div>
      )}

      {/* Member since */}
      <div className="flex items-center text-gray-500 mt-2">
        <Calendar className="h-4 w-4 mr-1.5" />
        <span className="text-sm">Member since {memberSince}</span>
      </div>

      {/* Social Links - increased margin top for spacing */}
      {userData.socialLinks && Object.keys(userData.socialLinks).length > 0 && (
        <div className="flex gap-3 mt-4">
          {Object.entries(userData.socialLinks).map(([platform, link]) => {
            // Basic validation for link
            if (typeof link === 'string' && link.trim() !== '') {
              return (
                <a 
                  key={platform} 
                  href={link.startsWith('http') ? link : `https://${link}`} // Ensure link has protocol
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label={`Visit ${userData.fullName}\'s ${platform} profile`}
                  className="text-gray-500 hover:text-primary transition-colors"
                >
                  {getSocialIcon(platform)}
                </a>
              );
            }
            return null;
          })}
        </div>
      )}

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
