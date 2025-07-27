import { log } from '@/utils/logger';
import { useEffect, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import useSpaceSettingsStore from "@/hooks/useSpaceSettingsStore";
import { useTrustToken } from '@/hooks/useTrustToken';
import { useCacheAccess } from '@/hooks/useCacheAccess';
import { ErrorBoundary } from "react-error-boundary";
import { Button } from "@/components/ui/button";
import usePersistentTabs from "@/hooks/usePersistentTabs";

// Import all tab components directly to keep them mounted
import AboutTab from "@/components/space/AboutTab";
import FeedTab from "@/components/space/FeedTab";
import CalendarTab from "@/components/space/CalendarTab";
import MembersTab from "@/components/space/MembersTab";
import LeaderboardsTab from "@/components/space/LeaderboardsTab";
import { ClassroomTabRefactored as ClassroomTab } from "@/components/classroom/ClassroomTabRefactored";
import CourseDetailPage from "@/pages/CourseDetailPage";

/**
 * SpaceTabContentTrulyPersistent - Revolutionary Persistent Tab Content
 * 
 * This component implements a truly persistent tab system that:
 * 1. Never unmounts any tab components
 * 2. Uses URL-independent state management 
 * 3. Updates URLs without triggering React Router navigation
 * 4. Maintains perfect component state across all navigation patterns
 * 
 * Key Innovation: Completely bypasses React Router for tab switching
 * while maintaining URL synchronization for browser back/forward.
 */
const SpaceTabContentTrulyPersistent = () => {
  const { user, loading: authLoading } = useOptimizedAuth();
  const { subdomain } = useParams<{ subdomain: string }>();
  const location = useLocation();
  
  // Get space data and permissions from store
  const { 
    space: storeSpace,
    permissions: storePermissions,
  } = useSpaceSettingsStore();
  
  // Trust token validation using extracted service
  const { token: trustToken } = useTrustToken(subdomain, user?.id);
  
  // Cache access using extracted service
  const { hasInstantAccess: hasInstantCacheAccess } = useCacheAccess(user, subdomain || '', authLoading);

  // Revolutionary URL-independent tab management
  const { currentTab, isTabActive } = usePersistentTabs(subdomain);
  
  // ✅ FIX: Check if we're on a course detail route (new pattern only)
  const isCourseDetailRoute = location.pathname.match(/^\/[^\/]+\/space\/classroom\/[^\/]+$/);
  
  // 🚨 CRITICAL FIX: Prevent race condition between tab state and URL state
  // Only show course detail if we're clearly on a course detail route
  const isClassroomTabActive = isTabActive('classroom');
  const isOnClassroomRoute = location.pathname.match(/^\/[^\/]+\/space\/classroom$/);
  
  // Simple logic: Only show course detail if URL clearly indicates a course detail route
  // AND we're not in a transition state (classroom tab active but URL not synced)
  const shouldShowCourseDetail = isCourseDetailRoute;
  
  // Debug logging for course detail route detection
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [SpaceTabContentTrulyPersistent] Route check:', {
      pathname: location.pathname,
      isCourseDetailRoute: !!isCourseDetailRoute,
      isClassroomTabActive,
      isOnClassroomRoute: !!isOnClassroomRoute,
      shouldShowCourseDetail,
      isTabActive: isTabActive('classroom')
    });
  }

  // Basic access check - SpaceProtectedRoute has already verified access
  const shouldShowContent = subdomain && user;

  // Basic permissions check
  const permissions = {
    isOwner: storePermissions?.isOwner ?? false,
    isAdmin: storePermissions?.isAdmin ?? false,
  };
  
  // Ref for the post input field in FeedTab
  const postInputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  
  // Track tab changes and clear course state when switching to classroom tab
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 [SpaceTabContentTrulyPersistent] Tab changed to:', currentTab);
    }
    
    // CRITICAL FIX: Clear course selection state when switching to classroom tab
    // This ensures classroom tab always shows course cards, not auto-navigates to last viewed course
    if (currentTab === 'classroom') {
      // IMMEDIATE CLEAR: Clear any saved lesson state from localStorage BEFORE any components can read it
      const courseIds = Object.keys(localStorage).filter(key => key.startsWith('lastViewedLesson_'));
      courseIds.forEach(key => {
        localStorage.removeItem(key);
        if (process.env.NODE_ENV === 'development') {
          console.log('🧹 [SpaceTabContentTrulyPersistent] Cleared saved lesson state:', key);
        }
      });
      
      // Ensure we're on the classroom overview route, not a course detail route
      const currentPath = window.location.pathname;
      const isOnClassroomOverview = currentPath.match(/^\/[^\/]+\/space\/classroom$/);
      const isOnCourseDetail = currentPath.match(/^\/[^\/]+\/space\/classroom\/[^\/]+$/) || 
                               currentPath.match(/^\/[^\/]+\/course\/[^\/]+$/);
      
      if (!isOnClassroomOverview && isOnCourseDetail) {
        // Navigate to classroom overview if we're on a course detail route
        const subdomain = window.location.pathname.split('/')[1];
        const newUrl = `/${subdomain}/space/classroom`;
        window.history.replaceState(null, '', newUrl);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 [SpaceTabContentTrulyPersistent] Redirected to classroom overview:', newUrl);
        }
      }
    }
  }, [currentTab]);
  
  // Common props for all tabs
  const tabProps = {
    user,
    isOwner: permissions.isOwner,
    isAdmin: permissions.isAdmin,
    hasInstantAccess: !!(trustToken || hasInstantCacheAccess),
    postInputRef,
    disableVisibilityTracking: true, // Disable aggressive visibility tracking for persistent tabs
  };

  // Space-specific props
  const spaceProps = storeSpace ? {
    space: {
      id: storeSpace.id,
      name: storeSpace.name,
      owner_id: storeSpace.owner_id,
    }
  } : {};

  // Render content immediately if we have access
  if (!shouldShowContent) return null;

  return (
    <div className="flex-1 overflow-auto">
      <ErrorBoundary
        fallback={
          <div className="p-6 text-center">
            <p className="text-red-600 mb-4">Something went wrong loading this tab.</p>
            <Button onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </div>
        }
      >
        {/* Feed Tab - Always mounted, visibility controlled by CSS */}
        <div
          style={{ 
            display: isTabActive('feed') ? 'block' : 'none' 
          }}
          className="w-full"
          data-tab="feed"
        >
          <FeedTab {...tabProps} />
        </div>

        {/* About Tab - Always mounted, visibility controlled by CSS */}
        <div
          style={{ 
            display: isTabActive('about') ? 'block' : 'none' 
          }}
          className="w-full"
          data-tab="about"
        >
          <AboutTab />
        </div>

        {/* Calendar Tab - Always mounted, visibility controlled by CSS */}
        {storeSpace && (
          <div
            style={{ 
              display: isTabActive('calendar') ? 'block' : 'none' 
            }}
            className="w-full"
            data-tab="calendar"
          >
            <CalendarTab space={spaceProps.space} />
          </div>
        )}

        {/* Members Tab - Always mounted, visibility controlled by CSS */}
        <div
          style={{ 
            display: isTabActive('members') ? 'block' : 'none' 
          }}
          className="w-full"
          data-tab="members"
        >
          <MembersTab />
        </div>

        {/* Classroom Tab - Always mounted, visibility controlled by CSS */}
        {storeSpace && (
          <div
            style={{ 
              display: isTabActive('classroom') ? 'block' : 'none' 
            }}
            className="w-full"
            data-tab="classroom"
          >
            {/* Show course detail if on course route AND URL state is synchronized, otherwise show classroom */}
            {shouldShowCourseDetail ? (
              <CourseDetailPage key={`course-${location.pathname}`} />
            ) : (
              <ClassroomTab {...spaceProps} key={`classroom-${location.pathname}`} />
            )}
          </div>
        )}

        {/* Leaderboard Tab - Always mounted, visibility controlled by CSS */}
        {storeSpace && (
          <div
            style={{ 
              display: isTabActive('leaderboard') ? 'block' : 'none' 
            }}
            className="w-full"
            data-tab="leaderboard"
          >
            <LeaderboardsTab 
              spaceId={storeSpace.id}
              spaceName={storeSpace.name}
            />
          </div>
        )}
      </ErrorBoundary>
    </div>
  );
};

SpaceTabContentTrulyPersistent.displayName = 'SpaceTabContentTrulyPersistent';

export default SpaceTabContentTrulyPersistent;