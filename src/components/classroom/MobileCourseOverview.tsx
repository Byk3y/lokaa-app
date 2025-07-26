import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, MoreHorizontal, FileText, Copy, Edit, FolderPlus, FilePlus, Trash2 } from 'lucide-react';
import { formatAsTitle } from '@/utils/textUtils';
import BottomNav from '@/components/mobile/BottomNav';
import type { 
  CourseLesson, 
  CourseModule, 
  CourseDetailData, 
  MobileCourseOverviewProps 
} from '@/types/classroom';

interface Space {
  id: string;
  name: string;
  subdomain: string;
  avatar_url?: string | null;
}

const MobileCourseOverview: React.FC<MobileCourseOverviewProps> = ({
  course,
  space,
  onBack,
  onLessonSelect,
  isOwner = false,
  onEditCourse,
  onAddFolder,
  onAddPage,
  onDeleteCourse,
  onEditLesson,
  onDeleteLesson,
  onRevertToDraft,
  onChangeFolder,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeLessonDropdown, setActiveLessonDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lessonDropdownRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      
      // Check lesson dropdowns
      if (activeLessonDropdown) {
        const activeRef = lessonDropdownRefs.current[activeLessonDropdown];
        if (activeRef && !activeRef.contains(event.target as Node)) {
          setActiveLessonDropdown(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeLessonDropdown]);

  // Function to copy course URL
  const copyCourseUrl = async () => {
    try {
      const currentUrl = window.location.href;
      await navigator.clipboard.writeText(currentUrl);
      setCopySuccess(true);
      setShowDropdown(false);
      
      // Reset copy success message after 2 seconds
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  // Sort modules by module_order and keep lessons organized under their modules
  const sortedModules = course.modules.sort((a, b) => a.module_order - b.module_order);

  return (
    <div className="fixed inset-0 flex flex-col bg-white z-50">
      {/* Proper Mobile Header */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          
          {/* Space branding */}
          <div className="flex items-center space-x-2">
            {space?.icon_image ? (
              <img 
                src={space.icon_image} 
                alt={space.name}
                className="w-8 h-8 bg-gray-200 rounded-lg object-cover"
              />
            ) : (
              <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">
                  {space?.name?.charAt(0).toUpperCase() || 'S'}
                </span>
              </div>
            )}
            <span className="font-bold text-gray-900">
              {space?.name || 'Space'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Search className="w-5 h-5 text-gray-600" />
          </button>
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MoreHorizontal className="w-5 h-5 text-gray-600" />
            </button>
            
            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 top-12 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px]">
                <button
                  onClick={copyCourseUrl}
                  className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Copy className="w-4 h-4 mr-3" />
                  Copy course link
                </button>
                
                {/* Admin-only options */}
                {isOwner && (
                  <>
                    <hr className="border-gray-100" />
                    {onEditCourse && (
                      <button
                        onClick={() => {
                          onEditCourse();
                          setShowDropdown(false);
                        }}
                        className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Edit className="w-4 h-4 mr-3" />
                        Edit course
                      </button>
                    )}
                    {onAddFolder && (
                      <button
                        onClick={() => {
                          onAddFolder();
                          setShowDropdown(false);
                        }}
                        className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <FolderPlus className="w-4 h-4 mr-3" />
                        Add folder
                      </button>
                    )}
                    {onAddPage && (
                      <button
                        onClick={() => {
                          onAddPage();
                          setShowDropdown(false);
                        }}
                        className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <FilePlus className="w-4 h-4 mr-3" />
                        Add page
                      </button>
                    )}
                    {onDeleteCourse && (
                      <>
                        <hr className="border-gray-100" />
                        <button
                          onClick={() => {
                            onDeleteCourse();
                            setShowDropdown(false);
                          }}
                          className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 mr-3" />
                          Delete course
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
            
            {/* Copy Success Message */}
            {copySuccess && (
              <div className="absolute right-0 top-12 bg-green-500 text-white px-3 py-2 rounded-lg shadow-lg z-50 text-sm">
                Link copied!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Course Title */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-2xl font-bold text-gray-900">
          {formatAsTitle(course.title)}
        </h1>
      </div>

      {/* Progress Bar */}
      <div className="px-4 mb-3">
        <div className="bg-gray-200 rounded-full h-6 relative flex items-center">
          <div 
            className="bg-green-500 h-6 rounded-full transition-all duration-300 flex items-center justify-center min-w-[50px]"
            style={{ width: `${Math.max(course.progress || 0, 15)}%` }}
          >
            <span className="text-xs font-bold text-white">
              {course.progress || 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Module and Lesson List */}
      <div className="flex-1 overflow-y-auto">
        {sortedModules.length > 0 ? (
          <div className="space-y-0">
            {sortedModules.map((module) => (
              <div key={module.id}>
                {/* Only show folder header if it's an actual folder (not generic module) */}
                {module.title && module.title.toLowerCase() !== 'pages' && module.title.toLowerCase() !== 'lessons' && (
                  <div className="mx-4 px-4 py-2 bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                      {formatAsTitle(module.title)}
                    </h3>
                  </div>
                )}
                
                {/* Lessons under this module */}
                {module.lessons
                  .sort((a, b) => a.lesson_order - b.lesson_order)
                  .map((lesson) => (
                    <div
                      key={lesson.id}
                      className={`mx-4 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                        module.title && module.title.toLowerCase() !== 'pages' && module.title.toLowerCase() !== 'lessons' 
                          ? 'border-l-2 border-transparent hover:border-gray-200 ml-2' 
                          : ''
                      }`}
                      onClick={() => onLessonSelect(lesson)}
                    >
                      <div className={`flex items-center space-x-3 ${
                        module.title && module.title.toLowerCase() !== 'pages' && module.title.toLowerCase() !== 'lessons' 
                          ? 'ml-2' 
                          : ''
                      }`}>
                        <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-base font-normal text-gray-900 truncate">
                            {formatAsTitle(lesson.title)}
                          </div>
                        </div>
                        {!lesson.is_published && isOwner && (
                          <span className="inline-block px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full flex-shrink-0 mr-2">
                            Draft
                          </span>
                        )}
                        {lesson.completed && (
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                        
                        {/* Lesson Admin Dropdown - Always visible on mobile for admins */}
                        {isOwner && (
                          <div 
                            className="relative"
                            ref={(el) => {
                              if (el) lessonDropdownRefs.current[lesson.id] = el;
                            }}
                          >
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveLessonDropdown(activeLessonDropdown === lesson.id ? null : lesson.id);
                              }}
                              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4 text-gray-600" />
                            </button>
                            
                            {/* Lesson Dropdown Menu */}
                            {activeLessonDropdown === lesson.id && (
                              <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[160px]">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditLesson?.(lesson.id, lesson.title);
                                    setActiveLessonDropdown(null);
                                  }}
                                  className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit page
                                </button>
                                
                                {lesson.is_published && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onRevertToDraft?.(lesson.id, lesson.title, lesson.is_published);
                                      setActiveLessonDropdown(null);
                                    }}
                                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                  >
                                    <FilePlus className="w-4 h-4 mr-2" />
                                    Revert to draft
                                  </button>
                                )}
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onChangeFolder?.(lesson.id, lesson.title, lesson.module_id);
                                    setActiveLessonDropdown(null);
                                  }}
                                  className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  <FolderPlus className="w-4 h-4 mr-2" />
                                  Change folder
                                </button>
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteLesson?.(lesson.id, lesson.title);
                                    setActiveLessonDropdown(null);
                                  }}
                                  className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete page
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No content available yet</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default MobileCourseOverview;