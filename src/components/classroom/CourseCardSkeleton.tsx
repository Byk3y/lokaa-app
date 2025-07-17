import React from 'react';

export function CourseCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col animate-pulse">
      {/* Image skeleton */}
      <div className="w-full h-40 bg-gray-200"></div>
      
      {/* Content skeleton */}
      <div className="p-4 flex flex-col flex-grow">
        {/* Title skeleton */}
        <div className="h-5 bg-gray-200 rounded mb-2"></div>
        
        {/* Description skeleton */}
        <div className="space-y-2 mb-3 flex-grow">
          <div className="h-3 bg-gray-200 rounded w-full"></div>
          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
        </div>
        
        {/* Meta info skeleton */}
        <div className="flex justify-between items-center mb-3">
          <div className="h-3 bg-gray-200 rounded w-16"></div>
          <div className="h-3 bg-gray-200 rounded w-12"></div>
        </div>
        
        {/* Separator */}
        <div className="h-px bg-gray-200 my-3"></div>
        
        {/* Button skeleton */}
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded w-full"></div>
          <div className="h-8 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    </div>
  );
} 