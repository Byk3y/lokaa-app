import { useEffect, useState, useRef, useLayoutEffect, ReactNode, useContext, useMemo, Suspense, lazy } from "react";
import { Outlet, useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { User } from '@/contexts/AuthContext';
import { useSpace, SpaceData } from "@/contexts/SpaceContext";
import { toast } from "@/hooks/use-toast";
import { Loader2, Settings, Camera, Search, Bell, MessageSquare } from "lucide-react";
import SpaceSwitcher from "@/components/spaces/SpaceSwitcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";


import useSpaceSettingsStore from "@/hooks/useSpaceSettingsStore";
const NewSpaceSettingsModal = lazy(() => import("@/components/modals/NewSpaceSettingsModal"));
import ProfileDropdown from "@/components/common/ProfileDropdown";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";
import BottomNav from "@/components/mobile/BottomNav";
import { getSpaceTabIcon, FeedIcon } from "@/components/ui/nav-icons";
import { SpaceAssetsUtils } from '@/shared/utils/space-assets-utils';

// Types for Space and User data
export interface SpaceData {
  id: string;
  name: string;
  description?: string;
  subdomain: string;
  owner_id?: string;
  is_private?: boolean;
  icon_image?: string | null;
  cover_image?: string | null;
  primary_color?: string | null;
}

/**
 * Header component for space layouts
 * ✅ UPGRADED: Now uses unified SpaceAssetsUtils system
 */
export function Header({ user, space, children }: { user: User | null; space: SpaceData | null; children?: ReactNode }) {
  const location = useLocation();

  // Function to capitalize space name properly
  const capitalizeSpaceName = (name: string) => {
    return name.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Get space from context if not passed directly
  const contextSpace = useContext(SpaceContext);
  const currentSpace = space || contextSpace;

  // 🚀 NEW: Use unified space assets system
  const spaceAssets = SpaceAssetsUtils.resolveSpaceAssets(currentSpace);

  // Get properly capitalized name
  const displayName = currentSpace ? capitalizeSpaceName(currentSpace.name) : '';

  return (
    <header className="bg-white border-b py-3 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between pl-8 pr-4">
        {/* Left - Space Logo and Name with Switch Button */}
        <div className="flex items-center">
          <div className="h-10 w-10 bg-[#1A8A7E] rounded-lg flex items-center justify-center text-white font-bold mr-3 shadow-sm relative overflow-hidden">
            {spaceAssets.hasIcon && spaceAssets.iconUrl ? (
              <div
                className="absolute inset-0 w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url(${spaceAssets.iconUrl})` }}
              />
            ) : (
              /* ✅ UPGRADED: Now uses unified initials */
              <span style={{ color: spaceAssets.textColor }}>
                {spaceAssets.initials}
              </span>
            )}
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex items-center">
              {/* Display the space name directly with dropdown on the right */}
              {currentSpace ? (
                <div className="flex items-center">
                  <span className="text-gray-800 font-bold text-xl mr-1">
                    {displayName || 'Profile'}
                  </span>
                  
                  {/* SpaceSwitcher with only the dropdown icon */}
                  <SpaceSwitcher
                    currentSpaceSubdomain={currentSpace.subdomain || '_profile_'}
                    currentSpaceName={currentSpace.name}
                    userId={user?.id || ''}
                    hideTriggerLabel={true}
                  />
                </div>
              ) : (
                <span className="font-bold text-xl text-gray-800 tracking-tight">Profile</span>
              )}
            </div>
          </div>
        </div>

        {/* Right - User profile and actions */}
        <div className="flex items-center space-x-4">
          {children}
          
          {/* Profile dropdown */}
          {user && <ProfileDropdown user={user} />}
        </div>
      </div>
    </header>
  );
}

// PrimaryNav component for space tabs
function PrimaryNav({ tabs, activeTab }: { tabs: string[]; activeTab: string }) {
  const navigate = useNavigate();
  const { subdomain } = useParams<{ subdomain?: string }>();

  const getIcon = (tab: string) => {
    return getSpaceTabIcon(tab, "h-4 w-4 sm:h-5 sm:w-5");
  };

  return (
    <nav className="bg-slate-50 dark:bg-slate-850 sticky top-16 z-40">
      <div className="max-w-6xl mx-auto pl-8 pr-4">
        <div className="flex overflow-x-auto">
          {tabs.map((tab, index) => {
            const isActive = activeTab.toLowerCase() === tab.toLowerCase();
            const isFirst = index === 0;
            return (
              <button
                key={tab}
                onClick={() => navigate(`/space/${subdomain}/${tab.toLowerCase()}`)}
                className={`flex items-center py-2.5 ${isFirst ? 'pr-4' : 'px-4 ml-1 sm:ml-2'} transition-all duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-offset-slate-850 focus-visible:ring-gray-900 border-b-2
                  ${isActive
                    ? 'text-gray-900 dark:text-white border-gray-900 dark:border-white font-semibold'
                    : 'text-gray-500 dark:text-gray-400 font-medium border-transparent hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span className="mr-1.5 sm:mr-2">{getIcon(tab)}</span>
                <span className="text-sm sm:text-base">{tab}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

// Composer component
function Composer({ onClick, user }: { onClick: () => void; user: User | null }) {
  const { userDetails } = useOptimizedAuth();
  
  // FIXED: Get avatar URL from multiple sources with proper fallback chain
  const avatarUrl = user?.user_metadata?.avatar_url || 
                    userDetails?.avatar_url || 
                    '';

  return (
    <div className="w-full">
      <div
        onClick={onClick}
        className="mb-1 text-gray-500 text-sm font-medium cursor-pointer hover:text-gray-700 transition-colors px-1"
      >
        Write something...
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-0 sm:px-3 py-2 sm:py-3 flex items-center gap-3">
        <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
          <AvatarImage
            src={avatarUrl}
            alt="Profile"
          />
          <AvatarFallback className="bg-gray-200 text-gray-600 font-semibold">
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        {/* You can add more composer actions here if needed */}
      </div>
    </div>
  );
}

/**
 * CoverPhotoCard component  
 * ✅ UPGRADED: Now uses unified SpaceAssetsUtils system
 */
function CoverPhotoCard({ space }: { space: SpaceData | null }) {
  // 🚀 NEW: Use unified space assets system
  const spaceAssets = SpaceAssetsUtils.resolveSpaceAssets(space);
  const placeholder = SpaceAssetsUtils.getPlaceholderConfig(space);
  
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-[#E1E4E8]">
      <div className="h-36 bg-[#F5F6F7] flex items-center justify-center relative">
        {spaceAssets.hasCover && spaceAssets.coverUrl ? (
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${spaceAssets.coverUrl})` }}
          />
        ) : (
          // 🎨 UPGRADED: Professional gradient placeholder
          <div 
            className="absolute inset-0 w-full h-full flex items-center justify-center"
            style={{ 
              background: `linear-gradient(135deg, ${placeholder.gradientFrom}, ${placeholder.gradientTo})` 
            }}
          >
            <span 
              className="text-2xl font-bold"
              style={{ color: placeholder.textColor }}
            >
              {placeholder.initials}
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h2 className="text-lg font-bold text-[#37474F] mb-1">{space?.name}</h2>
        <p className="text-sm text-[#78909C] mb-3">lokaa.app/{space?.subdomain || 'your-subdomain'}</p>
        <p className="text-sm text-[#4B5563]">{space?.description || `Welcome to ${space?.name}!`}</p>
      </div>
    </div>
  );
}

// StatsCard component
function StatsCard({ members = 0 }: { members?: number }) { // Default members to 0
  return (
    <div className="bg-white rounded-lg shadow-sm border border-[#E1E4E8] p-4">
      <h3 className="font-medium text-[#111827] mb-3\">Space Stats</h3>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2">
          <div className="text-xl font-semibold text-[#1A8A7E]\">{members}</div>
          <div className="text-xs text-[#4B5563]\">Members</div>
        </div>
      </div>
    </div>
  );
}

// SettingsButton component
function SettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      variant="outline"
      className="w-full flex items-center justify-center gap-2 text-[#4B5563] hover:text-[#1A8A7E] border-[#E1E4E8]"
    >
      <Settings className="h-4 w-4" />
      <span>Space Settings</span>
    </Button>
  );
}

// Loading component
function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Loader2 className="h-8 w-8 animate-spin text-[#1A8A7E] mb-4" />
      <p className="text-lg font-medium text-gray-700\">Loading space...</p>
    </div>
  );
}

// Error component
function ErrorScreen({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 border border-red-200">
        <h1 className="text-2xl font-bold text-red-600 mb-4\">Error Loading Space</h1>
        <p className="text-gray-700 mb-4">{error.message}</p>
        <div className="flex flex-col space-y-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-[#1A8A7E] text-white rounded-md hover:bg-[#157065]"
            >
              Try Again
            </button>
          )}
          <button
            onClick={() => window.location.href = "/discover"} // Or navigate('/discover') if preferred
            className="px-4 py-2 border border-[#1A8A7E] text-[#1A8A7E] rounded-md hover:bg-gray-50"
          >
            Go to Discover
          </button>
        </div>
      </div>
    </div>
  );
}

