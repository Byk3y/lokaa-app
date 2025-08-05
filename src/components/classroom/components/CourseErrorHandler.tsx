import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, X } from 'lucide-react';
import type { CourseDetailData } from '@/types/classroom/courseDetail';

interface CourseErrorHandlerProps {
  loading: boolean;
  error: string | null;
  course: CourseDetailData | null;
  onBack: () => void;
}

/**
 * CourseErrorHandler manages loading, error, and edge case states
 * Extracted from CourseDetailView to isolate error handling logic
 */
export const CourseErrorHandler: React.FC<CourseErrorHandlerProps> = ({
  loading,
  error,
  course,
  onBack
}) => {
  // Show loading state first
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
      </div>
    );
  }

  // Desktop error state - only show error for desktop view
  if (error || !course) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-red-500 mb-4">
          <X className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Course Not Found</h3>
        <p className="text-gray-600 mb-4">
          {error?.includes('No rows returned') || error?.includes('not found') 
            ? 'The course you\'re looking for doesn\'t exist or has been removed.'
            : error || 'Course not found'}
        </p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Classroom
        </Button>
      </div>
    );
  }

  // If no error or loading state, return null to let parent continue with normal rendering
  return null;
};