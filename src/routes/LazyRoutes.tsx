import { lazy } from 'react';
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { shouldEnableMobileFeatures } from '@/utils/mobileDetection';

/**
 * Lazy-loaded route components for code splitting
 * This reduces the initial bundle size by loading pages on demand
 */

// Core user-facing pages (loaded frequently)
// REMOVED: Space component - not used in current architecture (SpaceShellLayout + SpaceTabContent used instead)
// export const Space = lazy(() => import('@/views/Space'));
export const Dashboard = lazy(() => import('@/views/Dashboard'));

// Discover component with mobile preloading
export const Discover = lazy(() => {
  const importPromise = import('@/views/Discover');
  
  // Preload on mobile devices to prevent network timing issues
  if (shouldEnableMobileFeatures()) {
    // Start preloading immediately for mobile
    importPromise.catch(error => {
      console.warn('Mobile preload failed for Discover component:', error);
    });
  }
  
  return importPromise;
});

export const Profile = lazy(() => import('@/views/Profile'));
export const ChatPage = lazy(() => import('@/views/ChatPage'));
export const NotificationsPage = lazy(() => import('@/views/NotificationsPage'));

// App layout and navigation
export const AppLayout = lazy(() => import('@/components/layout/AppLayout'));

// Settings and user pages
export const Settings = lazy(() => import('@/views/UserSettings'));
export const UserSettings = lazy(() => import('@/views/UserSettings'));

// Space-related pages
export const CreateSpace = lazy(() => import('@/views/CreateSpace'));
export const CreateSpaceWrapper = lazy(() => import('@/views/CreateSpaceWrapper'));
export const SpaceAboutPage = lazy(() => import('@/views/SpaceAboutPage'));
export const SpaceJoinPage = lazy(() => import('@/views/SpaceJoinPage'));
export const PostDetailPage = lazy(() => import('@/views/PostDetailPage'));
export const CourseDetailPage = lazy(() => import('@/views/CourseDetailPage'));

// Landing and marketing pages (can afford loading delay)
export const SmartLanding = lazy(() => import('@/views/SmartLanding'));
export const LandingPageWrapper = lazy(() => import('@/views/LandingPage').then(module => ({ default: module.LandingPageWrapper })));

// Admin and debug pages (rarely used - perfect for lazy loading)
export const StorageDebugger = lazy(() => import('@/views/StorageDebugger'));
export const SpaceDebugPage = lazy(() => import('@/views/SpaceDebugPage'));
export const DebugPage = lazy(() => import('@/views/DebugPage'));
export const AuthConfirmPage = lazy(() => import('@/views/AuthConfirmPage'));

// Utility pages
export const QuickSpaceRedirect = lazy(() => import('@/views/QuickSpaceRedirect'));
export const SpaceRedirect = lazy(() => import('@/views/SpaceRedirect'));
export const SpaceRedirectWithValidation = lazy(() => import('@/views/SpaceRedirect').then(module => ({ default: module.SpaceRedirectWithValidation })));

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