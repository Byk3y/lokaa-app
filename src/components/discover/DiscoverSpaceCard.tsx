import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SpaceAssetsUtils, useSpaceAssets } from "@/shared/utils/space-assets-utils";

interface DiscoverSpaceCardProps {
  space: {
    id: string;
    name: string;
    description: string | null;
    about_description?: string | null;
    cover_image?: string | null;
    icon_image?: string | null;
    member_count?: number;
    subdomain?: string;
    pricing_type?: 'free' | 'paid';
    price_per_month?: number | null;
    primary_color?: string | null;
  };
}

/**
 * A specialized space card component for the Discover page that navigates
 * to the space's about page on click.
 * ✅ UPGRADED: Now uses unified SpaceAssetsUtils system
 */
export function DiscoverSpaceCard({ space }: DiscoverSpaceCardProps) {
  const navigate = useNavigate();
  
  // 🚀 NEW: Use unified space assets system
  const { assets, placeholder } = useSpaceAssets(space);
  // 🎨 USER PREFERENCE: Use neutral gray gradients to match landing page
  const coverPlaceholder = SpaceAssetsUtils.getCoverPlaceholderConfig(space); // Use gray gradients per user preference

  const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const handleNavigateToAboutPage = () => {
    if (space && space.subdomain) {
      navigate(`/${space.subdomain}/about`);
    } else {
      console.error("DiscoverSpaceCard: Space subdomain is missing, cannot navigate.");
    }
  };
  
  // Enhanced loading states
  const [coverImageLoaded, setCoverImageLoaded] = useState(false);
  const [iconImageLoaded, setIconImageLoaded] = useState(false);
  
  useEffect(() => {
    if (assets.coverUrl) {
      const img = new Image();
      img.src = assets.coverUrl;
      img.onload = () => setCoverImageLoaded(true);
    }
  }, [assets.coverUrl]);
  
  useEffect(() => {
    if (assets.iconUrl) {
      const img = new Image();
      img.src = assets.iconUrl;
      img.onload = () => setIconImageLoaded(true);
    }
  }, [assets.iconUrl]);

  return (
    <div
      onClick={handleNavigateToAboutPage}
      className="cursor-pointer rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 bg-white border border-gray-100 flex flex-col w-[337px] h-[382px]"
      role="button"
      tabIndex={0}
      onKeyPress={(e) => e.key === 'Enter' && handleNavigateToAboutPage()}
    >
      {/* Cover Image */}
      <div className="relative w-full h-[176.98px]">
        {assets.hasCover && assets.coverUrl ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: coverImageLoaded ? 1 : 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${assets.coverUrl})` }}
          />
        ) : (
          // 🎨 USER PREFERENCE: Use neutral gray gradients to match landing page
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
        {assets.hasCover && !coverImageLoaded && (
           <div className="absolute inset-0 w-full h-full bg-gray-200 animate-pulse"></div>
        )}
      </div>
      
      {/* Content area */}
      <div className="flex flex-col flex-1 h-[205.02px]">
        {/* Space Details */}
        <div className="px-3 pt-3 flex flex-col">
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
              // 🎨 USER PREFERENCE: Neutral gray placeholder for icons to match landing page
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
              {toTitleCase(space.name || 'Unnamed Space')}
            </h3>
          </div>
          <div className="w-[303px] h-[72px]">
            <p className="text-sm text-gray-600 overflow-hidden line-clamp-3 font-medium" style={{ 
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              fontSize: '15px'
            }}>
              {space.description || (space.name ? `Join the ${toTitleCase(space.name)} community` : 'Discover this community')}
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-4 py-3 mt-auto border-t border-gray-100">
          <div className="flex items-center text-sm text-gray-600">
            <span className="font-normal text-base">
              {space.member_count || 0} Member{(space.member_count !== 1 && space.member_count !== undefined) ? 's' : ''}
            </span>
            <span className="mx-2 text-gray-300">•</span>
            <span className="font-bold text-base">
              {space.pricing_type === 'paid' && space.price_per_month ? (
                `$${space.price_per_month}/month`
              ) : (
                'Free'
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 