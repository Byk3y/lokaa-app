import { log } from '@/utils/logger';
import { useEffect, useRef } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import useSpaceSettingsStore from "@/hooks/useSpaceSettingsStore";
import { useTrustToken } from '@/hooks/useTrustToken';
import { useCacheAccess } from '@/hooks/useCacheAccess';
import { ErrorBoundary } from "react-error-boundary";
import { Button } from "@/components/ui/button";
import { extractTabFromPathname, type SpaceTab } from "@/utils/tabUtils";

// Import all tab components directly to keep them mounted
import AboutTab from "@/components/space/AboutTab";
import FeedTab from "@/components/space/FeedTab";
import CalendarTab from "@/components/space/CalendarTab";
import MembersTab from "@/components/space/MembersTab";
import LeaderboardsTab from "@/components/space/LeaderboardsTab";
import { ClassroomTabRefactored as ClassroomTab } from "@/components/classroom/ClassroomTabRefactored";

// Define context type for useOutletContext
interface SpaceShellContext {
  activeTab: string;
  subdomain: string;
}

/**
 * SpacePersistentTabContent - Persistent tab content with mounted components
 * 
 * This component renders ALL tab components but only shows the active one.
 * This prevents unmounting/remounting which causes the "categories then posts" 
 * re-rendering issue when navigating between tabs.
 * 
 * Key difference from SpaceTabContent:
 * - All tab components stay mounted in the DOM
 * - Visibility is controlled via CSS display property
 * - No component lifecycle interruption when switching tabs
 * - Prevents the sequential loading issue in feed tab
 */
const SpacePersistentTabContent = () => {
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

  // Basic access check - SpaceProtectedRoute has already verified access
  const shouldShowContent = subdomain && user;

  // Basic permissions check
  const permissions = {
    isOwner: storePermissions?.isOwner ?? false,
    isAdmin: storePermissions?.isAdmin ?? false,
  };
  
  // Ref for the post input field in FeedTab
  const postInputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  
  // Use window.location.pathname directly to get current tab
  const currentTab = extractTabFromPathname(window.location.pathname);
  
  
  
  // Determine if each tab should be visible
  const isTabVisible = (tabKey: SpaceTab) => currentTab === tabKey;
  
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
        {/* Feed Tab - Always mounted */}
        <div
          style={{ 
            display: isTabVisible('feed') ? 'block' : 'none' 
          }}
          className="w-full"
        >
          <FeedTab {...tabProps} />
        </div>

        {/* About Tab - Always mounted */}
        <div
          style={{ 
            display: isTabVisible('about') ? 'block' : 'none' 
          }}
          className="w-full"
        >
          <AboutTab />
        </div>

        {/* Calendar Tab - Always mounted */}
        {storeSpace && (
          <div
            style={{ 
              display: isTabVisible('calendar') ? 'block' : 'none' 
            }}
            className="w-full"
          >
            <CalendarTab {...spaceProps} />
          </div>
        )}

        {/* Members Tab - Always mounted */}
        <div
          style={{ 
            display: isTabVisible('members') ? 'block' : 'none' 
          }}
          className="w-full"
        >
          <MembersTab />
        </div>

        {/* Classroom Tab - Always mounted */}
        {storeSpace && (
          <div
            style={{ 
              display: isTabVisible('classroom') ? 'block' : 'none' 
            }}
            className="w-full"
          >
            <ClassroomTab {...spaceProps} />
          </div>
        )}

        {/* Leaderboard Tab - Always mounted */}
        {storeSpace && (
          <div
            style={{ 
              display: isTabVisible('leaderboard') ? 'block' : 'none' 
            }}
            className="w-full"
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

SpacePersistentTabContent.displayName = 'SpacePersistentTabContent';

export default SpacePersistentTabContent;