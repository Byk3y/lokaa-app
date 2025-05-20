import React from 'react';

const DiscoverSpaceCardSkeleton: React.FC = () => {
  return (
    <div className="w-[337px] bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-pulse">
      {/* Cover Image Skeleton */}
      <div className="h-40 bg-gray-300"></div>
      
      <div className="p-5">
        {/* Icon and Name Skeleton */}
        <div className="flex items-center mb-3">
          <div className="h-10 w-10 rounded-lg bg-gray-300 mr-3"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
        
        {/* Description Skeleton */}
        <div className="space-y-2 mb-4">
          <div className="h-3 bg-gray-300 rounded w-full"></div>
          <div className="h-3 bg-gray-300 rounded w-5/6"></div>
        </div>
        
        {/* Stats Skeleton */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="h-3 bg-gray-300 rounded w-1/4"></div>
          <div className="h-3 bg-gray-300 rounded w-1/4"></div>
        </div>
      </div>
    </div>
  );
};

export default DiscoverSpaceCardSkeleton; 