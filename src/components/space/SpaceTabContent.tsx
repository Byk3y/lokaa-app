import { useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import useSpaceSettingsStore from "@/hooks/useSpaceSettingsStore";
import { useTrustToken } from '@/hooks/useTrustToken';
import { useCacheAccess } from '@/hooks/useCacheAccess';
import { ErrorBoundary } from "react-error-boundary";
import { Button } from "@/components/ui/button";
import { extractTabFromPathname, type SpaceTab } from "@/utils/tabUtils";
import { useTabManager } from '@/hooks/useTabManager';
import { type TabDependencies } from '@/services/TabManagerService';

// Define context type for useOutletContext
interface SpaceShellContext {
  activeTab: string;
  subdomain: string;
}

/**
 * SpaceTabContent - Optimized content area for space tabs
 * Renders persistent tab components with service-based management
 */
const SpaceTabContent = () => {
  const { user, loading: authLoading } = useOptimizedAuth();
  const { activeTab, subdomain } = useOutletContext<SpaceShellContext>();
  
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
  
  // FIXED: Use window.location.pathname directly to avoid stale activeTab from context
  const extractedTab = extractTabFromPathname(window.location.pathname);
  
  // Always prefer the extracted tab from current URL over potentially stale activeTab from context
  const currentTab = extractedTab;
  
  // Tab dependencies for service
  const tabDependencies: TabDependencies = {
    user,
    permissions: { isOwner: permissions.isOwner, isAdmin: permissions.isAdmin },
    spaceData: storeSpace,
    subdomain: subdomain || '',
    hasInstantAccess: !!(trustToken || hasInstantCacheAccess),
    postInputRef,
  };

  // Use the tab manager service
  const {
    tabComponents: persistentTabComponents,
    visitedTabs,
    addTab,
  } = useTabManager(tabDependencies);
  
  // DEBUGGING: Log tab determination logic
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [SpaceTabContent] Tab determination:', {
      activeTab,
      extractedTab,
      currentTab,
      pathname: window.location.pathname,
      windowPathname: window.location.pathname,
      subdomain,
      usingExtractedTab: true,
      visitedTabsArray: Array.from(visitedTabs),
      availableComponents: Object.keys(persistentTabComponents),
      currentTabHasComponent: !!persistentTabComponents[currentTab],
      willAddTab: currentTab && !visitedTabs.has(currentTab as SpaceTab)
    });
  }
  
  // Mark tab as visited when it becomes active
  useEffect(() => {
    if (currentTab) {
      addTab(currentTab as SpaceTab);
    }
  }, [currentTab]); // Remove addTab from dependencies to prevent circular updates

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
        {/* Persistent tabs - only active tab is visible */}
        {Object.entries(persistentTabComponents).map(([tabKey, component]) => {
          if (!component) return null;
          return (
            <div
              key={tabKey}
              style={{ 
                display: currentTab === tabKey ? 'block' : 'none' 
              }}
              className="w-full"
            >
              {component}
            </div>
          );
        })}
      </ErrorBoundary>
    </div>
  );
};

SpaceTabContent.displayName = 'SpaceTabContent';

export default SpaceTabContent;
