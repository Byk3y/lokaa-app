import React from 'react';

interface SimpleLoadingSkeletonProps {
  message?: string;
}

/**
 * A simple loading skeleton for spaces
 * This is a minimal implementation that can be replaced with 
 * the more comprehensive SpaceLoadingSkeleton later
 */
export default function SimpleLoadingSkeleton({ message = "Loading space..." }: SimpleLoadingSkeletonProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5FAFA]">
      <div className="flex flex-col items-center max-w-md text-center">
        <div className="relative h-16 w-16 mb-4">
          {/* Outer circle */}
          <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
          {/* Animated spinner */}
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-teal-500 animate-spin"></div>
        </div>
        
        <h3 className="text-xl font-medium text-gray-800 mb-2">
          {message}
        </h3>
        
        <p className="text-gray-500 text-sm">
          We're preparing your space. This will only take a moment.
        </p>
        
        {/* Shimmer loading bar */}
        <div className="w-64 h-2 mt-6 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-gray-200 via-teal-500 to-gray-200 animate-shimmer"></div>
        </div>
      </div>
    </div>
  );
}

// Add shimmer animation to tailwind
// Add this to your global CSS if you don't already have it
// @keyframes shimmer {
//   0% { transform: translateX(-100%); }
//   100% { transform: translateX(100%); }
// }
// .animate-shimmer {
//   animation: shimmer 1.5s infinite;
// } 