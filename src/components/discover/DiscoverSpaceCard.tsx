import { Link } from "react-router-dom";
import { prepareSpaceNavigation } from "@/utils/fixSpacesAccess";
import { motion } from "framer-motion";

interface DiscoverSpaceCardProps {
  space: {
    id: string;
    name: string;
    description: string | null;
    about_description?: string | null;
    cover_image?: string | null;
    member_count?: number;
    subdomain?: string;
    ranking?: number;
    pricing_type?: 'free' | 'paid';
    price_per_month?: number | null;
  };
}

/**
 * A specialized space card component for the Discover page that uses the same styling
 * as our updated SpaceCard component but opens in a new tab.
 */
export function DiscoverSpaceCard({ space }: DiscoverSpaceCardProps) {
  // Function to convert space name to title case (first letter of each word capitalized)
  const toTitleCase = (str: string) => {
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };
  
  return (
    <a 
      href={prepareSpaceNavigation(space, 'about')}
      target="_blank"
      rel="noopener noreferrer"
      className="cursor-pointer rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 bg-white border border-gray-100 flex flex-col w-[337px] h-[382px]"
      onClick={() => {
        console.log('Viewing about page for space:', space.subdomain);
      }}
    >
      {/* Cover Image - 335x176.98 */}
      <div className="relative w-full h-[176.98px]">
        {/* Ranking badge if available */}
        {space.ranking && (
          <div className="absolute top-3 left-3 bg-gray-800 text-white rounded-full h-8 w-8 flex items-center justify-center text-sm font-semibold z-10">
            #{space.ranking}
          </div>
        )}
        
        {space.cover_image ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${space.cover_image})` }}
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
              {space.pricing_type === 'paid' && space.price_per_month ? (
                `$${space.price_per_month}/month`
              ) : (
                'Free'
              )}
            </span>
          </div>
        </div>
      </div>
    </a>
  );
} 