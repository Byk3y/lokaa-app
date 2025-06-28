import { useState, useEffect, useRef } from "react";
import { Outlet, useParams, useNavigate, useLocation } from "react-router-dom";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import SpaceHeader from "@/components/layout/SpaceHeader";
import SpaceNav from "@/components/layout/SpaceNav";
import SpaceLayout from "@/components/layout/SpaceLayout";
import useSpaceSettingsStore from "@/hooks/useSpaceSettingsStore";
import NewSpaceSettingsModal from "@/components/modals/NewSpaceSettingsModal";
import { LocationState } from "@/pages/Space"; // Import the existing LocationState type
import { warmSpaceCache } from "@/utils/cacheUtils"; // Import cache warming
import { extractTabFromPathname, buildSpaceUrl, type SpaceTab, debugTabExtraction } from "@/utils/tabUtils";
// Removed setCurrentSpaceForPresence - new simple system doesn't need manual space tracking
import { AvatarCacheService } from "@/services/AvatarCacheService"; // 🚀 NEW: Avatar cache service
import { useAutoPresenceUpdater } from "@/hooks/useAutoPresenceUpdater"; // 🎯 NEW: Auto presence updater
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
 * Key features:
 * 1. Persistent header and tab bar across tab changes
 * 2. Shared state maintained in this component that can be accessed by tab content
 * 3. Pass context data to child routes via Outlet context
 * 4. Robust tab detection that works during React Router initialization
 */
