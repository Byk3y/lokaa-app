import { log } from '@/utils/logger';
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { BellRing, MessageCircle, User, LogOut, ChevronDown, Search, Settings, Users, Calendar, BookOpen, X, Upload, Lock, Check, Globe, Loader2, Trophy, GraduationCap, Camera } from "lucide-react";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import SpaceSwitcher from "@/components/spaces/SpaceSwitcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Confetti from 'react-confetti';
import SpacePrivacySettings from "@/components/space/SpacePrivacySettings";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import NewSpaceSettingsModal from "@/components/modals/NewSpaceSettingsModal";
import useSpaceSettingsStore, { type SpaceSettingsData } from "@/hooks/useSpaceSettingsStore";
import { checkSpaceAccessForUser } from '@/utils/debugTools';
import { spaceAccessDebugger } from '@/shared/services/debug/space-access-debug';
import { fixSpaceAccessBySubdomain, directSpaceAccessCheck } from '@/utils/fixSpacesAccess';
import { ErrorRecovery } from '@/components/common/ErrorRecovery';
import AboutTab from "@/components/space/AboutTab";
import FeedTab from "@/components/space/FeedTab";
import CalendarTab from "@/components/space/CalendarTab";
import MembersTab from "@/components/space/MembersTab";
import LeaderboardsTab from "@/components/space/LeaderboardsTab";
import ClassroomTab from "@/components/space/ClassroomTab";
import { getSpaceUrl, cacheSpaceData } from "@/utils/urlUtils";
import ProfileDropdown from "@/components/common/ProfileDropdown";
import SpaceLayout from "@/components/layout/SpaceLayout";
import SpaceHeader from "@/components/layout/SpaceHeader";
import SpaceNav from "@/components/layout/SpaceNav";
import { env } from '@/core/config/env';
import SpaceFallback from "@/components/space/SpaceFallback";
import { useAIUserJourney } from "@/hooks/useAIUserJourney";

const DEFAULT_COVER_IMAGE_URL = '/default-space-cover.jpg'; // Define a default

    // Initialize spaceAccessDebugger with the Supabase client
    spaceAccessDebugger.init(getSupabaseClient());

// Debug logging for space loading
const logSpaceDebug = (message: string, data?: any) => {
  log.debug('Page', `🏠 [Space] ${message}`, data || '');
};

interface SpaceDetails {
  id: string;
  name: string;
  description: string | null;
  about_description?: string | null;
  cover_image: string | null;
  icon_image?: string | null;
  primary_color: string | null;
  member_count: number | null;
  pricing_type: 'free' | 'paid';
  price_per_month: number | null;
  subdomain: string;
  owner_id: string;
  is_private: boolean;
}

// Define the response type for our custom RPC function
interface SpaceRPCResponse {
  success: boolean;
  space: {
    id: string;
    name: string;
    description: string;
    about_description?: string | null;
    cover_image: string;
    icon_image?: string | null;
    subdomain: string;
    owner_id: string;
    pricing_type: "free" | "paid";
    price_per_month: number;
    member_count: number;
    created_at: string;
    updated_at: string;
    primary_color: string;
    is_private: boolean;
  };
  message?: string;
}

// Add interface for component props
interface SpaceProps {
  initialTab?: string;
}

// Types for the space state must include about_description to fix linter error
interface SpaceType {
  id: string;
  name: string;
  subdomain: string;
  description: string;
  about_description?: string | null;
  icon_image?: string | null;
  cover_image?: string | null;
  primary_color?: string | null;
  is_private?: boolean;
  owner_id?: string;
  pricing_type?: string;
  price_per_month?: number | null;
  initials?: string;
  created_at?: string;
  updated_at?: string;
  member_count?: number | null;
  owner?: {
    id?: string;
    email?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
  } | null;
}

export interface LocationState {
  preserveSpace?: boolean;
  activeTab?: string;
  accessDenied?: boolean;
}

