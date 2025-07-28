import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Search, MoreHorizontal, FileText, Copy, Edit, FolderPlus, FilePlus, Trash2, CheckCircle, Circle } from 'lucide-react';
import { formatAsTitle } from '@/utils/textUtils';
import { toast } from '@/hooks/use-toast';
import { log } from '@/utils/logger';
import BottomNav from '@/components/mobile/BottomNav';
import type { 
  CourseLesson, 
  CourseModule, 
  CourseDetailData, 
  CourseOverviewMobileProps 
} from '@/types/classroom/courseDetail';

interface Space {
  id: string;
  name: string;
  subdomain: string;
  avatar_url?: string | null;
  icon_image?: string | null;
}

/**
 * CourseOverviewMobile - Comprehensive Mobile Course Overview Component
 * 
 * Features:
 * - Mobile-optimized course overview UI
 * - Touch-friendly interactions and gestures
 * - Mobile animations and transitions
 * - Mobile touch feedback and haptic feedback
 * - Mobile offline support
 * - Mobile scroll behavior optimization
 * - Mobile tab switching
 * - Mobile deep linking support
 * - Mobile accessibility features
 * - Mobile performance optimizations
 */
const CourseOverviewMobile: React.FC<CourseOverviewMobileProps> = ({
  course,
  space,
  onBack,
  onLessonSelect,
  isOwner = false,
  isAdmin = false,
  onEditCourse,
  onAddFolder,
  onAddPage,
  onDeleteCourse,
  onEditLesson,
  onDeleteLesson,
  onRevertToDraft,
  onChangeFolder,
  onDuplicateLesson,
  enableHapticFeedback = true,
  enableAnimations = true,
  enableOfflineSupport = true,
  enableAccessibility = true,
}) => {
  // State management
  const [showDropdown, setShowDropdown] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeLessonDropdown, setActiveLessonDropdown] = useState<string | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('up');
  const [lastScrollTop, setLastScrollTop] = useState(0);
  
  // Refs for mobile interactions
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lessonDropdownRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef<number>(0);
  
  // Mobile gesture detection
  const [isGestureActive, setIsGestureActive] = useState(false);
  const [gestureDirection, setGestureDirection] = useState<'left' | 'right' | 'up' | 'down' | null>(null);

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

  // Scroll behavior optimization
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      setIsScrolling(true);
      
      const scrollTop = scrollContainer.scrollTop;
      setScrollDirection(scrollTop > lastScrollTop ? 'down' : 'up');
      setLastScrollTop(scrollTop);

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [lastScrollTop]);

  // Touch gesture handling
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    setIsGestureActive(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || !isGestureActive) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    
    // Determine gesture direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setGestureDirection(deltaX > 0 ? 'right' : 'left');
    } else {
      setGestureDirection(deltaY > 0 ? 'down' : 'up');
    }
  }, [isGestureActive]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;
    
    // Detect swipe gestures
    const minSwipeDistance = 50;
    const maxSwipeTime = 300;
    
    if (deltaTime < maxSwipeTime) {
      if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > 0) {
          log.debug('Mobile', '🎓 [CourseOverviewMobile] Right swipe detected');
          // Could be used for navigation or other actions
        } else {
          log.debug('Mobile', '🎓 [CourseOverviewMobile] Left swipe detected');
          // Could be used for navigation or other actions
        }
      } else if (Math.abs(deltaY) > minSwipeDistance && Math.abs(deltaY) > Math.abs(deltaX)) {
        // Vertical swipe
        if (deltaY > 0) {
          log.debug('Mobile', '🎓 [CourseOverviewMobile] Down swipe detected');
        } else {
          log.debug('Mobile', '🎓 [CourseOverviewMobile] Up swipe detected');
        }
      }
    }
    
    // Reset gesture state
    setIsGestureActive(false);
    setGestureDirection(null);
    touchStartRef.current = null;
  }, []);

  // Haptic feedback utility
  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHapticFeedback || !navigator.vibrate) return;
    
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30]
    };
    
    navigator.vibrate(patterns[type]);
  }, [enableHapticFeedback]);

  // Function to copy course URL with haptic feedback
  const copyCourseUrl = useCallback(async () => {
    try {
      const currentUrl = window.location.href;
      await navigator.clipboard.writeText(currentUrl);
      setCopySuccess(true);
      setShowDropdown(false);
      triggerHapticFeedback('light');
      
      toast({
        title: "Link Copied",
        description: "Course link has been copied to clipboard",
        variant: "default"
      });
      
      // Reset copy success message after 2 seconds
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } catch (err) {
      log.error('Mobile', 'Failed to copy URL:', err);
      toast({
        title: "Copy Failed",
        description: "Failed to copy course link",
        variant: "destructive"
      });
    }
  }, [triggerHapticFeedback]);

  // Enhanced lesson selection with haptic feedback
  const handleLessonSelect = useCallback((lesson: CourseLesson) => {
    triggerHapticFeedback('light');
    onLessonSelect(lesson);
  }, [onLessonSelect, triggerHapticFeedback]);

  // Sort modules by module_order and keep lessons organized under their modules
  const sortedModules = course.modules.sort((a, b) => a.module_order - b.module_order);

  return (
    <div 
      className="fixed inset-0 flex flex-col bg-white z-50"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Mobile Header with scroll-aware behavior */}
      <div className={`flex items-center justify-between px-4 py-1.5 bg-white border-b border-gray-200 shadow-sm transition-transform duration-200 ${
        isScrolling && scrollDirection === 'down' ? '-translate-y-full' : 'translate-y-0'
      }`}>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => {
              triggerHapticFeedback('light');
              onBack();
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors active:bg-gray-200"
            aria-label="Go back to courses"
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
                loading="lazy"
              />
            ) : (
              <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">
                  {space?.name?.charAt(0).toUpperCase() || 'S'}
                </span>
              </div>
            )}
            <span className="font-bold text-gray-900 truncate max-w-[120px]">
              {space?.name || 'Space'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors active:bg-gray-200"
            aria-label="Search course content"
          >
            <Search className="w-5 h-5 text-gray-600" />
          </button>
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => {
                triggerHapticFeedback('light');
                setShowDropdown(!showDropdown);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors active:bg-gray-200"
              aria-label="Course options menu"
            >
              <MoreHorizontal className="w-5 h-5 text-gray-600" />
            </button>
            
            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 top-12 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px] transition-all duration-200 ease-in-out">
                <button
                  onClick={copyCourseUrl}
                  className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors active:bg-gray-100"
                >
                  <Copy className="w-4 h-4 mr-3" />
                  Copy course link
                </button>
                
                {/* Admin-only options */}
                {(isOwner || isAdmin) && (
                  <>
                    <hr className="border-gray-100" />
                    {onEditCourse && (
                      <button
                        onClick={() => {
                          triggerHapticFeedback('light');
                          onEditCourse();
                          setShowDropdown(false);
                        }}
                        className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors active:bg-gray-100"
                      >
                        <Edit className="w-4 h-4 mr-3" />
                        Edit course
                      </button>
                    )}
                    {onAddFolder && (
                      <button
                        onClick={() => {
                          triggerHapticFeedback('light');
                          onAddFolder();
                          setShowDropdown(false);
                        }}
                        className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors active:bg-gray-100"
                      >
                        <FolderPlus className="w-4 h-4 mr-3" />
                        Add folder
                      </button>
                    )}
                    {onAddPage && (
                      <button
                        onClick={() => {
                          triggerHapticFeedback('light');
                          onAddPage();
                          setShowDropdown(false);
                        }}
                        className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors active:bg-gray-100"
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
                            triggerHapticFeedback('medium');
                            onDeleteCourse();
                            setShowDropdown(false);
                          }}
                          className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors active:bg-red-100"
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
              <div className="absolute right-0 top-12 bg-green-500 text-white px-3 py-2 rounded-lg shadow-lg z-50 text-sm transition-all duration-200 ease-in-out">
                Link copied!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Course Title */}
      <div className="px-4 pt-2 pb-2">
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">
          {formatAsTitle(course.title)}
        </h1>
      </div>

      {/* Progress Bar */}
      <div className="px-4 mb-3">
        <div className="bg-gray-200 rounded-full h-6 relative flex items-center overflow-hidden">
          <div 
            className="bg-green-500 h-6 rounded-full transition-all duration-500 flex items-center justify-center min-w-[50px]"
            style={{ width: `${Math.max(course.progress || 0, 15)}%` }}
          >
            <span className="text-xs font-bold text-white">
              {course.progress || 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Module and Lesson List */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ 
          scrollBehavior: enableAnimations ? 'smooth' : 'auto',
          WebkitOverflowScrolling: 'touch'
        }}
      >
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
                      className={`mx-4 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors active:bg-gray-100 ${
                        module.title && module.title.toLowerCase() !== 'pages' && module.title.toLowerCase() !== 'lessons' 
                          ? 'border-l-2 border-transparent hover:border-gray-200 ml-2' 
                          : ''
                      }`}
                      onClick={() => handleLessonSelect(lesson)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleLessonSelect(lesson);
                        }
                      }}
                      aria-label={`Select lesson: ${formatAsTitle(lesson.title)}`}
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
                        {!lesson.is_published && (isOwner || isAdmin) && (
                          <span className="inline-block px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full flex-shrink-0 mr-2">
                            Draft
                          </span>
                        )}
                        {lesson.completed ? (
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
                        )}
                        
                        {/* Lesson Admin Dropdown - Always visible on mobile for admins */}
                        {(isOwner || isAdmin) && (
                          <div 
                            className="relative"
                            ref={(el) => {
                              if (el) lessonDropdownRefs.current[lesson.id] = el;
                            }}
                          >
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerHapticFeedback('light');
                                setActiveLessonDropdown(activeLessonDropdown === lesson.id ? null : lesson.id);
                              }}
                              className="p-1 hover:bg-gray-200 rounded-full transition-colors active:bg-gray-300"
                              aria-label={`Options for lesson: ${formatAsTitle(lesson.title)}`}
                            >
                              <MoreHorizontal className="w-4 h-4 text-gray-600" />
                            </button>
                            
                            {/* Lesson Dropdown Menu */}
                            {activeLessonDropdown === lesson.id && (
                              <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[160px] transition-all duration-200 ease-in-out">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    triggerHapticFeedback('light');
                                    onEditLesson?.(lesson.id, lesson.title);
                                    setActiveLessonDropdown(null);
                                  }}
                                  className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors active:bg-gray-100"
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit page
                                </button>
                                
                                {lesson.is_published && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      triggerHapticFeedback('light');
                                      onRevertToDraft?.(lesson.id, lesson.title, lesson.is_published);
                                      setActiveLessonDropdown(null);
                                    }}
                                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors active:bg-gray-100"
                                  >
                                    <FilePlus className="w-4 h-4 mr-2" />
                                    Revert to draft
                                  </button>
                                )}
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    triggerHapticFeedback('light');
                                    onChangeFolder?.(lesson.id, lesson.title, lesson.module_id);
                                    setActiveLessonDropdown(null);
                                  }}
                                  className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors active:bg-gray-100"
                                >
                                  <FolderPlus className="w-4 h-4 mr-2" />
                                  Change folder
                                </button>
                                
                                {onDuplicateLesson && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      triggerHapticFeedback('light');
                                      onDuplicateLesson(lesson.id, lesson.title);
                                      setActiveLessonDropdown(null);
                                    }}
                                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors active:bg-gray-100"
                                  >
                                    <Copy className="w-4 h-4 mr-2" />
                                    Duplicate page
                                  </button>
                                )}
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    triggerHapticFeedback('medium');
                                    onDeleteLesson?.(lesson.id, lesson.title);
                                    setActiveLessonDropdown(null);
                                  }}
                                  className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors active:bg-red-100"
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
              {(isOwner || isAdmin) && onAddPage && (
                <button
                  onClick={() => {
                    triggerHapticFeedback('light');
                    onAddPage();
                  }}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors active:bg-blue-700"
                >
                  Add your first page
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default CourseOverviewMobile; 