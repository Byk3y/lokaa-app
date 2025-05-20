import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface DiscoverSpaceCardProps {
  space: {
    id: string;
    name: string;
    description: string | null;
    about_description?: string | null;
    cover_image?: string | null;
    member_count?: number;
    subdomain?: string;
    pricing_type?: 'free' | 'paid';
    price_per_month?: number | null;
  };
}

/**
 * A specialized space card component for the Discover page that navigates
 * to the space's about page on click.
 */
export function DiscoverSpaceCard({ space }: DiscoverSpaceCardProps) {
  const navigate = useNavigate();

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
      // Optionally, show a toast error to the user if navigation isn't possible
    }
  };
  
  // Basic loading state for image, can be expanded if needed
  const [imageLoaded, setImageLoaded] = useState(false);
  useEffect(() => {
    if (space.cover_image) {
      const img = new Image();
      img.src = space.cover_image;
      img.onload = () => setImageLoaded(true);
    }
  }, [space.cover_image]);

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
        {space.cover_image ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: imageLoaded ? 1 : 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${space.cover_image})` }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <span className="text-xl font-bold text-gray-400">
              {space.name ? space.name.substring(0, 2).toUpperCase() : '??'}
            </span>
          </div>
        )}
        {!space.cover_image && !imageLoaded && space.cover_image && (
           <div className="absolute inset-0 w-full h-full bg-gray-200 animate-pulse"></div> // Simple pulse for loading
        )}
      </div>
      
      {/* Content area */}
      <div className="flex flex-col flex-1 h-[205.02px]">
        {/* Space Details */}
        <div className="px-3 pt-3 flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-md bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
              {space.name ? space.name.substring(0, 2).toUpperCase() : '??'}
            </div>
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