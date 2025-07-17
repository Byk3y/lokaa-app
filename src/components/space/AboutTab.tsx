import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Globe, Lock, Users, Tag, Upload, X, Play, Plus, AlertCircle, Loader2, GripHorizontal, ArrowUpDown, Settings, FileText, Check, Edit, Link as LinkIcon, Trash2, Eye, ExternalLink, Crown, Shield, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';
import { getSupabaseClient } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import useSpaceSettingsModal from "@/hooks/useSpaceSettingsModal";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useNavigate } from "react-router-dom";
import { useSpace } from "@/contexts/SpaceContext";
import { useMembership } from "@/contexts/MembershipContext";
import type { Database } from "@/types/database.types";
import useSpaceDescriptionManager from "@/hooks/useSpaceDescriptionManager";
import useSpaceSettingsStore, { SpaceSettingsData } from "@/hooks/useSpaceSettingsStore";
import { resolveImageUrl } from "@/utils/preloadAssets";
import SpaceIntroDisplay from "@/components/space/SpaceIntroDisplay";
import SpaceInfoSidebar from "./SpaceInfoSidebar";
import MediaGallery from "./MediaGallery";
import { useQuery } from "@tanstack/react-query";
import { 
  MediaItem, 
  STORAGE_BUCKET_NAME, 
  MAX_FILE_SIZE_MB, 
  MAX_FILE_SIZE_BYTES,
  fileToBase64, 
  uploadFileToStorage, 
  deleteFileFromStorage,
  extractVideoId,
  getVideoThumbnail,
  fetchSpaceMediaFromSupabase,
  addMediaToSupabase,
  reorderSpaceMediaInSupabase,
  deleteMediaFromSupabase
} from "@/utils/mediaStorageUtils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useSimpleMemberCounts } from "@/hooks/useSimpleMemberCounts";
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface AboutTabProps {
  // onSpaceUpdate?: (updatedSpace: Database['public']['Tables']['spaces']['Row'] | null) => void; // Removed
  _key?: string; // Added dummy prop to avoid empty interface warning
}

