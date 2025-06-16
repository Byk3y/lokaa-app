import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useMembership } from "@/contexts/MembershipContext";
import { updateLastJoinedSpace } from "@/utils/userSpaceUtils";
import SpaceAboutDisplay from "@/components/space/SpaceAboutDisplay";
import { useSpaceAboutStore } from "@/features/spaces/store/space-about-store";
import { fetchSpaceMediaFromSupabase, MediaItem } from "@/utils/mediaStorageUtils";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { useOptimizedMemberCounts } from "@/hooks/useOptimizedMemberCounts";

// Main component that fetches space data and renders the content
export default function SpaceAboutPage() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useOptimizedAuth();
  const { joinSpace } = useMembership();

  // Use the new Zustand store
  const {
    spaceAboutData,
    loading,
    error,
    fetchSpaceAboutData,
  } = useSpaceAboutStore();

  const [isMember, setIsMember] = useState(false);
  const [checkingMembership, setCheckingMembership] = useState(true);
  const [joiningSpace, setJoiningSpace] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  
  // Use the useMemberCounts hook for real-time member counts
  const { 
    totalMembers, 
    onlineMembers, 
    adminMembers, 
    loading: countsLoading 
  } = useOptimizedMemberCounts(spaceAboutData?.id);
  
  // Keep these for backward compatibility
  const [adminCount, setAdminCount] = useState<number>(0);
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [activeMemberCount, setActiveMemberCount] = useState<number>(0);
  
  // Update state from our hook values
  useEffect(() => {
    if (!countsLoading) {
      setAdminCount(adminMembers);
      setOnlineCount(onlineMembers);
      setActiveMemberCount(totalMembers);
    }
  }, [adminMembers, onlineMembers, totalMembers, countsLoading]);

  // Fetch space data when subdomain changes
  useEffect(() => {
    if (subdomain) {
      fetchSpaceAboutData(undefined, subdomain);
    }
  }, [subdomain, fetchSpaceAboutData]);

  // Load media items from Supabase when spaceAboutData changes
  useEffect(() => {
    const loadMedia = async () => {
      if (spaceAboutData?.id) {
        const items = await fetchSpaceMediaFromSupabase(spaceAboutData.id);
        setMediaItems(items);
      }
    };
    loadMedia();
  }, [spaceAboutData?.id]);

  // Check if the user is a member of this space
  useEffect(() => {
    if (!user || !spaceAboutData?.id) {
      setCheckingMembership(false);
      setIsMember(false);
      return;
    }
    
    setCheckingMembership(true);
    
    const checkMembership = async () => {
      try {
        const { data: memberData, error: memberError } = await getSupabaseClient()
          .from('space_members')
          .select('id, status')
          .eq('user_id', user.id)
          .eq('space_id', spaceAboutData.id)
          .eq('status', 'active')
          .maybeSingle();
        
        if (memberError && memberError.code !== 'PGRST116') {
          throw memberError;
        }
        
        setIsMember(!!memberData);
      } catch (err) {
        console.error("Error checking membership:", err);
        setIsMember(false);
      } finally {
        setCheckingMembership(false);
      }
    };
    
    checkMembership();
  }, [user, spaceAboutData?.id]);

  // Handle redirects from other pages that might include state
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

  const handleJoinSpace = async () => {
    if (!user) {
      navigate('/auth/signin', { state: { from: location } });
      toast({ title: "Login Required", description: "Please log in to join this space." });
      return;
    }
    
    if (!spaceAboutData?.id) {
      toast({ title: "Error", description: "Space data not loaded.", variant: "destructive" });
      return;
    }
    
    setJoiningSpace(true);
    
    try {
      await joinSpace(spaceAboutData.id);
      toast({ title: "Joined Successfully!", description: `You are now a member of ${spaceAboutData.name}.` });
      setIsMember(true);
      
      if (spaceAboutData.id && spaceAboutData.name && spaceAboutData.subdomain) {
        updateLastJoinedSpace(spaceAboutData.id, user.id);
      }
      
      navigate(`/${spaceAboutData.subdomain}/space`, { replace: true });
    } catch (joinErr: any) {
      console.error("Error joining space:", joinErr);
      toast({ title: "Join Failed", description: joinErr.message || "Could not join the space.", variant: "destructive" });
    } finally {
      setJoiningSpace(false);
    }
  };
  
  const handleEditAbout = () => {
    if (spaceAboutData?.subdomain) {
      navigate(`/${spaceAboutData.subdomain}/space/about`);
      toast({ title: "Redirecting to Edit", description: "You will be redirected to the space dashboard to edit."});
    }
  };

  if (loading || checkingMembership) {
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

  if (!spaceAboutData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5FAFA] p-4 text-center">
        <h2 className="text-2xl font-semibold text-amber-600 mb-3">Space Not Found</h2>
        <p className="text-gray-600 mb-6">
          The space could not be found or is not available.
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
        <title>{`${spaceAboutData.name} - About | Lokaa`}</title>
        <meta 
          name="description" 
          content={spaceAboutData.description || `Learn more about ${spaceAboutData.name} on Lokaa.`} 
        />
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
          </div>
        </div>
      </div>

      <SpaceAboutDisplay
        name={spaceAboutData.name || ""}
        subdomain={spaceAboutData.subdomain || ""}
        shortDescription={spaceAboutData.description}
        aboutContent={spaceAboutData.about_description}
        mediaItems={mediaItems}
        introMediaType={spaceAboutData.intro_media_type as 'image' | 'video' | 'none' | null}
        introMediaUrl={spaceAboutData.intro_media_url}
        coverPhotoUrl={spaceAboutData.cover_image}
        spaceIconUrl={spaceAboutData.icon_image}
        isPrivate={spaceAboutData.is_private || false}
        pricingType={spaceAboutData.pricing_type || 'free'}
        pricePerMonth={spaceAboutData.price_per_month || 0}
        primaryColor={spaceAboutData.primary_color || "#2AB5A0"}
        onEditAbout={handleEditAbout}
        isOwner={user?.id === spaceAboutData.owner?.id}
        isMember={isMember}
        isAuthenticated={!!user}
        actionButtonText={`Join ${spaceAboutData.name}`}
        onAction={!isMember && user ? handleJoinSpace : undefined}
        owner={spaceAboutData.owner}
        memberCount={activeMemberCount}
        adminCount={adminCount}
        onlineCount={onlineCount}
      />
    </div>
  );
} 