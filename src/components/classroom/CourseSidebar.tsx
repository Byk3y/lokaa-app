import { log } from '@/utils/logger';
import React from 'react';
import { ChevronDown, ChevronRight, Play, Plus } from 'lucide-react';

interface CourseLesson {
  id: string;
  title: string;
  content_type: string;
  content_url: string | null;
  content_text: string | null;
  lesson_order: number;
  module_id?: string;
}

interface CourseModule {
  id: string;
  title: string;
  description: string | null;
  module_order: number;
  lessons: CourseLesson[];
}

interface CourseDetailData {
  id: string;
  title: string;
  description: string | null;
  modules: CourseModule[];
}

interface CourseSidebarProps {
  course: CourseDetailData;
  selectedLesson: CourseLesson | null;
  onLessonSelect: (lesson: CourseLesson) => void;
  isOwner?: boolean;
  onAddLesson?: (moduleId: string) => void;
  onEditLesson?: (lesson: CourseLesson) => void;
  onAddModule?: () => void;
}

const CourseSidebar: React.FC<CourseSidebarProps> = ({
  course,
  selectedLesson,
  onLessonSelect,
  isOwner = false,
  onAddLesson,
  onEditLesson,
  onAddModule
}) => {
  log.debug('Component', '🎓 [CourseSidebar] Received course data:', course);
  log.debug('Component', '🎓 [CourseSidebar] Number of modules:', course?.modules?.length || 0);
  log.debug('Component', '🎓 [CourseSidebar] Selected lesson:', selectedLesson);
  log.debug('Component', '🎓 [CourseSidebar] Is owner:', isOwner);

  // Calculate total lessons and progress
  const totalLessons = course.modules.reduce((total, module) => total + module.lessons.length, 0);
  const completedLessons = 0; // TODO: Implement progress tracking
  const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  log.debug('Component', '🎓 [CourseSidebar] Total lessons calculated:', totalLessons);

  return (
    <div className="course-detail-sidebar flex flex-col h-full">
      {/* Course Header */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="course-title text-xl font-semibold text-gray-900 mb-3">{course.title}</h1>
        <div className="text-sm text-gray-600 mb-3 font-medium">
          {progressPercentage}%
        </div>
        <div className="course-progress-bar">
          <div 
            className="course-progress-fill"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Module and Lesson List */}
      <div className="flex-1 overflow-y-auto course-sidebar-scroll">
        <div className="p-4 space-y-2">
          {/* Empty course state - Skool Style */}
          {course.modules.length === 0 && isOwner && onAddModule ? (
              <button
                onClick={onAddModule}
                className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors font-medium text-gray-800 bg-yellow-100 hover:bg-yellow-200"
              >
                New page
              </button>
          ) : course.modules.length === 0 && !isOwner ? (
            <div className="p-6 text-center text-sm text-gray-600">
              No lessons available.
            </div>
          ) : null}

          {/* Course modules */}
          {course.modules.map((module) => (
            <div key={module.id} className="border-b border-gray-100 last:border-b-0">
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-3">{module.title}</h3>
                
                {/* Module lessons */}
                <div className="space-y-1">
                  {module.lessons.map((lesson) => (
                    <button
                      key={lesson.id}
                      onClick={() => onLessonSelect(lesson)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedLesson?.id === lesson.id
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {lesson.title}
                    </button>
                  ))}
                  
                  {/* Add Lesson Button for owners - Skool style */}
                  {isOwner && onAddLesson && (
                    <button
                      onClick={() => onAddLesson(module.id)}
                      className="w-full text-left px-3 py-2 text-sm text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <span>+ New page</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CourseSidebar; 