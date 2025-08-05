import React from 'react';
import { ArrowLeft } from 'lucide-react';
import CourseDetailMobile from '../mobile/CourseDetailMobile';
import type { Space } from '@/contexts/SpaceContext';

interface MobileStateManagerProps {
  courseId: string;
  onBack: () => void;
  moduleId?: string;
  lessonId?: string;
  isMobile: boolean;
  loading: boolean;
  spaceLoading: boolean;
  showCourseOverview: boolean;
  showLessonView: boolean;
  space: Space | null;
  onMobileStateChange: (state: { isMobile: boolean; showTabs: boolean }) => void;
}

/**
 * MobileStateManager handles mobile detection, loading states, and mobile routing logic
 * Extracted from CourseDetailView to isolate mobile-specific functionality
 */
export const MobileStateManager: React.FC<MobileStateManagerProps> = ({
  courseId,
  onBack,
  moduleId,
  lessonId,
  isMobile,
  loading,
  spaceLoading,
  showCourseOverview,
  showLessonView,
  space,
  onMobileStateChange
}) => {
  // FIXED: Add mobile loading state to prevent "back to courses" flash
  // Show mobile spinner while mobile state is being determined
  // IMPORTANT: This must come BEFORE the mobile container check
  if (isMobile && (loading || spaceLoading)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎓 [MobileStateManager] Mobile loading state:', { 
        loading, 
        spaceLoading, 
        hasSpace: !!space, 
        spaceIconImage: space?.icon_image,
        spaceName: space?.name 
      });
    }
    
    return (
      <div className="fixed inset-0 flex flex-col bg-white z-50">
        {/* Mobile Header */}
        <div className="flex items-center justify-between px-4 py-1.5 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center space-x-3">
            <button 
              onClick={onBack}
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
                  onError={(e) => {
                    // Fallback to initials if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const fallback = parent.querySelector('.space-icon-fallback') as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              {/* Always show fallback, but hide if icon loads successfully */}
              <div 
                className={`w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center space-icon-fallback ${
                  space?.icon_image ? 'hidden' : ''
                }`}
              >
                <span className="text-sm font-medium text-gray-600">
                  {space?.name?.charAt(0).toUpperCase() || 'S'}
                </span>
              </div>
              <span className="font-bold text-gray-900 truncate max-w-[120px]">
                {space?.name || 'Space'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Mobile Loading Spinner at Top */}
        <div className="flex justify-center py-8 border-b border-gray-100">
          <div className="w-8 h-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
        </div>
        
        {/* Empty content area */}
        <div className="flex-1"></div>
      </div>
    );
  }

  // MOBILE OPTIMIZATION: Prioritize mobile view over loading states
  // This eliminates white screen and long spinner on mobile
  if (showCourseOverview || showLessonView) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎓 [MobileStateManager] Rendering mobile container:', { showCourseOverview, showLessonView });
    }
    return (
      <CourseDetailMobile
        courseId={courseId}
        onBack={onBack}
        moduleId={moduleId}
        lessonId={lessonId}
        onMobileStateChange={onMobileStateChange}
      />
    );
  }

  // If none of the mobile conditions are met, return null to let parent handle desktop view
  return null;
};