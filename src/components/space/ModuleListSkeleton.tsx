import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";

export const ModuleListSkeleton = () => {
  return (
    <div className="animate-pulse">
      {/* Header Skeletons (Back button, Title, Description) */}
      <Skeleton className="h-9 w-32 mb-6" /> 
      <Skeleton className="h-8 w-3/4 mb-2" />
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-5/6 mb-6" />

      {/* Module Actions Skeleton (Add new module button) */}
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-9 w-40" />
      </div>

      {/* Repeating Module Skeletons */}
      {[...Array(3)].map((_, moduleIndex) => (
        <div key={moduleIndex} className="p-4 border rounded-lg bg-white mb-4">
          {/* Module Title Skeleton */}
          <Skeleton className="h-6 w-1/2 mb-2" />
          {/* Module Description Skeleton (optional) */}
          <Skeleton className="h-4 w-3/4 mb-3" />
          
          {/* Lessons List Skeleton */}
          <div className="space-y-2 pl-4 mt-2 border-t pt-3">
            {[...Array(3)].map((_, lessonIndex) => (
              <div key={lessonIndex} className="p-3 border-l-2 border-gray-200 flex justify-between items-center">
                <Skeleton className="h-5 flex-grow mr-4" />
                <Skeleton className="h-5 w-16" /> {/* Icon placeholder */}
              </div>
            ))}
          </div>
          {/* Add lesson button skeleton */}
           <div className="mt-4 pt-3 border-t border-gray-100">
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}; 