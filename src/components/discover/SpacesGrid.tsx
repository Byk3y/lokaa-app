import { Link } from "react-router-dom";
import { X, Loader2, Compass } from "lucide-react";
import { DiscoverSpaceCard } from "@/components/discover/DiscoverSpaceCard";
import DiscoverSpaceCardSkeleton from "@/components/discover/DiscoverSpaceCardSkeleton";
import { Space } from "@/types/space";

interface Category {
  id: string;
  label: string;
  icon: string;
}

interface SpacesGridProps {
  isLoading: boolean;
  loadError: string | null;
  filteredSpaces: Space[];
  searchQuery: string;
  activeCategory: string;
  categories: Category[];
  retryCount: number;
  onRetry: () => void;
  onClearSearch: () => void;
  onSetActiveCategory: (category: string) => void;
}

export default function SpacesGrid({
  isLoading,
  loadError,
  filteredSpaces,
  searchQuery,
  activeCategory,
  categories,
  retryCount,
  onRetry,
  onClearSearch,
  onSetActiveCategory
}: SpacesGridProps) {
  if (isLoading) {
    return (
      <section className="py-8 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16">
          <div className="flex justify-center">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-8 justify-items-center">
              {Array(6).fill(0).map((_, index) => (
                <div key={`skeleton-${index}`} className="w-[337px]">
                  <DiscoverSpaceCardSkeleton />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="py-8 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16">
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-lg shadow-sm border border-red-100">
            <div className="text-red-500 mb-2 text-5xl">
              <X className="h-12 w-12 mx-auto mb-2" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Error Loading Spaces</h3>
            <div className="text-red-600 mb-4 text-center">{loadError}</div>
            <p className="text-gray-600 mb-6 text-center max-w-lg">
              We're having trouble loading the latest spaces. This could be due to network connectivity 
              issues or temporary server problems.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={onRetry}
                className="px-5 py-2.5 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors flex items-center"
              >
                <Loader2 className={`${retryCount > 0 ? 'animate-spin mr-2 h-4 w-4' : 'hidden'}`} />
                {retryCount > 0 ? 'Trying Again...' : 'Try Again'}
              </button>
              <a 
                href="/discover"
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Refresh Page
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (filteredSpaces.length === 0) {
    return (
      <section className="py-8 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16">
          <div className="text-center py-16 bg-white rounded-lg shadow-sm">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Compass className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">No spaces found</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {searchQuery 
                ? `No spaces match your search for "${searchQuery}". Try a different search term or browse all spaces.`
                : activeCategory !== 'all'
                  ? `No spaces found in the "${categories.find(c => c.id === activeCategory)?.label || activeCategory}" category. Try another category.`
                  : 'No spaces found. Be the first to create a space!'}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {searchQuery && (
                <button 
                  onClick={onClearSearch} 
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                >
                  Clear Search
                </button>
              )}
              {activeCategory !== 'all' && (
                <button 
                  onClick={() => onSetActiveCategory('all')} 
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                >
                  View All Categories
                </button>
              )}
              <Link 
                to="/create-space"
                className="px-4 py-2 bg-teal-600 text-white rounded-full hover:bg-teal-700 transition-colors"
              >
                Create a new space
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16">
        <div className="flex justify-center">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-8 justify-items-center">
            {filteredSpaces.map((space) => (
              <div key={space.id} className="w-[337px]">
                <DiscoverSpaceCard space={{
                  ...space,
                  member_count: space.member_count || 0
                }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
