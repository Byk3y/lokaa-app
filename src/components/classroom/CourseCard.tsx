import { log } from '@/utils/logger';
import React, { memo, useCallback, useState } from 'react';
import { formatAsTitle } from '@/utils/textUtils';
import { motion } from 'framer-motion';
import { Book, Users, Loader2, MoreHorizontal, Edit3, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { CourseDisplayData } from '@/hooks/useClassroomCache';

interface CourseCardProps {
  course: CourseDisplayData;
  isOwner: boolean;
  isAdmin?: boolean; // Add isAdmin prop to show DRAFT badge for admins too
  user: any;
  onViewCourse: (course: CourseDisplayData) => void;
  onEditCourse: (course: CourseDisplayData) => void;
  onEnroll: (course: CourseDisplayData) => void;
  onUnenroll: (courseId: string) => void;
  onDeleteCourse?: (course: CourseDisplayData) => void;
  isProcessingEnrollment: boolean;
  primaryColor: string;
}

export const CourseCard = memo<CourseCardProps>(function CourseCard({
  course,
  isOwner,
  isAdmin = false,
  user,
  onViewCourse,
  onEditCourse,
  onEnroll,
  onUnenroll,
  onDeleteCourse,
  isProcessingEnrollment,
  primaryColor,
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    // Don't navigate if clicking on the dropdown menu
    if ((e.target as Element).closest('[data-dropdown-trigger]') || 
        (e.target as Element).closest('[data-dropdown-content]')) {
      return;
    }
    
    log.debug('Component', '🎯 [CourseCard] Card clicked!', {
      courseId: course.id,
      courseTitle: course.title,
      isOwner,
      enrolled: course.enrolled,
      accessType: course.access_type,
      user: user?.id
    });
    
    // Skool-style: Always allow direct access to course content
    // No enrollment step needed - just open the course
    log.debug('Component', '🎯 [CourseCard] Calling onViewCourse (Skool-style direct access)');
    onViewCourse(course);
  }, [course, onViewCourse, isOwner, user]);

  const handleEditCourse = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDropdownOpen(false);
    onEditCourse(course);
  }, [course, onEditCourse]);

  const handleDeleteCourse = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDropdownOpen(false);
    if (onDeleteCourse) {
      onDeleteCourse(course);
    }
  }, [course, onDeleteCourse]);

  // Get progress percentage (default to 0 if undefined)
  const progressPercent = course.progress || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 ease-in-out overflow-hidden cursor-pointer group relative"
      onClick={handleCardClick}
    >
      {/* DRAFT Badge - Show for owners and admins */}
      {!course.is_published && (isOwner || isAdmin) && (
        <div className="absolute top-3 left-3 bg-amber-400 text-amber-900 px-2.5 py-1 rounded-md text-xs font-semibold z-10 shadow">
          DRAFT
        </div>
      )}

      {/* Three Dots Menu - Show for owners and admins */}
      {(isOwner || isAdmin) && (
        <div className="absolute top-3 right-3 z-20">
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild data-dropdown-trigger>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full shadow-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4 text-gray-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-48 bg-white border border-gray-200 shadow-lg rounded-lg p-1"
              data-dropdown-content
            >
              <DropdownMenuItem
                onClick={handleEditCourse}
                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer rounded-md"
              >
                <Edit3 className="h-4 w-4" />
                Edit course
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDeleteCourse}
                className="flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer rounded-md"
              >
                <Trash2 className="h-4 w-4" />
                Delete course
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Course Image/Cover - Show full cover image like Skool */}
      <div className="relative w-full h-40 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        {course.image_url ? (
          <img 
            src={course.image_url} 
            alt={course.title} 
            className="w-full h-full object-cover" 
          />
        ) : (
          <div className="w-16 h-16 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
            <Book className="h-8 w-8 text-white" />
          </div>
        )}
      </div>

      {/* Course Content - White background */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {formatAsTitle(course.title) || "Untitled Course"}
        </h3>
        
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {course.description || "No description available."}
        </p>
        
        {/* Progress Bar - Like Skool */}
        <div className="w-full">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gray-400 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}); 