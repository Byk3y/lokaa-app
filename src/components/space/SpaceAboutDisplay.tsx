import React from 'react';
import { Globe, Lock, Users, Tag, FileText } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import SpaceIntroDisplay from "@/components/space/SpaceIntroDisplay";
import SpaceInfoSidebar from "@/components/space/SpaceInfoSidebar";
import MediaGallery from "@/components/space/MediaGallery";
import { MediaItem } from "@/utils/mediaStorageUtils";
import { useMediaQuery } from '@/hooks/useMediaQuery';

// Removed MediaItem interface as it's replaced by direct props

interface OwnerInfo {
  // Changed from OwnerData to OwnerInfo to match SpaceAboutData structure more closely
  id: string; // Assuming id is part of owner data we might need, even if not displayed
  full_name: string | null;
  avatar_url?: string | null; // Make optional to match the structure from spaceAboutData.owner
}

interface SpaceAboutDisplayProps {
  name: string;
  subdomain: string;
  shortDescription?: string | null;
  aboutContent: string | null; // Renamed from aboutDescription to match SpaceAboutData
  // Added mediaItems
  mediaItems?: MediaItem[] | null;
  introMediaType?: 'image' | 'video' | 'none' | null;
  introMediaUrl?: string | null;
  coverPhotoUrl?: string | null;
  spaceIconUrl?: string | null; // Added for placeholder

  isPrivate: boolean;
  memberCount?: number | null;
  pricingType: 'free' | 'paid';
  pricePerMonth?: number | null;
  owner?: OwnerInfo | null; // Updated owner type
  primaryColor?: string | null;

  onEditAbout?: () => void;
  isOwner?: boolean;
  isMember?: boolean;
  isAuthenticated?: boolean;
  adminCount?: number | null;
  onlineCount?: number | null;
  actionButtonText?: string;
  onAction?: () => void;
  spaceId?: string;
}

const SpaceAboutDisplay: React.FC<SpaceAboutDisplayProps> = ({
  name,
  subdomain,
  shortDescription,
  aboutContent,
  mediaItems = [],
  introMediaType,
  introMediaUrl,
  coverPhotoUrl,
  spaceIconUrl,
  isPrivate,
  memberCount,
  pricingType,
  pricePerMonth,
  owner,
  primaryColor = '#2AB5A0',
  onEditAbout,
  isOwner,
  isMember,
  isAuthenticated,
  adminCount = 0,
  onlineCount = 0,
  actionButtonText,
  onAction,
  spaceId,
}) => {
  // Add mobile detection for conditional rendering
  const isDesktop = useMediaQuery('(min-width: 1024px)'); // lg breakpoint
  
  const ownerDisplayName = owner?.full_name || 'Space Creator';

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row gap-x-8 gap-y-4 sm:px-4 sm:py-3">
        {/* Main content */}
        <div className="flex-1">
          {/* Main Media Display */}
          <div className="mb-6">
            {mediaItems && mediaItems.length > 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                <MediaGallery 
                  mediaItems={mediaItems} 
                  className=""
                  readOnly={true}
                  ownerData={owner}
                  showOwner={true}
                />
              </div>
            ) : (
              <SpaceIntroDisplay 
                name={name}
                introMediaType={introMediaType}
                introMediaUrl={introMediaUrl}
                coverPhotoUrl={coverPhotoUrl}
                spaceIconUrl={spaceIconUrl}
              />
            )}
          </div>

          {/* Space Info Banner */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              {isPrivate ? (
                <Lock className="h-4 w-4 mr-1.5" />
              ) : (
                <Globe className="h-4 w-4 mr-1.5" />
              )}
              <span>{isPrivate ? 'Private Space' : 'Public Space'}</span>
            </div>
            <span className="hidden sm:inline">•</span>
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-1.5" />
              <span>{memberCount || 0} member{memberCount !== 1 ? 's' : ''}</span>
            </div>
            <span className="hidden sm:inline">•</span>
            <div className="flex items-center">
              <Tag className="h-4 w-4 mr-1.5" />
              <span>
                {pricingType === 'free' ? 'Free to Join' : `Paid ($${pricePerMonth || 0}/month)`}
              </span>
            </div>
          </div>
          
          <Separator className="my-6" />

          {/* Created by Section */}
          {owner && (
            <div className="mb-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={owner.avatar_url || undefined} alt={owner.full_name || 'Space Creator'} />
                  <AvatarFallback className="text-lg font-semibold">
                    {(owner.full_name || 'SC').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col justify-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Created by</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 text-xl">
                    {owner.full_name || 'Space Creator'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* About Section */}
          <div className="mb-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">About {name}</h2>
            </div>
            
            <div className="prose prose-lg dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-line">
              {aboutContent ? (
                <p>{aboutContent}</p>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 italic">
                  The creator hasn't added a detailed description for this space yet.
                  {shortDescription && ` However, we know that: "${shortDescription}"`}
                </p>
              )}
            </div>
          </div>

          {/* Mobile-only join button - always show on mobile since no sidebar */}
          {!isDesktop && onAction && (
            <div className="mt-8 text-center">
              <Button 
                onClick={onAction}
                className="bg-[#2AB5A0] hover:bg-[#249B8A] text-white px-8 py-3 text-lg font-semibold rounded-lg shadow-md"
              >
                {isMember ? 'Go to Space' : (actionButtonText || 'Join Space')}
              </Button>
            </div>
          )}

          {isMember && (
            <div className="mt-8 text-center">
              <p className="text-green-600 dark:text-green-400 font-semibold">You are a member of this space!</p>
            </div>
          )}
        </div>

        {/* Right sidebar - desktop only */}
        {isDesktop && (
          <div className="w-[273px] flex-shrink-0">
            <SpaceInfoSidebar
              spaceName={name}
              spaceIcon={spaceIconUrl}
              spaceDescription={shortDescription}
              coverImage={coverPhotoUrl}
              isPrivate={isPrivate}
              memberCount={memberCount}
              adminCount={adminCount}
              onlineCount={onlineCount}
              canAccessSettings={false}
              permissionsLoading={false} // SpaceAboutDisplay doesn't have complex loading states
              subdomain={subdomain}
              spaceId={spaceId}
              isOwner={isOwner}
              isMember={isMember}
              actionButtonText={actionButtonText || 'Join Space'}
              onAction={onAction}
              hideOnlineAvatars={true}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SpaceAboutDisplay; 