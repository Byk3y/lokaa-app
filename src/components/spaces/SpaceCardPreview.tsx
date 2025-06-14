import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Globe, Lock, Users, Tag } from "lucide-react";
// import { SpaceData } from "@/hooks/useSpaceData"; // Old type
import { SpaceAboutData } from "@/hooks/useSpaceAboutData"; // New type
import SpaceIntroDisplay from "@/components/space/SpaceIntroDisplay"; // Import the new component
import SpaceInfoSidebar from "@/components/space/SpaceInfoSidebar";
import MediaGallery from "@/components/space/MediaGallery"; // Import MediaGallery component
import { useSpaceMembers } from "@/hooks/useSpaceMembers";
import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { fetchSpaceMediaFromSupabase, MediaItem } from "@/utils/mediaStorageUtils";
import { useMemberCounts } from "@/hooks/useMemberCounts"; // Import our new hook

interface SpaceCardPreviewProps {
  space: SpaceAboutData; // Use new type
  onJoin: () => void;
}

export default function SpaceCardPreview({ space, onJoin }: SpaceCardPreviewProps) {
  // Use the same approach as FeedTab to get accurate member counts
  const spaceId = space.id;
  const { stats: memberStats } = useSpaceMembers({ spaceId });
  
  // Use our new hook for real-time counts
  const { 
    totalMembers, 
    onlineMembers, 
    adminMembers,
    loading: countsLoading 
  } = useMemberCounts(spaceId);
  
  // Keep previous state variables for compatibility with existing code 
  const [adminCount, setAdminCount] = useState<number>(0);
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [activeMemberCount, setActiveMemberCount] = useState<number>(0);
  
  // Update state from our hook
  useEffect(() => {
    if (!countsLoading) {
      setAdminCount(adminMembers);
      setOnlineCount(onlineMembers);
      setActiveMemberCount(totalMembers);
    }
  }, [adminMembers, onlineMembers, totalMembers, countsLoading]);

  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [activeMediaIndex, setActiveMediaIndex] = useState<number | null>(null);

  // Fetch media gallery from Supabase
  useEffect(() => {
    const loadMedia = async () => {
      if (space?.id) {
        const items = await fetchSpaceMediaFromSupabase(space.id);
        setMediaItems(items);
        if (items.length > 0) setActiveMediaIndex(0);
      }
    };
    loadMedia();
  }, [space?.id]);
  
  // Determine main media based on gallery or intro media
  const activeMedia = activeMediaIndex !== null ? mediaItems[activeMediaIndex] : null;
  
  // Determine main media based on intro_media_type and intro_media_url
  const showIntroMedia = space.introMediaType === 'image' || space.introMediaType === 'video';
  const mediaUrl = space.introMediaUrl;
  const mediaType = space.introMediaType;
  // Fallback to coverPhotoUrl if no intro media
  const displayMediaUrl = showIntroMedia && mediaUrl ? mediaUrl : space.coverPhotoUrl;
  const displayMediaType = showIntroMedia && mediaUrl ? mediaType : (space.coverPhotoUrl ? 'image' : 'none'); // Treat cover as image
  
  // Add state for description expand/collapse
  const [descExpanded, setDescExpanded] = useState(false);
  // Helper to determine if description is too long
  const getDescriptionLines = (text: string) => text.split(/\r?\n/);
  const aboutText = space.aboutContent || space.shortDescription || '';
  const aboutLines = getDescriptionLines(aboutText);
  const isTooLong = aboutText.length > 300 || aboutLines.length > 8;
  const collapsedText = aboutLines.slice(0, 8).join('\n');
  const showViewMore = isTooLong;
  
  return (
    <div className="flex flex-col md:flex-row bg-white rounded-xl overflow-hidden shadow-md">
      {/* Left Column: Main content */}
      <div className="flex-1 p-6 overflow-y-auto" style={{ maxHeight: "600px" }}>
        {/* Media Gallery or fallback to intro/cover */}
        <div className="mb-6">
          {mediaItems.length > 0 ? (
            <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              <MediaGallery
                mediaItems={mediaItems}
                readOnly={true}
                activeIndex={activeMediaIndex ?? 0}
                onActiveChange={setActiveMediaIndex}
                ownerData={space.owner}
                showOwner={true}
              />
            </div>
          ) : (
            <SpaceIntroDisplay 
              name={space.name}
              introMediaType={space.introMediaType}
              introMediaUrl={space.introMediaUrl}
              coverPhotoUrl={space.coverPhotoUrl}
              spaceIconUrl={space.spaceIconUrl}
            />
          )}
        </div>
        
        {/* Metadata Row */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center">
            {space.is_private ? (
              <Lock className="h-4 w-4 mr-1 text-gray-600" />
            ) : (
              <Globe className="h-4 w-4 mr-1 text-gray-600" />
            )}
            <span className="text-sm">{space.is_private ? 'Private' : 'Public'}</span>
          </div>
          
          <div className="flex items-center">
            <Users className="h-4 w-4 mr-1 text-gray-600" />
            <span className="text-sm">{activeMemberCount || 0} members</span>
          </div>
          
          <div className="flex items-center">
            <Tag className="h-4 w-4 mr-1 text-gray-600" />
            <span className="text-sm">{space.pricing_type === 'free' ? 'Free' : `$${space.price_per_month || 0}/month`}</span>
          </div>
        </div>
        
        {/* About Section (Long Description) - Read-only */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">About this space</h2>
          <div className="border rounded-lg p-4 bg-gray-50">
            {aboutText ? (
              <>
                <p className="whitespace-pre-line text-gray-700">
                  {descExpanded || !showViewMore ? aboutText : collapsedText + (aboutLines.length > 8 ? '\n...' : '')}
                </p>
                {showViewMore && (
                  <button
                    className="mt-2 text-teal-600 hover:underline text-sm font-medium focus:outline-none"
                    onClick={() => setDescExpanded((v) => !v)}
                  >
                    {descExpanded ? 'Show less' : 'View more'}
                  </button>
                )}
              </>
            ) : (
              <div className="text-gray-600">
                <p className="mb-2">This space is a community where members can connect, share ideas, and collaborate.</p>
                <p className="text-sm text-gray-500">The space creator hasn't added a detailed description yet.</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Mobile CTA Button - Only visible on mobile */}
        <div className="block md:hidden mb-4">
          <Button 
            onClick={onJoin}
            className="w-full justify-center font-medium text-black bg-amber-300 hover:bg-amber-400 rounded-xl py-2.5"
          >
            Join {space.name ? space.name.charAt(0).toUpperCase() + space.name.slice(1) : ""}
          </Button>
        </div>
      </div>
      
      {/* Right Column: Use SpaceInfoSidebar instead of custom sidebar */}
      <div className="hidden md:block md:w-[273px] bg-gradient-to-br from-[#E0F2F1] to-[#B2DFDB] p-0 shadow-sm self-start rounded-r-xl">
        <SpaceInfoSidebar
          spaceName={space.name ? space.name.charAt(0).toUpperCase() + space.name.slice(1) : ""}
          spaceIcon={space.spaceIconUrl}
          spaceDescription={space.shortDescription}
          coverImage={space.coverPhotoUrl}
          isPrivate={space.is_private}
          memberCount={activeMemberCount}
          adminCount={adminCount}
          onlineCount={onlineCount}
          subdomain={space.subdomain}
          spaceId={space.id}
          actionButtonText={`Join ${space.name ? space.name.charAt(0).toUpperCase() + space.name.slice(1) : ""}`}
          onAction={onJoin}
        />
      </div>
    </div>
  );
} 