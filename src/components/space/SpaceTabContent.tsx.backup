import { useState, useEffect, useMemo, useRef } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import useSpaceSettingsStore from "@/hooks/useSpaceSettingsStore";
import { TrustToken } from "@/utils/simpleFastPath";
import AboutTab from "@/components/space/AboutTab";
import FeedTab from "@/components/space/FeedTab";
import CalendarTab from "@/components/space/CalendarTab";
import MembersTab from "@/components/space/MembersTab";
import LeaderboardsTab from "@/components/space/LeaderboardsTab";
import ClassroomTab from "@/components/space/ClassroomTab";
import { ErrorBoundary } from "react-error-boundary";
import { Button } from "@/components/ui/button";
import { extractTabFromPathname, type SpaceTab, debugTabExtraction } from "@/utils/tabUtils";
import { getSpaceFallbackData } from '@/utils/spaceDataFallback';
import { globalTabComponentManager } from "@/utils/globalTabComponentManager";
import { useSpacePermissions } from "@/hooks/useSpacePermissions";


// Define context type for useOutletContext
interface SpaceShellContext {
  activeTab: string;
  subdomain: string;
}

/**
 * SpaceTabContent - ULTRA-OPTIMIZED Content area for space tabs
 * 
 * This component is heavily optimized to eliminate excessive re-renders.
 * Key optimizations:
 * 1. Aggressive memoization of all expensive computations
 * 2. Minimal state updates
 * 3. Immediate content rendering when possible
 * 4. Ultra-aggressive cache checking
 * 5. Robust tab determination that works with React Router timing
 */
