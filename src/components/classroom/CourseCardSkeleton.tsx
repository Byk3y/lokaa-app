import React from 'react';

export function CourseCardSkeleton() {
  return (
    <div className="bg-white/40 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl overflow-hidden flex flex-col animate-pulse h-full min-h-[400px]">
      {/* Image skeleton with gradient */}
      <div className="w-full h-48 bg-gradient-to-br from-gray-200 to-gray-300"></div>

      {/* Content skeleton */}
      <div className="p-6 flex flex-col flex-grow">
        {/* Title skeleton */}
        <div className="h-6 bg-gray-200 rounded-lg mb-3 w-5/6"></div>

        {/* Description skeleton */}
        <div className="space-y-3 mb-4 flex-grow">
          <div className="h-3 bg-gray-200 rounded-full w-full"></div>
          <div className="h-3 bg-gray-200 rounded-full w-full"></div>
          <div className="h-3 bg-gray-200 rounded-full w-2/3"></div>
        </div>

        {/* Meta info skeleton */}
        <div className="flex justify-between items-center mb-4">
          <div className="h-4 bg-gray-200 rounded-lg w-20"></div>
          <div className="h-4 bg-gray-200 rounded-lg w-12"></div>
        </div>

        {/* Separator */}
        <div className="h-px bg-gray-100 mb-4"></div>

        {/* Button skeleton */}
        <div className="mt-auto space-y-3">
          <div className="h-10 bg-gray-200 rounded-xl w-full"></div>
        </div>
      </div>
    </div>
  );
}