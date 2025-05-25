import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Calendar, 
  Pencil, 
  Link as LinkIcon, 
  Twitter, 
  Facebook, 
  Linkedin, 
  Instagram, 
  Globe, 
  Github
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import ProfileImageUploader from './ProfileImageUploader';
import FollowButton from './FollowButton';
import FollowStats from './FollowStats';

interface ProfileHeaderProps {
  profileData: any;
  isCurrentUser: boolean;
}

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

  // Check if we need to render social links
  const hasSocialLinks = userData.socialLinks && Object.values(userData.socialLinks).some(link => !!link);
  
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
      {userData.username && <p className="text-sm text-gray-500 mb-1">@{userData.username}</p>}

      {/* Follow Stats */}
      {profileData.id && (
        <div className="mt-2 mb-3">
          <FollowStats 
            userId={profileData.id} 
            showLabels={true}
            size="md"
          />
        </div>
      )}

      {/* Role badge */}
      {userData.role === 'creator' && (
        <Badge variant="secondary" className="mt-2 bg-amber-100 text-amber-800">Creator</Badge>
      )}

      {/* Follow Button / Edit Profile */}
      <div className="mt-4 mb-2">
        {isCurrentUser ? (
          <Button 
            variant="outline" 
            className="border-gray-300" 
            onClick={handleEditProfile}
          >
            <Pencil className="h-4 w-4 mr-1.5" /> Edit Profile
          </Button>
        ) : (
          <FollowButton 
            userId={profileData.id} 
            size="md" 
            variant="default"
          />
        )}
      </div>

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

      {/* Social Links */}
      {hasSocialLinks && (
        <div className="flex items-center justify-center gap-3 mt-4">
          {userData.socialLinks?.twitter && (
            <Link to={ensureHttpPrefix(userData.socialLinks.twitter)} target="_blank" className="text-gray-500 hover:text-blue-400 transition-colors">
              <Twitter className="h-5 w-5" />
            </Link>
          )}
          {userData.socialLinks?.facebook && (
            <Link to={ensureHttpPrefix(userData.socialLinks.facebook)} target="_blank" className="text-gray-500 hover:text-blue-600 transition-colors">
              <Facebook className="h-5 w-5" />
            </Link>
          )}
          {userData.socialLinks?.linkedin && (
            <Link to={ensureHttpPrefix(userData.socialLinks.linkedin)} target="_blank" className="text-gray-500 hover:text-blue-700 transition-colors">
              <Linkedin className="h-5 w-5" />
            </Link>
          )}
          {userData.socialLinks?.instagram && (
            <Link to={ensureHttpPrefix(userData.socialLinks.instagram)} target="_blank" className="text-gray-500 hover:text-pink-600 transition-colors">
              <Instagram className="h-5 w-5" />
            </Link>
          )}
          {userData.socialLinks?.github && (
            <Link to={ensureHttpPrefix(userData.socialLinks.github)} target="_blank" className="text-gray-500 hover:text-gray-800 transition-colors">
              <Github className="h-5 w-5" />
            </Link>
          )}
          {userData.socialLinks?.website && (
            <Link to={ensureHttpPrefix(userData.socialLinks.website)} target="_blank" className="text-gray-500 hover:text-teal-600 transition-colors">
              <Globe className="h-5 w-5" />
            </Link>
          )}
        </div>
      )}
      
      {/* Copy Profile Link */}
      <Button 
        variant="ghost" 
        className="text-gray-500 text-sm mt-3" 
        onClick={handleCopyLink}
      >
        <LinkIcon className="h-4 w-4 mr-1.5" />
        Copy profile link
      </Button>
    </div>
  );
}

// Helper function to ensure URLs have http/https prefix
function ensureHttpPrefix(url: string): string {
  if (!url) return '';
  return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
}
