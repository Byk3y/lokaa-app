import { useState, useEffect, useMemo, useRef, useCallback, memo } from "react";
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
const SpaceTabContent = memo(() => {
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
    return !!(subdomain && user);
  }, [subdomain, user?.id]); // Minimal dependencies

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
  
  // STREAMLINED: Tab content renderer with instant access flag
  const renderTabContent = useCallback((activeTab: SpaceTab) => {
    const hasInstantAccess = !!(trustToken || hasInstantCacheAccess);
    
    switch (activeTab) {
      case 'feed':
        return <FeedTab 
          user={user} 
          isOwner={permissions.isOwner} 
          isAdmin={permissions.isAdmin} 
          postInputRef={postInputRef}
          hasInstantAccess={hasInstantAccess}
        />;
      case 'about':
        return <AboutTab />;
      case 'members':
        return <MembersTab />;
      case 'classroom':
        return (() => {
          const spaceData = storeSpace || getSpaceFallbackData(subdomain || '');
          return spaceData?.id
            ? <ClassroomTab space={{
                id: spaceData.id,
                name: spaceData.name,
                owner_id: spaceData.owner_id || 'f6064ebb-564a-49d2-a146-fb8615fd7ae2', // Use correct fallback owner ID
              }} />
            : <div className="p-4 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" /><div>Loading classroom...</div></div>;
        })();
      case 'calendar':
        return (() => {
          const spaceData = storeSpace || getSpaceFallbackData(subdomain || '');
          return spaceData?.id
            ? <CalendarTab space={{
                id: spaceData.id,
                name: spaceData.name,
                owner_id: spaceData.owner_id || 'fallback-owner',
              }} />
            : <div className="p-4 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" /><div>Loading calendar...</div></div>;
        })();
      case 'leaderboard':
        return (() => {
          const spaceData = storeSpace || getSpaceFallbackData(subdomain || '');
          return spaceData?.id
            ? <LeaderboardsTab 
                spaceId={spaceData.id} 
                spaceName={spaceData.name} 
              />
            : <div className="p-4 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" /><div>Loading leaderboard...</div></div>;
        })();
      default:
        return null;
    }
  }, [user, permissions.isOwner, permissions.isAdmin, trustToken, hasInstantCacheAccess, storeSpace?.id, storeSpace?.name, storeSpace?.owner_id]);

  // STREAMLINED: Render content immediately if we have access
  if (!shouldShowContent) {
    return null;
  }

  // STREAMLINED: Simple render without excessive monitoring
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
        {renderTabContent(currentTab as SpaceTab)}
      </ErrorBoundary>
    </div>
  );
});

SpaceTabContent.displayName = 'SpaceTabContent';

export default SpaceTabContent; 