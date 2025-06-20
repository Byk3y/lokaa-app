/**
 * SpaceCard Component
 * 
 * Displays a card for a space with its details, including cover image, 
 * name, description, and member information.
 * ✅ UPGRADED: Now uses unified SpaceAssetsUtils system
 */

import { Link } from "react-router-dom";
import { Globe, Lock, Users, Tag } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components";
import { useSpacePreviewStore } from "../../store/space-preview-store";
import { Space } from "../../types";
import { SpaceAssetsUtils, useSpaceAssets } from "@/shared/utils/space-assets-utils";

interface SpaceCardProps {
  /** The space to display */
  space: Space;
  
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
  
  // 🚀 NEW: Use unified space assets system
  const { assets, placeholder } = useSpaceAssets(space);
  // 🎨 USER PREFERENCE: Use neutral gray gradients for both cover and icons
  const coverPlaceholder = SpaceAssetsUtils.getCoverPlaceholderConfig(space); // Use gray gradients per user preference
  
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
        {assets.hasCover && assets.coverUrl ? (
          <img 
            src={assets.coverUrl} 
            alt={space.name}
            className="w-full h-full object-cover"
          />
        ) : (
          // 🎨 USER PREFERENCE: Use neutral gray gradients that user likes
          <div 
            className="w-full h-full flex items-center justify-center"
            style={{ 
              background: `linear-gradient(135deg, ${coverPlaceholder.gradientFrom}, ${coverPlaceholder.gradientTo})` 
            }}
          >
            <span 
              className="text-xl font-bold"
              style={{ color: coverPlaceholder.textColor }}
            >
              {coverPlaceholder.initials}
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
            {/* ✅ UPGRADED: Now uses unified SpaceAssetsUtils for consistent icon handling */}
            {assets.hasIcon && assets.iconUrl ? (
              <div className="h-10 w-10 rounded-md overflow-hidden">
                <img 
                  src={assets.iconUrl} 
                  alt={`${space.name} icon`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // 🎨 USER PREFERENCE: Graceful fallback to neutral gray placeholder
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      parent.style.background = `linear-gradient(135deg, ${coverPlaceholder.gradientFrom}, ${coverPlaceholder.gradientTo})`;
                      parent.style.display = 'flex';
                      parent.style.alignItems = 'center';
                      parent.style.justifyContent = 'center';
                      const initialsSpan = document.createElement('span');
                      initialsSpan.textContent = coverPlaceholder.initials;
                      initialsSpan.style.color = coverPlaceholder.textColor;
                      initialsSpan.style.fontSize = '14px';
                      initialsSpan.style.fontWeight = '600';
                      parent.appendChild(initialsSpan);
                    }
                  }}
                />
              </div>
            ) : (
              // 🎨 USER PREFERENCE: Neutral gray placeholder for icons too
              <div 
                className="h-10 w-10 rounded-md flex items-center justify-center text-sm font-medium"
                style={{ 
                  background: `linear-gradient(135deg, ${coverPlaceholder.gradientFrom}, ${coverPlaceholder.gradientTo})`,
                  color: coverPlaceholder.textColor
                }}
              >
                {coverPlaceholder.initials}
              </div>
            )}
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