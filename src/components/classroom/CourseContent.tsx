import React, { memo, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { formatAsTitle } from '@/utils/textUtils';
import { Plus } from "lucide-react";
import { ModuleListSkeleton } from '../space/ModuleListSkeleton';
import { ModuleCard } from './ModuleCard';
import type { CourseDisplayData } from '@/hooks/useClassroomCache';

// Define the types locally to match CourseDetailView
interface CourseModule {
  id: string;
  title: string;
  description: string | null;
  module_order: number;
  module_type: 'folder' | 'module' | string;
  course_id: string;
  space_id: string;
  lessons: CourseLesson[];
  release_delay_days?: number;
}

interface CourseLesson {
  id: string;
  title: string;
  content_type: string;
  content_url: string | null;
  content_text: string | null;
  lesson_order: number;
  module_id?: string;
  content_id?: string | null;
  is_published: boolean;
  page_type?: string;
  estimated_duration?: number | null;
  difficulty_level?: string | null;
  created_at?: string;
  updated_at?: string;
  completed?: boolean;
}

interface CourseContentProps {
  course: CourseDisplayData;
  modules: CourseModule[];
  isLoading: boolean;
  isOwner: boolean;
  enrollmentDate: string | null;
  primaryColor: string;
  onBackToCourses: () => void;
  onAddModule: () => void;
  onEditModule: (module: CourseModule) => void;
  onDeleteModule: (module: CourseModule) => void;
  onAddLesson: (moduleId: string) => void;
  onEditLesson: (lesson: CourseLesson) => void;
  onViewLesson: (lesson: CourseLesson) => void;
}

// Helper function to check if module is accessible
const isModuleAccessible = (
  module: CourseModule,
  enrollmentDate: string | null,
  isCourseOwner: boolean
): boolean => {
  if (isCourseOwner || !enrollmentDate || typeof module.release_delay_days !== 'number' || module.release_delay_days <= 0) {
    return true;
  }

  const now = new Date();
  const enrolledAt = new Date(enrollmentDate);
  const releaseDate = new Date(enrolledAt);
  releaseDate.setDate(enrolledAt.getDate() + module.release_delay_days);

  return now >= releaseDate;
};

// Helper function to format release date
const formatReleaseDate = (
  module: CourseModule,
  enrollmentDate: string | null
): string | undefined => {
  if (!enrollmentDate || typeof module.release_delay_days !== 'number' || module.release_delay_days <= 0) {
    return undefined;
  }

  const enrolledAt = new Date(enrollmentDate);
  const releaseDate = new Date(enrolledAt);
  releaseDate.setDate(enrolledAt.getDate() + module.release_delay_days);

  return releaseDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const CourseContent = memo<CourseContentProps>(({
  course,
  modules,
  isLoading,
  isOwner,
  enrollmentDate,
  primaryColor,
  onBackToCourses,
  onAddModule,
  onEditModule,
  onDeleteModule,
  onAddLesson,
  onEditLesson,
  onViewLesson
}) => {
  // Memoize module cards to prevent unnecessary re-renders
  const moduleCards = useMemo(() => {
    return modules.map(module => {
      const accessible = isModuleAccessible(module, enrollmentDate, isOwner);
      const releaseDateString = formatReleaseDate(module, enrollmentDate);

      return (
        <ModuleCard
          key={module.id}
          module={module}
          isOwner={isOwner}
          isAccessible={accessible}
          releaseDateString={releaseDateString}
          primaryColor={primaryColor}
          onEditModule={onEditModule}
          onDeleteModule={onDeleteModule}
          onAddLesson={onAddLesson}
          onEditLesson={onEditLesson}
          onViewLesson={onViewLesson}
        />
      );
    });
  }, [
    modules,
    isOwner,
    enrollmentDate,
    primaryColor,
    onEditModule,
    onDeleteModule,
    onAddLesson,
    onEditLesson,
    onViewLesson
  ]);

  // Memoize empty state
  const emptyState = useMemo(() => (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">📚</div>
      <h3 className="text-lg font-medium text-gray-600 mb-2">
        No modules yet
      </h3>
      <p className="text-gray-500">
        {isOwner 
          ? "Start building your course by adding the first module."
          : "The instructor hasn't added any modules yet."
        }
      </p>
    </div>
  ), [isOwner]);

  if (isLoading) {
    return <ModuleListSkeleton />;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      {/* Header */}
      <Button 
        variant="outline" 
        onClick={onBackToCourses}
        className="mb-6"
      >
        &larr; Back to Courses
      </Button>
      
      <h2 className="text-2xl font-semibold text-[#37474F] mb-2">
        {formatAsTitle(course.title)}
      </h2>
      
      <p className="text-gray-600 mb-6 line-clamp-3">
        {course.description || "No description."}
      </p>

      {/* Module Actions */}
      {isOwner && (
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-700">
            Course Modules
          </h3>
          <Button
            size="sm"
            className="font-medium"
            style={{ backgroundColor: primaryColor, color: 'white' }}
            onClick={onAddModule}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Module
          </Button>
        </div>
      )}

      {/* Modules Content */}
      {modules.length === 0 ? (
        emptyState
      ) : (
        <div className="space-y-4">
          {moduleCards}
        </div>
      )}
    </div>
  );
});

CourseContent.displayName = 'CourseContent'; 