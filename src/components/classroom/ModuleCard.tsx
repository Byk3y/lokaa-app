import React, { memo } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Pencil, Trash2, Plus } from "lucide-react";
import type { CourseModuleWithLessons, CourseLessonData } from '@/types/classroom';

interface ModuleCardProps {
  module: CourseModuleWithLessons;
  isOwner: boolean;
  isAccessible: boolean;
  releaseDateString?: string;
  primaryColor: string;
  onEditModule: (module: CourseModuleWithLessons) => void;
  onDeleteModule: (module: CourseModuleWithLessons) => void;
  onAddLesson: (moduleId: string) => void;
  onEditLesson: (lesson: CourseLessonData) => void;
  onViewLesson: (lesson: CourseLessonData) => void;
}

export const ModuleCard = memo<ModuleCardProps>(({
  module,
  isOwner,
  isAccessible,
  releaseDateString,
  primaryColor,
  onEditModule,
  onDeleteModule,
  onAddLesson,
  onEditLesson,
  onViewLesson
}) => {
  const handleEditModule = () => onEditModule(module);
  const handleDeleteModule = () => onDeleteModule(module);
  const handleAddLesson = () => onAddLesson(module.id);

  return (
    <div className={`group p-4 border rounded-lg bg-white relative ${!isAccessible ? 'opacity-70 bg-gray-50' : ''}`}>
      <div className="flex justify-between items-start">
        <div>
          <h4 className={`font-semibold text-lg text-gray-700 mb-1 pr-10 ${!isAccessible ? 'text-gray-500' : ''}`}>
            {module.title}
          </h4>
          
          {module.description && (
            <p className={`text-sm text-gray-600 mb-3 ${!isAccessible ? 'text-gray-500' : ''}`}>
              {module.description}
            </p>
          )}
          
          {!isAccessible && releaseDateString && (
            <Badge variant="outline" className="mb-2 text-sm font-normal bg-amber-50 border-amber-300 text-amber-700">
              <Calendar className="mr-2 h-3.5 w-3.5" />
              Unlocks on {releaseDateString}
            </Badge>
          )}
          
          {!isAccessible && !releaseDateString && !isOwner && (
            <Badge variant="outline" className="mb-2 text-sm font-normal bg-gray-100 border-gray-300 text-gray-600">
              <Calendar className="mr-2 h-3.5 w-3.5" />
              Coming Soon
            </Badge>
          )}
        </div>

        {/* Module Actions - Only for owners */}
        {isOwner && (
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1 pointer-events-none group-hover:pointer-events-auto">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
              onClick={handleEditModule}
              title="Edit module"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
              onClick={handleDeleteModule}
              title="Delete module"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Lessons List */}
      {(isAccessible || isOwner) && module.lessons && module.lessons.length > 0 && (
        <div className="space-y-2 pl-4 mt-2 border-t pt-3">
          {module.lessons.map((lesson) => (
            <div
              key={lesson.id}
              className={`p-3 border-l-2 border-gray-200 flex justify-between items-center rounded-r-md transition-colors duration-200 
                ${isAccessible ? 'hover:bg-gray-50 cursor-pointer' : 'bg-gray-100'}`}
              onClick={() => isAccessible && onViewLesson(lesson)}
            >
              <div className="flex-grow">
                <h5 className={`font-medium text-sm ${isAccessible ? 'text-gray-700' : 'text-gray-500'}`}>
                  {lesson.title}
                </h5>
                <p className={`text-xs ${isAccessible ? 'text-gray-500' : 'text-gray-400'} mt-0.5`}>
                  {lesson.content_type === 'text' ? '📄 Text Content' : 
                   lesson.content_type === 'video_embed' ? '🎥 Video' : 
                   '🔗 External Link'}
                </p>
              </div>
              
              {isOwner && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 ml-2 opacity-0 group-hover:opacity-100 hover:bg-blue-50 hover:text-blue-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditLesson(lesson);
                  }}
                  title="Edit lesson"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add New Lesson Button - Only for owners */}
      {isOwner && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <Button
            size="sm"
            variant="outline"
            className="w-full text-sm"
            onClick={handleAddLesson}
            style={{ borderColor: primaryColor, color: primaryColor }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Lesson to Module
          </Button>
        </div>
      )}
    </div>
  );
});

ModuleCard.displayName = 'ModuleCard'; 