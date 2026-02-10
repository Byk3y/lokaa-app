import { Suspense } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import { useTrustToken } from '@/hooks/useTrustToken';
import { useCacheAccess } from '@/hooks/useCacheAccess';
import { extractTabFromPathname } from '@/utils/tabUtils';
import CourseDetailPage from '@/views/CourseDetailPage';

// Import lazy tab components
import {
  LazyAboutTab,
  LazyFeedTab,
  LazyMembersTab,
  LazyCalendarTab,
  LazyLeaderboardsTab,
  LazyClassroomTab,
  TabLoadingFallback
} from './tabs/LazyTabComponents';

/**
 * PersistentTabContent - Renders all tab components simultaneously with visibility control
 * 
 * This component prevents tab remounting by rendering all tab components at once
 * and using CSS visibility to show/hide them. This maintains component state
 * and prevents unnecessary data refetching when switching tabs.
 */
export default function PersistentTabContent() {
  const { user } = useOptimizedAuth();
  const { subdomain } = useParams<{ subdomain: string }>();
  const location = useLocation();
  const { space: storeSpace, permissions: storePermissions } = useSpaceSettingsStore();
  const { token: trustToken } = useTrustToken(subdomain, user?.id);
  const { hasInstantAccess } = useCacheAccess(user, subdomain || '', false);

  // ✅ FIXED: Get current tab from URL using React Router's useLocation hook
  const currentTab = extractTabFromPathname(location.pathname);

  // ✅ FIXED: Check if we're on a course detail route using React Router's useLocation hook
  const currentPathname = location.pathname;
  const isCourseDetailRoute = currentPathname.match(/^\/[^\/]+\/(space\/classroom|courses)\/[^\/]+$/);
  const shouldShowCourseDetail = !!(isCourseDetailRoute && currentTab === 'classroom');

  // Basic access check
  if (!subdomain || !user) {
    return null;
  }

  // Permissions
  const permissions = {
    isOwner: storePermissions?.isOwner ?? false,
    isAdmin: storePermissions?.isAdmin ?? false,
  };

  // Common props for all tabs
  const tabProps = {
    user,
    isOwner: permissions.isOwner,
    isAdmin: permissions.isAdmin,
    hasInstantAccess: !!(trustToken || hasInstantAccess),
    disableVisibilityTracking: true, // Disable aggressive visibility tracking for persistent tabs
  };

  return (
    <div className="flex-1 overflow-auto">
      {/* Feed Tab - Always mounted, visibility controlled */}
      <div
        style={{
          display: currentTab === 'feed' ? 'block' : 'none'
        }}
        className="w-full"
        data-tab="feed"
      >
        <Suspense fallback={<TabLoadingFallback />}>
          <LazyFeedTab {...tabProps} />
        </Suspense>
      </div>

      {/* About Tab - Always mounted, visibility controlled */}
      <div
        style={{
          display: currentTab === 'about' ? 'block' : 'none'
        }}
        className="w-full"
        data-tab="about"
      >
        <Suspense fallback={<TabLoadingFallback />}>
          <LazyAboutTab />
        </Suspense>
      </div>

      {/* Calendar Tab - Always mounted, visibility controlled */}
      {storeSpace && (
        <div
          style={{
            display: currentTab === 'calendar' ? 'block' : 'none'
          }}
          className="w-full"
          data-tab="calendar"
        >
          <Suspense fallback={<TabLoadingFallback />}>
            <LazyCalendarTab space={storeSpace} />
          </Suspense>
        </div>
      )}

      {/* Members Tab - Always mounted, visibility controlled */}
      <div
        style={{
          display: currentTab === 'members' ? 'block' : 'none'
        }}
        className="w-full"
        data-tab="members"
      >
        <Suspense fallback={<TabLoadingFallback />}>
          <LazyMembersTab />
        </Suspense>
      </div>

      {/* Classroom Tab - Always mounted, visibility controlled */}
      {storeSpace && (
        <div
          style={{
            display: currentTab === 'classroom' ? 'block' : 'none'
          }}
          className="w-full"
          data-tab="classroom"
        >
          {/* Show course detail if on course route, otherwise show classroom */}
          {shouldShowCourseDetail ? (
            <CourseDetailPage key={`course-${currentPathname}`} />
          ) : (
            <Suspense fallback={<TabLoadingFallback />}>
              <LazyClassroomTab
                key="classroom-tab"
                {...tabProps}
                space={storeSpace ? {
                  id: storeSpace.id,
                  subdomain: storeSpace.subdomain,
                  owner_id: storeSpace.owner_id,
                  name: storeSpace.name
                } : undefined}
              />
            </Suspense>
          )}
        </div>
      )}

      {/* Leaderboard Tab - Always mounted, visibility controlled */}
      {storeSpace && (
        <div
          style={{
            display: currentTab === 'leaderboard' ? 'block' : 'none'
          }}
          className="w-full"
          data-tab="leaderboard"
        >
          <Suspense fallback={<TabLoadingFallback />}>
            <LazyLeaderboardsTab
              spaceId={storeSpace.id}
              spaceName={storeSpace.name}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}
