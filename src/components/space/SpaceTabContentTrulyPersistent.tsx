import { log } from '@/utils/logger';
import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
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

  // Basic access check - SpaceProtectedRoute has already verified access
  const shouldShowContent = subdomain && user;

  // Basic permissions check
  const permissions = {
    isOwner: storePermissions?.isOwner ?? false,
    isAdmin: storePermissions?.isAdmin ?? false,
  };
  
  // Ref for the post input field in FeedTab
  const postInputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  
  // Track tab changes (only log significant changes)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 [SpaceTabContentTrulyPersistent] Tab changed to:', currentTab);
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
            <ClassroomTab {...spaceProps} />
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