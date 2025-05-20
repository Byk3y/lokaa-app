import { Link } from "react-router-dom";
import { Globe, Lock, Users, Tag } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSpacePreviewStore } from "@/stores/useSpacePreviewStore";

interface SpaceCardProps {
  space: {
    id: string;
    name: string;
    description: string | null;
    about_description?: string | null;
    cover_image?: string | null;
    member_count?: number;
    subdomain?: string;
    is_private?: boolean;
    owner?: {
      name?: string;
      avatar_url?: string;
    };
  };
  /**
   * Controls the behavior when the card is clicked:
   * - When true: Opens a modal preview using useSpacePreviewStore (used on homepage for quick browsing)
   * - When false: Navigates directly to the space's about page (used on discover page and for shareable links)
   * 
   * @default true
   */
  openInModal?: boolean;
}

/**
 * SpaceCard component renders a card displaying information about a space.
 * Implements a hybrid navigation approach depending on the context:
 * - In the homepage: Uses modal preview for fast browsing experience
 * - In the discover page: Uses direct navigation for shareable links
 */
export function SpaceCard({ space, openInModal = true }: SpaceCardProps) {
  const openPreview = useSpacePreviewStore(state => state.open);
  
  /**
   * Handles the card click based on the openInModal prop:
   * - When openInModal is true: Opens the space preview modal
   * - When openInModal is false: Navigates to the space's about page directly
   */
  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (openInModal) {
      e.stopPropagation();
      openPreview(space.id);
    } else {
      if (space.subdomain) {
        window.location.href = `/${space.subdomain}/about`;
      }
    }
  };
  
  // Function to convert space name to title case (first letter of each word capitalized)
  const toTitleCase = (str: string) => {
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };
  
  return (
    <div 
      onClick={handleCardClick}
      className="cursor-pointer rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 bg-white border border-gray-100 flex flex-col w-[337px] h-[382px]"
    >
      {/* Cover Image - Keep at 335x176.98 */}
      <div className="relative w-full h-[176.98px]">
        {space.cover_image ? (
          <img 
            src={space.cover_image} 
            alt={space.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <span className="text-xl font-bold text-gray-400">
              {space.name.substring(0, 2).toUpperCase()}
            </span>
          </div>
        )}
      </div>
      
      {/* Content area - fills remaining height (205.02px) */}
      <div className="flex flex-col flex-1 h-[205.02px]">
        {/* Space Description */}
        <div className="px-3 pt-3 flex flex-col">
          {/* Icon and name on the same line */}
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-md bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
              {space.name.substring(0, 2).toUpperCase()}
            </div>
            <h3 className="font-bold text-gray-900 text-lg">
              {toTitleCase(space.name)}
            </h3>
          </div>
          
          {/* Description area - exactly 303x72 */}
          <div className="w-[303px] h-[72px]">
            <p className="text-sm text-gray-600 overflow-hidden line-clamp-3 font-medium" style={{ 
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              fontSize: '15px'
            }}>
              {space.description || `Join the ${space.name} community`}
            </p>
          </div>
        </div>
        
        {/* Footer styled like in the screenshot */}
        <div className="px-4 py-3 mt-auto border-t border-gray-100">
          <div className="flex items-center text-sm text-gray-600">
            <span className="font-normal text-base">
              {space.member_count || 0} Member{(space.member_count !== 1) ? 's' : ''}
            </span>
            <span className="mx-2 text-gray-300">•</span>
            <span className="font-bold text-base">
              {space.is_private ? '$9/month' : 'Free'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