export default function SpaceShellLayout() {
  const { subdomain, tab } = useParams<{ subdomain: string; tab?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useOptimizedAuth();
  const isInitialMount = useRef(true);
  
  // State needed for the shell
  const [searchQuery, setSearchQuery] = useState("");
  
  // 🚀 FIXED: Use robust pathname-based tab detection instead of unreliable useParams
  const [activeTab, setActiveTab] = useState<SpaceTab>(() => {
    // Extract tab directly from pathname for immediate, accurate detection
    const extractedTab = extractTabFromPathname(location.pathname);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 [SpaceShellLayout] Initial tab detection:', {
        pathname: location.pathname,
        extractedTab,
        urlTab: tab
      });
    }
    
    return extractedTab;
  });
  
  // Load the space from the store
  const { loadActiveSpace, space: storeSpace } = useSpaceSettingsStore();

  // 🎯 AUTO PRESENCE UPDATER: Automatically update presence when user returns from minimizing
  useAutoPresenceUpdater(storeSpace?.id);

  // PHASE 1.5 FIX: Prevent race condition with SpaceContext
  useEffect(() => {
    if (subdomain && user?.id) {
      // CRITICAL: Only load if we don't already have matching space data
      const hasMatchingSpaceData = storeSpace && storeSpace.subdomain === subdomain;
      
      if (!hasMatchingSpaceData) {
        console.log(`🔒 [Phase1.5] [SpaceShellLayout] Loading space data for ${subdomain} - no matching data found`);
        const preserveSpace = location.state?.preserveSpace === true;
        loadActiveSpace({ subdomain }, user.id, !preserveSpace);
      } else {
        console.log(`🔒 [Phase1.5] [SpaceShellLayout] Skipping loadActiveSpace - already have matching data for ${subdomain}`);
      }
    }
  }, [subdomain, user?.id, loadActiveSpace, storeSpace?.subdomain]); // Added storeSpace?.subdomain dependency

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
          console.log('🔄 [SpaceShellLayout] Redirecting to Feed tab on initial load');
        }
        
        // Navigate to the feed tab (default tab)
        navigate(`/${subdomain}/space`, {
          replace: true,
          state: { preserveSpace: true, activeTab: 'feed' } as LocationState
        });
        
        // Set the active tab to feed
        setActiveTab('feed');
      }
    }
  }, [subdomain, navigate, location.pathname]);

  // PHASE 2.6: CACHE WARMING + AVATAR PRELOADING - Warm cache when space data loads
  useEffect(() => {
    if (storeSpace && storeSpace.subdomain && subdomain && user?.id) {
      // Warm cache for instant future redirects with user ID
      warmSpaceCache({
        id: storeSpace.id,
        name: storeSpace.name || '',
        subdomain: storeSpace.subdomain
      }, user.id);
      
      // New simple presence system automatically handles space-specific presence
      console.log(`🌐 [SpaceShellLayout] Space loaded for simplified presence: ${storeSpace.id}`);
      
      // 🚀 OPTIMIZED: Initialize avatar cache for instant display
      AvatarCacheService.preloadSpaceAvatars(storeSpace.id)
        .then(result => {
          if (process.env.NODE_ENV === 'development') {
            console.log(`🚀 [SpaceShellLayout] Avatar cache initialized for ${storeSpace.name}`);
          }
        })
        .catch(error => {
          if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️ [SpaceShellLayout] Avatar cache initialization failed:', error);
          }
        });
    }
  }, [storeSpace, subdomain, user?.id]);

  // 🚀 FIXED: Robust tab synchronization that prevents bounce effects
  useEffect(() => {
    // Extract tab from current pathname
    const extractedTab = extractTabFromPathname(location.pathname);
    
    // Debug logging for development
    if (process.env.NODE_ENV === 'development') {
      debugTabExtraction(location.pathname, tab, activeTab);
    }
    
    // Only update if there's a significant mismatch AND we're not in a navigation transition
    if (extractedTab !== activeTab) {
      // Prevent bouncing during navigation by adding a small delay check
      const timeoutId = setTimeout(() => {
        // Double-check the URL hasn't changed during the timeout
        const currentExtractedTab = extractTabFromPathname(window.location.pathname);
        if (currentExtractedTab !== activeTab) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`🔄 [SpaceShellLayout] Syncing activeTab after navigation: ${activeTab} -> ${currentExtractedTab}`);
          }
          setActiveTab(currentExtractedTab);
        }
      }, 10); // Small delay to prevent race conditions
      
      return () => clearTimeout(timeoutId);
    }
    
    // Clear initial mount flag after first effect run
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
  }, [location.pathname, activeTab]); // Removed 'tab' dependency to prevent conflicts

  // Handle /space/feed -> /space redirect (legacy URL support)
  useEffect(() => {
    if (location.pathname.endsWith('/space/feed')) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 [SpaceShellLayout] Redirecting /space/feed to /space');
      }
      navigate(`/${subdomain}/space`, { replace: true });
    }
  }, [location.pathname, subdomain, navigate]);

  // 🚀 FIXED: Improved tab change handler with better URL building
  const handleTabChange = (tabKey: string) => {
    const newTab = tabKey as SpaceTab;
    
    // Update local state immediately for responsive UI
    setActiveTab(newTab);
    
    // Store in session storage for persistence
    try {
      sessionStorage.setItem(`active_tab_${subdomain}`, newTab);
    } catch (err) {
      console.warn('Failed to store active tab:', err);
    }
    
    // Build the appropriate URL using our utility
    const url = buildSpaceUrl(subdomain || '', newTab);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 [SpaceShellLayout] Navigating to tab: ${newTab} -> ${url}`);
    }
    
    navigate(url, {
      replace: true,
      state: { preserveSpace: true, activeTab: newTab } as LocationState,
    });
  };

  // **FIX**: Listen for custom tab change events from bottom nav
  useEffect(() => {
    const handleCustomTabChange = (event: CustomEvent) => {
      const { tabKey, subdomain: eventSubdomain, source } = event.detail;
      
      // Only handle events for the current space
      if (eventSubdomain === subdomain && source === 'bottom-nav') {
        console.log(`🔄 [SpaceShellLayout] Handling custom tab change from ${source}: ${tabKey}`);
        
        // Use the same tab change logic but skip the navigation since bottom nav handles URL
        setActiveTab(tabKey as SpaceTab);
        
        // Store in session storage for persistence
        try {
          sessionStorage.setItem(`active_tab_${subdomain}`, tabKey);
        } catch (err) {
          console.warn('Failed to store active tab:', err);
        }
      }
    };

    // Add event listener for custom tab changes
    window.addEventListener('spaceTabChange', handleCustomTabChange as EventListener);
    
    return () => {
      window.removeEventListener('spaceTabChange', handleCustomTabChange as EventListener);
    };
  }, [subdomain]);

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
        <div className="hidden lg:block">
          <SpaceNav 
            subdomain={subdomain}
            activeTab={activeTab}
            onTabChange={handleTabChange} 
          />
        </div>
      )}
    >
      {/* On mobile, SpaceNav is part of the scrollable body */}
      <div className="block lg:hidden">
        <SpaceNav 
          subdomain={subdomain}
          activeTab={activeTab}
          onTabChange={handleTabChange} 
        />
      </div>
      
      {/* The Outlet will render the appropriate tab component without re-rendering the shell */}
      <div className="px-0 sm:px-4 pt-4 sm:pt-6 pb-16 sm:pb-6">
        <Outlet context={{ activeTab, subdomain }} />
      </div>
      
      {/* Common modals that should persist across tab changes */}
      <NewSpaceSettingsModal />
    </SpaceLayout>
  );
} 