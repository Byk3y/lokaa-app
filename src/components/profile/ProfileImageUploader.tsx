import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Check, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useProfileImage } from '@/contexts/ProfileImageContext';

// This type defines the expected return from Cropper
interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Props for the component
interface ProfileImageUploaderProps {
  currentImageUrl?: string | null;
  onImageUploaded?: (url: string) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  userInitials?: string;
}

export default function ProfileImageUploader({
  currentImageUrl,
  onImageUploaded,
  size = 'md',
  className = '',
  userInitials = 'U',
}: ProfileImageUploaderProps) {
  // State for the file input and image handling
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { refreshProfileImage } = useProfileImage();
  
  // State for the cropper
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [isEditingExistingImage, setIsEditingExistingImage] = useState(false);

  // Update the preview URL when currentImageUrl changes
  useEffect(() => {
    if (currentImageUrl) {
      setPreviewUrl(currentImageUrl);
    }
  }, [currentImageUrl]);

  // Size mapping for avatar
  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-20 w-20',
    lg: 'h-28 w-28',
  };

  // Handler for clicking the avatar or upload button
  const handleUploadClick = () => {
    // If there's an existing image, open it in the cropper instead of selecting a file
    if (previewUrl) {
      handleEditExistingImage();
    } else {
      fileInputRef.current?.click();
    }
  };

  // Trigger file selection directly
  const handleNewUpload = () => {
    fileInputRef.current?.click();
  };

  // New handler to edit existing image
  const handleEditExistingImage = async () => {
    if (!previewUrl) return;
    
    setIsEditingExistingImage(true);
    setCropImage(previewUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setShowCropDialog(true);
  };

  // Handler for when a file is selected
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Image must be less than 2MB',
        variant: 'destructive',
      });
      return;
    }

    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPEG, PNG, GIF, or WEBP image',
        variant: 'destructive',
      });
      return;
    }

    // Create a URL for the image preview and show the crop dialog
    const objectUrl = URL.createObjectURL(file);
    setIsEditingExistingImage(false);
    setCropImage(objectUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setShowCropDialog(true);

    // Reset the file input so the same file can be selected again
    e.target.value = '';
  };

  // Handler for when the crop is complete
  const handleCropComplete = (_croppedArea: CropArea, croppedAreaPixels: CropArea) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  // Create a cropped image from the selected area
  const getCroppedImage = async (
    imageSrc: string,
    pixelCrop: CropArea
  ): Promise<Blob> => {
    const image = new Image();
    image.src = imageSrc;
    
    return new Promise((resolve) => {
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('No 2d context');
        }

        // Set the canvas dimensions to the cropped size
        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        // Draw the cropped image
        ctx.drawImage(
          image,
          pixelCrop.x,
          pixelCrop.y,
          pixelCrop.width,
          pixelCrop.height,
          0,
          0,
          pixelCrop.width,
          pixelCrop.height
        );

        // Convert the canvas to a blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            throw new Error('Canvas to Blob conversion failed');
          }
        }, 'image/jpeg', 0.95);
      };
    });
  };

  // Handler for applying the crop
  const handleApplyCrop = async () => {
    if (!cropImage || !croppedAreaPixels) return;
    
    try {
      setIsUploading(true);
      
      // Get the cropped image as a blob
      const croppedImageBlob = await getCroppedImage(cropImage, croppedAreaPixels);
      
      // Create a preview and show it immediately
      const previewUrl = URL.createObjectURL(croppedImageBlob);
      setPreviewUrl(previewUrl);
      
      // Close the crop dialog
      setShowCropDialog(false);
      
      // Upload the image to Supabase
      await uploadImage(croppedImageBlob);
      
      // Clean up the temporary object URL
      if (!isEditingExistingImage) {
        URL.revokeObjectURL(cropImage);
      }
      URL.revokeObjectURL(previewUrl);
      
      // Reset the editing state
      setIsEditingExistingImage(false);
    } catch (error) {
      console.error('Error applying crop:', error);
      toast({
        title: 'Error',
        description: 'Failed to process the image',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setCropImage(null);
    }
  };

  // Handler for canceling the crop
  const handleCancelCrop = () => {
    setShowCropDialog(false);
    // Only revoke object URL if it's a new image upload, not when editing existing image
    if (cropImage && !isEditingExistingImage) {
      URL.revokeObjectURL(cropImage);
    }
    setCropImage(null);
    setIsEditingExistingImage(false);
  };

  // Upload the image to Supabase
  const uploadImage = async (blob: Blob) => {
    try {
      // Get the current user
      const { data: { user } } = await getSupabaseClient().auth.getUser();
      if (!user) {
        toast({
          title: 'Authentication required',
          description: 'You must be logged in to upload an image',
          variant: 'destructive',
        });
        return;
      }
      
      // Create a unique file path
      const fileName = `${Date.now()}.jpg`;
      const filePath = `profiles/${user.id}/${fileName}`;
      
      // Upload the file to Supabase Storage
      const { error: uploadError } = await getSupabaseClient().storage
        .from('avatars')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg',
        });
      
      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        toast({
          title: 'Upload failed',
          description: uploadError.message,
          variant: 'destructive',
        });
        return;
      }
      
      // Get the public URL of the uploaded image
      const { data: { publicUrl } } = getSupabaseClient().storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      if (!publicUrl) {
        toast({
          title: 'Error',
          description: 'Could not get public URL for the image',
          variant: 'destructive',
        });
        return;
      }
      
      // Update user metadata
      const { error: metadataError } = await getSupabaseClient().auth.updateUser({
        data: { 
          avatar_url: publicUrl,
          avatar_path: filePath,
          avatar_updated_at: new Date().toISOString(),
         },
      });
      
      if (metadataError) {
        console.error('Error updating user metadata:', metadataError);
        toast({
          title: 'Metadata update failed',
          description: metadataError.message,
          variant: 'destructive',
        });
        // Optionally, consider deleting the uploaded image if metadata update fails
        return;
      }
      
      // Update the public.users table
      const { error: dbUpdateError } = await getSupabaseClient()
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      
      if (dbUpdateError) {
        console.error('Error updating public.users table:', dbUpdateError);
        toast({
          title: 'Profile update failed',
          description: 'Could not update your public profile with the new avatar.',
          variant: 'destructive',
        });
        // Potentially an issue, but the auth metadata is updated, and storage has the file.
        // The user might see an old avatar in some places if this fails.
      }
      
      // Update the UI with the new image URL
      setPreviewUrl(publicUrl);
      if (onImageUploaded) {
        onImageUploaded(publicUrl);
      }
      refreshProfileImage(); // from ProfileImageContext to trigger global refresh
      
      toast({
        title: 'Success',
        description: 'Profile image updated!',
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Avatar display */}
      <Avatar 
        className={`${sizeClasses[size]} bg-blue-600 text-white font-semibold relative group cursor-pointer transition-transform hover:scale-105`}
        onClick={handleNewUpload}
      >
        <AvatarImage src={previewUrl || undefined} alt="Profile" />
        <AvatarFallback>{userInitials}</AvatarFallback>
        
        {/* Improved overlay for hover effect with edit hint */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex flex-col items-center justify-center transition-all duration-200 rounded-full opacity-0 group-hover:opacity-100">
          {previewUrl ? (
            <>
              <div className="text-white text-[10px] mb-1 font-medium">Upload new</div>
              <Camera className="text-white h-4 w-4" />
            </>
          ) : (
            <>
              <div className="text-white text-[10px] mb-1 font-medium">Upload</div>
              <Camera className="text-white h-4 w-4" />
            </>
          )}
        </div>
      </Avatar>
      
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/jpeg, image/png, image/gif, image/webp"
        onChange={handleFileChange}
      />
      
      {/* Crop dialog */}
      <Dialog 
        open={showCropDialog} 
        onOpenChange={(open) => !open && handleCancelCrop()}
      >
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none max-h-[90vh] dialog-content">
          <div className="p-4 pb-2">
            <DialogTitle className="text-center text-xl font-semibold">
              {isEditingExistingImage ? 'Crop profile photo' : 'Crop profile photo'}
            </DialogTitle>
          </div>
          
          <div className="relative h-[280px] w-full bg-black">
            {cropImage && (
              <Cropper
                image={cropImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
                objectFit="contain"
                cropShape="round"
                showGrid={true}
                classes={{
                  containerClassName: 'cropper-container',
                  cropAreaClassName: 'cropper-area'
                }}
                style={{
                  containerStyle: {
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'black'
                  },
                  cropAreaStyle: {
                    color: '#ffffff',
                    borderRadius: '50%'
                  },
                  mediaStyle: {
                    cursor: 'move'
                  }
                }}
              />
            )}
            
            <div 
              className="absolute left-0 right-0 mx-auto text-center top-1/2 mt-16 bg-[#00A389] text-white py-1 px-4 rounded-full text-sm w-fit"
              style={{ pointerEvents: 'none' }}
            >
              Drag to reposition photo
            </div>
          </div>
          
          {/* Zoom slider */}
          <div className="px-6 py-3 bg-black">
            <div className="flex items-center text-white mb-1">
              <span className="text-lg">Zoom</span>
            </div>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-[#00A389]"
            />
          </div>
          
          {/* Action buttons */}
          <div className="p-3 bg-white flex flex-col">
            <Button 
              onClick={handleApplyCrop} 
              disabled={isUploading} 
              className="w-full py-4 text-base font-semibold rounded-md border-none save-btn"
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : 'SAVE'}
            </Button>
            
            <div className="text-center mt-3">
              <span className="text-gray-800 mr-2">Or,</span>
              <button 
                type="button" 
                className="text-[#00A389] font-medium"
                onClick={() => {
                  handleCancelCrop();
                  // Wait briefly before triggering the file input
                  setTimeout(() => fileInputRef.current?.click(), 300);
                }}
              >
                upload a different photo
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 