export default function AboutTab(props: AboutTabProps) { // Use props instead of empty object pattern
  const { space: spaceData, loading, error, fetchSpaceData } = useSpace(); // Keep for now, evaluate if storeSpace can replace entirely
  const { user } = useOptimizedAuth();
  const navigate = useNavigate();
  const { open: openSettingsModal } = useSpaceSettingsModal();
  const { 
    space: storeSpace, 
    loadActiveSpace, 
    permissions: storePermissions 
  } = useSpaceSettingsStore();
  
  // FIXED: Use same fallback pattern as MembersTab and FeedTab
  const currentSpaceData = storeSpace || spaceData;
  
  // Use MembershipContext instead of direct Supabase calls
  const { 
    isMember, 
    loading: membershipLoading, 
    joinSpace 
  } = useMembership();
  
  // FIXED: Use the same optimized member counts hook as FeedTab for unified presence system
  const memberCounts = useSimpleMemberCounts(currentSpaceData?.id || '');
  
  // useSpaceDescriptionManager for main space description
  const {
    editingDescription,
    setEditingDescription,
    descriptionText,
    descriptionLength,
    handleDescriptionChange,
    saveDescription,
    cancelDescription,
    isSavingDescription,
  } = useSpaceDescriptionManager();
  
  // State for UI components
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaLink, setMediaLink] = useState("");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [activeMediaIndex, setActiveMediaIndex] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [storageError, setStorageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const dragNode = useRef<HTMLDivElement | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Limit for media items
  const MAX_MEDIA_ITEMS = 4;
  
  // Media items with React Query
  const { 
    data: mediaItemsData, 
    isLoading: mediaLoading,
    refetch: refetchMedia
  } = useQuery({
    queryKey: ['spaceMedia', currentSpaceData?.id],
    queryFn: async () => {
      if (!currentSpaceData?.id) return [];
      return fetchSpaceMediaFromSupabase(currentSpaceData.id);
    },
    enabled: !!currentSpaceData?.id,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
  });
  
  // Update media items state when query data changes
  useEffect(() => {
    if (mediaItemsData) {
      setMediaItems(mediaItemsData);
    }
  }, [mediaItemsData]);
  
  // Set active media index if null but we have media items
  useEffect(() => {
    if (mediaItems.length > 0 && activeMediaIndex === null) {
      setActiveMediaIndex(0);
    } else if (mediaItems.length === 0) {
      setActiveMediaIndex(null);
    }
  }, [mediaItems, activeMediaIndex]);
  
  // State for joining a space
  const [joiningSpace, setJoiningSpace] = useState(false);
  
  // Permissions from store
  const canEditSpace = storePermissions?.canEditSpace ?? false;
  
  // About description state - now initialized from currentSpaceData
  const [aboutDescription, setAboutDescription] = useState(currentSpaceData?.about_description || "");
  const [aboutCharCount, setAboutCharCount] = useState((currentSpaceData?.about_description || "").length);
  const [editingAbout, setEditingAbout] = useState(false);
  const [aboutChanged, setAboutChanged] = useState(false);
  const [savingAbout, setSavingAbout] = useState(false);
  
  // Update aboutDescription when currentSpaceData.about_description changes
  useEffect(() => {
    setAboutDescription(currentSpaceData?.about_description || "");
    setAboutCharCount((currentSpaceData?.about_description || "").length);
    setAboutChanged(false); // Reset changed status when underlying data changes
  }, [currentSpaceData?.about_description]);
  
  // Fetch owner details with React Query
  const { data: ownerData, isLoading: ownerLoading } = useQuery({
    queryKey: ['owner', currentSpaceData?.owner_id],
    queryFn: async () => {
      if (!currentSpaceData?.owner_id) return null;
      
      const { data, error } = await getSupabaseClient()
        .from('users')
        .select('id, full_name, avatar_url')
        .eq('id', currentSpaceData.owner_id)
        .single();
        
      if (error) throw error;
      return data as {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
      } | null;
    },
    enabled: !!currentSpaceData?.owner_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache longer
  });
  
  const isSpaceOwner = currentSpaceData?.owner_id === user?.id;
  
  // Function to handle joining the space
  const handleJoinSpace = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (!currentSpaceData?.id) {
      toast({
        title: "Error",
        description: "Space information is missing",
        variant: "destructive"
      });
      return;
    }
    
    setJoiningSpace(true);
    
    try {
      // Use the joinSpace function from MembershipContext
      const success = await joinSpace(currentSpaceData.id);
      
              if (success) {
          toast({
            title: "Joined space",
            description: `You've successfully joined ${currentSpaceData.name}.`,
          });
        }
    } catch (err) {
      console.error("Error joining space:", err);
      toast({
        title: "Error joining space",
        description: "Could not join this space at this time.",
        variant: "destructive"
      });
    } finally {
      setJoiningSpace(false);
    }
  };
  
  // Handle about description changes
  const handleAboutChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setAboutDescription(val);
    setAboutCharCount(val.length);
    setAboutChanged(val !== (currentSpaceData?.about_description || "")); // Compare with currentSpaceData
  };
  
  // Save about description
  const handleSaveAbout = async () => {
    if (!aboutChanged || !aboutDescription.trim() || !currentSpaceData?.id || !user) return; // Use currentSpaceData.id and check user
    
    setSavingAbout(true);
    try {
      // Create an update object with proper type assertion
      const updateData: Partial<Database['public']['Tables']['spaces']['Row']> = { about_description: aboutDescription.trim() };
      
      const { error } = await getSupabaseClient()
        .from('spaces')
        .update(updateData)
        .eq('id', currentSpaceData.id); // Use currentSpaceData.id
      
      if (error) throw error;
      
      toast({
        title: "Changes saved",
        description: "Your space description has been updated",
      });
      
      setEditingAbout(false);
      setAboutChanged(false);
      
      // Refresh data using loadActiveSpace from the store
      if (currentSpaceData?.subdomain && user?.id) {
        loadActiveSpace({ subdomain: currentSpaceData.subdomain }, user.id, true);
        }
      // Removed onSpaceUpdate call and manual fetchSpaceData
      
    } catch (err) {
      console.error('Error saving about description:', err);
      toast({
        title: "Save failed",
        description: "Failed to update description. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSavingAbout(false);
    }
  };
  
  // Cancel about editing
  const handleCancelAbout = () => {
    setAboutDescription(currentSpaceData?.about_description || ""); // Reset from currentSpaceData
    setAboutCharCount((currentSpaceData?.about_description || "").length); // Reset from currentSpaceData
    setEditingAbout(false);
    setAboutChanged(false);
  };
  
  // Check if storage bucket exists
  useEffect(() => {
    const checkStorageBucket = async () => {
      try {
        // First check if user is logged in
        const { data: session } = await getSupabaseClient().auth.getSession();
        const isLoggedIn = !!session.session;
        
        if (!isLoggedIn) {
          setStorageError('Sign in required for permanent storage. Using local storage only.');
          return;
        }

        // Simplified bucket check - just try to list files
        const { data, error } = await getSupabaseClient().storage
          .from(STORAGE_BUCKET_NAME)
          .list('');
        
        if (error) {
          console.error('Cannot list files in storage bucket:', error);
          setStorageError('Storage bucket not accessible. Using local storage only.');
          return;
        }
        
        setStorageError(null);
        
      } catch (err) {
        console.error('Failed to check storage bucket:', err);
        setStorageError('Unable to connect to storage service. Using local storage only.');
      }
    };
    
    checkStorageBucket();
  }, []);
  
  const handleUploadImage = () => {
    // Open the media modal instead of settings
    setShowMediaModal(true);
  };
  
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  
  const handleCloseModal = () => {
    if (isUploading) return; // Prevent closing during upload
    setShowMediaModal(false);
    setMediaLink("");
    setSelectedFileName(null); // Reset the selected filename
    setUploadProgress(0);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const extractVideoId = (url: string): string | null => {
    // Match YouTube URL patterns
    const youtubeRegex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
    const match = url.match(youtubeRegex);
    return match ? match[1] : null;
  };

  const getVideoThumbnail = (videoId: string): string => {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
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
      if (!storageError && storeSpace?.id) {
    setIsUploading(true);
        // Get filetype and generate a unique path
        const fileExt = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${currentSpaceData.id}/${fileName}`;
        
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
  
  // Handle confirmation of media deletion
  const confirmDelete = async () => {
    if (mediaToDelete === null || !storeSpace?.id) return;
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
      // Use React Query's refetch instead of manual fetch
      refetchMedia();
    setShowDeleteConfirm(false);
    setMediaToDelete(null);
      toast({ title: "Media deleted", description: "The selected media has been removed." });
    } catch (err) {
      console.error('Error deleting media:', err);
      toast({ title: "Delete failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  // Start drag
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    // Set ref values for current drag item
    dragItem.current = index;
    dragNode.current = e.currentTarget;
    
    // Set dragging state for UI updates
      setDragging(true);
    
    // Add dragstart events
    e.dataTransfer.setData("text/plain", index.toString());
    e.dataTransfer.effectAllowed = "move";
    
    // Add a class for CSS styling during drag
    if (dragNode.current) {
      dragNode.current.classList.add("dragging");
    }
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    
    // Set the target item index
    dragOverItem.current = index;
    
    // Call handleDragEnd to perform the reordering
    handleDragEnd();
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    
    // Update dragOverItem to current hover index
    // Only if it's a new item (prevent excessive updates)
    if (dragOverItem.current !== index) {
    dragOverItem.current = index;
    }
  };
  
  // End drag
  const handleDragEnd = async () => {
    setDragging(false);
    
    // Only perform reordering if both items are valid and storeSpace exists
    if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current || !storeSpace?.id) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }
    
    try {
      // Re-order the array
      const _items = [...mediaItems];
      const itemToReorder = _items.splice(dragItem.current, 1)[0];
      _items.splice(dragOverItem.current, 0, itemToReorder);
      
      // Set the new order property for each item
      const reorderedItems = _items.map((item, index) => ({
        ...item,
        order: index
      }));
    
      // Update state first for responsive UI
      setMediaItems(reorderedItems);
      setActiveMediaIndex(dragOverItem.current);
      
      // Then save to Supabase - pass just the IDs in the correct order
      await reorderSpaceMediaInSupabase(currentSpaceData.id, reorderedItems.map(item => item.id));
      
      // Refresh data to ensure consistency
      refetchMedia();
      
      toast({ 
        title: "Media reordered", 
        description: "The order of your media has been updated.", 
        variant: "default" 
      });
    } catch (error) {
      console.error('Error reordering media:', error);
      toast({ 
        title: "Reordering failed", 
        description: "There was a problem updating the order. Please try again.", 
        variant: "destructive" 
      });
      
      // Refresh to restore original order
      refetchMedia();
    }
    
    // Reset drag references
    dragItem.current = null;
    dragOverItem.current = null;
  };
  
  // Settings button handler
  const handleOpenSettings = () => {
          if (currentSpaceData && user?.id) {
          const storeActions = useSpaceSettingsStore.getState();
          storeActions.loadActiveSpace({ subdomain: currentSpaceData.subdomain, spaceId: currentSpaceData.id }, user.id, true).then(() => {
            const storeActions = useSpaceSettingsStore.getState();
            storeActions.openModal();
      });
    }
  };

  // Default values for properties that might be missing
  const memberCount = currentSpaceData?.member_count ?? 1;
  const pricingType = currentSpaceData?.pricing_type ?? 'free';
  const pricePerMonth = currentSpaceData?.price_per_month ?? 0;
  const primaryColor = currentSpaceData?.primary_color ?? '#26A69A';

  // Get the active media item
  const activeMedia = activeMediaIndex !== null ? mediaItems[activeMediaIndex] : null;

  // Render join button if not a member
  const renderJoinButton = () => {
    if (membershipLoading) {
      return (
        <Button disabled className="w-full">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Checking membership...
        </Button>
      );
    }
    
    if (!isMember) {
      return (
        <Button 
          onClick={handleJoinSpace} 
          disabled={joiningSpace || !user}
          className="w-full"
        >
          {joiningSpace ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Joining...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              {user ? 'Join Space' : 'Login to Join'}
            </>
          )}
        </Button>
      );
    }
    
    return null;
  };

  // Handle reordering media items
  const handleReorderMedia = (fromIndex: number, toIndex: number) => {
    const newMediaItems = [...mediaItems];
    const [movedItem] = newMediaItems.splice(fromIndex, 1);
    newMediaItems.splice(toIndex, 0, movedItem);
    setMediaItems(newMediaItems);
    
    // Update active index if necessary
    if (activeMediaIndex === fromIndex) {
      setActiveMediaIndex(toIndex);
    } else if (
      (activeMediaIndex > fromIndex && activeMediaIndex <= toIndex) ||
      (activeMediaIndex < fromIndex && activeMediaIndex >= toIndex)
    ) {
      // Adjust active index based on the item movement direction
      const adjustment = activeMediaIndex > fromIndex ? -1 : 1;
      setActiveMediaIndex(activeMediaIndex + adjustment);
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

  // Add media to Supabase
  const handleAddMedia = async () => {
    try {
      if (!storeSpace?.id) return;
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
          const inserted = await addMediaToSupabase(currentSpaceData.id, newMedia);
          if (inserted) {
            // Use React Query's refetch instead of manual fetch
            refetchMedia();
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
        const inserted = await addMediaToSupabase(currentSpaceData.id, newMedia);
        if (inserted) {
          // Use React Query's refetch instead of manual fetch
          refetchMedia();
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
      console.error('Error adding media:', error);
      toast({ title: "Operation failed", description: (error instanceof Error ? error.message : String(error)) || "Something went wrong", variant: "destructive" });
      setSelectedFileName(null);
    }
  };

  // Add mobile detection for conditional rendering
  const isDesktop = useMediaQuery('(min-width: 1024px)'); // lg breakpoint
  
  // FIXED: Trust SpaceProtectedRoute - don't show loading screen since access is already verified
  // SpaceProtectedRoute ensures space data is available before rendering tabs
  // Only show error state if there was a critical error AND no fallback data
  if (error && !currentSpaceData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Alert variant="destructive" className="max-w-lg">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {`Error loading space: ${error.message}`}
          </AlertDescription>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </Alert>
      </div>
    );
  }

  // Early return if no space data is available from either source
  if (!currentSpaceData) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Add debug logging
  console.log('🔧 [AboutTab] Data sources - storeSpace:', storeSpace ? 'available' : 'null', 'currentSpaceData:', currentSpaceData?.id);
  
  // Ensure the component re-renders when currentSpaceData or its relevant properties change.

  return (
    <div className="flex flex-col lg:flex-row gap-x-8 gap-y-4 p-2 md:p-3 bg-gray-50 dark:bg-gray-900 min-h-full">
      <motion.div 
        className="flex-grow space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* FIXED: Removed loading state - SpaceProtectedRoute ensures space data is available */}
        {/* Display media gallery or intro display */}
        {currentSpaceData && (
          <>
            {mediaLoading ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden p-8 mb-6">
                <div className="w-full flex flex-col items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  <span className="mt-2 text-sm text-gray-500">Loading media gallery...</span>
                </div>
              </div>
            ) : mediaItems.length > 0 ? (
              <div className="mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                  <MediaGallery
                    mediaItems={mediaItems}
                    readOnly={!canEditSpace}
                    activeIndex={activeMediaIndex ?? 0}
                    onActiveChange={setActiveMediaIndex}
                    onDelete={canEditSpace ? handleRemoveMedia : undefined}
                    onReorder={canEditSpace ? handleReorderMedia : undefined}
                    ownerData={ownerData}
                    showOwner={true}
                    setShowMediaModal={setShowMediaModal}
                  />
                </div>
              </div>
            ) : (
            <div className="mb-6">
            <SpaceIntroDisplay 
              name={currentSpaceData.name}
              introMediaType={currentSpaceData.intro_media_type as "image" | "video" | "none"}
              introMediaUrl={currentSpaceData.intro_media_url as string}
              coverPhotoUrl={currentSpaceData.cover_image}
              spaceIconUrl={currentSpaceData.icon_image}
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
              </div>
            )}

            {/* Add the space header information below the media section */}
            <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 mb-4">
              <Globe className="h-5 w-5" />
              <span className="font-medium">Public Space</span>
              <span className="mx-2">•</span>
              <span>{memberCounts.totalMembers} members</span>
              <span className="mx-2">•</span>
              <span>Free to Join</span>
            </div>

        {/* Existing About Section Title and Edit Button */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">About This Space</h2>
          {canEditSpace && !editingAbout && (
            <Button variant="outline" size="sm" onClick={() => setEditingAbout(true)}>
              <Settings className="w-4 h-4 mr-2" /> Edit About
            </Button>
          )}
        </div>

        {/* Existing About Description Editor/Display */}
        {editingAbout && canEditSpace ? (
          <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800">
            <textarea
              value={aboutDescription}
              onChange={handleAboutChange}
              placeholder="Tell everyone about your space..."
              className="w-full p-3 min-h-[150px] focus:ring-0 border-0 focus:outline-none resize-none bg-transparent dark:text-gray-200"
              maxLength={2000} // Example max length
            />
            <div className="flex justify-between items-center p-3 border-t dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-400">{aboutCharCount}/2000</span>
              <div className="space-x-2">
                <Button variant="ghost" size="sm" onClick={handleCancelAbout} disabled={savingAbout}>Cancel</Button>
                <Button size="sm" onClick={handleSaveAbout} disabled={!aboutChanged || savingAbout || !aboutDescription.trim()}>
                  {savingAbout ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Save
                </Button>
              </div>
            </div>
          </div>
        ) : (
                <div className="prose prose-lg dark:prose-invert max-w-none text-gray-700 dark:text-gray-200 whitespace-pre-line">
            {currentSpaceData.about_description ? (
              <p>{currentSpaceData.about_description}</p>
            ) : (
              <div className="text-center py-8">
                {canEditSpace ? (
                  // Admin/Owner empty state
                  <div className="max-w-md mx-auto">
                    <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-6 w-6 text-teal-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Tell your story
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                      Help members understand what your space is about and what they can expect to find here.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => setEditingAbout(true)}
                      className="inline-flex items-center"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Add description
                    </Button>
                  </div>
                ) : (
                  // Member view - simpler message
                  <p className="italic text-gray-500 dark:text-gray-400">
                    The space creator hasn't added a detailed description yet.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
            </div>
        
        <Separator className="my-6" />
        
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
        )}

      </motion.div>

      {/* Sidebar */}
      {/* Only render on desktop to prevent unnecessary mounting and hook execution on mobile */}
      {isDesktop && currentSpaceData && (
        <div className="w-[273px] flex-shrink-0">
          <SpaceInfoSidebar 
            spaceName={currentSpaceData.name}
            spaceIcon={currentSpaceData.icon_image}
            spaceDescription={currentSpaceData.description} // This is the short description
            coverImage={currentSpaceData.cover_image}
            isPrivate={currentSpaceData.is_private}
            memberCount={memberCounts.totalMembers} // Use the unified presence system counts
            adminCount={memberCounts.adminMembers} // Use the unified presence system counts
            // onlineCount removed - let SpaceInfoSidebar use its own hook for real-time presence
            canAccessSettings={storePermissions?.canAccessSettings} // This prop is used by SpaceInfoSidebar
            permissionsLoading={membershipLoading || loading}
            subdomain={currentSpaceData.subdomain}
            spaceId={currentSpaceData.id}
            isOwner={isSpaceOwner} // Pass the derived isSpaceOwner
            isMember={isMember} // Pass the membership status
          />
        </div>
      )}
    </div>
  );
} 