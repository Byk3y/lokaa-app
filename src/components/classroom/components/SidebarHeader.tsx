import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, ArrowLeft } from "lucide-react";
import { formatAsTitle } from '@/utils/textUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CourseDetailData } from '@/types/classroom/courseDetail';

interface SidebarHeaderProps {
  course: CourseDetailData;
  isOwner?: boolean;
  isAdmin?: boolean;
  isCreatingPage?: boolean;
  onEditCourse?: () => void;
  onDeleteCourse?: () => void;
  onAddFolder?: () => void;
  onAddLesson?: () => void;
  onBackToCourses: () => void;
}

export default function SidebarHeader({
  course,
  isOwner = false,
  isAdmin = false,
  isCreatingPage = false,
  onEditCourse,
  onDeleteCourse,
  onAddFolder,
  onAddLesson,
  onBackToCourses,
}: SidebarHeaderProps) {
  return (
    <div className="p-4 border-b border-gray-100">
      {/* Back to Courses Button */}
      <div className="mb-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBackToCourses}
          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-2 h-auto -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Courses
        </Button>
      </div>
      
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-gray-900 truncate">
            {formatAsTitle(course.title)}
          </h2>
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{course.progress || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${course.progress || 0}%` }}
              ></div>
            </div>
          </div>
        </div>
        {(isOwner || isAdmin) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100 mt-1">
                <svg className="h-4 w-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <circle cx="6" cy="12" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="18" cy="12" r="1.5" />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onEditCourse}>
                Edit course
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAddFolder}>
                Add folder
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onDeleteCourse}
                className="text-red-600 focus:text-red-600"
              >
                Delete course
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      {/* Add New Page Button */}
      {(isOwner || isAdmin) && (
        <Button
          onClick={() => onAddLesson?.()}
          disabled={isCreatingPage}
          className="w-full h-9 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium"
        >
          <Plus className="mr-2 h-4 w-4" />
          {isCreatingPage ? 'Creating...' : 'New page'}
        </Button>
      )}
    </div>
  );
}