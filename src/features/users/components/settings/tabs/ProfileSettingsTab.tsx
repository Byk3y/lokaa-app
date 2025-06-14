import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { SettingsTabProps } from '../../../types/settings';
import { useUserProfile } from '../../../hooks/useUserProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ProfileImageUploader from '@/components/profile/ProfileImageUploader';
import { toast } from '@/hooks/use-toast';

export default function ProfileSettingsTab({ user }: SettingsTabProps) {
  const {
    bio, setBio,
    myersBriggs, setMyersBriggs,
    country, setCountry,
    socialLinks, setSocialLinks,
    firstName, setFirstName,
    lastName, setLastName,
    hideFromSearch, setHideFromSearch,
    isEditingName,
    hasChangedName,
    isSavingName,
    isSavingProfile,
    handleNameChange,
    handleSaveProfile,
    countries
  } = useUserProfile(user);

  const [showSocial, setShowSocial] = React.useState(false);
  const [showMembership, setShowMembership] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  // Get user's initials
  const getUserInitials = () => {
    if (!user) return "A";
    
    if (user.user_metadata?.firstName && user.user_metadata?.lastName) {
      return `${user.user_metadata.firstName.charAt(0)}${user.user_metadata.lastName.charAt(0)}`;
    }
    
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    
    return "A";
  };

  return (
    <div className="max-w-[760px] mx-auto bg-white rounded-[20px] py-8 px-6 shadow-[0px_4px_16px_rgba(0,0,0,0.08)]">
      <h1 className="text-[24px] font-semibold text-[#111111] mb-6">Profile</h1>
      
      {/* Profile Image */}
      <div className="flex flex-col items-center mb-6">
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
          className="mb-2"
        />
        <p className="text-sm text-gray-500 mt-1">Click on image to upload new photo</p>
      </div>

      {/* Name Fields */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <Label htmlFor="firstName" className="text-[16px] font-bold text-[#181818] mb-2">First name</Label>
          <Input
            id="firstName"
            type="text"
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-[#00A389]"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={!isEditingName || hasChangedName}
          />
        </div>
        <div>
          <Label htmlFor="lastName" className="text-[16px] font-bold text-[#181818] mb-2">Last name</Label>
          <Input
            id="lastName"
            type="text"
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-[#00A389]"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={!isEditingName || hasChangedName}
          />
        </div>
      </div>

      {/* Name Change Button */}
      <div className="mb-6">
        <Button
          onClick={handleNameChange}
          disabled={isSavingName}
          className={`px-6 py-2 rounded-lg font-bold text-[15px] transition-colors ${
            hasChangedName 
              ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
              : "bg-[#00A389] text-white hover:bg-[#00A389]/90"
          }`}
        >
          {isSavingName ? "SAVING..." : isEditingName ? "SAVE NAME" : "EDIT NAME"}
        </Button>
        {hasChangedName && (
          <p className="text-sm text-gray-500 mt-2">You can only change your name once.</p>
        )}
      </div>

      {/* Bio */}
      <div className="mb-6">
        <Label htmlFor="bio" className="text-[16px] font-bold text-[#181818] mb-2">Bio</Label>
        <textarea
          id="bio"
          className="w-full border border-gray-200 rounded-lg px-4 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-[#00A389] resize-none"
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell us about yourself..."
        />
      </div>

      {/* Country */}
      <div className="mb-6">
        <Label htmlFor="country" className="text-[16px] font-bold text-[#181818] mb-2">Country</Label>
        <select
          id="country"
          className="w-full border border-gray-200 rounded-lg px-4 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-[#00A389] bg-white"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        >
          <option value="">Select a country</option>
          {countries.map((countryName) => (
            <option key={countryName} value={countryName}>
              {countryName}
            </option>
          ))}
        </select>
      </div>

      {/* Social Links Section */}
      <div className="mb-6">
        <button
          className="flex items-center justify-between w-full py-3 px-0 text-left"
          onClick={() => setShowSocial(!showSocial)}
        >
          <span className="text-[16px] font-bold text-[#181818]">Social links</span>
          {showSocial ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        
        {showSocial && (
          <div className="mt-4 space-y-4">
            {Object.entries(socialLinks).map(([platform, url]) => (
              <div key={platform}>
                <Label htmlFor={platform} className="text-[14px] font-medium text-gray-700 mb-1 capitalize">
                  {platform === 'x' ? 'X (Twitter)' : platform}
                </Label>
                <Input
                  id={platform}
                  type="url"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-[#00A389]"
                  value={url}
                  onChange={(e) => setSocialLinks({...socialLinks, [platform]: e.target.value})}
                  placeholder={`Your ${platform === 'x' ? 'X' : platform} URL`}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Membership Type Section */}
      <div className="mb-6">
        <button
          className="flex items-center justify-between w-full py-3 px-0 text-left"
          onClick={() => setShowMembership(!showMembership)}
        >
          <span className="text-[16px] font-bold text-[#181818]">Membership type</span>
          {showMembership ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        
        {showMembership && (
          <div className="mt-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="text-[16px] font-medium text-gray-700">Current plan: Free</div>
              <div className="text-[14px] text-gray-500 mt-1">Basic features included</div>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Section */}
      <div className="mb-6">
        <button
          className="flex items-center justify-between w-full py-3 px-0 text-left"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <span className="text-[16px] font-bold text-[#181818]">Advanced</span>
          {showAdvanced ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        
        {showAdvanced && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[16px] font-medium text-gray-700">Hide from search</div>
                <div className="text-[14px] text-gray-500">Don't show your profile in search results</div>
              </div>
              <button 
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  hideFromSearch ? 'bg-[#00A389]' : 'bg-gray-200'
                }`}
                onClick={() => setHideFromSearch(!hideFromSearch)}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  hideFromSearch ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="pt-4">
        <Button
          onClick={handleSaveProfile}
          disabled={isSavingProfile}
          className="bg-[#00A389] text-white px-8 py-3 rounded-lg font-bold text-[15px] hover:bg-[#00A389]/90"
        >
          {isSavingProfile ? "SAVING..." : "SAVE PROFILE"}
        </Button>
      </div>
    </div>
  );
} 