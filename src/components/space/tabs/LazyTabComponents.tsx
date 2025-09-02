import { lazy } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Lazy-loaded tab components for code splitting
 * This reduces the initial bundle size by loading tab components on demand
 */

// Lazy load all tab components
export const LazyFeedTab = lazy(() => import('@/components/space/FeedTab'));
export const LazyAboutTab = lazy(() => import('@/components/space/AboutTab'));
export const LazyMembersTab = lazy(() => import('@/components/space/MembersTab'));
export const LazyCalendarTab = lazy(() => import('@/components/space/CalendarTab'));
export const LazyLeaderboardsTab = lazy(() => import('@/components/space/LeaderboardsTab'));
export const LazyClassroomTab = lazy(() => import('@/components/space/ClassroomTab'));

/**
 * Loading fallback component for tab components
 */
export const TabLoadingFallback = () => {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="flex flex-col items-center space-y-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );
};