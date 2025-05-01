import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Space } from "@/hooks/useSpacesData";
import { SpaceCard } from "@/components/spaces/SpaceCard";
import { useSpacePreviewStore } from "@/stores/useSpacePreviewStore";

interface SpaceCardGridProps {
  spaces: Space[];
  isLoading: boolean;
}

/**
 * Renders a grid of space cards for the homepage.
 * Uses the modal approach for space navigation (openInModal=true) to provide
 * a fast browsing experience without page transitions.
 * 
 * This is part of the application's hybrid navigation strategy:
 * - Homepage: Uses modals for quick browsing
 * - Discover page: Uses direct page navigation for shareable links
 */
export default function SpaceCardGrid({ spaces, isLoading }: SpaceCardGridProps) {
  const openPreview = useSpacePreviewStore(state => state.open);

  return (
    <div className="flex justify-center">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-8 justify-items-center">
        {isLoading ? (
          Array(6).fill(null).map((_, index) => (
            <div key={index} className="animate-pulse h-full rounded-xl overflow-hidden shadow-md bg-white border border-gray-100 flex flex-col w-[337px]">
              {/* Cover image skeleton */}
              <div className="aspect-video bg-gray-200"></div>
              
              {/* Content skeleton */}
              <div className="p-4">
                {/* Avatar skeleton */}
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                
                {/* Title and info skeleton */}
                <div className="mt-3">
                  <div className="h-5 bg-gray-200 rounded mb-2 w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-3 w-1/2"></div>
                  
                  {/* Description skeleton */}
                  <div className="h-4 bg-gray-200 rounded mb-1 w-full"></div>
                  <div className="h-4 bg-gray-200 rounded mb-1 w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                </div>
              </div>
              
              {/* Footer skeleton */}
              <div className="mt-auto px-4 py-3 border-t border-gray-100 flex justify-between">
                <div className="flex gap-4">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 rounded w-12"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
          ))
        ) : (
          spaces.map((space) => (
            <div key={space.id} className="w-[337px]">
              <SpaceCard 
                space={{
                  id: space.id,
                  name: space.name,
                  description: space.description,
                  about_description: space.about_description,
                  cover_image: space.cover_image,
                  member_count: space.member_count,
                  subdomain: space.subdomain,
                  is_private: !!space.is_private,
                  owner: space.owner || {
                    name: "Space Owner",
                    avatar_url: null
                  }
                }}
                openInModal={true}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
} 