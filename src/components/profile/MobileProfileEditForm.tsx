import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProfileImageUploader from './ProfileImageUploader';
import { useUserProfile } from '@/features/users/hooks/useUserProfile';
import { toast } from '@/hooks/use-toast';

interface MobileProfileEditFormProps {
  user: any;
  onClose: () => void;
}

export default function MobileProfileEditForm({ user, onClose }: MobileProfileEditFormProps) {
  const {
    bio, setBio,
    firstName, setFirstName,
    lastName, setLastName,
    profileUrl, setProfileUrl,
    isEditingName,
    hasChangedName,
    isSavingName,
    isSavingProfile,
    handleNameChange,
    handleSaveProfile,
  } = useUserProfile(user);
  const [bioCharCount, setBioCharCount] = useState(0);
  const maxBioLength = 150;

  // Update character count when bio changes
  useEffect(() => {
    setBioCharCount(bio.length);
  }, [bio]);

  // Get user initials for profile image
  const getUserInitials = () => {
    if (!user) return "U";
    
    if (user.user_metadata?.firstName && user.user_metadata?.lastName) {
      return `${user.user_metadata.firstName.charAt(0)}${user.user_metadata.lastName.charAt(0)}`;
    }
    
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    
    return "U";
  };

  // Handle bio change with character limit
  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newBio = e.target.value;
    if (newBio.length <= maxBioLength) {
      setBio(newBio);
    }
  };

  // Handle save and close
  const handleSaveAndClose = async () => {
    try {
      await handleSaveProfile();
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="px-4 py-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile</h2>
      
      {/* Profile Image Section */}
      <div className="text-center mb-8">
        <ProfileImageUploader
          currentImageUrl={user?.user_metadata?.avatar_url || null}
          onImageUploaded={(url) => {
            toast({
              title: "Profile photo updated",
              description: "Your profile photo has been updated successfully",
            });
          }}
          size="lg"
          userInitials={getUserInitials()}
          className="mx-auto mb-3"
        />
        <button className="text-blue-600 font-medium text-base">
          Change profile photo
        </button>
      </div>

      {/* Name Fields */}
      <div className="space-y-4 mb-6">
        <div>
          <Label htmlFor="firstName" className="text-base font-medium text-gray-700 mb-2 block">
            First Name
          </Label>
          <Input
            id="firstName"
            type="text"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={!isEditingName || hasChangedName}
            placeholder="Francis"
          />
        </div>
        
        <div>
          <Label htmlFor="lastName" className="text-base font-medium text-gray-700 mb-2 block">
            Last Name
          </Label>
          <Input
            id="lastName"
            type="text"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={!isEditingName || hasChangedName}
            placeholder="Chukwuma"
          />
        </div>
      </div>

      {/* Name Change Info */}
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-3">
          You can only change your name once, and you must use your real name.{' '}
          <button className="text-blue-600 font-medium">Change name.</button>
        </p>
      </div>

      {/* URL Field */}
      <div className="mb-6">
        <Label htmlFor="profileUrl" className="text-base font-medium text-gray-700 mb-2 block">
          URL
        </Label>
        <Input
          id="profileUrl"
          type="text"
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
          value={profileUrl ? `lokaa.app/@${profileUrl}` : 'lokaa.app/@username-not-set'}
          disabled
          readOnly
        />
        <p className="text-sm text-gray-600 mt-2">
          You can change your URL once you've got 90 contributions, 30 followers, and been using it for 90 days.
        </p>
      </div>

      {/* Bio Field */}
      <div className="mb-8">
        <Label htmlFor="bio" className="text-base font-medium text-gray-700 mb-2 block">
          Bio
        </Label>
        <div className="relative">
          <textarea
            id="bio"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={4}
            value={bio}
            onChange={handleBioChange}
            placeholder="Here to learn"
            maxLength={maxBioLength}
          />
          <div className="absolute bottom-3 right-3 text-sm text-gray-500">
            {bioCharCount} / {maxBioLength}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-4 border-t">
        <Button
          onClick={handleSaveAndClose}
          disabled={isSavingProfile}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold text-base hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {isSavingProfile ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}