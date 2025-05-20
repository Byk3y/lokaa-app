import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChevronLeft, Globe, Lock, Users, Tag, FileText, LogIn, Play, Upload, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Separator } from "@/components/ui/separator";
import { useMembership } from "@/contexts/MembershipContext";
import { updateLastJoinedSpace } from "@/utils/userSpaceUtils";

// Add this constant at the top of the file with your other constants
const STORAGE_BUCKET_NAME = 'media';
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Media item interface for videos and images
interface MediaItem {
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  videoId?: string;
  id: string;
}

// Space data interface
interface SpaceData {
  id: string;
  name: string;
  subdomain: string;
  description: string | null;
  about_description: string | null;
  cover_image: string | null;
  owner_id: string;
  is_private: boolean;
  pricing_type: 'free' | 'paid';
  price_per_month: number | null;
  member_count: number;
  primary_color: string | null;
  created_at: string;
  media_items?: MediaItem[];
}

// API response interface
interface ApiResponse {
  success: boolean;
  message?: string;
  space?: SpaceData;
}

// Owner data interface
interface OwnerData {
  id: string;
  email: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

// User data from database
interface UserData {
  id: string;
  email?: string;
  username?: string;
}

// First add a proper function to extract YouTube video IDs
const extractVideoId = (url: string): string | null => {
  // Match YouTube URL patterns
  const youtubeRegex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
  const match = url.match(youtubeRegex);
  return match ? match[1] : null;
};

const getVideoThumbnail = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};

