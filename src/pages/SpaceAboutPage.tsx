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
import SpaceAboutDisplay from "@/components/space/SpaceAboutDisplay";
import type { Json } from "@/types/supabase";

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

// Space data interface (matching the RPC response structure for 'space' object)
interface SpaceRpcDataObject {
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
  member_count: number; // Assuming RPC provides this, adjust if not
  primary_color: string | null;
  created_at: string;
  // media_items are handled client-side in this component for now
}

// This interface should match the JSON structure *returned by the SQL function itself*
interface AboutPageGetSpaceFnReturn {
  success: boolean;
  message?: string;
  space?: SpaceRpcDataObject;
}

// Owner data interface
interface OwnerData {
  id: string;
  email: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

// User data from database (if needed, though useAuth provides user object)
// interface UserData {
//   id: string;
//   email?: string;
//   username?: string;
// }

const extractVideoId = (url: string): string | null => {
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
  const [spaceData, setSpaceData] = useState<SpaceRpcDataObject | null>(null);
  const [ownerData, setOwnerData] = useState<OwnerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const { joinSpace } = useMembership();
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);

  const [isMember, setIsMember] = useState(false);
  const [checkingMembership, setCheckingMembership] = useState(true);
  const [joiningSpace, setJoiningSpace] = useState(false);
  
