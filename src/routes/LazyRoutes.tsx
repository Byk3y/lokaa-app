import { lazy } from 'react';
import { useParams } from 'react-router-dom';
import { lazyWithReload } from '@/utils/lazyWithReload';
import { shouldEnableMobileFeatures } from '@/utils/mobileDetection';

/**
 * Lazy-loaded route components for code splitting
 * This reduces the initial bundle size by loading pages on demand
 */

// Core user-facing pages (loaded frequently)
// REMOVED: Space component - not used in current architecture (SpaceShellLayout + SpaceTabContent used instead)
// export const Space = lazy(() => import('@/views/Space'));
export const Dashboard = lazyWithReload(() => import('@/views/Dashboard'), { id: 'Dashboard' });

// Discover component with mobile preloading
export const Discover = lazyWithReload(() => {
  const importPromise = import('@/views/Discover');
  
  // Preload on mobile devices to prevent network timing issues
  if (shouldEnableMobileFeatures()) {
    // Start preloading immediately for mobile
    importPromise.catch(error => {
      console.warn('Mobile preload failed for Discover component:', error);
    });
  }
  
  return importPromise;
}, { id: 'Discover' });

export const Profile = lazyWithReload(() => import('@/views/Profile'), { id: 'Profile' });
export const ChatPage = lazyWithReload(() => import('@/views/ChatPage'), { id: 'ChatPage' });
export const NotificationsPage = lazyWithReload(() => import('@/views/NotificationsPage'), { id: 'NotificationsPage' });

// App layout and navigation
export const AppLayout = lazyWithReload(() => import('@/components/layout/AppLayout'), { id: 'AppLayout' });

// Settings and user pages
export const Settings = lazyWithReload(() => import('@/views/UserSettings'), { id: 'UserSettings' });
export const UserSettings = lazyWithReload(() => import('@/views/UserSettings'), { id: 'UserSettings' });

// Space-related pages
export const CreateSpace = lazyWithReload(() => import('@/views/CreateSpace'), { id: 'CreateSpace' });
export const CreateSpaceWrapper = lazyWithReload(() => import('@/views/CreateSpaceWrapper'), { id: 'CreateSpaceWrapper' });
export const SpaceAboutPage = lazyWithReload(() => import('@/views/SpaceAboutPage'), { id: 'SpaceAboutPage' });
export const SpaceJoinPage = lazyWithReload(() => import('@/views/SpaceJoinPage'), { id: 'SpaceJoinPage' });
export const PostDetailPage = lazyWithReload(() => import('@/views/PostDetailPage'), { id: 'PostDetailPage' });
export const CourseDetailPage = lazyWithReload(() => import('@/views/CourseDetailPage'), { id: 'CourseDetailPage' });

// Legacy redirect components for URL migration
export const PostLegacyRedirect = lazyWithReload(() => import('@/components/PostLegacyRedirect'), { id: 'PostLegacyRedirect' });
export const CourseLegacyRedirect = lazyWithReload(() => import('@/components/CourseLegacyRedirect'), { id: 'CourseLegacyRedirect' });
export const LessonLegacyRedirect = lazyWithReload(() => import('@/components/LessonLegacyRedirect'), { id: 'LessonLegacyRedirect' });

// ✅ FIXED: Add tab components for SpaceShellLayout Outlet with proper props
export const FeedTab = lazyWithReload(() => import('@/components/space/tabs/FeedTabWrapper'), { id: 'FeedTab' });
export const AboutTab = lazyWithReload(() => import('@/components/space/AboutTab'), { id: 'AboutTab' });
export const MembersTab = lazyWithReload(() => import('@/components/space/MembersTab'), { id: 'MembersTab' });
export const ClassroomTab = lazyWithReload(() => import('@/components/space/tabs/ClassroomTabWrapper'), { id: 'ClassroomTab' });
export const CalendarTab = lazyWithReload(() => import('@/components/space/tabs/CalendarTabWrapper'), { id: 'CalendarTab' });
export const LeaderboardTab = lazyWithReload(() => import('@/components/space/tabs/LeaderboardTabWrapper'), { id: 'LeaderboardTab' });
export const SearchTab = lazy(() => Promise.resolve({ 
  default: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Search</h1>
        <p className="text-gray-600">Search functionality is under development.</p>
      </div>
    </div>
  ) 
}));

// Landing and marketing pages (can afford loading delay)
export const SmartLanding = lazyWithReload(() => import('@/views/SmartLanding'), { id: 'SmartLanding' });
export const LandingPageWrapper = lazyWithReload(() => import('@/views/LandingPage').then(module => ({ default: module.LandingPageWrapper })), { id: 'LandingPageWrapper' });

// Admin and debug pages (rarely used - perfect for lazy loading)
export const StorageDebugger = lazyWithReload(() => import('@/views/StorageDebugger'), { id: 'StorageDebugger' });
export const SpaceDebugPage = lazyWithReload(() => import('@/views/SpaceDebugPage'), { id: 'SpaceDebugPage' });
export const DebugPage = lazyWithReload(() => import('@/views/DebugPage'), { id: 'DebugPage' });
export const AuthConfirmPage = lazyWithReload(() => import('@/views/AuthConfirmPage'), { id: 'AuthConfirmPage' });
export const AuthCallback = lazyWithReload(() => import('@/views/AuthCallback'), { id: 'AuthCallback' });
export const ResetPasswordPage = lazyWithReload(() => import('@/views/ResetPasswordPage'), { id: 'ResetPasswordPage' });

// Utility pages
export const QuickSpaceRedirect = lazyWithReload(() => import('@/views/QuickSpaceRedirect'), { id: 'QuickSpaceRedirect' });
export const SpaceRedirect = lazyWithReload(() => import('@/views/SpaceRedirect'), { id: 'SpaceRedirect' });
export const SpaceRedirectWithValidation = lazyWithReload(() => import('@/views/SpaceRedirect').then(module => ({ default: module.SpaceRedirectWithValidation })), { id: 'SpaceRedirectWithValidation' });

// Placeholder components for missing pages
export const Start = lazy(() => Promise.resolve({ 
  default: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Start Page</h1>
        <p className="text-gray-600">This page is under development.</p>
      </div>
    </div>
  ) 
}));

export const GlobalSearch = lazy(() => Promise.resolve({ 
  default: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Global Search</h1>
        <p className="text-gray-600">This feature is under development.</p>
      </div>
    </div>
  ) 
}));

/**
 * FIXED: Immediate loading fallback to prevent white screen
 */
export const RouteLoadingFallback = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" style={{ minHeight: '100vh' }}>
      <div className="flex flex-col items-center">
        <div className="animate-spin h-6 w-6 rounded-full border-t-2 border-b-2 border-teal-500 mb-2"></div>
        <p className="text-gray-500 text-sm">Loading page...</p>
      </div>
    </div>
  );
};

/**
 * FIXED: Instant space loading fallback - no delays
 */
export const SpaceLoadingFallback = () => {
  const { subdomain } = useParams<{ subdomain?: string }>();
  
  // FIXED: Show loading immediately without any delays
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" style={{ minHeight: '100vh' }}>
      <div className="flex flex-col items-center">
        <div className="animate-spin h-8 w-8 rounded-full border-t-2 border-b-2 border-teal-500 mb-3"></div>
        <p className="text-gray-600 text-base font-medium">
          {subdomain ? `Loading ${subdomain}...` : "Loading your space..."}
        </p>
        <p className="text-gray-400 text-sm mt-1">Please wait</p>
      </div>
    </div>
  );
}; 