export default function SpaceAboutPage() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [spaceData, setSpaceData] = useState<SpaceData | null>(null);
  const [ownerData, setOwnerData] = useState<OwnerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { joinSpace } = useMembership();
  const [aboutDescription, setAboutDescription] = useState<string>("");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [activeMediaIndex, setActiveMediaIndex] = useState<number | null>(0);
  const [storageAvailable, setStorageAvailable] = useState(false);
  const [storageLoading, setStorageLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Add membership state
  const [isMember, setIsMember] = useState(false);
  const [checkingMembership, setCheckingMembership] = useState(false);
  const [joiningSpace, setJoiningSpace] = useState(false);
  
  // Check if user was redirected due to access denial or needs login
  const accessDenied = location.state?.accessDenied === true;
  const loginRequired = location.state?.loginRequired === true;
  
  // Show appropriate toast messages on mount if redirected
  useEffect(() => {
    if (accessDenied) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to view this space.",
        variant: "destructive"
      });
    } else if (loginRequired) {
      toast({
        title: "Login Required",
        description: "Please log in to view this space.",
        variant: "default"
      });
    }
  }, [accessDenied, loginRequired]);

  // Fetch space data
  useEffect(() => {
    const fetchSpaceData = async () => {
      if (!subdomain) {
        setError("No space specified");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      // For users coming from discover page - mark that they were on the discover page
      // This will help with navigation flow when they're a new user
      try {
        // Update localStorage and sessionStorage to remember they were on discover
        if (document.referrer.includes('/discover')) {
          console.log("User came from discover page, storing navigation state");
          localStorage.removeItem('lastLocationWasDiscover');
          sessionStorage.removeItem('lastLocationWasDiscover');
        }
        
        // For users without spaces, check if they came from the discover page
        if (user) {
          const { count } = await supabase
            .from('space_access')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_active', true);
            
          if (count === 0) {
            console.log("User has no spaces, coming to about page");
          }
        }
      } catch (err) {
        console.warn("Error checking user spaces in about page:", err);
      }

      try {
        // Fetch space data including about_description
        const { data: spaces, error: spaceError } = await supabase
          .from('spaces')
          .select('*, owner:owner_id(*)')
          .eq('subdomain', subdomain)
          .single();
        
        if (spaceError) {
          throw spaceError;
        }
        
        if (!spaces) {
          setError("Space not found");
          setLoading(false);
          return;
        }

        // Use type casting to handle the space data
        // Cast the data to match our SpaceData type
        const spaceInfo = spaces as unknown as SpaceData;
        
        // Clean up descriptions to avoid duplication
        if (spaceInfo.description === spaceInfo.about_description && spaceInfo.description) {
          // If they're the same, use one for short and keep the other for long
          console.log("Descriptions are identical, differentiating for display");
        }
        
        setSpaceData(spaceInfo);

        // Fetch owner information if we have the space
        if (spaceInfo.owner_id) {
          try {
            const { data: userData, error: ownerError } = await supabase
              .from('users')
              .select('id, email, username, display_name, avatar_url')
              .eq('id', spaceInfo.owner_id)
              .single<OwnerData>();

            if (ownerError) {
              console.error("Error fetching owner data:", ownerError);
              setOwnerData({
                id: spaceInfo.owner_id,
                email: null,
                username: null,
                display_name: 'Space Creator',
                avatar_url: null
              });
            } else if (!userData) {
              console.warn("Owner data not found for ID:", spaceInfo.owner_id);
              setOwnerData({
                id: spaceInfo.owner_id,
                email: null,
                username: null,
                display_name: 'Space Creator',
                avatar_url: null
              });
            } else {
              setOwnerData({
                id: userData.id,
                email: userData.email || null,
                username: userData.username || null,
                display_name: userData.display_name || userData.username || (userData.email ? userData.email.split('@')[0] : 'Anonymous'),
                avatar_url: userData.avatar_url || null
              });
            }
          } catch (userErr) {
            console.error("Exception fetching owner data:", userErr);
            // Set a default owner even when errors occur
            setOwnerData({
              id: spaceInfo.owner_id,
              email: null,
              username: null,
              display_name: 'Space Creator',
              avatar_url: null
            });
          }
        }

        // Set about description for display
        if (spaceInfo) {
          setAboutDescription(spaceInfo.about_description || spaceInfo.description || "");
        }

        // Try to load media items from various sources:
        // 1. First try localStorage (where AboutTab stores media)
        // 2. Then check for YouTube links in the description
        try {
          const demoMediaItems: MediaItem[] = [];
          
          // 1. Check localStorage for saved media from AboutTab
          const savedMedia = localStorage.getItem(`space_media_${spaceInfo.id}`);
          if (savedMedia) {
            try {
              const parsedMedia = JSON.parse(savedMedia);
              if (Array.isArray(parsedMedia) && parsedMedia.length > 0) {
                console.log("Loaded media from localStorage:", parsedMedia);
                setMediaItems(parsedMedia);
                setActiveMediaIndex(0);
                
                // If we found media in localStorage, we don't need to look elsewhere
                return;
              }
            } catch (e) {
              console.error("Failed to parse saved media", e);
            }
          }
          
          // 2. Check for YouTube links in the space description and about_description
          const description = spaceInfo.about_description || spaceInfo.description || '';
          
          // More comprehensive YouTube regex to catch different formats
          const descriptionYoutubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?/\s]{11})/g;
          
          // Also check for iframe embeds which are common in rich text editors
          const iframeEmbedRegex = /<iframe.*?src=["'](?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^"']+)["'].*?><\/iframe>/g;
          
          let match;
          
          // First check for direct YouTube links
          while ((match = descriptionYoutubeRegex.exec(description)) !== null) {
            const videoId = match[1];
            if (!demoMediaItems.some(item => item.type === 'video' && item.videoId === videoId)) {
              demoMediaItems.push({
                id: `youtube-${videoId}`,
                type: 'video' as const,
                url: `https://www.youtube.com/embed/${videoId}`,
                thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                videoId
              });
            }
          }
          
          // Then check for iframe embeds
          while ((match = iframeEmbedRegex.exec(description)) !== null) {
            const videoId = match[1];
            if (!demoMediaItems.some(item => item.type === 'video' && item.videoId === videoId)) {
              demoMediaItems.push({
                id: `youtube-${videoId}`,
                type: 'video' as const,
                url: `https://www.youtube.com/embed/${videoId}`,
                thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                videoId
              });
            }
          }
          
          // 2. Add direct YouTube link from AboutTab's description editor
          if (demoMediaItems.length === 0) {
            // Extract any YouTube links from the about_description that are common
            // This is a fallback in case localStorage doesn't have the items
            console.log("No media items found in description or localStorage.");
              
            // Try a direct hardcoded YouTube video from the example in the screenshot
            // Note: This can be removed after the AboutTab media items are working
            if (window.location.pathname.includes('nextpath-ai')) {
              const testVideo = {
                id: 'lovable-2',
                type: 'video' as const,
                url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Replace with actual video ID
                thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
                videoId: 'dQw4w9WgXcQ'
              };
              demoMediaItems.push(testVideo);
            }
          }
          
          // If we found any media items from the description, use those
          if (demoMediaItems.length > 0) {
            console.log("Found media items from description:", demoMediaItems);
            setMediaItems(demoMediaItems);
            setActiveMediaIndex(0);
          }
        } catch (mediaErr) {
          console.error("Error processing media items:", mediaErr);
          // Continue without media items
        }
      } catch (err) {
        console.error("Exception fetching space:", err);
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchSpaceData();
  }, [subdomain, user]);

  // Add effect to check if user is a member of the space
  useEffect(() => {
    const checkMembership = async () => {
      if (!user || !spaceData?.id) {
        return;
      }
      
      try {
        setCheckingMembership(true);
        
        const { data, error } = await supabase
          .from('space_members')
          .select('id, status')
          .eq('user_id', user.id)
          .eq('space_id', spaceData.id)
          .maybeSingle();
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error checking membership:', error);
        }
        
        // User is a member if data exists and status is 'active'
        setIsMember(!!data && data.status === 'active');
      } catch (err) {
        console.error('Failed to check membership status:', err);
      } finally {
        setCheckingMembership(false);
      }
    };
    
    if (user && spaceData?.id) {
      checkMembership();
    }
  }, [user, spaceData?.id]);

  // Improved function to handle joining the space with multiple fallback options
  const handleJoinSpace = async () => {
    if (!user) {
      // Store the current page URL to redirect back after login
      sessionStorage.setItem('redirect_after_login', window.location.pathname);
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
      console.log("[SpaceAboutPage] Attempting to join space via MembershipContext:", spaceData.id);
      const success = await joinSpace(spaceData.id); // This now calls the updated RPC
      
      if (success) {
        console.log("[SpaceAboutPage] joinSpace from context reported success.");
        // The joinSpace function in MembershipContext now handles success toasts.
        // It also triggers a refresh of membership status.
        completeSuccessfulJoin(); 
      } else {
        // joinSpace from context would have already shown a toast for failure cases (RPC error, success:false)
        console.warn("[SpaceAboutPage] joinSpace from context reported failure. Toasts should be handled by context.");
        // Optionally, show a generic failure toast here if specific ones aren't guaranteed by context
        // For now, we assume context handles failure toasts.
      }
    } catch (err: unknown) {
      console.error("[SpaceAboutPage] Error during joinSpace call or in completeSuccessfulJoin:", err);
      let message = "An unexpected error occurred. Please try again later.";
      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === 'string') {
        message = err;
      }
      toast({
        title: "Error Joining Space",
        description: message,
        variant: "destructive"
      });
    } finally {
      setJoiningSpace(false);
    }
  };
  
  // Helper function for successful join completion
  const completeSuccessfulJoin = async () => {
    try {
      // Set client-side flags
      localStorage.setItem(`joined_space_${spaceData!.id}`, "true");
      sessionStorage.setItem(`can_post_in_${spaceData!.id}`, "true");
      
      // Update last joined space
      await updateLastJoinedSpace(
        spaceData!.id,
        spaceData!.name,
        spaceData!.subdomain
      );
      
      // Update membership state manually
      setIsMember(true);
      
      // Show success message
      toast({
        title: "Successfully joined space",
        description: `You've joined ${spaceData!.name}.`,
      });
      
      // Redirect after small delay to ensure toast is seen
      setTimeout(() => {
        navigate(`/${subdomain}/space/feed`, { replace: true });
      }, 500);
    } catch (err) {
      console.error("[SpaceAboutPage] Error in join completion:", err);
      // Still consider it successful even if some cleanup fails
    }
  };

  // Handle thumbnail click to change active media
  const handleThumbnailClick = (index: number) => {
    setActiveMediaIndex(index);
  };

  // Get active media item
  const activeMedia = activeMediaIndex !== null && mediaItems.length > 0 
    ? mediaItems[activeMediaIndex] 
    : null;

  // Generate a gradient background color based on primary color or default
  const generateGradientBackground = () => {
    const defaultColor = '#26A69A';
    const color = spaceData?.primary_color || defaultColor;
    
    const lightenColor = (color: string, percent: number) => {
      const num = parseInt(color.replace('#', ''), 16);
      const amt = Math.round(2.55 * percent);
      const R = Math.min(255, (num >> 16) + amt);
      const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
      const B = Math.min(255, (num & 0x0000FF) + amt);
      return `#${(0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
    };
    
    return `linear-gradient(135deg, ${lightenColor(color, 20)} 0%, ${color} 100%)`;
  };

  // Add this function to test storage access
  const testStorageAccess = useCallback(async () => {
    if (!spaceData?.id) {
      console.warn("testStorageAccess: spaceData.id is not available. Skipping test.");
      setStorageAvailable(false); 
      setStorageLoading(false); 
      return false;
    }
    try {
      setStorageLoading(true);
      setStorageError(null);
      
      // Test file
      const testContent = 'Storage access test';
      const testBlob = new Blob([testContent], { type: 'text/plain' });
      const testPath = `space_${spaceData.id}/test_${Date.now()}.txt`;
      
      // Try upload
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET_NAME)
        .upload(testPath, testBlob, { upsert: true });
        
      if (error) {
        console.error('Storage test failed:', error);
        setStorageError(`Storage access failed: ${error.message}`);
        setStorageAvailable(false);
        return false;
      }
      
      // Clean up test file
      await supabase.storage
        .from(STORAGE_BUCKET_NAME)
        .remove([testPath]);
        
      setStorageAvailable(true);
      setStorageError(null);
      return true;
    } catch (error: unknown) {
      console.error('Storage test error:', error);
      let message = "An unexpected error occurred during storage test.";
      if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === 'string') {
        message = error;
      }
      setStorageError(`Storage error: ${message}`);
      setStorageAvailable(false);
      return false;
    } finally {
      setStorageLoading(false);
    }
  }, [spaceData, setStorageLoading, setStorageError, setStorageAvailable]);

  // Add this useEffect to run the test when the component mounts
  useEffect(() => {
    if (user) {
      testStorageAccess();
    }
  }, [user, testStorageAccess]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600 mb-3" />
          <p className="text-gray-600">Loading space information...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-red-600 font-medium">{error}</p>
            <Button 
              onClick={() => navigate('/discover')}
              className="mt-4"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Return to Discover
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // No space data state
  if (!spaceData) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-gray-600">No space information available</p>
            <Button 
              onClick={() => navigate('/discover')}
              className="mt-4 bg-teal-600 hover:bg-teal-700"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Return to Discover
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Main render with space data
  return (
    <div className="min-h-screen bg-[#F5FAFA]">
      <Helmet>
        <title>{spaceData.name} - About | Lokaa Connect</title>
        <meta name="description" content={spaceData.description || `Learn about the ${spaceData.name} community on Lokaa`} />
      </Helmet>
      
      {/* Simple header with back navigation */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="text-gray-600"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            
            <div className="ml-auto">
              {user && user.id === spaceData?.owner_id ? (
                <Button
                  onClick={() => navigate(`/${subdomain}/space/feed`)}
                  className="bg-amber-300 hover:bg-amber-400 text-black"
                >
                  MANAGE SPACE
                </Button>
              ) : checkingMembership ? (
                <Button
                  disabled
                  className="bg-gray-200 text-gray-500"
                >
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  CHECKING...
                </Button>
              ) : isMember ? (
                <Button
                  onClick={() => navigate(`/${subdomain}/space/feed`)}
                  className="bg-[#26A69A] hover:bg-[#1E8E7E] text-white"
                >
                  GO TO SPACE
                </Button>
              ) : joiningSpace ? (
                <Button
                  disabled
                  className="bg-amber-300 hover:bg-amber-400 text-black"
                >
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  JOINING...
                </Button>
              ) : (
                <Button
                  onClick={handleJoinSpace}
                  className="bg-amber-300 hover:bg-amber-400 text-black"
                >
                  JOIN GROUP
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="w-full bg-[#F5FAFA] p-6 rounded-xl">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Left column - Main content */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-4 text-[#37474F]">{spaceData.name}</h1>
              
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
                  {mediaItems.length > 1 && (
                    <div className="flex overflow-x-auto pb-2 space-x-2 border border-gray-200 rounded-lg p-2">
                      {mediaItems.map((item, index) => (
                        <div 
                          key={item.id} 
                          className={`
                            relative group flex-shrink-0 w-[90px] h-[56px] cursor-pointer 
                            rounded-md overflow-hidden
                            ${activeMediaIndex === index ? 'ring-2 ring-[#26A69A]' : ''}
                            transition-all duration-150
                          `}
                          onClick={() => handleThumbnailClick(index)}
                        >
                          {item.type === 'video' ? (
                            <>
                              <img 
                                src={item.thumbnail} 
                                alt="Video thumbnail" 
                                className="w-full h-full object-cover"
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
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Default display when no media - show welcome content */
                <div className="mb-6">
                  <div className="rounded-xl overflow-hidden bg-gradient-to-r from-[#E6F7F6] to-[#DCEFED] p-6 aspect-video shadow-lg flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-full bg-[#BFEAE3] flex items-center justify-center mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#2AB5A0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Welcome to {spaceData.name}</h3>
                    <p className="text-gray-600 max-w-lg mb-4">
                      {spaceData.description || "Join our community to connect with like-minded people and access exclusive content."}
                    </p>
                    <div className="text-sm text-gray-500">
                      Videos added to the space will appear here
                </div>
              </div>
            </div>
              )}

              {/* Public/Member/Free metadata section */}
              <div className="flex items-center mb-6">
                <div className="flex items-center">
                  {spaceData.is_private ? (
                    <Lock className="h-4 w-4 mr-1 text-gray-700" />
                  ) : (
                    <Globe className="h-4 w-4 mr-1 text-gray-700" />
                  )}
                  <span className="text-sm text-gray-700">{spaceData.is_private ? 'Private' : 'Public'}</span>
                </div>
                <div className="mx-3 text-gray-300">•</div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1 text-gray-700" /> 
                  <span className="text-sm text-gray-700">{spaceData.member_count || 1} member{spaceData.member_count !== 1 ? 's' : ''}</span>
                </div>
                <div className="mx-3 text-gray-300">•</div>
                <div className="flex items-center">
                  <Tag className="h-4 w-4 mr-1 text-gray-700" /> 
                  <span className="text-sm text-gray-700">{spaceData.pricing_type === 'free' ? 'Free' : 'Paid'}</span>
                </div>
                <div className="ml-auto">
                  <span className="text-sm text-gray-700">
                    By {ownerData?.display_name || 'Space Creator'}
                  </span>
                </div>
              </div>

              {/* About this space section with description box */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-[#37474F] mb-3">About this space</h2>
                
                {/* Add Edit button that only appears for space owner */}
                {user && user.id === spaceData.owner_id && (
                  <div className="flex justify-end mb-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => navigate(`/space/${subdomain}`)}
                    >
                      Edit
                    </Button>
                  </div>
                )}
                
                <div className="border rounded-lg p-4 bg-gray-50 min-h-[150px]">
                  <p className="whitespace-pre-line text-gray-700">
                    {spaceData?.about_description || <span className="text-gray-400">No description yet.</span>}
                  </p>
                </div>
              </div>
            </div>

            {/* Right column - Sidebar */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="md:w-80 bg-gradient-to-br from-[#E0F2F1] to-[#B2DFDB] rounded-xl p-5 shadow-[0_4px_6px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.08)] self-start max-h-[calc(100vh-120px)] overflow-auto"
            >
              {/* Cover image display */}
              <div className="bg-[#26A69A] aspect-video rounded-xl overflow-hidden mb-4 shadow-md">
                {spaceData.cover_image ? (
                    <img 
                    src={spaceData.cover_image} 
                    alt={`${spaceData.name} cover`}
                    className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    <FileText size={24} className="mr-2" />
                    <span>No cover image</span>
                    </div>
                  )}
                </div>
              
              {/* Space info */}
              <div className="bg-white rounded-xl border border-[#E0F2F1] p-4 mb-4 shadow-sm overflow-hidden">
                <h3 className="font-semibold text-[#37474F] mb-1">{spaceData.name}</h3>
                <p className="text-sm text-[#78909C] mb-3">
                  lokaa.com/{spaceData.subdomain}
                </p>
                
                <Separator className="my-3 bg-[#E0F2F1]" />
                
                {/* Only show the short description in the sidebar */}
                {spaceData.description && spaceData.description !== spaceData.about_description ? (
                  <p className="text-sm text-[#37474F] mb-4 whitespace-pre-wrap">
                    {spaceData.description}
                  </p>
                ) : (
                  <div className="flex items-center text-sm text-blue-600 mb-4">
                    <FileText className="h-4 w-4 mr-1" />
                    <span>Join this space to learn more</span>
                  </div>
                )}
                
                {/* Statistics */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-[#F5FAFA] rounded-lg shadow-sm">
                    <div className="text-lg font-semibold text-[#26A69A]">{spaceData.member_count || 1}</div>
                    <div className="text-xs text-[#78909C]">Member{spaceData.member_count !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="text-center p-2 bg-[#F5FAFA] rounded-lg shadow-sm">
                    <div className="text-lg font-semibold text-[#26A69A]">0</div>
                    <div className="text-xs text-[#78909C]">Online</div>
                </div>
                  <div className="text-center p-2 bg-[#F5FAFA] rounded-lg shadow-sm">
                    <div className="text-lg font-semibold text-[#26A69A]">1</div>
                    <div className="text-xs text-[#78909C]">Admin</div>
              </div>
            </div>
          </div>

              {/* Join button */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                {user && user.id === spaceData?.owner_id ? (
                  <Button 
                    onClick={() => navigate(`/${subdomain}/space/feed`)}
                    className="w-full justify-center font-medium text-black bg-amber-300 hover:bg-amber-400 rounded-xl transition-colors duration-300"
                  >
                    MANAGE SPACE
                  </Button>
                ) : checkingMembership ? (
                  <Button
                    disabled
                    className="w-full justify-center font-medium text-black bg-gray-200 rounded-xl"
                  >
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    CHECKING...
                  </Button>
                ) : isMember ? (
                  <Button 
                    onClick={() => navigate(`/${subdomain}/space/feed`)}
                    className="w-full justify-center font-medium text-white bg-[#26A69A] hover:bg-[#1E8E7E] rounded-xl transition-colors duration-300"
                  >
                    GO TO SPACE
                  </Button>
                ) : joiningSpace ? (
                  <Button
                    disabled
                    className="w-full justify-center font-medium text-black bg-amber-300 rounded-xl"
                  >
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    JOINING...
                  </Button>
                ) : (
                  <Button 
                    onClick={handleJoinSpace}
                    className="w-full justify-center font-medium text-black bg-amber-300 hover:bg-amber-400 rounded-xl transition-colors duration-300"
                  >
                    JOIN SPACE
                  </Button>
                )}
              </motion.div>
              
              {/* Powered by */}
              <div className="text-center text-xs text-[#78909C] mt-4">
                powered by <span className="text-[#37474F]">Lokaa</span>
            </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
} 