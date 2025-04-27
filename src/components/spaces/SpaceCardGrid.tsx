import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Space } from "@/hooks/useSpacesData";

interface SpaceCardGridProps {
  spaces: Space[];
  isLoading: boolean;
}

export default function SpaceCardGrid({ spaces, isLoading }: SpaceCardGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {isLoading ? (
        Array(6).fill(null).map((_, index) => (
          <div key={index} className="animate-pulse h-full">
            <div className="relative h-36 overflow-hidden bg-gray-200 rounded-t-lg"></div>
            <div className="p-4 bg-white rounded-b-lg">
              <div className="flex items-start mb-2">
                <div className="h-10 w-10 bg-gray-200 rounded-md mr-3"></div>
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 rounded mb-2 w-3/4"></div>
                </div>
              </div>
              <div className="h-4 bg-gray-200 rounded mb-1 w-full"></div>
              <div className="h-4 bg-gray-200 rounded mb-4 w-4/5"></div>
              <div className="flex justify-between mt-auto">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          </div>
        ))
      ) : (
        spaces.map((space) => (
          <Link 
            key={space.id}
            to={space.subdomain ? `/${space.subdomain}/about` : `/spaces/${space.id}`}
            className="block bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-200 h-full flex flex-col"
          >
            {/* Card with ranking badge */}
            <div className="relative">
              {/* Ranking badge */}
              {space.ranking && (
                <div className="absolute top-2 left-2 bg-gray-800 text-white rounded-full h-7 w-7 flex items-center justify-center text-sm font-semibold z-10">
                  #{space.ranking}
                </div>
              )}
              
              {/* Cover image */}
              <div className="w-full h-40 bg-gray-100">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${space.cover_image || "/default-space-cover.jpg"})` }}
                />
              </div>
            </div>
            
            {/* Content */}
            <div className="p-3 flex-1 flex flex-col">
              {/* Space info */}
              <div className="flex items-start mb-2">
                <div className="flex-shrink-0 mr-2">
                  <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
                    {/* Space icon or first letter */}
                    <span className="text-base font-semibold text-gray-600">
                      {space.name?.charAt(0) || 'S'}
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900 mb-1 line-clamp-1">{space.name}</h3>
                  {/* Description */}
                  <p className="text-sm text-gray-700 mb-3 line-clamp-2">{space.description}</p>
                </div>
              </div>
              
              {/* Stats row */}
              <div className="flex items-center justify-between text-sm mt-auto">
                <div className="flex items-center">
                  <span className="font-medium">
                    {space.member_count && space.member_count > 1000 
                      ? `${(space.member_count / 1000).toFixed(1)}k` 
                      : space.member_count || 0} Members
                  </span>
                </div>
                <div>
                  {space.pricing_type === 'paid' && space.price_per_month ? (
                    <span className="text-teal-600 font-semibold">${space.price_per_month}/month</span>
                  ) : (
                    <span className="text-teal-600 font-semibold">Free</span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))
      )}
    </div>
  );
} 