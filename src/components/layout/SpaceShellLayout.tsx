import { log } from '@/utils/logger';
import { useState, useEffect, useRef, Suspense, lazy } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import SpaceHeader from "@/components/layout/SpaceHeader";
import SpaceNav from "@/components/layout/SpaceNav";
import SpaceLayout from "@/components/layout/SpaceLayout";
import useSpaceSettingsStore from "@/hooks/useSpaceSettingsStore";
const NewSpaceSettingsModal = lazy(() => import("@/components/modals/NewSpaceSettingsModal"));
import { LocationState } from "@/views/Space"; // Import the existing LocationState type
// Cache warming removed - using simplified cache system
import { extractTabFromPathname } from "@/utils/tabUtils";
// Removed setCurrentSpaceForPresence - new simple system doesn't need manual space tracking
import { AvatarCacheService } from "@/services/AvatarCacheService"; // 🚀 NEW: Avatar cache service
import { useAutoPresenceUpdater } from "@/hooks/useAutoPresenceUpdater"; // 🎯 NEW: Auto presence updater
import { getSupabaseClient } from "@/integrations/supabase/client"; // Add for category verification
import { devLogger } from "@/utils/developmentLogger";
import { resetScrollForFeedNavigation } from "@/utils/scrollPositionManager";
import { categoryVerificationCache } from "@/utils/categoryVerificationCache";
import { useCategoriesCache } from "@/hooks/useCategoriesCache";
import PersistentTabContent from "@/components/space/PersistentTabContent";
// ✅ FIXED: Removed usePersistentTabs - using standard React Router navigation
/**
 * SpaceShellLayout - A shell layout for space pages
 * 
 * This component implements the "Shell" pattern for React Router v6.
 * It maintains a persistent header and tab navigation bar, while only
 * re-rendering the content when a tab is changed.
 * 
 * The shell wraps all space tab routes, so that when the route changes
 * between tabs (e.g., feed to calendar), only the content within the
 * <Outlet /> component re-renders. This prevents the header and nav
 * components from unmounting and remounting, eliminating the flicker
 * and maintaining scroll position.
 * 
 * ✅ FIXED: Simplified to use standard React Router navigation
 * Key features:
 * 1. Persistent header and tab bar across tab changes
 * 2. Standard React Router navigation for tab switching
 * 3. Simple tab state management via URL pathname
 * 4. Clean separation of concerns with wrapper components
 */
interface SpaceShellLayoutProps {
  showTabs?: boolean;
}