interface SpaceDebugTools {
  checkAccess: () => Promise<unknown>;
  directCheck: () => Promise<unknown>;
  forceUpdateStore: () => void;
  fixAccess: () => Promise<void>;
  spaceInfo: {
    subdomain: string | undefined;
    space: SpaceType | null;
    userId: string | undefined;
    isOwner: boolean;
  };
}

declare global {
  interface Window {
    spaceDebug?: SpaceDebugTools;
  }
}

export default function Space({ initialTab }: SpaceProps) {
  const { subdomain, tab: tabFromParams } = useParams<{ subdomain: string; tab?: string }>();
  const { user, signOut, loading: authLoading } = useOptimizedAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Use the enhanced SpaceSettingsStore
  const { 
    space: storeSpace,
    permissions: storePermissions,
    loadingSpace: storeLoadingSpace,
    loadingPermissions: storeLoadingPermissions,
    error: storeError,
    loadActiveSpace,
    resetStore: resetSpaceSettingsStore,
    formData,
  } = useSpaceSettingsStore();
  
  const [activeTab, setActiveTab] = useState(initialTab || "community");
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationShown, setNotificationShown] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  
  // AI User Journey Integration
  const { renderJourneyComponent, triggerTestJourney, getJourneyStats } = useAIUserJourney(
    storeSpace?.id,
    storeSpace?.name,
    storeSpace?.member_count || 0
  );
  
  // Add debugging for space loading state
  useEffect(() => {
    logSpaceDebug('Space component render state:', {
      subdomain,
      user: user?.id,
      authLoading,
      storeSpace: storeSpace?.name,
      storeLoadingSpace,
      storeError,
      activeTab
    });
  }, [subdomain, user, authLoading, storeSpace, storeLoadingSpace, storeError, activeTab]);
  
  // Error boundary simulation
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      logSpaceDebug('JavaScript error caught:', {
        message: error.message,
        filename: error.filename,
        lineno: error.lineno,
        colno: error.colno
      });
      setRenderError(`JavaScript Error: ${error.message}`);
    };
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logSpaceDebug('Unhandled promise rejection:', {
        reason: event.reason
      });
      setRenderError(`Promise Rejection: ${event.reason}`);
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  
  // If there's a render error, show debug info
  if (renderError) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Space Loading Error</h1>
          <p className="text-gray-700 mb-4">{renderError}</p>
          <div className="bg-gray-100 p-4 rounded text-sm">
            <pre>{JSON.stringify({
              subdomain,
              user: user?.id,
              authLoading,
              storeSpace: storeSpace?.name,
              storeLoadingSpace,
              storeError: storeError
            }, null, 2)}</pre>
          </div>
          <Button 
            onClick={() => {
              setRenderError(null);
              window.location.reload();
            }}
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }
  
  // Simplified permissions access from store
  const isOwner = storePermissions?.isOwner ?? false;
  const isAdmin = storePermissions?.isAdmin ?? false;
  const canEditSpace = storePermissions?.canEditSpace ?? false;
  const canManageMembers = storePermissions?.canManageMembers ?? false;
  const canAccessSettings = storePermissions?.canAccessSettings ?? false;
  // For canCreateContent, SpaceProtectedRoute already handles access.
  // We assume if a user can view the space, they can create content.
  const canCreateContent = true; 

  // Ref for the post input field in FeedTab
  const postInputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  // Function to focus the post editor, to be passed to SetupTasksGuide
  const handleFocusPostEditor = () => {
    if (postInputRef.current) {
      postInputRef.current.focus();
      // postInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Effect to load space data when subdomain or user changes
  useEffect(() => {
    if (subdomain && user && user.id) {
      // PreserveSpace logic might influence `force` parameter if reloads are too aggressive
      const preserveSpace = location.state?.preserveSpace === true;
      // If navigating between tabs (preserveSpace=true) and space is already loaded for this subdomain,
      // we might not need to force a full reload unless specifically required.
      // For now, let's keep it simple: if storeSpace matches subdomain, don't force.
      const forceReload = !(storeSpace?.subdomain === subdomain && !preserveSpace);
      
      loadActiveSpace({ subdomain }, user.id, forceReload);
    } else if (!user && !authLoading) {
      // If no user and auth is not loading, likely means logged out, reset store or navigate.
      // For now, if on a space page without a user, it might lead to an error or empty state handled below.
      // Consider redirecting to login or discover page if user is null here.
    }
    // Add location.state to dependencies if its changes should trigger re-fetch.
    // Be careful with this, as it can cause loops if not managed properly.
  }, [subdomain, user, authLoading, loadActiveSpace, location.state]);


  // Debug: log permissions when they're loaded or storeSpace changes
  useEffect(() => {
    if (!storeLoadingPermissions && storeSpace?.id) {
    }
  }, [storeLoadingPermissions, storeSpace?.id, isOwner, isAdmin, canEditSpace, canManageMembers, canCreateContent, canAccessSettings, storePermissions]);


  useEffect(() => {
    const pathSegments = location.pathname.split('/');
    let targetTab = initialTab || "community"; // Default to community

    if (pathSegments.length > 3 && pathSegments[2] === 'space') { // Path is like /subdomain/space/tab
      const tabNameFromUrl = pathSegments[3];
      targetTab = tabNameFromUrl === 'feed' ? 'community' : tabNameFromUrl;
    } else if (tabFromParams) { // Fallback to tabFromParams if path segment is invalid or not present
      targetTab = tabFromParams === 'feed' ? 'community' : tabFromParams;
    }

    // Check feature flags before setting activeTab
    if (storeSpace && formData) {
      let effectiveTab = targetTab;
      if (targetTab === 'classroom' && formData.feature_classroom_enabled === false) {
        effectiveTab = "community"; // Fallback to community if classroom is disabled
      }
      if (targetTab === 'calendar' && formData.feature_calendar_enabled === false) {
        effectiveTab = "community"; // Fallback to community if calendar is disabled
      }
      // Add similar check for 'map' if it becomes a main tab
      // if (targetTab === 'map' && formData.feature_map_enabled === false) {
      //   effectiveTab = "community";
      // }

      if (activeTab !== effectiveTab) {
        setActiveTab(effectiveTab);
        // Optionally, if the URL needs to change to reflect the fallback:
        // navigate(`/${subdomain}/space/${effectiveTab === 'community' ? 'feed' : effectiveTab}`, { replace: true, state: { preserveSpace: true } });
      }
    } else if (activeTab !== targetTab && !storeSpace) {
        // If space/formData not loaded yet, set to targetTab optimistically or based on URL
        // This will be re-evaluated once formData is available.
        setActiveTab(targetTab);
    }
  }, [location.pathname, tabFromParams, initialTab, storeSpace, formData, activeTab, navigate, subdomain]);


  useEffect(() => {
    const onVisibility = () => {};
    const onFocus = () => {};
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // SessionStorage caching for quick recovery can be handled by the store if needed, or removed if store's caching is sufficient.
  // For now, removing direct sessionStorage interaction from component.

  // Space data fetching handled by store


  const handleSignOut = async () => {
    try {
      await signOut();
      resetSpaceSettingsStore(); // Reset store on sign out
      // Navigate to home or login after sign out
      navigate('/', { replace: true }); 
      // Fallback redirect (though navigate should handle it)
      setTimeout(() => {
        if (window.location.pathname.includes('/space/')) {
          window.location.replace(`/?from=space_signout&t=${Date.now()}`);
        }
      }, 1000);
    } catch (error) {
      window.location.replace('/');
    }
  };
  
  const handleCloseNotification = () => setNotificationShown(false);
  const toggleProfileDropdown = () => setProfileDropdownOpen(!profileDropdownOpen);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (profileDropdownOpen && !target.closest('.profile-dropdown-container')) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileDropdownOpen]);

  useEffect(() => {
    // Only expose debug utilities in development mode
    if (env.isDevelopment && typeof window !== 'undefined' && subdomain && user) {
      const currentSubdomain = subdomain; // Capture for closure
      const currentUserId = user.id; // Capture for closure
      window.spaceDebug = {
        checkAccess: async () => {
          if (!currentUserId || !currentSubdomain) return log.error('Page', 'Missing user or subdomain for checkAccess');
          return await checkSpaceAccessForUser(currentUserId, currentSubdomain);
        },
        directCheck: async () => {
          if (!currentSubdomain) return log.error('Page', 'Missing subdomain for directCheck');
          return await directSpaceAccessCheck(currentSubdomain);
        },
        forceUpdateStore: () => {
          if (!currentSubdomain || !currentUserId) return log.error('Page', 'Missing subdomain or user ID for forceUpdateStore');
          loadActiveSpace({ subdomain: currentSubdomain }, currentUserId, true);
        },
        fixAccess: async () => {
          if (!currentSubdomain || !currentUserId) return log.error('Page', 'Missing subdomain or user ID for fixAccess');
          await fixSpaceAccessBySubdomain(currentSubdomain);
          toast({ title: "Access Fix Attempted", description: "Please refresh and check access." });
        },
        spaceInfo: {
          subdomain: currentSubdomain,
          space: storeSpace, // Use storeSpace
          userId: currentUserId,
          isOwner: storePermissions?.isOwner, // Use storePermissions
        },
        // AI User Journey Testing
        journey: {
          triggerTest: triggerTestJourney,
          getStats: getJourneyStats,
          clearHistory: () => {
            if (typeof window !== 'undefined' && (window as any).aiUserJourneyManager) {
              (window as any).aiUserJourneyManager.clearHistory();
            }
          }
        },
      };
    }
    return () => {
      if (env.isDevelopment && typeof window !== 'undefined') delete window.spaceDebug;
    };
  }, [user, subdomain, storeSpace, storePermissions, loadActiveSpace]);

  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey);
    try {
      sessionStorage.setItem(`active_tab_${subdomain}`, tabKey);
    } catch (err) {
      log.warn('Page', 'Failed to store active tab:', err);
    }
    // Navigation logic is now handled by SpaceNav.tsx
    /*
    const url = `/${subdomain}/space/${tabKey === 'community' ? 'feed' : tabKey}`;
    navigate(url, { 
      replace: true,
      state: { preserveSpace: true, activeTab: tabKey } as LocationState
    });
    */
  };

  useEffect(() => {
    // If tabFromParams changes (e.g. direct navigation to a tab URL), update activeTab
    if (tabFromParams) {
      const normalizedTab = tabFromParams === 'feed' ? 'community' : tabFromParams;
      const validTabs = ['about', 'members', 'calendar', 'leaderboard', 'community', 'classroom'];
      if (validTabs.includes(normalizedTab) && activeTab !== normalizedTab) {
          setActiveTab(normalizedTab);
      }
    }
  }, [tabFromParams, activeTab]); // Added activeTab to prevent re-setting if already correct


  const memoizedSpaceDataForTabs = useMemo(() => {
    if (!storeSpace) return null;
    // Ensure all required fields for various tabs are present
    return {
      id: storeSpace.id,
      name: storeSpace.name,
      subdomain: storeSpace.subdomain,
      description: storeSpace.description,
      about_description: storeSpace.about_description,
      cover_image: storeSpace.cover_image,
      icon_image: storeSpace.icon_image,
      owner_id: storeSpace.owner_id,
      pricing_type: (storeSpace.pricing_type as ('free' | 'paid')) || 'free', // Cast and default
      member_count: storeSpace.member_count,
      created_at: storeSpace.created_at,
      updated_at: storeSpace.updated_at,
    };
  }, [storeSpace]);

  // FIXED: Remove loading states since SpaceProtectedRoute + SpaceShellLayout handle loading
  // Space.tsx should not be rendered in current architecture, but if it is, don't show duplicate loading
  if (authLoading || (!user && !storeError)) {
    return null; // Let SpaceProtectedRoute handle loading
  }
  
  // FIXED: Remove loading states - trust the current architecture
  if ((!storeSpace && storeLoadingSpace && !storeError && user)) {
    return null; // Let SpaceProtectedRoute handle loading
  }

  if (storeError) {
    return (
      <SpaceFallback 
        type="error" 
        spaceName={subdomain}
        error={storeError}
        onRetry={() => {
          if (subdomain && user) loadActiveSpace({ subdomain }, user.id, true);
        }}
      />
    );
  }

  if (!storeSpace && !storeLoadingSpace && user) { // If not loading, no error, but still no space data (e.g. space not found for user)
    return (
      <SpaceFallback 
        type="not-found" 
        spaceName={subdomain}
        onRetry={() => {
          if (subdomain && user) loadActiveSpace({ subdomain }, user.id, true);
        }}
      />
    );
  }

  // If user is null after auth has finished loading, and we are on a space page.
  if (!user && !authLoading) {
    // This case might redirect to login or show a public version if applicable.
    // For now, assuming space access requires a user.
    return (
      <SpaceFallback 
        type="error" 
        spaceName={subdomain}
        error="You need to be logged in to access this space"
      />
    );
  }

  // Ensure storeSpace is not null before proceeding to render dependent components
  if (!storeSpace) {
      // This should ideally be caught by loading/error states, but as a fallback:
      return (
        <SpaceFallback 
          type="error" 
          spaceName={subdomain}
          error="Critical error: Space data unavailable"
        />
      );
  }

  const renderActiveTabContent = () => {
    // FIXED: Remove loading states - trust that SpaceProtectedRoute has ensured space data is available
    // If we're being rendered, the data should be ready
    
    // Fallback if storeSpace is somehow null here (should be caught by earlier checks)
    if (!storeSpace) {
         return <div className="flex-grow flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-red-500" /> <span className="ml-2 text-red-500">Error: Space data missing.</span></div>;
    }


    switch (activeTab) {
      case "feed":
      case "community":
        return <FeedTab user={user} isOwner={isOwner} isAdmin={isAdmin} postInputRef={postInputRef} />;
      case "classroom":
        return storeSpace.feature_classroom_enabled !== false && memoizedSpaceDataForTabs ? <ClassroomTab space={memoizedSpaceDataForTabs} /> : null;
      case "calendar":
        return storeSpace.feature_calendar_enabled !== false && memoizedSpaceDataForTabs ? <CalendarTab space={memoizedSpaceDataForTabs} /> : null;
      case "members":
        return <MembersTab />; // MembersTab likely fetches its own data or uses context
      case "leaderboard":
        return memoizedSpaceDataForTabs 
          ? <LeaderboardsTab spaceId={memoizedSpaceDataForTabs.id} spaceName={memoizedSpaceDataForTabs.name} /> 
          : null;
      case "about":
        return <AboutTab />;
      default:
        return <FeedTab user={user} isOwner={isOwner} isAdmin={isAdmin} postInputRef={postInputRef} />;
    }
  };

  return (
    <SpaceLayout
      header={(
        <SpaceHeader 
          subdomain={subdomain}
          searchQuery=""
          onSearchQueryChange={() => {}}
        />
                )}
      nav={(
        <SpaceNav 
          subdomain={subdomain}
          activeTab={activeTab}
          onTabChange={handleTabChange} 
        />
      )}
    >
          {renderActiveTabContent()}
        
        {/* Render the SpaceSettingsModal - It will now use the store */}
        <NewSpaceSettingsModal />
        
        {/* AI User Journey Components */}
        {renderJourneyComponent()}
        
      {/* Creation Success Notification - This can be moved into SpaceLayout or a dedicated Notification component later */}
        {notificationShown && (
          <div className="fixed bottom-4 right-4 w-auto bg-gray-900 text-white px-5 py-3 rounded-lg shadow-lg flex items-center justify-between">
            <div className="text-sm mr-4">Space was created</div>
            <button 
              onClick={handleCloseNotification}
              className="text-white hover:text-gray-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
    </SpaceLayout>
  );
} 