interface SpaceLayoutProps {
  header: ReactNode;
  nav?: ReactNode; // Make nav optional
  children: ReactNode; // For the main content (active tab)
}

// Layout component that provides the overall structure for a space
export default function SpaceLayout({
  header,
  nav,
  children,
}: SpaceLayoutProps) {
  const { user, loading: authLoading } = useOptimizedAuth();
  const { 
    space: storeSpace, 
    loadingSpace: storeLoadingSpace, 
    error: storeError, 
    loadActiveSpace 
  } = useSpaceSettingsStore();
  
  const { subdomain } = useParams<{ subdomain?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  


  // Effect to load space on mount or if subdomain changes
  useEffect(() => {
    if (subdomain && user && user.id) {
      // Only force reload if the store doesn't have this space or different space
      const forceReload = !storeSpace || storeSpace.subdomain !== subdomain;
      loadActiveSpace({ subdomain }, user.id, forceReload);
    }
  }, [subdomain, user, loadActiveSpace, storeSpace]);

  // Determine if content area should be full width or have a sidebar
  // Example: Only show sidebar on certain tabs or if space data indicates it
  const hasSidebar = location.pathname.includes('/about'); // Simplified, adjust as needed
  
  const mainContentRef = useRef<HTMLDivElement>(null);
  const [mainContentHeight, setMainContentHeight] = useState(0);

  useLayoutEffect(() => {
    if (mainContentRef.current) {
      setMainContentHeight(mainContentRef.current.offsetHeight);
    }
  }, [children]); // Recalculate if children change

  // FIXED: Trust SpaceProtectedRoute - don't show loading screen since access and space data are already verified
  // SpaceProtectedRoute ensures space data is available before rendering SpaceShellLayout -> SpaceLayout
  // Only show error state if there's an actual error
  if (storeError) {
    return <ErrorScreen error={new Error(storeError)} onRetry={() => {
      if (subdomain && user) loadActiveSpace({ subdomain }, user.id, true);
    }} />;
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorScreen}>
      <div className="min-h-screen flex flex-col bg-[#F5FAFA]">
        {header && header}

        {/* Desktop Navigation - sticky */}
        {nav && (
          <div className="hidden lg:block sticky top-[var(--header-height)] z-40">
        {nav}
          </div>
        )}
        
        {/* Main content area */}
        <main className="flex-grow max-w-6xl w-full mx-auto">
          {children}
        </main>

        {/* Bottom Navigation - Mobile Only */}
        <BottomNav />
      </div>
    </ErrorBoundary>
  );
}