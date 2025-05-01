import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Globe, Lock, Users, Tag } from "lucide-react";
import { SpaceData } from "@/hooks/useSpaceData";

interface SpaceCardPreviewProps {
  space: SpaceData;
  onJoin: () => void;
}

export default function SpaceCardPreview({ space, onJoin }: SpaceCardPreviewProps) {
  // Get the first media item for the main display if available
  const mainMedia = space.media_items?.[0];
  
  return (
    <div className="flex flex-col md:flex-row bg-white rounded-xl overflow-hidden shadow-md">
      {/* Left Column: Main content */}
      <div className="flex-1 p-6 overflow-y-auto" style={{ maxHeight: "600px" }}>
        <h1 className="text-2xl font-bold mb-4">{space.name}</h1>
        
        {/* Main Media Display */}
        <div className="rounded-xl overflow-hidden mb-6 shadow-lg aspect-video">
          {mainMedia?.type === 'video' ? (
            <div className="aspect-[16/9]">
              <iframe 
                src={mainMedia.url} 
                className="w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              ></iframe>
            </div>
          ) : mainMedia?.type === 'image' ? (
            <img 
              src={mainMedia.url} 
              alt={space.name} 
              className="w-full object-cover aspect-[16/9]"
            />
          ) : space.cover_image ? (
            <img 
              src={space.cover_image} 
              alt={space.name} 
              className="w-full object-cover aspect-[16/9]"
            />
          ) : (
            <div className="w-full bg-gray-100 flex items-center justify-center aspect-[16/9]">
              <span className="text-gray-400">No image available</span>
            </div>
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
            <span className="text-sm">{space.member_count} members</span>
          </div>
          
          <div className="flex items-center">
            <Tag className="h-4 w-4 mr-1 text-gray-600" />
            <span className="text-sm">{space.pricing_type === 'free' ? 'Free' : `$${space.price_per_month}/month`}</span>
          </div>
          
          <div className="ml-auto flex items-center">
            <Avatar className="h-6 w-6 mr-2">
              <AvatarImage src={space.owner.avatar_url || undefined} />
              <AvatarFallback>{space.owner.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-sm">By {space.owner.name}</span>
          </div>
        </div>
        
        {/* About Section (Long Description) - Read-only */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">About this space</h2>
          <div className="border rounded-lg p-4 bg-gray-50 max-h-[200px] overflow-y-auto">
            <p className="whitespace-pre-line text-gray-700">
              {space.about_description || space.description || <span className="text-gray-400">No description yet.</span>}
            </p>
          </div>
        </div>
        
        {/* Mobile CTA Button - Only visible on mobile */}
        <div className="block md:hidden mb-4">
          <Button 
            onClick={onJoin}
            className="w-full justify-center font-medium text-black bg-amber-300 hover:bg-amber-400 rounded-xl py-2.5"
          >
            JOIN GROUP
          </Button>
        </div>
      </div>
      
      {/* Right Column: Sidebar - Hidden on mobile */}
      <div className="hidden md:block md:w-80 bg-gradient-to-br from-[#E0F2F1] to-[#B2DFDB] p-5 shadow-sm self-start rounded-r-xl">
        {/* Cover image display */}
        <div className="bg-[#26A69A] aspect-video rounded-xl overflow-hidden mb-3 shadow-md">
          {space.cover_image ? (
            <img 
              src={space.cover_image} 
              alt={`${space.name} cover`}
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              <span className="text-xl font-bold">{space.name.substring(0, 2).toUpperCase()}</span>
            </div>
          )}
        </div>
        
        <h2 className="text-xl font-semibold mb-1">{space.name}</h2>
        <p className="text-sm text-gray-500 mb-2">
          lokaa.com/{space.subdomain}
        </p>
        
        <div className="text-sm mb-3 max-h-20 overflow-y-auto pr-1">
          <p className="whitespace-pre-wrap">
            {space.description || `The #1 community for ${space.name.toLowerCase()} enthusiasts.`}
          </p>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-2 bg-white rounded-lg shadow-sm">
            <div className="text-lg font-semibold">{space.member_count}</div>
            <div className="text-xs text-gray-500">Members</div>
          </div>
          <div className="text-center p-2 bg-white rounded-lg shadow-sm">
            <div className="text-lg font-semibold">{space.online_count || 0}</div>
            <div className="text-xs text-gray-500">Online</div>
          </div>
          <div className="text-center p-2 bg-white rounded-lg shadow-sm">
            <div className="text-lg font-semibold">{space.admin_count || 1}</div>
            <div className="text-xs text-gray-500">Admins</div>
          </div>
        </div>
        
        {/* CTA Button */}
        <Button 
          onClick={onJoin}
          className="w-full justify-center font-medium text-black bg-amber-300 hover:bg-amber-400 rounded-xl py-2.5"
        >
          JOIN GROUP
        </Button>
        
        {/* Powered by */}
        <div className="text-center text-xs text-gray-500 mt-4">
          powered by <span className="font-semibold">Lokaa</span>
        </div>
      </div>
    </div>
  );
} 