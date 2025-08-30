import React, { useState, useEffect, useRef } from 'react';
import { log } from '@/utils/logger';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/features/users/hooks/useUserProfile';
import ProfileImageUploader from '@/components/profile/ProfileImageUploader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, Loader2, User, Camera } from 'lucide-react';
import PhotoSelectionModal, { PhotoSelectionModalRef } from './PhotoSelectionModal';

export default function CompleteProfileModal() {
  const { user } = useOptimizedAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'form' | 'loading' | 'success'>('form');
  const [isImageUploading, setIsImageUploading] = useState(false);
  const photoSelectionRef = useRef<PhotoSelectionModalRef>(null);
  
  // Form state
  const [bio, setBio] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  
  // Character limit for bio
  const BIO_MAX_LENGTH = 150;
  const bioCharCount = bio.length;
  const isBioValid = bio.trim().length > 0;
  
  // Check if form is complete - only bio is required since names are pre-filled
  const isFormComplete = isBioValid;

  // Initialize form with existing user data
  useEffect(() => {
    if (user) {
      setFirstName(user.user_metadata?.firstName || user.user_metadata?.first_name || '');
      setLastName(user.user_metadata?.lastName || user.user_metadata?.last_name || '');
      setProfileImageUrl(user.user_metadata?.avatar_url || null);
      
      // Load existing bio from database if available
      loadExistingBio();
    }
  }, [user]);

  const loadExistingBio = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await getSupabaseClient()
        .from('users')
        .select('bio')
        .eq('id', user.id)
        .single();
        
      if (!error && data?.bio) {
        setBio(data.bio);
      }
    } catch (error) {
      log.error('Component', 'Error loading existing bio:', error);
    }
  };

  const handleImageUploaded = (url: string) => {
    setProfileImageUrl(url);
  };

  const handlePhotoSelected = async (file: File) => {
    try {
      setIsImageUploading(true);
      
      // Create a preview URL for the selected image
      const previewUrl = URL.createObjectURL(file);
      setProfileImageUrl(previewUrl);
      
      // Upload the image using the existing ProfileImageUploader logic
      const { uploadProfileImage } = await import('@/utils/profileImageUtils');
      const uploadedUrl = await uploadProfileImage(file);
      
      if (uploadedUrl) {
        setProfileImageUrl(uploadedUrl);
        toast({
          title: "Photo uploaded",
          description: "Your profile photo has been uploaded successfully.",
        });
      } else {
        toast({
          title: "Upload failed",
          description: "Failed to upload photo. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      log.error('Component', 'Error uploading photo:', error);
      toast({
        title: "Error",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImageUploading(false);
    }
  };

  const handleAvatarClick = () => {
    // Trigger native photo options (Photo Library, Camera, Choose File)
    photoSelectionRef.current?.openPhotoOptions();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormComplete || !user) return;
    
    setIsLoading(true);
    setStatus('loading');

    try {
      // Update user metadata
      const { error: metadataError } = await getSupabaseClient().auth.updateUser({
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          avatar_url: profileImageUrl,
        }
      });

      if (metadataError) {
        throw metadataError;
      }

      // Update users table
      const { error: dbError } = await getSupabaseClient()
        .from('users')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          bio: bio.trim(),
          avatar_url: profileImageUrl,
        })
        .eq('id', user.id);

      if (dbError) {
        throw dbError;
      }

      setStatus('success');
      toast({
        title: "Profile completed!",
        description: "Your profile has been updated successfully.",
      });

      // Refresh the page to trigger global profile completion re-check
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      log.error('Component', 'Error completing profile:', error);
      setStatus('form');
      toast({
        title: "Error",
        description: "Failed to complete profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

          // Loading state
        if (status === 'loading') {
          return (
            <div className="h-screen bg-white flex flex-col p-0 sm:p-4 sm:min-h-screen">
              <div className="flex-1 flex flex-col justify-start pt-4 sm:justify-center sm:bg-white sm:rounded-lg sm:border sm:border-gray-200 sm:p-6 sm:max-w-md sm:w-full sm:mx-auto px-4">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-4" />
            <p className="text-gray-600">Completing your profile...</p>
          </div>
        </div>
      </div>
    );
  }

          // Success state
        if (status === 'success') {
          return (
            <div className="h-screen bg-white flex flex-col p-0 sm:p-4 sm:min-h-screen">
              <div className="flex-1 flex flex-col justify-start pt-4 sm:justify-center sm:bg-white sm:rounded-lg sm:border sm:border-gray-200 sm:p-6 sm:max-w-md sm:w-full sm:mx-auto px-4">
          <div className="text-center">
            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-4" />
            <p className="text-gray-600">Profile completed! Redirecting...</p>
          </div>
        </div>
      </div>
    );
  }

    // Main form
  return (
    <div className="h-screen bg-white flex flex-col p-0 sm:p-4 sm:min-h-screen">
      <div className="flex-1 flex flex-col justify-start pt-8 sm:justify-center sm:bg-white sm:rounded-lg sm:border sm:border-gray-200 sm:p-6 sm:max-w-md sm:w-full sm:mx-auto px-4">
        <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
          Complete your profile
        </h2>
        
        <p className="text-gray-600 text-center mb-6 text-sm">
          Spaces feel more personal with faces and stories.<br />
          Your profile helps others connect and engage with you.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center">
            <div 
              onClick={!isImageUploading ? handleAvatarClick : undefined}
              className={isImageUploading ? "cursor-not-allowed" : "cursor-pointer"}
            >
              {isImageUploading ? (
                <div className="h-28 w-28 rounded-full bg-gray-200 flex items-center justify-center mb-2 relative">
                  <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-teal-600 text-white text-xs px-2 py-1 rounded-full">
                    Uploading...
                  </div>
                </div>
              ) : profileImageUrl ? (
                <ProfileImageUploader
                  currentImageUrl={profileImageUrl}
                  onImageUploaded={handleImageUploaded}
                  size="lg"
                  userInitials={`${firstName.charAt(0)}${lastName.charAt(0)}`}
                  className="mb-2"
                />
              ) : (
                <div className="h-28 w-28 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors mb-2 relative">
                  <User className="h-12 w-12 text-gray-400" />
                  <Camera className="h-4 w-4 text-gray-400 absolute bottom-2 left-1/2 transform -translate-x-1/2" />
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 text-center">
              {isImageUploading ? 'Uploading photo...' : 'Upload a photo'}
            </p>
          </div>



        {/* Bio Field */}
        <div>
          <Label htmlFor="bio" className="text-sm font-medium text-gray-700">
            Bio
          </Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX_LENGTH))}
            placeholder="Add your bio..."
            className="mt-1 resize-none"
            rows={3}
            maxLength={BIO_MAX_LENGTH}
            required
            style={{ 
              fontSize: '16px' // Prevents zoom on iOS
            }}
            onFocus={(e) => {
              // Ensure proper focus on mobile
              (e.target as HTMLTextAreaElement).focus();
            }}
            onClick={(e) => {
              // Ensure focus on click for mobile
              (e.target as HTMLTextAreaElement).focus();
            }}
          />
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-500">
              {isBioValid ? '✓ Bio added' : 'Bio is required'}
            </span>
            <span className="text-xs text-gray-500">
              {bioCharCount}/{BIO_MAX_LENGTH}
            </span>
          </div>
        </div>

        {/* Complete Button */}
        <Button
          type="submit"
          disabled={!isFormComplete || isLoading}
          className={`w-full py-3 rounded-lg font-medium transition-colors ${
            isFormComplete
              ? 'bg-teal-600 hover:bg-teal-700 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Completing...
            </>
          ) : (
            'COMPLETE'
          )}
        </Button>
      </form>

      {/* Photo Selection Modal */}
      <PhotoSelectionModal
        ref={photoSelectionRef}
        onPhotoSelected={handlePhotoSelected}
      />
    </div>
  </div>
  );
}
