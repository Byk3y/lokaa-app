import React, { useState, useEffect, memo } from "react";
import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { useSpace } from "@/contexts/SpaceContext";
import { useMembership } from "@/contexts/MembershipContext";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import useSpaceSettingsStore from "@/hooks/useSpaceSettingsStore";
import { useSimpleMemberCounts } from "@/hooks/useSimpleMemberCounts";
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { fetchSpaceMediaFromSupabase, MediaItem } from "@/utils/mediaStorageUtils";
import SpaceInfoSidebar from "./SpaceInfoSidebar";
import SpaceMediaGallery from "./SpaceMediaGallery";
import SpaceMembershipActions from "./SpaceMembershipActions";
import SpaceDescriptionEditor from "./SpaceDescriptionEditor";
import SpaceSettingsAccess from "./SpaceSettingsAccess";
import SpaceStatsDisplay from "./SpaceStatsDisplay";

interface AboutTabLayoutProps {
  /** Dummy prop to avoid empty interface warning */
  _key?: string;
}

export const AboutTabLayout = memo(function AboutTabLayout(props: AboutTabLayoutProps) {
  const { space: spaceData, loading, error } = useSpace();
  const { user } = useOptimizedAuth();
  const { 
    space: storeSpace, 
    permissions: storePermissions 
  } = useSpaceSettingsStore();
  
  // Use the same fallback pattern as other tabs
  const currentSpaceData = storeSpace || spaceData;
  
  // Use MembershipContext for membership operations
  const { 
    isMember, 
    loading: membershipLoading, 
  } = useMembership();
  
  // Use the unified member counts hook
  const memberCounts = useSimpleMemberCounts(currentSpaceData?.id || '');
  
  // Local state for media items
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [activeMediaIndex, setActiveMediaIndex] = useState<number | null>(null);
  
  // Permissions from store
  const canEditSpace = storePermissions?.canEditSpace ?? false;
  const canAccessSettings = storePermissions?.canAccessSettings ?? false;
  
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
  
  // Add mobile detection for conditional rendering
  const isDesktop = useMediaQuery('(min-width: 1024px)'); // lg breakpoint
  
  // Default values for properties that might be missing
  const pricingType = currentSpaceData?.pricing_type ?? 'free';
  const pricePerMonth = currentSpaceData?.price_per_month ?? 0;

  // Early returns for error and loading states are handled by parent component
  if (!currentSpaceData) {
    return null;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-x-8 gap-y-4 p-2 md:p-3 bg-gray-50 dark:bg-gray-900 min-h-full">
      <motion.div 
        className="flex-grow space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Media Gallery Section */}
        <SpaceMediaGallery
          spaceId={currentSpaceData.id}
          mediaItems={mediaItems}
          mediaLoading={mediaLoading}
          activeMediaIndex={activeMediaIndex}
          onActiveIndexChange={setActiveMediaIndex}
          canEditSpace={canEditSpace}
          ownerData={ownerData}
          onRefetchMedia={refetchMedia}
          onMediaItemsChange={setMediaItems}
          spaceData={{
            name: currentSpaceData.name,
            intro_media_type: currentSpaceData.intro_media_type,
            intro_media_url: currentSpaceData.intro_media_url,
            cover_image: currentSpaceData.cover_image,
            icon_image: currentSpaceData.icon_image,
          }}
        />

        {/* Space Stats Display */}
        <SpaceStatsDisplay
          isPrivate={currentSpaceData.is_private}
          memberCounts={memberCounts}
          pricing={{
            type: pricingType,
            pricePerMonth: pricePerMonth
          }}
        />

        {/* Membership Actions */}
        <SpaceMembershipActions
          spaceData={{
            id: currentSpaceData.id,
            name: currentSpaceData.name
          }}
          isMember={isMember}
          membershipLoading={membershipLoading}
        />

        {/* Settings Access */}
        <SpaceSettingsAccess
          spaceData={{
            id: currentSpaceData.id,
            subdomain: currentSpaceData.subdomain
          }}
          canAccessSettings={canAccessSettings}
        />

        {/* Description Editor Section */}
        <SpaceDescriptionEditor
          spaceData={{
            id: currentSpaceData.id,
            subdomain: currentSpaceData.subdomain,
            about_description: currentSpaceData.about_description
          }}
          canEditSpace={canEditSpace}
        />
        
        <Separator className="my-6" />
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
});

export default AboutTabLayout;