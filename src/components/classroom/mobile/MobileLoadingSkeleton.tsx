import React from 'react';

/**
 * Mobile Loading Skeleton Component
 * 
 * Provides consistent loading states for mobile course views
 */
const MobileLoadingSkeleton: React.FC = () => {
  return (
    <div className="h-full min-h-screen bg-white">
      <div className="flex flex-col h-full">
        {/* Header skeleton */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
            </div>
          </div>
        </div>
        
        {/* Content skeleton */}
        <div className="flex-1 p-4">
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
          </div>
          
          {/* Lesson list skeleton */}
          <div className="mt-6 space-y-3">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileLoadingSkeleton;