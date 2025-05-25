import { useState, useRef, useEffect } from "react";
import { Globe, Lock, Users, Tag, Upload, X, Play, Plus, AlertCircle, Loader2, GripHorizontal, ArrowUpDown, Settings, FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogTitle, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import useSpaceSettingsModal from "@/hooks/useSpaceSettingsModal";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useSpace } from "@/contexts/SpaceContext";
import { useMembership } from "@/contexts/MembershipContext";
import { Database } from "@/types/supabase";
import useSpaceDescriptionManager from "@/hooks/useSpaceDescriptionManager";
import useSpaceSettingsStore from "@/hooks/useSpaceSettingsStore";
import { resolveImageUrl } from "@/utils/preloadAssets";
import SpaceInfoSidebar from "./SpaceInfoSidebar";

interface AboutTabProps {
  // onSpaceUpdate?: (updatedSpace: Database['public']['Tables']['spaces']['Row'] | null) => void; // Removed
}

interface MediaItem {
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  videoId?: string;
  id: string; // Unique identifier
  storagePath?: string; // Path in Supabase storage
}

// Constants for storage
export const STORAGE_BUCKET_NAME = 'media';
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Helper to convert file to base64 for fallback storage
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export default function AboutTab({ /* onSpaceUpdate */ }: AboutTabProps) { // Removed onSpaceUpdate from props
  const { spaceData, loading, error, fetchSpaceData } = useSpace(); // Keep for now, evaluate if storeSpace can replace entirely
  const { user } = useAuth();
  const navigate = useNavigate();
  const { open: openSettingsModal } = useSpaceSettingsModal();
  const { 
    space: storeSpace, 
    loadActiveSpace, 
    permissions: storePermissions 
  } = useSpaceSettingsStore();
  
  // Use MembershipContext instead of direct Supabase calls
  const { 
    isMember, 
    isOwner, 
    loading: membershipLoading, 
    joinSpace 
  } = useMembership();
  
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
  
  // State for joining a space
  const [joiningSpace, setJoiningSpace] = useState(false);
  
  // Permissions from store
  const canEditSpace = storePermissions?.canEditSpace ?? false;
  
  // About description state - now initialized from storeSpace
  const [aboutDescription, setAboutDescription] = useState(storeSpace?.about_description || "");
  const [aboutCharCount, setAboutCharCount] = useState((storeSpace?.about_description || "").length);
  const [editingAbout, setEditingAbout] = useState(false);
  const [aboutChanged, setAboutChanged] = useState(false);
  const [savingAbout, setSavingAbout] = useState(false);
  
  // Update aboutDescription when storeSpace.about_description changes
  useEffect(() => {
    setAboutDescription(storeSpace?.about_description || "");
    setAboutCharCount((storeSpace?.about_description || "").length);
    setAboutChanged(false); // Reset changed status when underlying data changes
  }, [storeSpace?.about_description]);
  
  // Add state for owner information
  const [ownerData, setOwnerData] = useState<{
    id: string;
    email: string | null;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null>(null);
  
  const fetchOwnerData = async () => {
    if (!spaceData?.owner_id) return;
    
    try {
      console.log("Fetching owner data for ID:", spaceData?.owner_id);
      const { data, error } = await supabase
        .from('users')
        .select('id, email, display_name, avatar_url')
        .eq('id', spaceData?.owner_id)
        .single();
        
      if (error) {
        console.error("Error fetching owner data:", error);
        return;
      }
      
      if (data) {
        console.log("Owner data retrieved:", data);
        // Type assertion to handle the data properly
        const userData = data as unknown as {
          id: string;
          email: string | null;
          display_name: string | null;
          avatar_url: string | null;
        };
        
        // Only use the display_name if it exists
        setOwnerData({
          id: userData.id,
          email: userData.email,
          username: null,
          display_name: userData.display_name,
          avatar_url: userData.avatar_url
        });
      }
    } catch (err) {
      console.error("Exception fetching owner data:", err);
    }
  };
  
  useEffect(() => {
    fetchOwnerData();
  }, [spaceData?.owner_id]);
  
  const sidebarOwnerProps = ownerData 
    ? { ownerDisplayName: ownerData.display_name, ownerAvatarUrl: ownerData.avatar_url } 
    : { ownerDisplayName: undefined, ownerAvatarUrl: undefined };
  
  // Function to handle joining the space
  const handleJoinSpace = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (!spaceData?.id) {
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
      const success = await joinSpace(spaceData.id);
      
      if (success) {
        toast({
          title: "Joined space",
          description: `You've successfully joined ${spaceData.name}.`,
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
    setAboutChanged(val !== (storeSpace?.about_description || "")); // Compare with storeSpace
  };
  
  // Save about description
  const handleSaveAbout = async () => {
    if (!aboutChanged || !aboutDescription.trim() || !storeSpace?.id || !user) return; // Use storeSpace.id and check user
    
    setSavingAbout(true);
    try {
      // Create an update object with proper type assertion
      const updateData: Partial<Database['public']['Tables']['spaces']['Row']> = { about_description: aboutDescription.trim() };
      
      const { error } = await supabase
        .from('spaces')
        .update(updateData)
        .eq('id', storeSpace.id); // Use storeSpace.id
      
      if (error) throw error;
      
      toast({
        title: "Changes saved",
        description: "Your space description has been updated",
      });
      
      setEditingAbout(false);
      setAboutChanged(false);
      
      // Refresh data using loadActiveSpace from the store
      if (storeSpace?.subdomain && user?.id) {
        loadActiveSpace({ subdomain: storeSpace.subdomain }, user.id, true);
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
    setAboutDescription(storeSpace?.about_description || ""); // Reset from storeSpace
    setAboutCharCount((storeSpace?.about_description || "").length); // Reset from storeSpace
    setEditingAbout(false);
    setAboutChanged(false);
  };
  
  // Check if storage bucket exists
  useEffect(() => {
    const checkStorageBucket = async () => {
      try {
        console.log('Starting storage bucket check...');
        
        // First check if user is logged in
        const { data: session } = await supabase.auth.getSession();
        const isLoggedIn = !!session.session;
        
        if (!isLoggedIn) {
          console.log('User not logged in - skipping storage check');
          setStorageError('Sign in required for permanent storage. Using local storage only.');
          return;
        }

        // Simplified bucket check - just try to list files
        console.log('Testing storage access by listing files...');
        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKET_NAME)
          .list('');
        
        if (error) {
          console.error('Cannot list files in storage bucket:', error);
          setStorageError('Storage bucket not accessible. Using local storage only.');
          return;
        }
        
        console.log('Storage bucket accessible, files:', data);
        setStorageError(null);
        console.log('Storage check complete - using Supabase storage');
        
      } catch (err) {
        console.error('Failed to check storage bucket:', err);
        setStorageError('Unable to connect to storage service. Using local storage only.');
      }
    };
    
    checkStorageBucket();
  }, []);
  
  // Load saved media items from localStorage on component mount
  useEffect(() => {
    if (!spaceData?.id) return;
    
    const savedMedia = localStorage.getItem(`space_media_${spaceData?.id}`);
    if (savedMedia) {
      try {
        const parsedMedia = JSON.parse(savedMedia);
        setMediaItems(parsedMedia);
        // Always set the first item as active
        if (parsedMedia.length > 0) {
          setActiveMediaIndex(0);
        }
      } catch (e) {
        console.error("Failed to parse saved media", e);
      }
    }
  }, [spaceData?.id]);
  
  // Save media items to localStorage whenever they change
  useEffect(() => {
    if (mediaItems.length > 0 && spaceData?.id) {
      localStorage.setItem(`space_media_${spaceData?.id}`, JSON.stringify(mediaItems));
    } else if (spaceData?.id) {
      localStorage.removeItem(`space_media_${spaceData?.id}`);
    }
  }, [mediaItems, spaceData?.id]);
  
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
  
  // Update the uploadImageToStorage function to use Supabase when available
  const uploadImageToStorage = async (file: File): Promise<{ url: string, path: string } | null> => {
    if (!file) return null;
    
    // Check file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({
        title: "File too large",
        description: `File size must be less than ${MAX_FILE_SIZE_MB}MB.`,
        variant: "destructive"
      });
      return null;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      console.log('Processing file upload:', file.name, file.type, file.size);
      
      // Simulate progress for better UX
      setUploadProgress(25);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Check if we have storage access before trying to upload
      if (!storageError && user?.id) {
        try {
          // We have storage access, try to upload to Supabase
          // Use simpler path format: spaces/[filename]
          const filePath = `spaces/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          
          setUploadProgress(40);
          console.log('Attempting Supabase upload to:', filePath);
          
          // Upload to Supabase storage
          const { data, error } = await supabase.storage
            .from(STORAGE_BUCKET_NAME)
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: true
            });
          
          if (error) {
            console.error('Supabase storage upload failed:', error);
            throw error; // This will be caught by the outer try/catch
          }
          
          setUploadProgress(90);
          
          // Get the public URL
          const { data: { publicUrl } } = supabase.storage
            .from(STORAGE_BUCKET_NAME)
            .getPublicUrl(filePath);
          
          console.log('File uploaded to Supabase storage:', publicUrl);
          
          setUploadProgress(100);
          
          // Return the public URL and storage path
          return {
            url: publicUrl,
            path: filePath
          };
        } catch (uploadError) {
          console.error('Error during Supabase upload, falling back to base64:', uploadError);
          // Fall through to base64 encoding
        }
      }
      
      // Fall back to base64 if we don't have storage access or upload failed
      console.log('Using base64 encoding for local storage');
      setUploadProgress(60);
      const base64Data = await fileToBase64(file);
      setUploadProgress(90);
      console.log('File converted to base64');
      setUploadProgress(100);
      
      // Return base64 as the image source
      return { 
        url: base64Data, 
        path: '' // Empty path as we're not using storage
      };
    } catch (error: unknown) {
      console.error('Error uploading image:', error instanceof Error ? error.message : String(error));
      toast({
        title: "Upload error",
        description: (error instanceof Error ? error.message : String(error)) || "Something went wrong",
        variant: "destructive"
      });
      return null;
    } finally {
      // Keep the uploading state for a moment to show the 100% progress
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    }
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
            description: "Your YouTube video has been added and will persist across sessions.",
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
        console.log("Uploading file:", file.name, `(${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        
        // Upload to Supabase or fall back to temporary URL
        const uploadResult = await uploadImageToStorage(file);
        
        if (!uploadResult) {
          console.error("Upload failed or was cancelled");
          setSelectedFileName(null); // Reset selected filename on failure
          return; // Error already displayed in toast
        }
        
        // Create a new media item with the URL from storage or object URL
        const newMedia: MediaItem = {
          id: uuidv4(),
          type: 'image',
          url: uploadResult.url,
          storagePath: uploadResult.path
        };
        
        const newMediaItems = [...mediaItems, newMedia];
        setMediaItems(newMediaItems);
        // Set this as the active item
        setActiveMediaIndex(newMediaItems.length - 1);
        
        toast({
          title: "Image added",
          description: "Your image has been uploaded successfully.",
        });
        
        setShowMediaModal(false);
        setMediaLink("");
        setSelectedFileName(null); // Reset selected filename after upload
        
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
    } catch (error: unknown) {
      console.error('Error adding media:', error);
      toast({
        title: "Operation failed",
        description: (error instanceof Error ? error.message : String(error)) || "Something went wrong",
        variant: "destructive"
      });
      setSelectedFileName(null); // Reset selected filename on error
    }
  };
  
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // This will be triggered when a file is selected
    if (e.target.files?.length) {
      const file = e.target.files[0];
      console.log("File selected:", file.name, `(${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      
      // Set the selected filename
      setSelectedFileName(file.name);
      
      // Validate file size early
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          title: "File too large",
          description: `File size must be less than ${MAX_FILE_SIZE_MB}MB.`,
          variant: "destructive"
        });
        // Reset file input and filename
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
          setSelectedFileName(null);
        }
      }
    } else {
      setSelectedFileName(null);
    }
  };
  
  const handleImageUploadClick = () => {
    // Trigger file input click
    fileInputRef.current?.click();
  };
  
  const handleRemoveMedia = async (index: number) => {
    setMediaToDelete(index);
    setShowDeleteConfirm(true);
  };
  
  const confirmDelete = async () => {
    if (mediaToDelete === null) return;
    
    const index = mediaToDelete;
    const mediaItem = mediaItems[index];
    
    // If it's stored in Supabase and we have a path, try to delete it
    if (mediaItem.type === 'image' && mediaItem.storagePath && !storageError) {
      try {
        const { error } = await supabase.storage
          .from(STORAGE_BUCKET_NAME)
          .remove([mediaItem.storagePath]);
        
        if (error) {
          console.error('Failed to delete file from storage:', error);
        }
      } catch (err) {
        console.error('Error during file deletion:', err);
      }
    }
    
    setMediaItems(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      
      // Update active index if necessary
      if (activeMediaIndex === index) {
        setActiveMediaIndex(updated.length > 0 ? 0 : null);
      } else if (activeMediaIndex !== null && index < activeMediaIndex) {
        setActiveMediaIndex(activeMediaIndex - 1);
      }
      
      return updated;
    });
    
    // Close the confirmation dialog
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
  
  // Reorder the items and update the state
  const handleReorder = () => {
    // Exit if invalid indices
    if (dragItem.current === null || dragOverItem.current === null) return;
    
    // Create a new copy of the array
    const _mediaItems = [...mediaItems];
    
    // Get the dragged item content
    const draggedItemContent = _mediaItems[dragItem.current];
    
    // Remove from old position
    _mediaItems.splice(dragItem.current, 1);
    
    // Add at new position
    _mediaItems.splice(dragOverItem.current, 0, draggedItemContent);
    
    // Reset references
    dragItem.current = null;
    dragOverItem.current = null;
    
    // Update the media items array
    setMediaItems(_mediaItems);
    
    // Always set the first item as active
    setActiveMediaIndex(0);
    
    // Wait a moment before removing dragging state for animation
    setTimeout(() => {
      setDragging(false);
    }, 50);
    
    // Show success message
    toast({
      title: "Order updated",
      description: "Your media items have been reordered successfully.",
    });
  };

  // Handle starting to drag
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    console.log("Drag started on item:", index);
    
    // Store the dragged node reference
    dragNode.current = e.currentTarget;
    
    // Remember which item we're dragging
    dragItem.current = index;
    
    // Add dragging styles
    setTimeout(() => {
      setDragging(true);
    }, 0);
    
    // Add dragging class to the element
    e.currentTarget.classList.add('dragging');
    
    // Required for Firefox
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
  };

  // Handle dropping
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    console.log("Drop event occurred, reordering items");
    e.preventDefault();
    e.stopPropagation();
    
    // Remove dragging class from the dragged element
    if (dragNode.current) {
      dragNode.current.classList.remove('dragging');
      dragNode.current = null;
    }
    
    // Reorder the items
    handleReorder();
  };

  // Handle item being dragged over
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    
    // Exit early if the drag is over the same item or no item is being dragged
    if (dragItem.current === null || dragItem.current === index) return;
    
    // Update the target position
    dragOverItem.current = index;
    
    console.log(`Dragging item ${dragItem.current} over item ${index}`);
  };

  // Handle drag end
  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    console.log("Drag ended");
    e.preventDefault();
    
    // Remove dragging class
    if (dragNode.current) {
      dragNode.current.classList.remove('dragging');
    }
    
    // Reset state if reordering wasn't performed (for example, dragged outside of valid area)
    if (dragging) {
      setDragging(false);
    }
    
    // Reset references
    dragNode.current = null;
    dragItem.current = null;
    dragOverItem.current = null;
  };
  
  // Settings button handler
  const handleOpenSettings = () => {
    if (storeSpace?.id && storeSpace?.subdomain) {
      openSettingsModal(storeSpace.id, storeSpace.subdomain);
    } else {
      toast({
        title: "Error",
        description: "Space information is missing or not loaded yet.",
        variant: "destructive"
      });
    }
  };

  // Default values for properties that might be missing
  const memberCount = spaceData?.member_count ?? 1;
  const pricingType = spaceData?.pricing_type ?? 'free';
  const pricePerMonth = spaceData?.price_per_month ?? 0;
  const primaryColor = spaceData?.primary_color ?? '#26A69A';

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

  // Show loading state if data is being fetched
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-teal-600 mb-4" />
          <p className="text-lg font-medium text-gray-700">Loading space information...</p>
        </div>
      </div>
    );
  }
  
  // Show error state if there was a problem
  if (error || !spaceData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Alert variant="destructive" className="max-w-lg">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error ? `Error loading space: ${error.message}` : "Space data not available"}
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content Area */}
        <div className="flex-1 space-y-8">
          {/* About Description Section */}
    <div className="w-full bg-[#F5FAFA] p-6 rounded-xl">
          <h1 className="text-2xl font-bold mb-4 text-[#37474F]">{spaceData?.name}</h1>
          
          {/* Main media area */}
          {mediaItems.length > 0 && activeMedia ? (
            <div className="mb-6">
              {/* Main active media display */}
              <div className="mb-4">
                {activeMedia.type === 'video' ? (
                  <div className="rounded-xl overflow-hidden aspect-video shadow-lg">
                    <iframe 
                      src={activeMedia.url} 
                      className="w-full h-full"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowFullScreen
                    ></iframe>
                  </div>
                ) : (
                  <div className="rounded-xl overflow-hidden aspect-video shadow-lg">
                    <img 
                      src={activeMedia.url} 
                      alt="Uploaded content"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
              
              {/* Thumbnails row */}
              <div className="flex overflow-x-auto pb-2 space-x-2 border border-gray-200 rounded-lg p-2"
                   onDragOver={(e) => e.preventDefault()}
                   onDrop={handleDrop}>
                {mediaItems.map((item, index) => (
                  <div 
                    key={item.id} 
                    className={`
                      relative group flex-shrink-0 w-[90px] h-[56px] cursor-grab 
                      rounded-md overflow-hidden
                      ${activeMediaIndex === index ? 'ring-2 ring-[#26A69A]' : ''}
                      ${dragging && dragItem.current === index ? 'opacity-50 border-2 border-dashed' : ''}
                      ${dragging && dragOverItem.current === index ? 'border-2 border-amber-400' : ''}
                      transition-all duration-150
                    `}
                    onClick={() => handleThumbnailClick(index)}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    {item.type === 'video' ? (
                      <>
                        <img 
                          src={item.thumbnail} 
                          alt="Video thumbnail" 
                          className="w-full h-full object-cover"
                          draggable={false} 
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40">
                          <Play className="h-5 w-5 text-white" />
                        </div>
                      </>
                    ) : (
                      <img 
                        src={item.url} 
                        alt="Thumbnail" 
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    )}
                    
                    {/* Drag handle icon */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                      <div className="bg-black bg-opacity-50 rounded-full p-1">
                        <ArrowUpDown className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    
                    {/* Delete button (X) */}
                    <button
                      className="absolute top-1 right-1 bg-black bg-opacity-60 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveMedia(index);
                      }}
                      aria-label="Delete media"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                
                {/* Add button */}
                <div 
                  className="flex-shrink-0 w-[90px] h-[56px] flex items-center justify-center bg-[#E0F2F1] border-2 border-dashed border-[#26A69A] rounded-md cursor-pointer hover:bg-[#B2DFDB] transition-colors duration-200"
                  onClick={handleUploadImage}
                >
                  <Plus className="h-5 w-5 text-[#26A69A]" />
                </div>
              </div>
              
              {mediaItems.length > 1 && (
                <div className="flex items-center gap-2 mt-2">
                  <ArrowUpDown className="h-4 w-4 text-gray-500" />
                  <p className="text-xs text-gray-500">
                    Drag thumbnails to rearrange them. The first thumbnail will be displayed in the main view.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Upload area */
            <motion.div 
              whileHover={{ boxShadow: "0 6px 12px rgba(0, 0, 0, 0.15)" }}
              className="bg-[#E0F2F1] rounded-xl flex flex-col items-center justify-center cursor-pointer mb-6 border-2 border-dashed border-[#26A69A] transition-all duration-300 shadow-[0_4px_6px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.08)]"
              style={{ height: "396px" }}
              onClick={handleUploadImage}
            >
              <div className="p-6 rounded-full bg-[#B2DFDB] mb-3">
                <Upload className="h-8 w-8 text-[#26A69A]" />
              </div>
              <p className="text-[#26A69A] font-medium mb-1">Upload images / videos</p>
              <p className="text-[#78909C] text-sm">Click to browse or drag and drop</p>
            </motion.div>
          )}

          {/* Public/Member/Free metadata - similar to screenshot */}
          <div className="flex items-center mb-6">
            <div className="flex items-center">
              <Globe className="h-4 w-4 mr-1 text-gray-700" /> 
              <span className="text-sm text-gray-700">Public</span>
            </div>
            <div className="mx-3 text-gray-300">•</div>
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-1 text-gray-700" /> 
              <span className="text-sm text-gray-700">{spaceData?.member_count || 1} member{spaceData?.member_count !== 1 ? 's' : ''}</span>
            </div>
            <div className="mx-3 text-gray-300">•</div>
            <div className="flex items-center">
              <Tag className="h-4 w-4 mr-1 text-gray-700" /> 
              <span className="text-sm text-gray-700">{spaceData?.pricing_type === 'free' ? 'Free' : 'Paid'}</span>
            </div>
            <div className="ml-auto">
              <span className="text-sm text-gray-700">
                  By {(ownerData as any)?.display_name || spaceData?.owner?.display_name || 'Space Creator'}
              </span>
            </div>
          </div>
          
          {/* About this space section with description box */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-[#37474F] mb-3">About this space</h2>
            
              {canEditSpace && !editingAbout && (
              <div className="flex justify-end mb-2">
                <Button size="sm" variant="outline" onClick={() => setEditingAbout(true)}>
                  Edit
                </Button>
              </div>
            )}
            
            {editingAbout ? (
              <div className="border rounded-lg overflow-hidden">
                <textarea
                  placeholder="Add a description about your space..."
                  className="w-full min-h-[200px] text-base focus:outline-none resize-none px-4 py-4"
                  value={aboutDescription}
                  onChange={handleAboutChange}
                  maxLength={1000}
                />
                <div className="flex items-center justify-between px-4 py-2 bg-white text-xs text-gray-400">
                  <span>{aboutCharCount} / 1000</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={handleCancelAbout} disabled={savingAbout}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveAbout}
                      disabled={!aboutChanged || !aboutDescription.trim() || savingAbout}
                      className="bg-amber-300 hover:bg-amber-400 text-black font-semibold px-6"
                    >
                      {savingAbout ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border rounded-lg p-4 bg-gray-50 min-h-[150px]">
                <p className="whitespace-pre-line text-gray-700">
                    {aboutDescription || <span className="text-gray-400">No description yet.</span>}
                </p>
              </div>
            )}
            </div>
          </div>
        </div>
        
        {/* Sidebar Area - Now using SpaceInfoSidebar */}
        {storeSpace && (
          <div className="w-full lg:w-1/3 lg:max-w-sm flex-shrink-0">
            <SpaceInfoSidebar
              spaceName={storeSpace.name}
              spaceIcon={storeSpace.icon_image}
              coverImage={storeSpace.cover_image}
              isPrivate={storeSpace.is_private}
              memberCount={storeSpace.member_count}
              ownerDisplayName={sidebarOwnerProps.ownerDisplayName}
              ownerAvatarUrl={sidebarOwnerProps.ownerAvatarUrl}
              canAccessSettings={storePermissions?.canAccessSettings}
              subdomain={storeSpace.subdomain}
              spaceId={storeSpace.id}
            />
          </div>
        )}
        {!storeSpace && !loading && (
          <div className="w-full lg:w-1/3 lg:max-w-sm flex-shrink-0">
            <p>Loading space details for sidebar...</p>
          </div>
        )}

      </div>

      {/* Media Upload Modal */}
      <Dialog open={showMediaModal} onOpenChange={isUploading ? undefined : setShowMediaModal}>
        <DialogContent className="sm:max-w-md p-0 gap-0 rounded-xl overflow-hidden border-0">
          <DialogClose 
            className={`absolute right-3 top-3 p-1 rounded-full ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
            onClick={handleCloseModal}
            disabled={isUploading}
          >
            <X className="h-4 w-4 text-gray-500" />
          </DialogClose>
          
          <div className="p-6">
            <DialogTitle className="text-xl font-semibold mb-4">Add media</DialogTitle>
            
            {storageError && (
              <Alert variant="warning" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{storageError}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-4">
              <div>
                <p className="mb-2">Upload an image (1400 x 790 recommended, max {MAX_FILE_SIZE_MB}MB).</p>
                <input 
                  type="file" 
                  id="media-file-input" 
                  ref={fileInputRef}
                  accept="image/*" 
                  onChange={handleFileInputChange}
                  className="hidden" 
                />
                <Button 
                  variant="outline" 
                  onClick={handleImageUploadClick}
                  className={`w-full rounded-lg border-gray-300 py-6 uppercase tracking-wide ${selectedFileName ? 'bg-gray-50' : ''}`}
                  disabled={isUploading}
                >
                  {selectedFileName ? (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      CHANGE IMAGE
                    </>
            ) : (
                    "UPLOAD IMAGE"
                  )}
                </Button>
                
                {selectedFileName && (
                  <div className="mt-2 text-sm flex items-center text-gray-600">
                    <FileText className="h-3 w-3 mr-1" /> 
                    <span className="truncate">{selectedFileName}</span>
              </div>
            )}
              </div>
              
              <div className="text-center my-2">
                <p>Or, add a YouTube video link.</p>
              </div>
              
              <Input
                type="text"
                placeholder="YouTube Link"
                value={mediaLink}
                onChange={(e) => setMediaLink(e.target.value)}
                className="w-full p-3 rounded-lg"
                disabled={isUploading}
              />
            
              {isUploading && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">Uploading{uploadProgress === 100 ? ' complete' : '...'}</span>
                    <span className="text-sm text-gray-600">{uploadProgress}%</span>
              </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        uploadProgress === 100 ? 'bg-green-500' : 'bg-[#26A69A]'
                      }`}
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
              </div>
              </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end items-center p-4 bg-gray-50 border-t border-gray-100 rounded-b-xl">
            <Button 
              variant="ghost" 
              onClick={handleCloseModal}
              className="uppercase mr-2 font-medium text-gray-500 hover:text-gray-700"
              disabled={isUploading}
          >
              CANCEL
            </Button>
            
              <Button 
              onClick={handleAddMedia}
              className={`${
                isUploading ? 'bg-gray-400' : 'bg-amber-400 hover:bg-amber-500'
              } uppercase text-black font-medium px-8`}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {uploadProgress === 100 ? 'FINISHING...' : 'UPLOADING...'}
                </>
              ) : 'ADD'}
              </Button>
          </div>
        </DialogContent>
      </Dialog>
          
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md p-6 gap-6 rounded-xl">
          <DialogTitle className="text-xl font-semibold mb-2">Delete media?</DialogTitle>
          <p className="text-gray-700">Are you sure you want to delete? You can't undo this.</p>
          
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={cancelDelete}
              className="text-gray-500 font-medium"
            >
              CANCEL
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="bg-amber-400 hover:bg-amber-500 text-black font-medium"
            >
              DELETE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 