export default function SpaceShellLayout({ showTabs = true }: SpaceShellLayoutProps) {
  const { user } = useOptimizedAuth();
  const { subdomain } = useParams<{ subdomain: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const isInitialMount = useRef(true);

  // **OPTIMIZED**: Use persistent verification cache instead of memory-only ref
  const categoriesCache = useCategoriesCache();

  // State needed for the shell
  const [searchQuery, setSearchQuery] = useState("");

  // ✅ FIXED: Use standard React Router navigation instead of custom tab management
  const activeTab = extractTabFromPathname(location.pathname);

  // ✅ FIXED: Removed complex tab state debugging - React Router handles state consistency

  // Load the space from the store
  const { loadActiveSpace, space: storeSpace, loadingSpace, error: storeError } = useSpaceSettingsStore();

  // 🎯 AUTO PRESENCE UPDATER: Automatically update presence when user returns from minimizing
  useAutoPresenceUpdater(storeSpace?.id);

  // PHASE 1.5 FIX: Prevent race condition with SpaceContext + PHASE 0 Guard
  useEffect(() => {
    const needsNewData = !storeSpace || storeSpace.subdomain !== subdomain;

    // GUARD: Avoid infinite loops if we are already loading or if there's an error for the SAME subdomain
    if (loadingSpace || (storeError && !needsNewData)) {
      return;
    }

    if (subdomain && user?.id) {
      // Only consider it a match if the store space belongs to the current subdomain
      const hasMatchingSpaceData = !!storeSpace && storeSpace.subdomain === subdomain;
      if (!hasMatchingSpaceData) {
        log.debug('Component', `🔒 [Phase1.5] [SpaceShellLayout] Loading space data for ${subdomain} - no matching data found`);
        const preserveSpace = location.state?.preserveSpace === true;
        loadActiveSpace({ subdomain }, user.id, !preserveSpace);
      } else {
        log.debug('Component', `🔒 [Phase1.5] [SpaceShellLayout] Skipping loadActiveSpace - already have matching data for ${subdomain}`);
      }
    }
  }, [subdomain, user?.id, loadActiveSpace, storeSpace?.subdomain, loadingSpace, storeError]);

  // Effect to handle initial navigation and ensure Feed tab is the default
  useEffect(() => {
    // On first mount, check if we need to redirect to Feed tab
    if (isInitialMount.current && subdomain) {
      const currentPath = location.pathname;
      const currentTab = extractTabFromPathname(currentPath);

      // Handle cases where we should redirect to default feed tab:
      // 1. Direct access to root space page (e.g., /subdomain)
      // 2. Accessing a URL with trailing slash
      // 3. Initial empty or invalid tab value
      if (
        currentPath.endsWith(`/${subdomain}`) ||
        currentPath.endsWith(`/${subdomain}/`) ||
        (currentTab !== 'feed' && !currentPath.includes('/space/'))
      ) {
        if (process.env.NODE_ENV === 'development') {
          log.debug('Component', '🔄 [SpaceShellLayout] Redirecting to Feed tab on initial load');
        }

        // Navigate to the feed tab (default tab)
        navigate(`/${subdomain}/space`, {
          replace: true,
          state: { preserveSpace: true, activeTab: 'feed' } as LocationState
        });

        // ✅ FIXED: Tab state is now managed by React Router

        // Reset scroll position for initial feed navigation
        resetScrollForFeedNavigation();
      }
    }
  }, [subdomain, navigate, location.pathname]);

  // PHASE 2.6: CACHE WARMING + AVATAR PRELOADING - Warm cache when space data loads
  useEffect(() => {
    // Run only when the loaded storeSpace matches the current URL subdomain
    if (storeSpace && storeSpace.subdomain === subdomain && user?.id) {
      // Cache warming removed - using simplified cache system

      // New simple presence system automatically handles space-specific presence
      log.debug('Component', `🌐 [SpaceShellLayout] Space loaded for simplified presence: ${storeSpace.id}`);

      // 🚀 OPTIMIZED: Initialize avatar cache for instant display
      AvatarCacheService.preloadSpaceAvatars(storeSpace.id)
        .then(() => {
          if (process.env.NODE_ENV === 'development') {
            log.debug('Component', `🚀 [SpaceShellLayout] Avatar cache initialized for ${storeSpace.name}`);
          }
        })
        .catch(error => {
          if (process.env.NODE_ENV === 'development') {
            log.warn('Component', '⚠️ [SpaceShellLayout] Avatar cache initialization failed:', error);
          }
        });

      // 🛡️ OPTIMIZED: Smart category verification with persistent cache
      const verifySpaceCategories = async () => {
        // Check if verification is needed using smart cache
        if (!categoryVerificationCache.shouldVerifyCategories(storeSpace.id)) {
          devLogger.log('SpaceManagement', `[SpaceShellLayout] Skipping verification - cache hit for space ${storeSpace.id}`);
          return;
        }

        // Check if we have recent category data from existing cache
        if (categoryVerificationCache.hasRecentCategoryData(storeSpace.id, categoriesCache)) {
          const spaceCache = categoriesCache.cache[storeSpace.id];
          const hasGeneralDiscussion = spaceCache.categories.some((cat: any) =>
            cat.name === 'General Discussion'
          );

          // Update verification cache with existing data
          categoryVerificationCache.updateVerification(storeSpace.id, {
            hasCategories: spaceCache.categories.length > 0,
            hasGeneralDiscussion,
            categoriesCount: spaceCache.categories.length
          });

          devLogger.log('SpaceManagement', `[SpaceShellLayout] Using cached categories for space ${storeSpace.id}`);
          return;
        }

        try {
          devLogger.log('SpaceManagement', `[SpaceShellLayout] Verifying categories for space ${storeSpace.id}`);

          // Check if space has any categories
          const supabaseClient = getSupabaseClient();
          if (!supabaseClient) {
            devLogger.log('SpaceManagement', `[SpaceShellLayout] Supabase client not available`);
            return;
          }

          const { data: existingCategories, error: categoriesError } = await supabaseClient
            .from('space_categories')
            .select('*')
            .eq('space_id', storeSpace?.id || '')
            .eq('is_archived', false)
            .order('created_at', { ascending: true });

          if (categoriesError) {
            devLogger.log('SpaceManagement', `[SpaceShellLayout] Error checking categories:`, categoriesError);
            return;
          }

          devLogger.log('SpaceManagement', `[SpaceShellLayout] Found ${existingCategories?.length || 0} categories for space ${storeSpace.id}`);

          const hasGeneralDiscussion = existingCategories?.some(cat =>
            cat.name === 'General Discussion'
          ) || false;

          // Update verification cache
          categoryVerificationCache.updateVerification(storeSpace.id, {
            hasCategories: (existingCategories?.length || 0) > 0,
            hasGeneralDiscussion,
            categoriesCount: existingCategories?.length || 0
          });

          // If no categories exist, create General Discussion
          if (!existingCategories || existingCategories.length === 0) {
            const { error: insertError } = await supabaseClient
              .from('space_categories')
              .insert({
                name: 'General Discussion',
                icon: '💬',
                space_id: storeSpace?.id || '',
                created_by: storeSpace?.owner_id || ''
              });

            if (insertError) {
              devLogger.log('SpaceManagement', `[SpaceShellLayout] Error creating General Discussion category:`, insertError);
            } else {
              devLogger.log('SpaceManagement', `[SpaceShellLayout] Created General Discussion category for space ${storeSpace.id}`);

              // Update verification cache after creating category
              categoryVerificationCache.updateVerification(storeSpace.id, {
                hasCategories: true,
                hasGeneralDiscussion: true,
                categoriesCount: 1
              });
            }
          }
        } catch (error) {
          devLogger.log('SpaceManagement', `[SpaceShellLayout] Error in verifySpaceCategories:`, error);
        }
      };

      // Run category verification immediately (no delay needed with smart cache)
      verifySpaceCategories();
    }
  }, [storeSpace, subdomain, user?.id, categoriesCache]);

  // ✅ FIXED: Simplified tab state management - React Router handles navigation
  useEffect(() => {
    // Clear initial mount flag after first effect run
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }

    // Reset scroll position when feed tab becomes active
    if (activeTab === 'feed') {
      resetScrollForFeedNavigation();
    }
  }, [location.pathname, activeTab]);

  // Handle /space/feed -> /space redirect (legacy URL support)
  useEffect(() => {
    if (location.pathname.endsWith('/space/feed')) {
      if (process.env.NODE_ENV === 'development') {
        log.debug('Component', '🔄 [SpaceShellLayout] Redirecting /space/feed to /space');
      }
      navigate(`/${subdomain}/space`, { replace: true });
    }
  }, [location.pathname, subdomain, navigate]);

  // ✅ FIXED: Simple React Router navigation for tab changes
  const handleTabChange = (tabKey: string) => {
    if (process.env.NODE_ENV === 'development') {
      log.debug('Component', `🔄 [SpaceShellLayout] Tab change requested: ${activeTab} -> ${tabKey}`);
    }

    // Use standard React Router navigation
    if (subdomain) {
      const newUrl = tabKey === 'feed'
        ? `/${subdomain}/space`
        : `/${subdomain}/space/${tabKey}`;

      navigate(newUrl, {
        replace: true,
        state: { preserveSpace: true, activeTab: tabKey } as LocationState
      });
    }

    // Reset scroll position for feed navigation
    if (tabKey === 'feed') {
      resetScrollForFeedNavigation();
    }
  };

  // ✅ FIXED: Simplified custom event handling for bottom navigation
  useEffect(() => {
    const handleCustomTabChange = (event: CustomEvent) => {
      const { tabKey, subdomain: eventSubdomain, source } = event.detail;

      // Only handle events for the current space
      if (eventSubdomain === subdomain && source === 'bottom-nav') {
        if (process.env.NODE_ENV === 'development') {
          log.debug('Component', `🔄 [SpaceShellLayout] Handling custom tab change from ${source}: ${tabKey}`);
        }

        // Use standard React Router navigation
        handleTabChange(tabKey);
      }
    };

    // Add event listener for custom tab changes
    window.addEventListener('spaceTabChange', handleCustomTabChange as EventListener);

    return () => {
      window.removeEventListener('spaceTabChange', handleCustomTabChange as EventListener);
    };
  }, [subdomain, handleTabChange]);

  return (
    <SpaceLayout
      header={(
        <SpaceHeader
          subdomain={subdomain}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
        />
      )}
      nav={(
        showTabs && (
          <div className="hidden lg:block">
            <SpaceNav
              subdomain={subdomain}
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
          </div>
        )
      )}
    >
      {/* On mobile, SpaceNav is part of the scrollable body */}
      {showTabs && (
        <div className="block lg:hidden">
          <SpaceNav
            subdomain={subdomain}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </div>
      )}

      {/* ✅ FIXED: Use persistent tab content to prevent remounting */}
      <div className="px-0 sm:px-4 pt-0 sm:pt-6 pb-16 sm:pb-6">
        <PersistentTabContent />
      </div>

      {/* Common modals that should persist across tab changes */}
      <Suspense fallback={null}>
        <NewSpaceSettingsModal />
      </Suspense>
    </SpaceLayout>
  );
} 