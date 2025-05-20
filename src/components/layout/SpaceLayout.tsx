import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { Outlet, useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, User } from "@/contexts/AuthContext";
import { useSpace, SpaceData } from "@/contexts/SpaceContext";
import { toast } from "@/hooks/use-toast";
import { Loader2, Settings, Camera, Users, MessageSquare, Calendar, Trophy, BookOpen, GraduationCap } from "lucide-react";
import SpaceSwitcher from "@/components/spaces/SpaceSwitcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import useSpaceSettingsModal from "@/hooks/useSpaceSettingsModal";
import useSpaceSettingsStore from "@/hooks/useSpaceSettingsStore";
import SpaceSettingsModal from "@/components/modals/SpaceSettingsModal";
import ProfileDropdown from "@/components/common/ProfileDropdown";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";

// Header component for space
export function Header({ user, space }: { user: User | null; space: SpaceData | null }) {
  // Try to get the current space name even when not directly set
  const [contextSpace, setContextSpace] = useState<{name: string; subdomain?: string; id?: string} | null>(null);
  const [isContextLoaded, setIsContextLoaded] = useState(false);
  
  // Function to properly capitalize space name
  const capitalizeSpaceName = (name: string) => {
    if (!name) return '';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };
  
  // Look for navigatedFromSpace in sessionStorage on mount
  useEffect(() => {
    if (space) {
      // If space prop exists, use it (takes precedence)
      setContextSpace({
        name: space.name,
        subdomain: space.subdomain,
        id: space.id
      });
      setIsContextLoaded(true);
      return;
    }
    
    // No space prop, try to get from session storage
    try {
      const navigationSpaceData = sessionStorage.getItem('navigatedFromSpace');
      if (navigationSpaceData) {
        const parsedSpace = JSON.parse(navigationSpaceData);
        if (parsedSpace) {
          let spaceName = null;
          
          if (parsedSpace.name) {
            console.log('Header: Using space name from navigation context:', parsedSpace.name);
            spaceName = parsedSpace.name;
          } else if (parsedSpace.subdomain) {
            // If we only have subdomain, capitalize it as fallback
            spaceName = parsedSpace.subdomain
              .split('-')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          }
          
          if (spaceName) {
            setContextSpace({
              name: spaceName,
              subdomain: parsedSpace.subdomain,
              id: parsedSpace.id
            });
          }
        }
      }
    } catch (e) {
      console.error('Error retrieving space from navigation context:', e);
    }
    
    setIsContextLoaded(true);
  }, [space]);

  // Don't render until we've loaded context to prevent flashes
  if (!isContextLoaded) {
    return (
      <header className="bg-white border-b py-3 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4">
          <div className="flex items-center">
            <div className="h-10 w-10 bg-[#F5F6F7] rounded-lg flex items-center justify-center text-white font-bold mr-3 shadow-sm"></div>
            <div className="h-6 w-40 bg-[#F5F6F7] rounded-md"></div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="h-5 w-5 bg-[#F5F6F7] rounded-md"></div>
            <div className="h-10 w-10 bg-[#F5F6F7] rounded-full"></div>
          </div>
        </div>
      </header>
    );
  }

  // Get properly capitalized name
  const displayName = contextSpace ? capitalizeSpaceName(contextSpace.name) : '';

  return (
    <header className="bg-white border-b py-3 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4">
        {/* Left - Space Logo and Name with Switch Button */}
        <div className="flex items-center">
          <div className="h-10 w-10 bg-[#1A8A7E] rounded-lg flex items-center justify-center text-white font-bold mr-3 shadow-sm relative overflow-hidden">
            {space?.icon_image ? (
              <div
                className="absolute inset-0 w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url(${space.icon_image})` }}
              />
            ) : (
              <span>{displayName?.charAt(0).toUpperCase() || 'S'}</span>
            )}
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex items-center">
              {/* Display the space name directly with dropdown on the right */}
              {contextSpace ? (
                <div className="flex items-center">
                  <span className="text-gray-800 font-bold text-xl mr-1">
                    {displayName}
                  </span>
                  
                  {/* SpaceSwitcher with only the dropdown icon */}
                  <SpaceSwitcher
                    currentSpaceSubdomain={contextSpace.subdomain || '_profile_'}
                    currentSpaceName={contextSpace.name}
                    userId={user?.id || ''}
                    hideTriggerLabel={true}
                  />
                </div>
              ) : (
                <span className="font-bold text-xl text-gray-800 tracking-tight">Spaces</span>
              )}
            </div>
          </div>
        </div>

        {/* Right - User profile and actions */}
        <div className="flex items-center space-x-6">
          <button className="text-[#4B5563] hover:text-[#1A8A7E] transition-colors">
            <MessageSquare className="h-5 w-5" />
          </button>

          <div className="relative">
            {user ? (
              <ProfileDropdown user={user} variant="animation" size="md" />
            ) : (
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-[#1A8A7E] text-white">
                  U
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

// PrimaryNav component for space tabs
function PrimaryNav({ tabs, activeTab }: { tabs: string[]; activeTab: string }) {
  const navigate = useNavigate();
  const { subdomain } = useParams<{ subdomain?: string }>(); // Make subdomain optional for safety

  const getIcon = (tab: string) => {
    switch(tab.toLowerCase()) {
      case 'feed': return <MessageSquare className="h-4 w-4" />;
      case 'classroom': return <GraduationCap className="h-4 w-4" />;
      case 'calendar': return <Calendar className="h-4 w-4" />;
      case 'members': return <Users className="h-4 w-4" />;
      case 'leaderboards': return <Trophy className="h-4 w-4" />;
      case 'about': return <BookOpen className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <nav className="bg-white border-b sticky top-16 z-40"> {/* Assuming header height is around 4rem (top-16) */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => navigate(`/space/${subdomain}/${tab.toLowerCase()}`)} // Corrected path construction
              className={`flex items-center py-3 px-4 border-b-2 ${
                activeTab.toLowerCase() === tab.toLowerCase()
                  ? 'border-[#1A8A7E] text-[#1A8A7E]'
                  : 'border-transparent text-[#4B5563] hover:text-[#1A8A7E]'
              } transition-colors`}
            >
              <span className="mr-2">{getIcon(tab)}</span>
              <span className="font-medium">{tab}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

// Composer component
function Composer({ onClick, user }: { onClick: () => void; user: User | null }) {
  return (
    <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#E1E4E8] overflow-hidden">
      <div className="px-5 py-4 flex items-center">
        <Avatar className="h-12 w-12 rounded-lg overflow-hidden mr-5 border-2 border-[#E0F2F1]">
          <AvatarImage
            src={user?.user_metadata?.avatar_url}
            alt="Profile"
          />
          <AvatarFallback className="bg-[#1A8A7E] text-white text-lg">
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-grow">
          <input
            type="text"
            placeholder="Write something..."
            onClick={onClick}
            className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-[#E1E4E8] focus:outline-none focus:ring-0 focus:border-[#1A8A7E] focus:border-2 text-[#37474F] placeholder-[#9CA3AF] transition-all cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}

// OnboardingCard component
function OnboardingCard({ tasks, onTaskClick }: {
  tasks: { id: string; label: string; completed: boolean }[];
  onTaskClick: (id: string) => void
}) {
  const completedTasks = tasks.filter(task => task.completed).length;
  const progressValue = (completedTasks / tasks.length) * 100;

  return (
    <div className="bg-[#F5F6F7] rounded-xl shadow-[0_4px_6px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden p-6">
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-[#111827]">Set up your group</h2>
          <span className="text-sm font-medium text-[#4B5563]\">{completedTasks}/{tasks.length} Complete</span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="w-full">
              <Progress
                value={progressValue}
                className="h-2 rounded-full shadow-sm bg-[#E1E4E8] [&>*]:bg-[#1A8A7E]"
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Complete all steps to launch your space faster!</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="space-y-4">
        {tasks.map(task => (
          <div
            key={task.id}
            className="flex items-center"
          >
            <motion.div
              className={`h-6 w-6 rounded-full border flex items-center justify-center mr-3 transition-all ${
                task.completed ? 'bg-[#1A8A7E] border-[#1A8A7E]' : 'border-[#E1E4E8] bg-transparent'
              }`}
            >
              {task.completed && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12L10 17L19 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </motion.div>
            <button
              onClick={() => onTaskClick(task.id)}
              className={`${
                task.completed ? 'line-through' : ''
              } text-sm font-medium flex items-center text-[#111827]`}
            >
              {task.label}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// CoverPhotoCard component
function CoverPhotoCard({ space }: { space: SpaceData | null }) {
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-[#E1E4E8]">
      <div className="h-36 bg-[#F5F6F7] flex items-center justify-center relative">
        {space?.cover_image ? (
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${space.cover_image})` }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-[#A0AEC0]">
            <Camera className="h-8 w-8 opacity-40" />
          </div>
        )}
      </div>

      <div className="p-4">
        <h2 className="text-lg font-bold text-[#37474F] mb-1">{space?.name}</h2>
        <p className="text-sm text-[#78909C] mb-3\">lokaa.com/{space?.subdomain || 'your-subdomain'}</p>
        <p className="text-sm text-[#4B5563]\">{space?.description || `Welcome to ${space?.name}!`}</p>
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

// SpaceLayout component that provides context to child routes
function SpaceLayout() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const { user, loading: authLoading } = useAuth(); // Correctly get authLoading
  const navigate = useNavigate();
  const location = useLocation();
  const { spaceData, loading: spaceIsLoading, error: spaceError, fetchSpaceData } = useSpace(); // Correctly get spaceIsLoading and spaceError

  const [tasks, setTasks] = useState([
    { id: "invitePeople", label: "Invite 3 people", completed: false },
    { id: "addDescription", label: "Add group description", completed: false },
    { id: "setCoverImage", label: "Set cover image", completed: false },
    { id: "writeFirstPost", label: "Write your first post", completed: false }
  ]);
  const openSpaceSettingsModal = useSpaceSettingsModal((state) => state.open);
  const { fetchSpaceSettings } = useSpaceSettingsStore();
  const redirectRef = useRef<boolean>(false);

  const isFeed = location.pathname.endsWith('/feed') ||
                 location.pathname === `/space/${subdomain}` || // Handle base space path
                 location.pathname.match(new RegExp(`^/space/${subdomain}$`)) || // More robust base path check
                 location.pathname.includes('/compose');


  useEffect(() => {
    if (subdomain && !redirectRef.current) {
      if (!authLoading && user) {
        console.log(`[SpaceLayout] Auth complete, user found. Fetching data for ${subdomain}`);
        fetchSpaceData(subdomain);
      } else if (!authLoading && !user) {
        console.warn(`[SpaceLayout] Auth complete, but no user. Not fetching space data for ${subdomain}. Error screen should appear.`);
      } else {
        console.log("[SpaceLayout] Auth in progress. Waiting to fetch space data.");
      }
    }
  }, [subdomain, fetchSpaceData, authLoading, user]);

  useEffect(() => {
    if (spaceData) {
      setTasks(prev => prev.map(task =>
        task.id === "addDescription" ? { ...task, completed: !!spaceData.description } :
        task.id === "setCoverImage" ? { ...task, completed: !!spaceData.cover_image } : task
      ));
    }
  }, [spaceData]);

  const handleError = (error: Error) => {
    console.error("Caught error in SpaceLayout:", error);
    toast({
      title: "Something went wrong",
      description: "An unexpected error occurred. Please try refreshing the page.",
      variant: "destructive",
    });
  };

  const handleTaskComplete = (taskId: string) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const handleSettingsClick = () => {
    if (spaceData && user) {
      fetchSpaceSettings(spaceData.id, user.id);
      openSpaceSettingsModal(spaceData.id, spaceData.subdomain || "");
    }
  };

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/compose')) return 'Feed';
    // Check for /space/:subdomain exactly or /space/:subdomain/
    if (path === `/space/${subdomain}` || path === `/space/${subdomain}/`) return 'Feed';
    if (path.includes('/feed')) return 'Feed';
    if (path.includes('/classroom')) return 'Classroom';
    if (path.includes('/calendar')) return 'Calendar';
    if (path.includes('/members')) return 'Members';
    if (path.includes('/leaderboards')) return 'Leaderboards';
    if (path.includes('/about')) return 'About';
    return 'Feed';
  };

  // --- REVISED LOADING/ERROR HANDLING ---
  if (authLoading) {
    console.log("[SpaceLayout] Authentication in progress, showing loading screen.");
    return <LoadingScreen />;
  }

  if (!user && subdomain) {
    console.log("[SpaceLayout] No authenticated user but trying to access a subdomain. Showing auth error.");
    return <ErrorScreen error={new Error("Authentication required to access this space. Please log in.")} onRetry={() => navigate('/auth/login', { state: { from: location } })} />;
  }

  if (spaceIsLoading && !spaceData) {
    console.log(`[SpaceLayout] User authenticated, space data for ${subdomain} is loading (no current spaceData).`);
    return <LoadingScreen />;
  }

  if (spaceError) {
    console.log(`[SpaceLayout] Space context error for ${subdomain}: ${spaceError.message}`);
    return <ErrorScreen error={spaceError} onRetry={() => fetchSpaceData(subdomain, true)} />;
  }

  if (user && !spaceData) {
    console.log(`[SpaceLayout] User authenticated, space loading complete, no error, but no spaceData for ${subdomain}. Space not found or inaccessible.`);
    return <ErrorScreen error={new Error(`The space '${subdomain}' could not be found or you don't have permission to access it.`)} onRetry={() => fetchSpaceData(subdomain, true)} />;
  }

  if (!spaceData) {
    console.error("[SpaceLayout] Fallback: spaceData is null after all primary checks. This indicates an unexpected state.");
    return <ErrorScreen error={new Error("An unexpected issue occurred while loading the space information.")} onRetry={() => fetchSpaceData(subdomain, true)} />;
  }
  // --- END REVISED LOADING/ERROR HANDLING ---

  return (
    <ErrorBoundary
      fallbackRender={({ error: boundaryError, resetErrorBoundary }: FallbackProps) => (
        <ErrorScreen error={boundaryError} onRetry={resetErrorBoundary} />
      )}
      onError={handleError}
      onReset={() => {
        if (subdomain) {
          fetchSpaceData(subdomain, true);
        }
      }}
    >
      <div className="flex flex-col min-h-screen bg-[#F5F6F7]">
        <Header user={user} space={spaceData} />
        <PrimaryNav tabs={['Feed', 'Classroom', 'Calendar', 'Members', 'Leaderboards', 'About']} activeTab={getActiveTab()} />
        <main className="flex-grow py-6">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex gap-6">
              <div className={`flex-1 space-y-6 ${!isFeed ? 'w-full' : ''}`}>
                {isFeed && (
                  <Composer onClick={() => navigate('compose')} user={user} />
                )}
                <Outlet />
                {isFeed && (
                  <OnboardingCard tasks={tasks} onTaskClick={handleTaskComplete} />
                )}
              </div>
              {isFeed && (
                <aside className="w-80 space-y-6">
                  <CoverPhotoCard space={spaceData} />
                  <StatsCard members={spaceData.member_count} />
                  <SettingsButton onClick={handleSettingsClick} />
                </aside>
              )}
            </div>
          </div>
        </main>
        <SpaceSettingsModal />
      </div>
    </ErrorBoundary>
  );
}

export default SpaceLayout;