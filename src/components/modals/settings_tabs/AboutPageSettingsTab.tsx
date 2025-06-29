import React, { useState, useEffect } from 'react';
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X, Play, AlertCircle } from 'lucide-react';
import { MediaItem, getSpaceMediaItems, saveSpaceMediaItems, extractVideoId, getVideoThumbnail } from '@/utils/mediaStorageUtils';
import { v4 as uuidv4 } from 'uuid';
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import MediaGallery from "@/components/space/MediaGallery";
import { useSettingsValidation } from '@/hooks/useSettingsValidation';

// We might need a more sophisticated rich text editor later.
// For now, a simple textarea will be used for the about_description.

export default function AboutPageSettingsTab() {
  const { space, formData, setFormDataField, permissions, loadingSpace } = useSpaceSettingsStore();
  const { user } = useOptimizedAuth();

  // Add validation hook
  const {
    validateData,
    validateField,
    validateFile,
    errors,
    isValid,
    isValidating
  } = useSettingsValidation('about', { validateOnChange: true, validateFiles: true });

  // Local state for managing edits specifically within this tab
  const [currentAboutDescription, setCurrentAboutDescription] = useState<string>("");
  const [currentShortDescription, setCurrentShortDescription] = useState<string>("");
  const [currentIconImageUrl, setCurrentIconImageUrl] = useState<string>(""); // Placeholder for actual URL
  const [currentCoverPhotoUrl, setCurrentCoverPhotoUrl] = useState<string>(""); // Placeholder
  const [currentIntroMediaType, setCurrentIntroMediaType] = useState<'image' | 'video' | 'none' | null>('none');
  const [currentIntroMediaUrl, setCurrentIntroMediaUrl] = useState<string>("");

  // Owner info state
  const [ownerData, setOwnerData] = useState<{ id: string; full_name: string | null; avatar_url: string | null } | null>(null);
  const [loadingOwner, setLoadingOwner] = useState(false);

  // Media gallery state
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaLink, setMediaLink] = useState("");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<number | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (formData) {
      setCurrentAboutDescription(formData.about_description || "");
      setCurrentShortDescription(formData.description || ""); // Assuming 'description' is short_description
      setCurrentIconImageUrl(formData.icon_image || "");
      setCurrentCoverPhotoUrl(formData.cover_image || "");
      setCurrentIntroMediaType(formData.intro_media_type || 'none');
      setCurrentIntroMediaUrl(formData.intro_media_url || "");
      
      // Load owner data if owner_id is available
      if (formData.owner_id) {
        fetchOwnerData(formData.owner_id);
      }

      // Validate initial data
      validateData({
        about_description: formData.about_description,
        short_description: formData.description,
        intro_media_type: formData.intro_media_type,
        intro_media_url: formData.intro_media_url,
        icon_image: formData.icon_image,
        cover_image: formData.cover_image
      });
    } else {
      setCurrentAboutDescription("");
      setCurrentShortDescription("");
      setCurrentIconImageUrl("");
      setCurrentCoverPhotoUrl("");
      setCurrentIntroMediaType('none');
      setCurrentIntroMediaUrl("");
    }
    setIsDirty(false);
  }, [formData, validateData]);

  // Fetch owner data
  const fetchOwnerData = async (ownerId: string) => {
    setLoadingOwner(true);
    try {
      const { data, error } = await getSupabaseClient()
        .from('users')
        .select('id, full_name, avatar_url')
        .eq('id', ownerId)
        .single();
        
      if (error) throw error;
      
      setOwnerData(data as {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
      });
    } catch (err) {
      console.error('Error fetching owner data:', err);
      setOwnerData(null);
    } finally {
      setLoadingOwner(false);
    }
  };

  // Load media items when space id changes
  useEffect(() => {
    if (space?.id) {
      const items = getSpaceMediaItems(space.id);
      setMediaItems(items);
      
      // Set the first item as active if available
      if (items.length > 0 && activeMediaIndex === null) {
        setActiveMediaIndex(0);
      }
    }
  }, [space?.id]);

  // Save media items when they change
  useEffect(() => {
    if (space?.id && mediaItems.length > 0) {
      saveSpaceMediaItems(space.id, mediaItems);
    }
  }, [mediaItems, space?.id]);

  const handleInputChange = (field: string, value: string | File | null) => {
    // Basic dirty check, more complex logic needed for file objects vs URLs
    let changed = false;
    switch (field) {
      case 'about_description':
        setCurrentAboutDescription(value as string);
        changed = (value as string) !== (formData?.about_description || "");
        validateField('about_description', value as string, formData);
        break;
      case 'short_description':
        setCurrentShortDescription(value as string);
        changed = (value as string) !== (formData?.description || "");
        validateField('short_description', value as string, formData);
        break;
      case 'icon_image':
        if (value instanceof File) {
          validateFile(value, 'icon');
        }
        setCurrentIconImageUrl(typeof value === 'string' ? value : (value as File)?.name || "");
        changed = true;
        break;
      case 'cover_image':
        if (value instanceof File) {
          validateFile(value, 'cover');
        }
        setCurrentCoverPhotoUrl(typeof value === 'string' ? value : (value as File)?.name || "");
        changed = true;
        break;
      case 'intro_media_type':
        const mediaType = value as 'image' | 'video' | 'none';
        setCurrentIntroMediaType(mediaType);
        changed = mediaType !== (formData?.intro_media_type || 'none');
        validateField('intro_media_type', mediaType, formData);
        if (mediaType === 'none' || mediaType !== currentIntroMediaType) {
            setCurrentIntroMediaUrl("");
            if (formData?.intro_media_url) changed = true;
        }
        break;
      case 'intro_media_url':
        if (value instanceof File) {
          validateFile(value, currentIntroMediaType === 'video' ? 'video' : 'image');
        }
        setCurrentIntroMediaUrl(typeof value === 'string' ? value : (value as File)?.name || "");
        validateField('intro_media_url', value, formData);
        changed = true;
        break;
    }
    if (changed || isDirty) {
      setIsDirty(true);
    }
  };

  const handleSaveChangesToStore = () => {
    if (isDirty) {
      const updatedData = {
        about_description: currentAboutDescription,
        description: currentShortDescription,
        icon_image: currentIconImageUrl,
        cover_image: currentCoverPhotoUrl,
        intro_media_type: currentIntroMediaType,
        intro_media_url: currentIntroMediaType === 'none' ? null : currentIntroMediaUrl
      };

      // Validate before saving
      validateData(updatedData).then(isValid => {
        if (isValid) {
          setFormDataField('about_description', currentAboutDescription);
          setFormDataField('description', currentShortDescription);
          setFormDataField('icon_image', currentIconImageUrl);
          setFormDataField('cover_image', currentCoverPhotoUrl);
          setFormDataField('intro_media_type', currentIntroMediaType);
          setFormDataField('intro_media_url', currentIntroMediaType === 'none' ? null : currentIntroMediaUrl);
          setIsDirty(false);
        }
      });
    }
  };
  
  const handleShowMediaModal = () => {
    setShowMediaModal(true);
  };

  const handleCloseModal = () => {
    setShowMediaModal(false);
    setMediaLink("");
    setSelectedFileName(null);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const file = e.target.files[0];
      setSelectedFileName(file.name);
    } else {
      setSelectedFileName(null);
    }
  };

  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleAddMedia = async () => {
    try {
      if (mediaLink) {
        // Handle video links
        const videoId = extractVideoId(mediaLink);
        if (videoId) {
          // It's a YouTube video
          const newMedia: MediaItem = {
            id: uuidv4(),
            type: 'video',
            url: `https://www.youtube.com/embed/${videoId}`,
            thumbnail: getVideoThumbnail(videoId),
            videoId
          };
          
          const newMediaItems = [...mediaItems, newMedia];
          setMediaItems(newMediaItems);
          // Set this as the active item
          setActiveMediaIndex(newMediaItems.length - 1);
          
          toast({
            title: "Video added successfully",
            description: "Your YouTube video has been added to the gallery.",
            variant: "default"
          });
          
          setShowMediaModal(false);
          setMediaLink("");
        } else {
          // Not a valid YouTube URL
          toast({
            title: "Invalid URL",
            description: "Please enter a valid YouTube video URL.",
            variant: "destructive"
          });
        }
      } else if (fileInputRef.current?.files?.length) {
        // Handle image file upload
        const file = fileInputRef.current.files[0];
        
        // In a real implementation, you would upload the file to storage
        // For now, we'll create a temporary URL
        const tempUrl = URL.createObjectURL(file);
        
        // Create a new media item
        const newMedia: MediaItem = {
          id: uuidv4(),
          type: 'image',
          url: tempUrl
        };
        
        const newMediaItems = [...mediaItems, newMedia];
        setMediaItems(newMediaItems);
        // Set this as the active item
        setActiveMediaIndex(newMediaItems.length - 1);
        
        toast({
          title: "Image added",
          description: "Your image has been added to the gallery.",
        });
        
        setShowMediaModal(false);
        setMediaLink("");
        setSelectedFileName(null);
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        toast({
          title: "No media selected",
          description: "Please upload an image or add a video link.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error adding media:', error);
      toast({
        title: "Operation failed",
        description: error.message || "Something went wrong",
        variant: "destructive"
      });
      setSelectedFileName(null);
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMediaToDelete(index);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (mediaToDelete === null) return;
    
    setMediaItems(prev => {
      const updated = [...prev];
      updated.splice(mediaToDelete, 1);
      
      // Update active index if necessary
      if (activeMediaIndex === mediaToDelete) {
        setActiveMediaIndex(updated.length > 0 ? 0 : null);
      } else if (activeMediaIndex !== null && mediaToDelete < activeMediaIndex) {
        setActiveMediaIndex(activeMediaIndex - 1);
      }
      
      return updated;
    });
    
    setShowDeleteConfirm(false);
    setMediaToDelete(null);
    
    toast({
      title: "Media deleted",
      description: "The selected media has been removed.",
    });
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setMediaToDelete(null);
  };

  const handleThumbnailClick = (index: number) => {
    setActiveMediaIndex(index);
  };

  if (loadingSpace && !formData?.name) {
    return <div className="p-6 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!formData) {
    return <div className="p-6">About page settings are not available.</div>;
  }

  // Get the active media item
  const activeMedia = activeMediaIndex !== null ? mediaItems[activeMediaIndex] : null;

  return (
    <div className="p-6 space-y-8"> {/* Increased spacing */}
      
      {/* Space Name (Display Only, edited in General Tab) */}
      <div className="space-y-2">
        <Label>Space Name (Managed in General Settings)</Label>
        <p className="text-sm text-gray-700 p-2 border rounded-md bg-gray-50">
          {formData.name || 'Not set'}
        </p>
      </div>

      {/* Icon Image Upload */}
      <div className="space-y-2">
        <Label htmlFor="icon_image_upload">Space Icon (e.g., logo)</Label>
        <p className="text-sm text-gray-500">
          Recommended: Square image (e.g., 200x200px). This will be displayed in previews and headers.
        </p>
        {/* Placeholder for file uploader - real one needed */}
        <input 
          type="file" 
          id="icon_image_upload" 
          onChange={(e) => handleInputChange('icon_image', e.target.files ? e.target.files[0] : null)} 
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
        />
        {currentIconImageUrl && <img src={currentIconImageUrl} alt="Icon Preview" className="mt-2 h-16 w-16 rounded-md border object-cover" />}
      </div>

      {/* Intro Media Section */}
      <div className="space-y-4 p-4 border rounded-md bg-gray-50 dark:bg-gray-800">
        <h3 className="text-md font-semibold">Intro Media (Optional)</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          The intro media is displayed at the top of your About page. It can be a video or an image 
          that introduces your space. If not set, a placeholder with your space icon will be shown.
        </p>
        <div className="space-y-2">
          <Label htmlFor="intro_media_type_select">Intro Media Type</Label>
                      <select 
              id="intro_media_type_select" 
              value={currentIntroMediaType || 'none'}
              onChange={(e) => handleInputChange('intro_media_type', e.target.value as 'image' | 'video' | 'none')}
              className="block w-full p-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="none">None (will show space icon placeholder)</option>
              <option value="image">Image</option>
              <option value="video">Video (YouTube/Vimeo URL)</option>
            </select>
        </div>

        {currentIntroMediaType === 'image' && (
          <div className="space-y-2 p-3 border border-dashed rounded-md bg-white dark:bg-gray-700">
            <Label htmlFor="intro_image_upload">Intro Image</Label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This image will be displayed as the introduction on your About page. 
              For best results, use a 16:9 landscape image.
            </p>
            {/* Placeholder for file uploader */}
            <input 
              type="file" 
              id="intro_image_upload" 
              onChange={(e) => handleInputChange('intro_media_url', e.target.files ? e.target.files[0] : null)} 
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
            {currentIntroMediaUrl && <img src={currentIntroMediaUrl} alt="Intro Image Preview" className="mt-2 h-32 w-auto rounded-md border object-contain" />}
          </div>
        )}

        {currentIntroMediaType === 'video' && (
          <div className="space-y-2 p-3 border border-dashed rounded-md bg-white dark:bg-gray-700">
            <Label htmlFor="intro_video_url_input">Intro Video URL (YouTube/Vimeo)</Label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Enter a YouTube or Vimeo URL for your intro video. This will be displayed at the top of your About page.
              Use the embed URL format (e.g., https://www.youtube.com/embed/VIDEO_ID).
            </p>
            <input 
              type="text" 
              id="intro_video_url_input" 
              value={currentIntroMediaUrl || ''} 
              onChange={(e) => handleInputChange('intro_media_url', e.target.value)}
              placeholder="https://www.youtube.com/embed/VIDEO_ID"
              className="block w-full p-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
            {currentIntroMediaUrl && currentIntroMediaUrl.includes('youtube.com') && (
              <div className="mt-2 aspect-video">
                <iframe 
                  src={currentIntroMediaUrl} 
                  className="w-full h-full rounded-md border"
                  title="Video Preview"
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                ></iframe>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cover Photo Upload - Keep this separate from Intro Media */}
      <div className="space-y-2">
        <Label htmlFor="cover_image_upload">Cover Photo</Label>
        <p className="text-sm text-gray-500">
          The cover photo is used throughout your space in various places but will not appear in the main intro area of the About page.
          Recommended: Landscape image (e.g., 1200x400px).
        </p>
        {/* Placeholder for file uploader */}
        <input 
          type="file" 
          id="cover_image_upload" 
          onChange={(e) => handleInputChange('cover_image', e.target.files ? e.target.files[0] : null)} 
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
        />
        {currentCoverPhotoUrl && <img src={currentCoverPhotoUrl} alt="Cover Preview" className="mt-2 h-32 w-full rounded-md border object-cover" />}
      </div>
      
      {/* Media Gallery Section */}
      <div className="space-y-4 p-4 border rounded-md bg-gray-50 dark:bg-gray-800">
        <div className="flex justify-between items-center">
          <h3 className="text-md font-semibold">Media Gallery</h3>
          <Button variant="outline" size="sm" onClick={handleShowMediaModal}>
            <Upload className="h-4 w-4 mr-2" />
            Add Media
          </Button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Add images or YouTube videos to your space's media gallery. These will be displayed on your About page.
        </p>
        
        {mediaItems.length > 0 ? (
          <div className="space-y-4 mt-4">
            {/* Main media display */}
            {activeMedia && (
              <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
                <MediaGallery
                  mediaItems={mediaItems}
                  activeIndex={activeMediaIndex || 0}
                  onActiveChange={setActiveMediaIndex}
                  onDelete={handleRemoveMedia}
                  readOnly={false}
                  ownerData={ownerData}
                  showOwner={true}
                />
              </div>
            )}
            
            {/* Add Button if no media yet */}
            {mediaItems.length === 0 && (
              <div className="text-center py-8 bg-white dark:bg-gray-700 rounded-md border border-dashed">
                <p className="text-gray-500 dark:text-gray-400">No media items added yet.</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={handleShowMediaModal}>
                  <Upload className="h-4 w-4 mr-2" />
                  Add Your First Media Item
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 bg-white dark:bg-gray-700 rounded-md border border-dashed">
            <p className="text-gray-500 dark:text-gray-400">No media items added yet.</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={handleShowMediaModal}>
              <Upload className="h-4 w-4 mr-2" />
              Add Your First Media Item
            </Button>
          </div>
        )}
      </div>
      
      {/* Short Description */}
      <div className="space-y-2">
        <Label htmlFor="short_description_editor">Short Description (for previews)</Label>
        <p className="text-sm text-gray-500">
          A brief summary (1-2 sentences) shown in space listings and previews. Max 200 characters.
        </p>
        <Textarea 
          id="short_description_editor"
          name="short_description"
          value={currentShortDescription} 
          onChange={(e) => handleInputChange('short_description', e.target.value)}
          placeholder="A catchy summary of your space..." 
          rows={3}
          maxLength={200}
        />
      </div>

      {/* About Page Content (Long Description) */}
      <div className="space-y-2">
        <Label htmlFor="about_description_editor">Full About Page Content</Label>
        <p className="text-sm text-gray-500">
          This is the main content for your dedicated "About" page. You can use markdown for formatting.
        </p>
        <Textarea 
          id="about_description_editor"
          name="about_description"
          value={currentAboutDescription} 
          onChange={(e) => handleInputChange('about_description', e.target.value)}
          placeholder="Tell everyone more details about your space..." 
          rows={15}
          className="min-h-[300px]"
        />
      </div>

        {isDirty && (
        <div className="flex justify-end mt-4">
          <Button onClick={handleSaveChangesToStore} size="sm" className="bg-green-600 hover:bg-green-700">
            Update Form with About Page Changes
            </Button>
          </div>
        )}
        <p className="text-xs text-gray-500">
        Remember to click the main "Save Changes" button at the bottom of the modal to persist these settings to the database.
      </p>

      {/* Media Modal */}
      {showMediaModal && (
        <Dialog open={showMediaModal} onOpenChange={handleCloseModal}>
          <DialogContent className="sm:max-w-md">
            <DialogTitle>Add Media</DialogTitle>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="col-span-4">
                  <p className="text-sm text-gray-500 mb-2">
                    Add a YouTube video link or upload an image
                  </p>
                  
                  <div className="grid gap-2">
                    <Input
                      placeholder="Enter YouTube URL"
                      value={mediaLink}
                      onChange={(e) => setMediaLink(e.target.value)}
                    />
                    
                    <div className="text-center my-2">
                      <span className="text-gray-500 text-sm">OR</span>
                    </div>
                    
                    <input 
                      type="file" 
                      accept="image/*" 
                      ref={fileInputRef}
                      onChange={handleFileInputChange}
                      className="hidden" 
                    />
                    
                    <Button 
                      variant="outline" 
                      onClick={handleImageUploadClick}
                      className="w-full"
                    >
                      {selectedFileName ? (
                        <span className="truncate max-w-[200px]">{selectedFileName}</span>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" /> Upload Image
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button onClick={handleAddMedia} disabled={!mediaLink && !selectedFileName}>
                Add Media
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="sm:max-w-md">
            <DialogTitle>Delete Media</DialogTitle>
            <p className="py-4">Are you sure you want to delete this media? This cannot be undone.</p>
            <DialogFooter>
              <Button variant="outline" onClick={cancelDelete}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Show validation errors if any */}
      {Object.keys(errors).length > 0 && (
        <Alert variant="destructive">
          {Object.entries(errors).map(([field, fieldErrors]) => (
            fieldErrors.map((error, i) => (
              <p key={`${field}-${i}`} className="text-sm flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                {error}
              </p>
            ))
          ))}
        </Alert>
      )}
    </div>
  );
} 