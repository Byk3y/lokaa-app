import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"; // Assuming you have these from shadcn/ui
import { Skeleton } from "@/components/ui/skeleton"; // Assuming you have Skeleton from shadcn/ui

export const CourseCardSkeleton = () => {
  return (
    <Card className="flex flex-col overflow-hidden shadow-lg group relative animate-pulse">
      {/* Image Placeholder */}
      <div className="relative w-full h-40 bg-gray-200">
        <Skeleton className="h-full w-full" />
      </div>
      <div className="p-4 flex flex-col flex-grow">
        {/* Title Placeholder */}
        <Skeleton className="h-5 w-3/4 mb-2" />
        {/* Description Placeholder */}
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-5/6 mb-3" />
        
        {/* Meta info (students/price) Placeholder */}
        <div className="flex items-center justify-between text-xs mb-2.5">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>

        {/* Separator */}
        <Skeleton className="h-px w-full my-3 bg-gray-200" />

        {/* Buttons Placeholder */}
        <div className="mt-auto space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    </Card>
  );
};

// Make sure to create a similar skeleton structure if your actual card varies significantly
// This is a generic representation. 