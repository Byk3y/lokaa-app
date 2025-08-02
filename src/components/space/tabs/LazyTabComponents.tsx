import { lazy } from 'react';
import LoadingIndicator from '@/components/LoadingIndicator';

// Lazy-loaded tab components for code splitting
export const LazyAboutTab = lazy(() => import('@/components/space/AboutTab'));
export const LazyFeedTab = lazy(() => import('@/components/space/FeedTab'));
export const LazyMembersTab = lazy(() => import('@/components/space/MembersTab'));
export const LazyCalendarTab = lazy(() => import('@/components/space/CalendarTab'));
export const LazyLeaderboardsTab = lazy(() => import('@/components/space/LeaderboardsTab'));
export const LazyClassroomTab = lazy(() => import('@/components/classroom/ClassroomTabRefactored').then(module => ({
  default: module.ClassroomTabRefactored
})));

// Shared loading component for tabs
export const TabLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <LoadingIndicator />
  </div>
);