const SpaceTabContent = () => {
  const { tab } = useParams<{ tab?: string }>();
  const { user, loading: authLoading } = useOptimizedAuth();
  const { activeTab, subdomain } = useOutletContext<SpaceShellContext>();
  
  // Get space data and permissions from store
  const { 
    space: storeSpace,
    permissions: storePermissions,
    loadingSpace: storeLoadingSpace,
  } = useSpaceSettingsStore();
  
  // REVOLUTIONARY: Memoized Trust Token Validation - prevents redundant validation in SpaceTabContent
  const validateTrustTokenMemoized = useMemo(() => {
    const cache = new Map<string, { result: TrustToken | null; timestamp: number }>();
    const CACHE_TTL = 30000; // 30 seconds
    
    return (subdomain: string, userId: string): TrustToken | null => {
      const cacheKey = `${subdomain}-${userId}`;
      const cached = cache.get(cacheKey);
      
      // Check cache first
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.result;
      }
      
      try {
        // Quick sessionStorage check for trust token (using the correct storage key)
        const trustTokenData = sessionStorage.getItem(`trust_token_${subdomain}`);
        if (!trustTokenData) {
          cache.set(cacheKey, { result: null, timestamp: Date.now() });
          return null;
        }
        
        const parsed = JSON.parse(trustTokenData);
        
        // Validate the trust token structure and expiration
        if (!parsed.userId || !parsed.subdomain || !parsed.expiresAt) {
          cache.set(cacheKey, { result: null, timestamp: Date.now() });
          return null;
        }
        
        // Check if token is valid and for the correct user/subdomain
        const isValid = parsed.expiresAt > Date.now() && 
                        parsed.subdomain === subdomain && 
                        parsed.userId === userId;
        
        const token: TrustToken | null = isValid ? {
          userId: parsed.userId,
          subdomain: parsed.subdomain,
          access: parsed.access || 'verified',
          timestamp: parsed.timestamp || Date.now(),
          source: parsed.source || 'database-verified',
          signature: parsed.signature || '',
          expiresAt: parsed.expiresAt
        } : null;
        
        cache.set(cacheKey, { result: token, timestamp: Date.now() });
        return token;
      } catch (e) {
        cache.set(cacheKey, { result: null, timestamp: Date.now() });
        return null;
      }
    };
  }, []); // Empty dependency array since this is a stable function

  // REVOLUTIONARY: Ultra-fast trust token access with memoization
  const trustToken = useMemo(() => {
    if (!user || !subdomain) return null;
    return validateTrustTokenMemoized(subdomain, user.id);
  }, [user?.id, subdomain, validateTrustTokenMemoized]);
  
  // REVOLUTIONARY: Single trust token log to prevent spam
  const trustTokenLoggedRef = useRef(false);
  useEffect(() => {
    if (trustToken && !trustTokenLoggedRef.current) {
      trustTokenLoggedRef.current = true;
      console.log('🔒 [SpaceTabContent] Trust token access confirmed');
    }
  }, [trustToken]);
  
  // REVOLUTIONARY: Ultra-aggressive cache access with memoization
  const hasInstantCacheAccess = useMemo(() => {
    if (!user || authLoading || !subdomain) return false;
    
    try {
      // Check cache sources for instant access
      const lastActiveSpace = localStorage.getItem('lastActiveSpace');
      if (lastActiveSpace) {
        const space = JSON.parse(lastActiveSpace);
        if (space?.subdomain === subdomain) return true;
      }
      
      const ownershipFlag = localStorage.getItem(`user_owns_space_${subdomain}`);
      if (ownershipFlag === 'true') return true;
      
      const membershipCache = localStorage.getItem(`user_member_${subdomain}_${user.id}`);
      if (membershipCache) {
        try {
          const memberData = JSON.parse(membershipCache);
          if (memberData.isMember) return true;
        } catch (e) {
          // Continue
        }
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }, [user, subdomain, authLoading]);

  // STREAMLINED: Simple access check - trust that SpaceProtectedRoute has verified access
  const shouldShowContent = useMemo(() => {
    // If we have a subdomain and user, show content immediately
    // SpaceProtectedRoute has already verified access before rendering us
    const hasSubdomain = !!subdomain;
    const hasUser = !!user;
    const result = hasSubdomain && hasUser;
    
    // DEBUG: Log the decision process
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [SpaceTabContent] shouldShowContent check:', {
        subdomain: subdomain || 'MISSING',
        user: user ? 'PRESENT' : 'MISSING',
        result
      });
    }
    
    return result;
  }, [subdomain, user]); // Fixed: use user instead of user?.id

  // STREAMLINED: Simple permissions without complex memoization
  const permissions = useMemo(() => ({
    isOwner: storePermissions?.isOwner ?? false,
    isAdmin: storePermissions?.isAdmin ?? false,
  }), [storePermissions?.isOwner, storePermissions?.isAdmin]);
  
  // Ref for the post input field in FeedTab
  const postInputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  
  // STREAMLINED: Simple tab determination
  const currentTab = useMemo(() => {
    // Primary: use activeTab from context
    if (activeTab) return activeTab as SpaceTab;
    
    // Fallback: extract from pathname
    const pathname = window.location.pathname;
    return extractTabFromPathname(pathname);
  }, [activeTab, tab]);
  
  // **SOLUTION: Persistent Tab Components** - Prevent "reappearing" animation by keeping tabs mounted
  // Track which tabs have been visited to control mounting
  const [visitedTabs, setVisitedTabs] = useState<Set<SpaceTab>>(new Set(['feed'])); // Feed is always mounted
  
  // Mark tab as visited when it becomes active
  useEffect(() => {
    if (currentTab) {
      setVisitedTabs(prev => new Set([...prev, currentTab as SpaceTab]));
    }
  }, [currentTab]);
  
  // **CRITICAL FIX**: Use global tab component manager instead of local refs
  // This prevents tab component recreation when SpaceShellLayout remounts (Chat→Feed navigation)
  const tabComponentsRef = useRef<Record<string, JSX.Element | null>>({});
  
  // **REVOLUTIONARY**: Get or create tab components using global manager
  const getOrCreateTabComponent = (tabKey: SpaceTab): JSX.Element | null => {
    if (!user?.id || !subdomain) return null;
    
    // Try to get existing component from global manager first
    const existingComponent = globalTabComponentManager.getTabComponent(subdomain, tabKey, user.id);
    if (existingComponent) {
      // Store in local ref for immediate access
      tabComponentsRef.current[tabKey] = existingComponent;
      return existingComponent;
    }
    
    // Create new component if it doesn't exist
    const currentUser = user;
    const currentPermissions = permissions;
    const currentInstantAccess = !!(trustToken || hasInstantCacheAccess);
    const currentSpaceData = storeSpace || getSpaceFallbackData(subdomain || '');
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🌐 [SpaceTabContent] Creating NEW ${tabKey} component for ${subdomain}`);
    }
    
    let component: JSX.Element | null = null;
    
    switch (tabKey) {
      case 'feed':
        component = (
          <FeedTab 
            user={currentUser} 
            isOwner={currentPermissions.isOwner} 
            isAdmin={currentPermissions.isAdmin} 
            postInputRef={postInputRef}
            hasInstantAccess={currentInstantAccess}
          />
        );
        break;
        
      case 'about':
        component = (
          <AboutTab />
        );
        break;
        
      case 'calendar':
        component = (
          <CalendarTab 
            space={{
              id: currentSpaceData.id,
              name: currentSpaceData.name,
              owner_id: currentSpaceData.owner_id || 'fallback-owner',
            }}
          />
        );
        break;
        
      case 'members':
        component = <MembersTab />;
        break;
        
      case 'classroom':
        if (currentSpaceData?.id) {
          component = (
            <ClassroomTab space={{
              id: currentSpaceData.id,
              name: currentSpaceData.name,
              owner_id: currentSpaceData.owner_id || 'f6064ebb-564a-49d2-a146-fb8615fd7ae2',
            }} />
          );
        } else {
          component = (
            <div className="p-4 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <div>Loading classroom...</div>
            </div>
          );
        }
        break;
        
      case 'leaderboard':
        if (currentSpaceData?.id) {
          component = (
            <LeaderboardsTab 
              spaceId={currentSpaceData.id} 
              spaceName={currentSpaceData.name} 
            />
          );
        } else {
          component = (
            <div className="p-4 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <div>Loading leaderboard...</div>
            </div>
          );
        }
        break;
        
      default:
        return null;
    }
    
    if (component && currentSpaceData?.id) {
      // Store in global manager for persistence across remounts
      globalTabComponentManager.setTabComponent(
        subdomain, 
        tabKey, 
        user.id, 
        currentSpaceData.id, 
        component
      );
      
      // Store in local ref for immediate access
      tabComponentsRef.current[tabKey] = component;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🌐 [SpaceTabContent] Stored ${tabKey} component globally`);
      }
    }
    
    return component;
  };

  // **TRULY PERSISTENT TAB CREATION** - Create components only once, never recreate
  useEffect(() => {
    const needsUpdate = visitedTabs.size > Object.keys(tabComponentsRef.current).length;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 [SpaceTabContent] Tab creation effect:', {
        visitedTabsCount: visitedTabs.size,
        existingComponentsCount: Object.keys(tabComponentsRef.current).length,
        visitedTabs: Array.from(visitedTabs),
        existingComponents: Object.keys(tabComponentsRef.current),
        needsUpdate,
        hasUser: !!user,
        hasStoreSpace: !!storeSpace,
        subdomain
      });
    }
    
    visitedTabs.forEach(tabKey => {
      // Skip if component already exists in local ref
      if (tabComponentsRef.current[tabKey]) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔧 [SpaceTabContent] Skipping ${tabKey} - already exists locally`);
        }
        return;
      }
      
      // Get or create component using global manager
      const component = getOrCreateTabComponent(tabKey);
      if (component) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ [SpaceTabContent] Successfully created/retrieved ${tabKey} component`);
        }
      }
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 [SpaceTabContent] Tab creation effect completed:', {
        totalComponents: Object.keys(tabComponentsRef.current).length,
        componentKeys: Object.keys(tabComponentsRef.current)
      });
    }
  }, [visitedTabs, user?.id, permissions.isOwner, permissions.isAdmin, storeSpace?.id, subdomain]);
  
  // Cleanup global components when user navigates away from space
  useEffect(() => {
    return () => {
      if (user?.id && subdomain) {
        // Don't clear immediately - let them persist for quick return
        setTimeout(() => {
          // Only clear if user hasn't returned to this space within 30 seconds
          if (window.location.pathname.includes(`/${subdomain}/space`)) {
            return; // User is still in this space, don't clear
          }
          globalTabComponentManager.clearSpaceComponents(subdomain, user.id);
        }, 30000); // 30 second grace period
      }
    };
  }, [subdomain, user?.id]);

  // Get the stable tab components
  const persistentTabComponents = tabComponentsRef.current;

  // DEBUG: Log component state before render decision
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [SpaceTabContent] Render decision:', {
      shouldShowContent,
      currentTab,
      visitedTabsCount: visitedTabs.size,
      visitedTabsList: Array.from(visitedTabs),
      componentsCount: Object.keys(persistentTabComponents).length,
      componentsKeys: Object.keys(persistentTabComponents),
      hasActiveTabComponent: !!persistentTabComponents[currentTab]
    });
  }

  // STREAMLINED: Render content immediately if we have access
  if (!shouldShowContent) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🚨 [SpaceTabContent] NOT RENDERING - shouldShowContent is false');
    }
    return null;
  }

  // STREAMLINED: Render all visited tabs but only show the active one
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
        {/* **SOLUTION: Persistent Tab Rendering** - All tabs stay mounted, only active one is visible */}
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