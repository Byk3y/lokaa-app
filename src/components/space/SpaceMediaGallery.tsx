import React, { useState, useRef, useEffect, memo } from "react";
import { Upload, X, Plus, AlertCircle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { v4 as uuidv4 } from 'uuid';
import { getSupabaseClient } from "@/integrations/supabase/client";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { log } from '@/utils/logger';
import { 
  MediaItem, 
  STORAGE_BUCKET_NAME, 
  MAX_FILE_SIZE_MB, 
  MAX_FILE_SIZE_BYTES,
  fileToBase64, 
  extractVideoId,
  getVideoThumbnail,
  addMediaToSupabase,
  reorderSpaceMediaInSupabase,
  deleteMediaFromSupabase
} from "@/utils/mediaStorageUtils";
import MediaGallery from "./MediaGallery";
import SpaceIntroDisplay from "@/components/space/SpaceIntroDisplay";

interface SpaceMediaGalleryProps {
  /** Space ID for media operations */
  spaceId: string;
  /** Media items to display */
  mediaItems: MediaItem[];
  /** Whether media is currently loading */
  mediaLoading: boolean;
  /** Active media index */
  activeMediaIndex: number | null;
  /** Callback when active media changes */
  onActiveIndexChange: (index: number) => void;
  /** Whether user can edit space media */
  canEditSpace: boolean;
  /** Owner data for display */
  ownerData?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  /** Callback to refetch media data */
  onRefetchMedia: () => void;
  /** Callback when media items change locally */
  onMediaItemsChange: (items: MediaItem[]) => void;
  /** Space data for intro display fallback */
  spaceData: {
    name: string;
    intro_media_type: string | null;
    intro_media_url: string | null;
    cover_image: string | null;
    icon_image: string | null;
  };
}

// Limit for media items
const MAX_MEDIA_ITEMS = 4;

export const SpaceMediaGallery = memo(function SpaceMediaGallery({
  spaceId,
  mediaItems,
  mediaLoading,
  activeMediaIndex,
  onActiveIndexChange,
  canEditSpace,
  ownerData,
  onRefetchMedia,
  onMediaItemsChange,
  spaceData
}: SpaceMediaGalleryProps) {
  const { user } = useOptimizedAuth();
  
  // Modal state
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Upload state
  const [mediaLink, setMediaLink] = useState("");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [storageError, setStorageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Delete state
  const [mediaToDelete, setMediaToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Drag and drop state
  const [dragging, setDragging] = useState(false);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const dragNode = useRef<HTMLDivElement | null>(null);

  // Surface a warning if the user isn't signed in. Upload-specific errors
  // (bucket misconfig, network) now bubble up on the actual upload attempt
  // instead of being probed with a .list() call that required a broad
  // public SELECT policy on storage.objects.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: session } = await getSupabaseClient().auth.getSession();
        if (cancelled) return;
        setStorageError(
          session.session
            ? null
            : 'Sign in required for permanent storage. Using local storage only.'
        );
      } catch (err) {
        if (!cancelled) {
          log.error('Component', 'Failed to check session:', err);
          setStorageError('Unable to connect to storage service. Using local storage only.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Handle modal close
  const handleCloseModal = () => {
    if (isUploading) return; // Prevent closing during upload
    setShowMediaModal(false);
    setMediaLink("");
    setSelectedFileName(null);
    setUploadProgress(0);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle file upload to storage
  const uploadImageToStorage = async (file: File): Promise<{ url: string, path: string } | null> => {
    try {
      // Validate file
      if (!file || !file.type.startsWith('image/')) {
        toast({ title: "Invalid file", description: "Please select a valid image file.", variant: "destructive" });
        return null;
      }
      
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          title: "File too large",
          description: `Maximum file size is ${MAX_FILE_SIZE_MB}MB. Please select a smaller file.`, 
          variant: "destructive"
        });
        return null;
      }
      
      // First check if storage is available
      if (!user) {
        toast({ title: "Sign in required", description: "You must be signed in to upload images.", variant: "destructive" });
        return null;
      }
      
      // Upload to Supabase Storage
      if (!storageError && spaceId) {
        setIsUploading(true);
        // Get filetype and generate a unique path
        const fileExt = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${spaceId}/${fileName}`;
        
        // Upload the file
        const { data, error } = await getSupabaseClient().storage
          .from(STORAGE_BUCKET_NAME)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });
        
        setIsUploading(false);
        
        if (error) {
          toast({
            title: "Upload failed", 
            description: error.message, 
            variant: "destructive"
          });
          return null;
        }
        
        // Get the public URL of the uploaded file
        const { data: { publicUrl } } = getSupabaseClient().storage
          .from(STORAGE_BUCKET_NAME)
          .getPublicUrl(data.path);
        
        return { url: publicUrl, path: data.path };
      } else {
        // Fallback to base64 storage if Supabase storage is not available
        setIsUploading(true);
        const base64 = await fileToBase64(file);
        setIsUploading(false);
        return { url: base64, path: '' };
      }
    } catch (error) {
      setIsUploading(false);
      toast({
        title: "Upload failed", 
        description: error instanceof Error ? error.message : "An unexpected error occurred", 
        variant: "destructive"
      });
      return null;
    }
  };

  // Handle file selection in the upload input
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      setSelectedFileName(null);
      return;
    }
    
    const file = files[0];
      
    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({
        title: "File too large",
        description: `Maximum file size is ${MAX_FILE_SIZE_MB}MB. Please select a smaller file.`, 
        variant: "destructive"
      });
      setSelectedFileName(null);
      e.target.value = ''; // Clear the input
      return;
    }
    
    setSelectedFileName(file.name);
  };

  // Add media to Supabase
  const handleAddMedia = async () => {
    try {
      if (!spaceId) return;
      if (mediaItems.length >= MAX_MEDIA_ITEMS) {
        toast({ title: "Limit reached", description: `You can only add up to ${MAX_MEDIA_ITEMS} media items.`, variant: "destructive" });
        return;
      }
      if (mediaLink) {
        // Handle video links
        const videoId = extractVideoId(mediaLink);
        if (videoId) {
          const newMedia: Omit<MediaItem, 'id'> & { order: number } = {
            type: 'video',
            url: `https://www.youtube.com/embed/${videoId}`,
            thumbnail: getVideoThumbnail(videoId),
            videoId,
            order: mediaItems.length
          };
          const inserted = await addMediaToSupabase(spaceId, newMedia);
          if (inserted) {
            onRefetchMedia();
            toast({ title: "Video added successfully", description: "Your YouTube video has been added.", variant: "default" });
          }
          setShowMediaModal(false);
          setMediaLink("");
        } else {
          toast({ title: "Invalid URL", description: "Please enter a valid YouTube video URL.", variant: "destructive" });
        }
      } else if (fileInputRef.current?.files?.length) {
        const file = fileInputRef.current.files[0];
        const uploadResult = await uploadImageToStorage(file);
        if (!uploadResult) {
          setSelectedFileName(null);
          return;
        }
        const newMedia: Omit<MediaItem, 'id'> & { order: number } = {
          type: 'image',
          url: uploadResult.url,
          storagePath: uploadResult.path,
          order: mediaItems.length
        };
        const inserted = await addMediaToSupabase(spaceId, newMedia);
        if (inserted) {
          onRefetchMedia();
          toast({ title: "Image added", description: "Your image has been uploaded successfully." });
        }
        setShowMediaModal(false);
        setMediaLink("");
        setSelectedFileName(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        toast({ title: "No media selected", description: "Please upload an image or add a video link.", variant: "destructive" });
      }
    } catch (error: unknown) {
      log.error('Component', 'Error adding media:', error);
      toast({ title: "Operation failed", description: (error instanceof Error ? error.message : String(error)) || "Something went wrong", variant: "destructive" });
      setSelectedFileName(null);
    }
  };

  // Handle reordering media items
  const handleReorderMedia = (fromIndex: number, toIndex: number) => {
    const newMediaItems = [...mediaItems];
    const [movedItem] = newMediaItems.splice(fromIndex, 1);
    newMediaItems.splice(toIndex, 0, movedItem);
    onMediaItemsChange(newMediaItems);
    
    // Update active index if necessary
    if (activeMediaIndex === fromIndex) {
      onActiveIndexChange(toIndex);
    } else if (
      (activeMediaIndex !== null && activeMediaIndex > fromIndex && activeMediaIndex <= toIndex) ||
      (activeMediaIndex !== null && activeMediaIndex < fromIndex && activeMediaIndex >= toIndex)
    ) {
      // Adjust active index based on the item movement direction
      const adjustment = activeMediaIndex > fromIndex ? -1 : 1;
      onActiveIndexChange(activeMediaIndex + adjustment);
    }
    
    toast({
      title: "Media reordered",
      description: "The order of your media gallery has been updated.",
    });
  };

  // Handle deleting media items
  const handleRemoveMedia = (index: number) => {
    setMediaToDelete(index);
    setShowDeleteConfirm(true);
  };

  // Handle confirmation of media deletion
  const confirmDelete = async () => {
    if (mediaToDelete === null || !spaceId) return;
    setDeleting(true);
    try {
      const index = mediaToDelete;
      const mediaItem = mediaItems[index];
      if (!mediaItem) {
        toast({ title: "Delete failed", description: "Media item not found.", variant: "destructive" });
        setDeleting(false);
        return;
      }
      await deleteMediaFromSupabase(mediaItem.id, mediaItem.storagePath);
      onRefetchMedia();
      setShowDeleteConfirm(false);
      setMediaToDelete(null);
      toast({ title: "Media deleted", description: "The selected media has been removed." });
    } catch (err) {
      log.error('Component', 'Error deleting media:', err);
      toast({ title: "Delete failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  // Render loading state
  if (mediaLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden p-8 mb-6">
        <div className="w-full flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="mt-2 text-sm text-gray-500">Loading media gallery...</span>
        </div>
      </div>
    );
  }

  // Render media gallery if items exist
  if (mediaItems.length > 0) {
    return (
      <>
        <div className="mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
            <MediaGallery
              mediaItems={mediaItems}
              readOnly={!canEditSpace}
              activeIndex={activeMediaIndex ?? 0}
              onActiveChange={onActiveIndexChange}
              onDelete={canEditSpace ? handleRemoveMedia : undefined}
              onReorder={canEditSpace ? handleReorderMedia : undefined}
              ownerData={ownerData}
              showOwner={true}
              setShowMediaModal={setShowMediaModal}
            />
          </div>
        </div>

        {/* Media Modal */}
        {showMediaModal && (
          <Dialog open={showMediaModal} onOpenChange={handleCloseModal}>
            <DialogContent className="sm:max-w-md">
              <DialogTitle>Add Media</DialogTitle>
              <DialogDescription>Add a YouTube video or upload an image to your space gallery</DialogDescription>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="col-span-4">
                    <p className="text-sm text-gray-500 mb-2">
                      Add a YouTube video link or upload an image (max {MAX_FILE_SIZE_MB}MB)
                    </p>
            
                    {storageError && (
                      <Alert variant="warning" className="mb-3">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {storageError}
                        </AlertDescription>
                      </Alert>
                    )}
                
                    {mediaItems.length >= MAX_MEDIA_ITEMS && (
                      <Alert variant="destructive" className="mb-3">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          You can only add up to {MAX_MEDIA_ITEMS} media items.
                        </AlertDescription>
                      </Alert>
                    )}
            
                    <div className="grid gap-2">
                      <Input
                        placeholder="Enter YouTube URL"
                        value={mediaLink}
                        onChange={(e) => setMediaLink(e.target.value)}
                        disabled={isUploading || mediaItems.length >= MAX_MEDIA_ITEMS}
                      />
                      
                      <div className="text-center my-2">
                        <span className="text-gray-500 text-sm">OR</span>
                      </div>
                      
                      <input 
                        type="file" 
                        accept="image/*" 
                        ref={fileInputRef}
                        onChange={handleFileSelected}
                        className="hidden" 
                        disabled={isUploading || mediaItems.length >= MAX_MEDIA_ITEMS}
                      />
                      
                      <Button 
                        variant="outline" 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading || mediaItems.length >= MAX_MEDIA_ITEMS}
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
            
                      {isUploading && (
                        <div className="mt-2">
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-teal-500 transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-center mt-1 text-gray-500">
                            {uploadProgress < 100
                              ? `Uploading... ${uploadProgress}%`
                              : 'Processing...'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
          
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={isUploading}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button onClick={() => {
                  if (selectedFileName || mediaLink) {
                    handleAddMedia();
                  }
                }} disabled={(!selectedFileName && !mediaLink) || isUploading || mediaItems.length >= MAX_MEDIA_ITEMS}>
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Add Media'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
          
        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <Dialog open={showDeleteConfirm} onOpenChange={(open) => {
            setShowDeleteConfirm(open);
            if (!open) setMediaToDelete(null);
          }}>
            <DialogContent className="sm:max-w-md">
              <DialogTitle>Delete Media</DialogTitle>
              <DialogDescription>Confirm deletion of the selected media item</DialogDescription>
              <p className="py-4">Are you sure you want to delete this media? This cannot be undone.</p>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setMediaToDelete(null); }} disabled={deleting}>Cancel</Button>
                <Button variant="destructive" onClick={confirmDelete} autoFocus disabled={deleting}>
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </>
    );
  }

  // Render intro display with empty state for editing
  return (
    <div className="mb-6">
      <SpaceIntroDisplay 
        name={spaceData.name}
        introMediaType={spaceData.intro_media_type as "image" | "video" | "none"}
        introMediaUrl={spaceData.intro_media_url as string}
        coverPhotoUrl={spaceData.cover_image}
        spaceIconUrl={spaceData.icon_image}
        className="shadow-md"
      />
        
      {/* Show small + button for empty state */}
      {canEditSpace && (
        <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <div className="flex items-center space-x-2">
            <div 
              className="w-16 h-16 rounded-md border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
              onClick={() => setShowMediaModal(true)}
            >
              <Plus className="w-6 h-6 text-gray-400 hover:text-teal-500" />
            </div>
          </div>
        </div>
      )}

      {/* Media Modal for empty state */}
      {showMediaModal && (
        <Dialog open={showMediaModal} onOpenChange={handleCloseModal}>
          <DialogContent className="sm:max-w-md">
            <DialogTitle>Add Media</DialogTitle>
            <DialogDescription>Add a YouTube video or upload an image to your space gallery</DialogDescription>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="col-span-4">
                  <p className="text-sm text-gray-500 mb-2">
                    Add a YouTube video link or upload an image (max {MAX_FILE_SIZE_MB}MB)
                  </p>
          
                  {storageError && (
                    <Alert variant="warning" className="mb-3">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {storageError}
                      </AlertDescription>
                    </Alert>
                  )}
              
                  <div className="grid gap-2">
                    <Input
                      placeholder="Enter YouTube URL"
                      value={mediaLink}
                      onChange={(e) => setMediaLink(e.target.value)}
                      disabled={isUploading}
                    />
                    
                    <div className="text-center my-2">
                      <span className="text-gray-500 text-sm">OR</span>
                    </div>
                    
                    <input 
                      type="file" 
                      accept="image/*" 
                      ref={fileInputRef}
                      onChange={handleFileSelected}
                      className="hidden" 
                      disabled={isUploading}
                    />
                    
                    <Button 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
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
          
                    {isUploading && (
                      <div className="mt-2">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-500 transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-center mt-1 text-gray-500">
                          {uploadProgress < 100
                            ? `Uploading... ${uploadProgress}%`
                            : 'Processing...'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
        
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={isUploading}>
                  Cancel
                </Button>
              </DialogClose>
              <Button onClick={() => {
                if (selectedFileName || mediaLink) {
                  handleAddMedia();
                }
              }} disabled={(!selectedFileName && !mediaLink) || isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Add Media'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
});

export default SpaceMediaGallery;