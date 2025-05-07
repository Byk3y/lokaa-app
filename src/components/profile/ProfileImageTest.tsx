import { useState } from 'react';
import { useProfileImage } from '@/hooks/use-profile-image';
import ProfileImageUploader from './ProfileImageUploader';
import { Button } from '@/components/ui/button';
import { Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';

export default function ProfileImageTest() {
  const { imageUrl, isLoading, error, deleteImage, refreshImage } = useProfileImage();
  const [testState, setTestState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleImageUploaded = (url: string) => {
    setTestState('success');
    toast({
      title: 'Image uploaded',
      description: 'Profile picture has been updated successfully.',
    });
  };

  const handleDeleteImage = async () => {
    setTestState('loading');
    const success = await deleteImage();
    if (success) {
      setTestState('idle');
      toast({
        title: 'Image deleted',
        description: 'Profile picture has been removed.',
      });
    } else {
      setTestState('error');
      toast({
        title: 'Error',
        description: 'Failed to delete profile picture.',
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = async () => {
    setTestState('loading');
    await refreshImage();
    setTestState('idle');
  };

  // Get user initials from localStorage or session if available
  const getInitials = () => {
    // This is just a placeholder - in a real app, you would get this from user data
    return 'U';
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Profile Image Test</CardTitle>
      </CardHeader>
      
      <CardContent className="flex flex-col items-center space-y-4">
        {error && (
          <div className="text-red-500 text-sm mb-2">
            Error: {error}
          </div>
        )}
        
        <div className="flex items-center justify-center p-4">
          <ProfileImageUploader
            currentImageUrl={imageUrl}
            onImageUploaded={handleImageUploaded}
            size="lg"
            userInitials={getInitials()}
          />
        </div>
        
        <div className="text-center text-sm text-gray-500">
          {imageUrl ? (
            <p>Current image URL: <span className="text-xs break-all">{imageUrl}</span></p>
          ) : (
            <p>No profile image set</p>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-center space-x-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading || testState === 'loading'}
        >
          {testState === 'loading' ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1" />
          )}
          Refresh
        </Button>
        
        {imageUrl && (
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleDeleteImage}
            disabled={isLoading || testState === 'loading'}
          >
            {testState === 'loading' ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-1" />
            )}
            Delete
          </Button>
        )}
      </CardFooter>
    </Card>
  );
} 