  useEffect(() => {
    if (location.state?.accessDenied === true) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to view this space.",
        variant: "destructive"
      });
    } else if (location.state?.loginRequired === true) {
      toast({
        title: "Login Required",
        description: "Please log in to view this space.",
        variant: "default"
      });
    }
  }, [location.state]);

  useEffect(() => {
    const fetchSpaceData = async () => {
      if (!subdomain) {
        setError("No space specified");
        setLoading(false);
        setCheckingMembership(false);
        return;
      }

      setLoading(true);
      setError(null);
      setCheckingMembership(true);
      
      try {
        if (document.referrer.includes('/discover')) {
          console.log("User came from discover page, storing navigation state");
          localStorage.removeItem('lastLocationWasDiscover');
          sessionStorage.removeItem('lastLocationWasDiscover');
        }
        
        // Type for the arguments passed to the RPC function
        type AboutPageGetSpaceArgs = { target_subdomain: string };

        // Attempt to use 'any' for Returns if strict typing fails
        const { data, error: rpcError } = await supabase.rpc<
          'about_page_get_space',
          { Args: AboutPageGetSpaceArgs; Returns: Json }
        >(
          'about_page_get_space',
          { target_subdomain: subdomain }
        );

        if (rpcError) {
          console.error("RPC Error fetching space data:", rpcError);
          throw new Error(rpcError.message);
        }
        
        const rpcFnReturn = data as unknown as AboutPageGetSpaceFnReturn | null;

        if (!rpcFnReturn || !rpcFnReturn.success || !rpcFnReturn.space) {
          setError(rpcFnReturn?.message || "Space not found or could not be loaded.");
          setSpaceData(null);
          setLoading(false);
          setCheckingMembership(false);
          return;
        }
        
        const spaceInfo = rpcFnReturn.space;
        setSpaceData(spaceInfo);

        if (spaceInfo.owner_id) {
          try {
            const { data: userData, error: ownerFetchError } = await supabase
              .from('users')
              .select('id, email, username, display_name, avatar_url')
              .eq('id', spaceInfo.owner_id)
              .single<OwnerData>();

            if (ownerFetchError) throw ownerFetchError;
            if (!userData) throw new Error('Owner not found');
            setOwnerData(userData);
          } catch (userErr) {
            console.error("Error fetching owner data:", userErr);
            setOwnerData({
              id: spaceInfo.owner_id,
                email: null, username: null,
                display_name: 'Space Creator', avatar_url: null
            });
          }
        }

        const loadedMediaItems: MediaItem[] = [];
        try {
            const storedMedia = localStorage.getItem(`space_media_${spaceInfo.id}`);
            if (storedMedia) {
                const parsedMedia = JSON.parse(storedMedia);
                if (Array.isArray(parsedMedia)) {
                    loadedMediaItems.push(...parsedMedia.map((item: any) => ({
                        id: item.id || crypto.randomUUID(),
                        type: item.type || (item.url?.includes('youtube.com') || item.url?.includes('youtu.be') ? 'video' : 'image'),
                        url: item.url,
                        thumbnail: item.thumbnail || (item.url?.includes('youtube.com') || item.url?.includes('youtu.be') ? getVideoThumbnail(extractVideoId(item.url) || '') : item.url),
                        videoId: item.url?.includes('youtube.com') || item.url?.includes('youtu.be') ? extractVideoId(item.url) : undefined,
                    })));
                }
            }
        } catch (e) {
            console.warn("Failed to load media from localStorage", e);
        }

        if (loadedMediaItems.length === 0) {
            const textToScan = spaceInfo.about_description || spaceInfo.description || "";
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const urls = textToScan.match(urlRegex) || [];
            for (const url of urls) {
                const videoId = extractVideoId(url);
                if (videoId) {
                    loadedMediaItems.push({
                        id: crypto.randomUUID(),
                        type: 'video',
                        url: `https://www.youtube.com/watch?v=${videoId}`,
                        thumbnail: getVideoThumbnail(videoId),
                        videoId: videoId,
                    });
                }
            }
        }
        setMediaItems(loadedMediaItems);

      } catch (err: any) {
        console.error("Failed to fetch space data:", err);
        setError(err.message || "An unknown error occurred");
        setSpaceData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSpaceData();
  }, [subdomain]);

  useEffect(() => {
    if (!user || !spaceData || !spaceData.id) {
      setCheckingMembership(false);
      setIsMember(false);
      return;
    }
    setCheckingMembership(true);
    const checkMembership = async () => {
      try {
        const { data: accessData, error: accessError } = await supabase
          .from('space_access')
          .select('id')
          .eq('user_id', user.id)
          .eq('space_id', spaceData.id)
          .eq('is_active', true)
          .maybeSingle();
        
        if (accessError) throw accessError;
        setIsMember(!!accessData);
      } catch (err) {
        console.error("Error checking membership:", err);
        setIsMember(false);
      } finally {
        setCheckingMembership(false);
      }
    };
      checkMembership();
  }, [user, spaceData]);

  const handleJoinSpace = async () => {
    if (!user) {
      navigate('/auth/signin', { state: { from: location } });
      toast({ title: "Login Required", description: "Please log in to join this space." });
      return;
    }
    if (!spaceData || !spaceData.id) {
      toast({ title: "Error", description: "Space data not loaded.", variant: "destructive" });
      return;
    }
    
    setJoiningSpace(true);
    try {
      // Assuming joinSpace from context now only needs spaceId, and user is inferred from context
      await joinSpace(spaceData.id);
      toast({ title: "Joined Successfully!", description: `You are now a member of ${spaceData.name}.` });
      setIsMember(true);
      updateLastJoinedSpace(spaceData.id, spaceData.name, spaceData.subdomain);
      navigate(`/${spaceData.subdomain}/space/feed`, { replace: true });
    } catch (joinErr: any) {
      console.error("Error joining space:", joinErr);
      toast({ title: "Join Failed", description: joinErr.message || "Could not join the space.", variant: "destructive" });
    } finally {
      setJoiningSpace(false);
    }
  };
  
  const handleEditAbout = () => {
    if (spaceData?.subdomain) {
      navigate(`/${spaceData.subdomain}/space/about`); // Or to a specific settings/edit page
       toast({ title: "Redirecting to Edit", description: "You will be redirected to the space dashboard to edit."});
    }
  };

  if (loading || authLoading || checkingMembership) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5FAFA]">
        <Loader2 className="h-12 w-12 animate-spin text-[#2AB5A0]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5FAFA] p-4 text-center">
        <h2 className="text-2xl font-semibold text-red-600 mb-3">Oops! Something went wrong.</h2>
        <p className="text-red-500 mb-6">{error}</p>
        <Button onClick={() => navigate("/discover")} variant="outline">
          Discover Other Spaces
            </Button>
      </div>
    );
  }

  if (!spaceData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5FAFA] p-4 text-center">
        <h2 className="text-2xl font-semibold text-amber-600 mb-3">Space Not Found</h2>
        <p className="text-gray-600 mb-6">
          The space at "{subdomain}" could not be found or is not available.
        </p>        
        <Button onClick={() => navigate("/discover")} className="bg-[#2AB5A0] hover:bg-[#249B8A] text-white">
          Discover Other Spaces
            </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5FAFA] dark:bg-gray-900">
      <Helmet>
        <title>{spaceData.name} - About | Lokaa Connect</title>
        <meta name="description" content={spaceData.description || `Learn about the ${spaceData.name} community on Lokaa`} />
      </Helmet>
      
      <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="mr-2 h-5 w-5" />
              Back
            </Button>
            <div className="ml-auto">
            </div>
          </div>
        </div>
      </div>

      <SpaceAboutDisplay
        name={spaceData.name}
        subdomain={spaceData.subdomain}
        shortDescription={spaceData.description}
        aboutDescription={spaceData.about_description}
        mediaItems={mediaItems}
        isPrivate={spaceData.is_private}
        memberCount={spaceData.member_count}
        pricingType={spaceData.pricing_type}
        pricePerMonth={spaceData.price_per_month}
        owner={ownerData ? { display_name: ownerData.display_name, avatar_url: ownerData.avatar_url } : null}
        primaryColor={spaceData.primary_color}
        onJoinSpace={handleJoinSpace}
        onEditAbout={handleEditAbout}
        isOwner={user?.id === spaceData.owner_id}
        isMember={isMember}
        isLoadingJoin={joiningSpace}
        isAuthenticated={!!user}
      />
    </div>
  );
} 