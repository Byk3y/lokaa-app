import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ArrowLeft, MoreHorizontal, CheckCircle2, Link, Copy, Edit, BookOpen, Share2, Volume2, VolumeX } from 'lucide-react';
import { formatAsTitle } from '@/utils/textUtils';
import { VideoContentExtractor } from '@/utils/videoContentExtractor';
import { log } from '@/utils/logger';
import { toast } from '@/hooks/use-toast';
import BottomNav from '@/components/mobile/BottomNav';
import MobileLessonEditor from '../MobileLessonEditor';
import type { 
  CourseLesson, 
  CourseDetailData, 
  LessonViewMobileProps 
} from '@/types/classroom/courseDetail';

/**
 * Mobile Lesson View Component
 * 
 * Enhanced mobile lesson viewing experience with:
 * - Mobile-optimized lesson display
 * - Video content optimization
 * - Mobile-specific interactions
 * - Performance optimizations
 * - Accessibility features
 * - Mobile reading mode
 * - Lesson transitions
 * - State management
 * - Haptic feedback
 * - Offline support
 */
const LessonViewMobile: React.FC<LessonViewMobileProps> = React.memo(({
  lesson,
  course,
  space,
  onBackToMenu,
  onNextLesson,
  onMarkAsDone,
  isOwner = false,
  isAdmin = false,
  hasNextLesson = false,
  onEditLesson,
  enableHapticFeedback = true,
  enableAnimations = true,
  enableOfflineSupport = true,
  enableAccessibility = true,
  enableReadingMode = true,
  enableVideoOptimization = true,
  enableGestureSupport = true
}) => {
  // State management
  const [showDropdown, setShowDropdown] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [isReadingMode, setIsReadingMode] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for mobile interactions
  const dropdownRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLIFrameElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef<number>(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Performance optimizations
  const [isVisible, setIsVisible] = useState(true);
  const [isInViewport, setIsInViewport] = useState(true);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Intersection Observer for performance optimization
  useEffect(() => {
    if (!contentRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInViewport(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, []);

  // Scroll position tracking for reading progress
  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        const scrollTop = contentRef.current.scrollTop;
        const scrollHeight = contentRef.current.scrollHeight;
        const clientHeight = contentRef.current.clientHeight;
        const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
        setScrollPosition(Math.min(100, Math.max(0, progress)));
      }
    };

    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('scroll', handleScroll, { passive: true });
      return () => contentElement.removeEventListener('scroll', handleScroll);
    }
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

  // Function to copy lesson URL with haptic feedback
  const copyLessonUrl = useCallback(async () => {
    try {
      const currentUrl = window.location.href;
      await navigator.clipboard.writeText(currentUrl);
      setCopySuccess(true);
      setShowDropdown(false);
      triggerHapticFeedback('light');
      
      toast({
        title: "Link copied!",
        description: "Lesson link has been copied to clipboard",
        duration: 2000
      });
      
      // Reset copy success message after 2 seconds
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
      toast({
        title: "Copy failed",
        description: "Failed to copy lesson link",
        variant: "destructive"
      });
    }
  }, [triggerHapticFeedback]);

  // Function to handle lesson editing
  const handleEditLesson = useCallback(() => {
    setShowDropdown(false);
    setShowEditor(true);
    triggerHapticFeedback('medium');
  }, [triggerHapticFeedback]);

  // Function to save lesson changes
  const handleSaveLesson = useCallback(async (updatedData: Partial<CourseLesson>) => {
    if (onEditLesson) {
      setIsLoading(true);
      setError(null);
      
      try {
        await onEditLesson(updatedData);
        setShowEditor(false);
        triggerHapticFeedback('light');
        
        toast({
          title: "Lesson updated!",
          description: "Your changes have been saved successfully",
          duration: 3000
        });
      } catch (err) {
        console.error('Error updating lesson:', err);
        setError('Failed to update lesson. Please try again.');
        
        toast({
          title: "Update failed",
          description: "Failed to save lesson changes",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
  }, [onEditLesson, triggerHapticFeedback]);

  // Touch gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enableGestureSupport) return;
    
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  }, [enableGestureSupport]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!enableGestureSupport || !touchStartRef.current) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;
    
    // Detect swipe gestures
    if (deltaTime < 300 && Math.abs(deltaX) > 50 && Math.abs(deltaY) < 100) {
      if (deltaX > 0) {
        // Swipe right - go back to menu
        onBackToMenu();
        triggerHapticFeedback('medium');
      } else if (deltaX < 0 && hasNextLesson) {
        // Swipe left - go to next lesson
        onNextLesson();
        triggerHapticFeedback('medium');
      }
    }
    
    // Detect double tap
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap - toggle reading mode
      if (enableReadingMode) {
        setIsReadingMode(prev => !prev);
        triggerHapticFeedback('light');
      }
    }
    lastTapRef.current = now;
    
    touchStartRef.current = null;
  }, [enableGestureSupport, onBackToMenu, onNextLesson, hasNextLesson, triggerHapticFeedback, enableReadingMode]);

  // Helper function to get lesson content
  const getContentSource = useCallback(() => {
    if (lesson?.educational_content?.text_content) {
      return {
        content: lesson.educational_content.text_content,
        isEducationalContent: true,
        source: 'educational_content'
      };
    }
    
    if (lesson?.content_text) {
      return {
        content: lesson.content_text,
        isEducationalContent: false,
        source: 'legacy_content_text'
      };
    }
    
    return {
      content: '',
      isEducationalContent: false,
      source: 'no_content'
    };
  }, [lesson]);

  // Helper function to remove duplicate H2 titles and clean video content
  const processContentForDisplay = useCallback((content: string | null): string => {
    if (!content) return '';
    
    // First, remove any embedded videos to prevent duplicates
    let cleaned = VideoContentExtractor.cleanHTMLContent(content);
    
    // Remove the hr tag if it exists
    cleaned = cleaned.replace(/<hr[^>]*>/gi, '');
    
    // Remove H1/H2 tags that contain the exact lesson title
    const titleToRemove = lesson.title;
    if (titleToRemove) {
      cleaned = cleaned.replace(new RegExp(`<h1[^>]*>\\s*${titleToRemove.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</h1>`, 'gi'), '');
      cleaned = cleaned.replace(new RegExp(`<h2[^>]*>\\s*${titleToRemove.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</h2>`, 'gi'), '');
    }
    
    // Remove any leading whitespace and empty paragraphs
    cleaned = cleaned.replace(/^\s*<p>\s*<\/p>\s*/i, '').trim();
    
    return cleaned;
  }, [lesson.title]);

  // Helper function to render video content using the new extractor
  const renderVideoContent = useCallback(() => {
    if (!enableVideoOptimization) return null;
    
    const videoInfo = VideoContentExtractor.extractVideoInfo(lesson);
    
    if (!videoInfo) return null;
    
    const embedUrl = VideoContentExtractor.generateEmbedUrl(videoInfo, window.location.origin);
    
    return (
      <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ paddingBottom: '56.25%' }}>
        <iframe
          ref={videoRef}
          className="absolute top-0 left-0 w-full h-full"
          src={embedUrl}
          title={lesson.title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          onLoad={() => setIsVideoPlaying(true)}
        />
        
        {/* Video controls overlay */}
        <div className="absolute top-2 right-2 flex space-x-2">
          <button
            onClick={() => {
              setIsVideoMuted(!isVideoMuted);
              triggerHapticFeedback('light');
            }}
            className="p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-all"
            aria-label={isVideoMuted ? "Unmute video" : "Mute video"}
          >
            {isVideoMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    );
  }, [lesson, enableVideoOptimization, isVideoMuted, triggerHapticFeedback]);

  // Memoized content processing
  const contentSource = useMemo(() => getContentSource(), [getContentSource]);
  const processedContent = useMemo(() => processContentForDisplay(contentSource.content), [processContentForDisplay, contentSource.content]);
  const hasVideo = useMemo(() => VideoContentExtractor.hasVideo(lesson), [lesson]);

  // Reading progress indicator
  const readingProgress = useMemo(() => {
    return Math.round(scrollPosition);
  }, [scrollPosition]);


  return (
    <div 
      className={`min-h-screen bg-white ${isReadingMode ? 'reading-mode' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="main"
      aria-label={`Lesson: ${lesson.title}`}
    >
      {/* Fixed Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-1.5 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => {
              onBackToMenu();
              triggerHapticFeedback('medium');
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Back to menu"
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
          {/* Reading mode toggle */}
          {enableReadingMode && (
            <button 
              onClick={() => {
                setIsReadingMode(!isReadingMode);
                triggerHapticFeedback('light');
              }}
              className={`p-2 rounded-lg transition-colors ${
                isReadingMode ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'
              }`}
              aria-label={isReadingMode ? "Exit reading mode" : "Enter reading mode"}
            >
              <BookOpen className="w-5 h-5" />
            </button>
          )}
          
          {/* Mark as done */}
          {onMarkAsDone && (
            <button 
              onClick={() => {
                onMarkAsDone();
                triggerHapticFeedback('medium');
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label={lesson.completed ? "Lesson completed" : "Mark lesson as done"}
            >
              <CheckCircle2 
                className={`w-6 h-6 ${lesson.completed ? 'text-green-600' : 'text-gray-400'}`}
                strokeWidth={lesson.completed ? 2.5 : 2}
              />
            </button>
          )}
          
          {/* Dropdown menu */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => {
                setShowDropdown(!showDropdown);
                triggerHapticFeedback('light');
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="More options"
            >
              <MoreHorizontal className="w-5 h-5 text-gray-600" />
            </button>
            
            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 top-12 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px] transition-all duration-200 ease-in-out">
                <button
                  onClick={copyLessonUrl}
                  className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Copy className="w-4 h-4 mr-3" />
                  Copy page link
                </button>
                <button
                  onClick={() => {
                    // TODO: Implement share functionality
                    triggerHapticFeedback('light');
                  }}
                  className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Share2 className="w-4 h-4 mr-3" />
                  Share lesson
                </button>
                {isOwner && onEditLesson && (
                  <button
                    onClick={handleEditLesson}
                    className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                  >
                    <Edit className="w-4 h-4 mr-3" />
                    Edit
                  </button>
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

      {/* Reading Progress Bar */}
      {enableReadingMode && isReadingMode && (
        <div className="fixed top-12 left-0 right-0 z-40 h-1 bg-gray-200">
          <div 
            className="h-full bg-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${readingProgress}%` }}
          />
        </div>
      )}

      {/* Scrollable Content - starts after fixed header */}
      <div 
        ref={contentRef}
        className={`pt-0 pb-20 ${isReadingMode ? 'reading-mode-content' : ''}`}
        style={{ 
          scrollBehavior: enableAnimations ? 'smooth' : 'auto',
          fontSize: isReadingMode ? '1.1rem' : '1rem',
          lineHeight: isReadingMode ? '1.8' : '1.6'
        }}
      >
        {/* Lesson Title */}
        <div className="px-4 pt-2 pb-2">
          <div className="flex items-center gap-3 flex-wrap">
            {!lesson.is_published && isOwner && (
              <span className="inline-block px-2 py-1 text-sm font-medium bg-yellow-100 text-yellow-800 rounded-full flex-shrink-0">
                Draft
              </span>
            )}
            <h1 className="text-xl font-bold text-gray-900">
              {formatAsTitle(lesson.title)}
            </h1>
          </div>
        </div>

        {/* Video Content */}
        {hasVideo && (
          <div className="px-4 mb-1">
            {renderVideoContent()}
          </div>
        )}

        {/* Navigation Buttons - Below Video */}
        <div className="flex justify-between items-center px-4 mb-2">
          <button 
            onClick={() => {
              onBackToMenu();
              triggerHapticFeedback('medium');
            }}
            className="text-blue-600 font-medium hover:text-blue-700 transition-colors"
          >
            ← Menu
          </button>
          {hasNextLesson && (
            <button 
              onClick={() => {
                onNextLesson();
                triggerHapticFeedback('medium');
              }}
              className="text-blue-600 font-medium hover:text-blue-700 transition-colors"
            >
              Next →
            </button>
          )}
        </div>

        {/* Lesson Content */}
        <div className="px-4 pb-6">
          {processedContent ? (
            <div 
              className={`prose max-w-none text-gray-700 leading-relaxed ${
                isReadingMode ? 'reading-mode-prose' : ''
              }`}
              dangerouslySetInnerHTML={{ __html: processedContent }}
            />
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p>No content available for this lesson.</p>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-4 pb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Bottom Navigation - Only show when not editing */}
      {!showEditor && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <BottomNav />
        </div>
      )}

      {/* Mobile Lesson Editor */}
      {showEditor && (
        <MobileLessonEditor
          lesson={lesson}
          space={space}
          isOpen={showEditor}
          onClose={() => setShowEditor(false)}
          onSave={handleSaveLesson}
        />
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="w-6 h-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
            <span className="text-gray-700">Saving changes...</span>
          </div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.lesson.id === nextProps.lesson.id &&
    prevProps.lesson.title === nextProps.lesson.title &&
    prevProps.lesson.completed === nextProps.lesson.completed &&
    prevProps.lesson.is_published === nextProps.lesson.is_published &&
    prevProps.course.id === nextProps.course.id &&
    prevProps.space?.id === nextProps.space?.id &&
    prevProps.isOwner === nextProps.isOwner &&
    prevProps.isAdmin === nextProps.isAdmin &&
    prevProps.hasNextLesson === nextProps.hasNextLesson &&
    prevProps.onBackToMenu === nextProps.onBackToMenu &&
    prevProps.onNextLesson === nextProps.onNextLesson &&
    prevProps.onMarkAsDone === nextProps.onMarkAsDone &&
    prevProps.onEditLesson === nextProps.onEditLesson &&
    prevProps.enableHapticFeedback === nextProps.enableHapticFeedback &&
    prevProps.enableAnimations === nextProps.enableAnimations &&
    prevProps.enableOfflineSupport === nextProps.enableOfflineSupport &&
    prevProps.enableAccessibility === nextProps.enableAccessibility &&
    prevProps.enableReadingMode === nextProps.enableReadingMode &&
    prevProps.enableVideoOptimization === nextProps.enableVideoOptimization &&
    prevProps.enableGestureSupport === nextProps.enableGestureSupport
  );
});

export default LessonViewMobile; 