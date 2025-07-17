import React from 'react';
import { Plus } from 'lucide-react';

interface CreateCourseCardProps {
  onCreateCourse: () => void;
  hasExistingCourses: boolean;
}

export function CreateCourseCard({ onCreateCourse, hasExistingCourses }: CreateCourseCardProps) {
  return (
    <div
      className="bg-white rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-all duration-200 ease-in-out cursor-pointer group"
      onClick={onCreateCourse}
    >
      <div className="p-8 flex flex-col items-center justify-center min-h-[280px] text-center">
        <div className="bg-gray-100 group-hover:bg-gray-200 rounded-full p-4 mb-4 transition-colors duration-200">
          <Plus className="h-8 w-8 text-gray-600 group-hover:text-gray-700" />
        </div>
        
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Add course
        </h3>
        
        <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
          {hasExistingCourses 
            ? "Create another course to expand your teaching collection" 
            : "Create your first course and start building your classroom"}
        </p>
      </div>
    </div>
  );
} 