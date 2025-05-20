import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { BellRing, MessageCircle, User, LogOut, ChevronDown, Search, Settings, Users, Calendar, BookOpen, X, Upload, Lock, Check, Globe, Loader2, Trophy, GraduationCap, Camera } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSpace } from "@/contexts/SpaceContext";
import { useSpacePermissions } from "@/hooks/useSpacePermissions";
import SpaceSwitcher from "@/components/spaces/SpaceSwitcher";
import { SpaceSidebar } from "@/components/layout/SpaceSidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Confetti from 'react-confetti';
import SpacePrivacySettings from "@/components/space/SpacePrivacySettings";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import SpaceSettingsModal from "@/components/modals/SpaceSettingsModal";
import useSpaceSettingsModal from "@/hooks/useSpaceSettingsModal";
import useSpaceSettingsStore, { type SpaceSettingsData } from "@/hooks/useSpaceSettingsStore";
import { checkSpaceAccessForUser } from '@/utils/debugTools';
import spaceAccessFix from '@/utils/spaceAccessFix';
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

const DEFAULT_COVER_IMAGE_URL = '/default-space-cover.jpg'; // Define a default

// Initialize spaceAccessFix with the Supabase client
spaceAccessFix.init(supabase);

// Helper function to resolve image URLs that might be stored in localStorage
const resolveImageUrl = (imageUrl: string | null, fallbackUrl: string = '/default-cover.jpg'): string => {
  if (!imageUrl) return fallbackUrl;
  
  // If the URL starts with 'local:', retrieve from localStorage
  if (imageUrl.startsWith('local:')) {
    const storageKey = imageUrl.replace('local:', '');
    const storedImage = localStorage.getItem(storageKey);
    return storedImage || fallbackUrl;
  }
  
  // Otherwise, use the URL directly
  return imageUrl;
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

// Define setup tasks
const setupTasks = [
  { id: 'invitePeople', label: 'Invite 3 people' },
  { id: 'addDescription', label: 'Add group description' },
  { id: 'setCoverImage', label: 'Set cover image' },
  { id: 'writeFirstPost', label: 'Write your first post' },
];

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

interface LocationState {
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
  const { subdomain, tab } = useParams<{ subdomain: string; tab?: string }>();
  const { user, signOut } = useAuth();
  const { spaceData, loading: loadingSpaceData, error: spaceError, fetchSpaceData } = useSpace();
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    space: settingsStoreSpace,
    fetchSpaceSettings,
  } = useSpaceSettingsStore();
  const [activeTab, setActiveTab] = useState(tab || initialTab || "community");
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [setupCompletion, setSetupCompletion] = useState<Record<string, boolean>>({
    invitePeople: false,
    addDescription: false,
    setCoverImage: false,
    writeFirstPost: false
  });
  const [notificationShown, setNotificationShown] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiSource, setConfettiSource] = useState({ x: 0, y: 0 });
  
  // State for description editing
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionText, setDescriptionText] = useState("");
  const [descriptionLength, setDescriptionLength] = useState(0);
  
  const openSpaceSettingsModal = useSpaceSettingsModal(state => state.open);

  // Get space permissions for current user
  const {
    isOwner,
    isAdmin,
    canEditSpace,
    canManageMembers,
    canCreateContent: permissionsCanCreateContent,
    canAccessSettings,
    loading: loadingPermissions
  } = useSpacePermissions(settingsStoreSpace?.id || '');

  // When a user is allowed through SpaceProtectedRoute, they should be able to create content
  // This ensures all space members can create content
  const canCreateContent = true; // Force to true since SpaceProtectedRoute already verified access

  // Debug: log permissions when they're loaded
  useEffect(() => {
    if (!loadingPermissions && settingsStoreSpace?.id) {
      console.log('Space permissions loaded:', {
        spaceId: settingsStoreSpace.id,
        isOwner,
        isAdmin,
        canEditSpace,
        canManageMembers,
        originalCanCreateContent: permissionsCanCreateContent,
        forcedCanCreateContent: canCreateContent,
        canAccessSettings
      });
    }
  }, [loadingPermissions, settingsStoreSpace?.id, isOwner, isAdmin, canEditSpace, canManageMembers, permissionsCanCreateContent, canCreateContent, canAccessSettings]);

  // State for about_description
  const [aboutDescription, setAboutDescription] = useState("");
  const [editingAbout, setEditingAbout] = useState(false);
  const [aboutCharCount, setAboutCharCount] = useState(0);
  const [aboutChanged, setAboutChanged] = useState(false);
  const [savingAbout, setSavingAbout] = useState(false);

  // Initialize description text from space data
  useEffect(() => {
    if (settingsStoreSpace?.description) {
      setDescriptionText(settingsStoreSpace.description);
      setDescriptionLength(settingsStoreSpace.description.length);
    } else if (spaceData?.description) {
      setDescriptionText(spaceData.description);
      setDescriptionLength(spaceData.description.length);
    } else {
      setDescriptionText("");
      setDescriptionLength(0);
    }
  }, [settingsStoreSpace?.description, spaceData?.description]);

  // Handle description text change
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setDescriptionText(text);
    setDescriptionLength(text.length);
  };

  // Save description
  const saveDescription = async () => {
    try {
      if (!settingsStoreSpace?.id) return;
      
      // Call supabase to update the description
      const { error } = await supabase
        .from('spaces')
        .update({ description: descriptionText })
        .eq('id', settingsStoreSpace.id);
        
      if (error) throw error;
      
      // Update local state
      useSpaceSettingsStore.setState((state) => ({ 
        space: state.space ? { ...state.space, description: descriptionText } : null 
      }));
      
      // Mark description task as complete
      setSetupCompletion(prev => ({ ...prev, addDescription: true }));
      
      // Exit edit mode
      setEditingDescription(false);
      
      toast({
        title: "Description saved",
        description: "Your space description has been updated."
      });
    } catch (error) {
      console.error("Error saving description:", error);
      toast({
        title: "Error",
        description: "Failed to save description. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Cancel editing
  const cancelDescription = () => {
    // Reset to original description
    setDescriptionText(settingsStoreSpace?.description || "");
    setDescriptionLength((settingsStoreSpace?.description || "").length);
    setEditingDescription(false);
  };

  // Initialize aboutDescription from space data
  useEffect(() => {
    if (settingsStoreSpace?.about_description) {
      setAboutDescription(settingsStoreSpace.about_description);
      setAboutCharCount(settingsStoreSpace.about_description.length);
      setAboutChanged(false);
    }
  }, [settingsStoreSpace?.about_description]);

  // Handler for textarea changes
  const handleAboutChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setAboutDescription(val);
    setAboutCharCount(val.length);
    setAboutChanged(val !== (settingsStoreSpace?.about_description || ""));
  };

  // Save about description
  const handleSaveAbout = async () => {
    try {
      setSavingAbout(true);
      
      if (!settingsStoreSpace?.id) return;
      
      // First get the current settings
      const { data, error } = await supabase
        .from('spaces')
        .update({ 
          about_description: aboutDescription 
        })
        .eq('id', settingsStoreSpace.id)
        .select('about_description');
      
      if (error) throw error;
      
      if (settingsStoreSpace) {
        // Update space data in store with proper typing
        useSpaceSettingsStore.setState((state) => ({
          space: state.space ? {
            ...state.space,
            about_description: aboutDescription,
          } : null
        }));
      }
      
      setAboutChanged(false);
      setEditingAbout(false);
      
      toast({
        title: "About section saved",
        description: "Your about section has been updated."
      });
    } catch (error) {
      console.error("Error saving about section:", error);
      toast({
        title: "Error",
        description: "Failed to save about section. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSavingAbout(false);
    }
  };

  // Cancel editing
  const handleCancelAbout = () => {
    setAboutDescription(settingsStoreSpace?.about_description || "");
    setAboutCharCount((settingsStoreSpace?.about_description || "").length);
    setEditingAbout(false);
    setAboutChanged(false);
  };

  console.log("Space component rendering for subdomain:", subdomain);
  console.log("Current user:", user?.email);

  // Calculate progress based on completed tasks
  const completedTasks = useMemo(() => 
    Object.values(setupCompletion).filter(Boolean).length, 
    [setupCompletion]
  );
  const totalTasks = setupTasks.length;
  const progressValue = useMemo(() => 
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
    [completedTasks, totalTasks]
  );

  // Function to handle task completion and trigger confetti
  const handleTaskComplete = (taskId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    // Simulate task completion for now
    setSetupCompletion(prev => ({ ...prev, [taskId]: !prev[taskId] }));

    // Only show confetti if the task is marked as complete
    if (!setupCompletion[taskId]) {
      // Get button position for confetti source
      const rect = event.currentTarget.getBoundingClientRect();
      setConfettiSource({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000); // Show confetti for 3 seconds
    }
  };

  // Set initial active tab based on URL path segment
  useEffect(() => {
    // Extract the tab from the path
    const pathSegments = location.pathname.split('/');
    if (pathSegments.length > 2) {
      const tabFromPath = pathSegments[2];
      // Make sure this list matches the actual tab names used in the component
      const validTabs = ['about', 'members', 'calendar', 'leaderboard', 'community', 'classroom'];
      
      if (validTabs.includes(tabFromPath)) {
        // Normalize the tab name to match our internal naming
        const normalizedTab = tabFromPath === 'leaderboard' ? 'leaderboard' : tabFromPath;
        setActiveTab(normalizedTab);
      }
    }
  }, [location.pathname]);

  // Debug: Log visibility and focus events to troubleshoot unexpected reloads
  useEffect(() => {
    const onVisibility = () => {
      console.log('[Space Debug] Document visibility changed:', document.visibilityState, 'at', new Date().toLocaleString());
      // Don't take any action on visibility change - just log for debugging
    };
    const onFocus = () => {
      console.log('[Space Debug] Window focused at', new Date().toLocaleString());
      // Don't take any action on focus - just log for debugging
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // ADDED: Cache and restore space data to make the component resilient to remounts
  useEffect(() => {
    // Only cache if we have valid data and it's not a visibility change event (visible state is ok)
    if (settingsStoreSpace && subdomain && document.visibilityState !== 'hidden') {
      try {
        // Save to sessionStorage when we have space data
        const cacheKey = `space_data_${subdomain}`;
        sessionStorage.setItem(cacheKey, JSON.stringify({
          space: settingsStoreSpace,
          timestamp: new Date().getTime()
        }));
        console.log('[Space] Cached space data to sessionStorage');
      } catch (err) {
        console.warn('[Space] Failed to cache space data:', err);
      }
    }
  }, [settingsStoreSpace, subdomain]);

  // ADDED: Quick Recovery from Cache
  const [quickRecoveryAttempted, setQuickRecoveryAttempted] = useState(false);
  const quickRecoveryAttemptedRef = useRef(quickRecoveryAttempted);

  useEffect(() => {
    quickRecoveryAttemptedRef.current = quickRecoveryAttempted;
  }, [quickRecoveryAttempted]);

  // Fetch space data when component mounts or subdomain changes
  const fetchInitialSpaceData = useCallback(async () => {
    console.log(`[Space.tsx FID Start] loadingSpaceData: ${loadingSpaceData}, qRA: ${quickRecoveryAttemptedRef.current}, user: ${!!user}, subdomain: ${subdomain}`);

    // Skip fetching if we're in a hidden tab (minimized)
    if (document.visibilityState === 'hidden') {
      console.log(`[Space.tsx FID Path 0 - Skipping due to hidden tab]`);
      return;
    }

    if (!subdomain || !user) {
      console.log(`[Space.tsx FID Path 1 - No user/subdomain]`);
      return;
    }

    if (loadingSpaceData) { // Context is loading
      console.log(`[Space.tsx FID Path 2 - Context loading]`);
      console.log("[Space.tsx FID Path 2] Returning, wait for context.");
      return;
    }

    if (spaceData && spaceData.subdomain === subdomain) { // Context has correct data
      console.log(`[Space.tsx FID Path 3 - Data in context]`);
      // Log spaceData from context before setting the store
      console.log("[Space.tsx FID Path 3] spaceData from context before store update:", JSON.stringify(spaceData));
      try {
            const spaceToSet: SpaceSettingsData = {
              id: spaceData.id,
              name: spaceData.name,
              description: spaceData.description,
              about_description: spaceData.about_description === undefined ? null : spaceData.about_description,
              cover_image: spaceData.cover_image || DEFAULT_COVER_IMAGE_URL,
              icon_image: spaceData.icon_image || null,
              subdomain: spaceData.subdomain,
              owner_id: spaceData.owner_id,
              is_private: spaceData.is_private ?? false, // Ensure boolean
            };
            useSpaceSettingsStore.setState({ 
              space: spaceToSet
            });
        if (spaceData.id && user?.id) {
           fetchSpaceSettings(spaceData.id, user.id);
        }
      } catch (e) { console.error("[Space.tsx FID Path 3] Error during settings store sync/fetch:", e); }
      
      if (!quickRecoveryAttemptedRef.current) {
        console.log("[Space.tsx FID Path 3] Setting quickRecoveryAttempted to true.");
        setQuickRecoveryAttempted(true);
      }
      console.log("[Space.tsx FID Path 3] Exiting.");
      return;
    }
    
    console.log(`[Space.tsx FID Path 4 - Must fetch]`);
    
    try {
      const newSpaceData = await fetchSpaceData(subdomain);
      
      if (!newSpaceData) {
        console.error('[Space.tsx FID Path 4] Failed to fetch newSpaceData from context.');
        return;
      }
      
      try {
        const spaceToSetFromNew: SpaceSettingsData = {
          id: newSpaceData.id,
          name: newSpaceData.name,
          description: newSpaceData.description,
          about_description: newSpaceData.about_description === undefined ? null : newSpaceData.about_description,
          cover_image: newSpaceData.cover_image || DEFAULT_COVER_IMAGE_URL,
          icon_image: newSpaceData.icon_image || null,
          subdomain: newSpaceData.subdomain,
          owner_id: newSpaceData.owner_id,
          is_private: newSpaceData.is_private ?? false, // Ensure boolean
        };
        useSpaceSettingsStore.setState({ 
          space: spaceToSetFromNew
        });
         if (newSpaceData.id && user?.id) {
            fetchSpaceSettings(newSpaceData.id, user.id);
         }
      } catch (e) { console.error("[Space.tsx FID Path 4] Error during settings store sync/fetch post-fetch:", e); }
      
      if (!quickRecoveryAttemptedRef.current) {
        console.log("[Space.tsx FID Path 4] Setting quickRecoveryAttempted to true.");
      setQuickRecoveryAttempted(true);
      }
    } catch (error) {
      console.error('[Space.tsx FID Path 4] Error in try-catch block:', error);
    } finally {
      console.log(`[Space.tsx FID Path 4 Finally] fetchInitialSpaceData path 4 finished.`);
    }
  }, [subdomain, user, fetchSpaceData, fetchSpaceSettings, spaceData, loadingSpaceData, quickRecoveryAttemptedRef]); // Added quickRecoveryAttemptedRef to dependencies

  // Fetch space details AND trigger settings fetch
  useEffect(() => {
    const currentPreserveSpaceState = location.state && 
      typeof location.state === 'object' && 
      'preserveSpace' in (location.state as LocationState) && 
      (location.state as LocationState).preserveSpace === true;
    
    const isTabChangeOnly = currentPreserveSpaceState;

    console.log("[Space.tsx useEffect for FID] location.state:", JSON.stringify(location.state));
    console.log("[Space.tsx useEffect for FID] isTabChangeOnly evaluation:", isTabChangeOnly);
    console.log("[Space.tsx useEffect for FID] spaceData present:", !!spaceData);
    console.log("[Space.tsx useEffect for FID] settingsStoreSpace present:", !!settingsStoreSpace);

    // If the settings store doesn't have space details yet, we must fetch/set them.
    if (!settingsStoreSpace) {
      console.log("[Space.tsx useEffect for FID] Settings store is empty, proceeding to call fetchInitialSpaceData.");
      fetchInitialSpaceData();
      return; // Exit early after initiating the fetch for store population
    }
    
    // If store is populated, then apply the optimization for tab changes.
    if (isTabChangeOnly && spaceData) {
      console.log("[Space.tsx useEffect for FID] Settings store populated. Skipping fetchInitialSpaceData due to isTabChangeOnly && spaceData.");
      return;
    }
    
    console.log("[Space.tsx useEffect for FID] Settings store populated. Proceeding to call fetchInitialSpaceData (not a tab change or spaceData missing).");
    fetchInitialSpaceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [subdomain, user, location, fetchInitialSpaceData, spaceData]); // Removed settingsStoreSpace from dependencies

  // Handle sign out
  const handleSignOut = async () => {
    try {
      console.log('Space page: Starting sign out process');
      
      // Store the current pathname before signing out
      const currentPath = window.location.pathname;
      
      // Call the signOut function from AuthContext
      await signOut();
      
      // Add Safari-specific fix with a safety timeout
      console.log('Space page: Adding fallback redirect for Safari');
      setTimeout(() => {
        // Check if we're still on a space page after signOut
        if (window.location.pathname.includes('/space/')) {
          console.log('Space page: Still on space page after signOut, forcing hard redirect');
          // Force a cache-busting redirect
          window.location.replace(`/?from=space&t=${Date.now()}`);
        }
      }, 1000);
    } catch (error) {
      console.error('Space page: Sign out error:', error);
      // Force a hard redirect on error
      window.location.replace('/');
    }
  };
  
  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search
    console.log("Searching for:", searchQuery);
  };

  // Handle close notification
  const handleCloseNotification = () => {
    setNotificationShown(false);
  };

  // Toggle profile dropdown
  const toggleProfileDropdown = () => {
    setProfileDropdownOpen(!profileDropdownOpen);
  };

  // Close profile dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (profileDropdownOpen && !target.closest('.profile-dropdown-container')) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownOpen]);

  // Expose debug utils on window for easy access in console
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.spaceDebug = {
        checkAccess: async () => {
          if (!user || !subdomain) return console.error('Missing user or subdomain');
          return await checkSpaceAccessForUser(user.id, subdomain);
        },
        directCheck: async () => {
          if (!subdomain) return console.error('Missing subdomain');
          return await directSpaceAccessCheck(subdomain);
        },
        forceUpdateStore: () => {
          if (!subdomain || !user?.id) return console.error('Missing subdomain or user ID for forceUpdateStore');
          console.log(`Forcing update of space store for ${subdomain} and user ${user.id}`);
          fetchInitialSpaceData();
        },
        fixAccess: async () => {
          if (!subdomain || !user?.id) return console.error('Missing subdomain or user ID for fixAccess');
          console.log(`Attempting to fix space access for ${subdomain} and user ${user.id}`);
          await fixSpaceAccessBySubdomain(subdomain);
          toast({ title: "Access Fix Attempted", description: "Please refresh and check access." });
        },
        spaceInfo: {
          subdomain,
          space: spaceData,
          userId: user?.id,
          isOwner,
        },
      };
      
      console.log('Space debug utils available in console. Try: window.spaceDebug.directCheck()');
    }
    
    return () => {
      // Cleanup
      if (typeof window !== 'undefined') {
        delete window.spaceDebug;
      }
    };
  }, [user, subdomain, spaceData, isOwner, fetchInitialSpaceData]); // Added fetchInitialSpaceData

  // Use modern tab styles for navigation
  const renderTabButton = (tab: string, icon: React.ReactNode, label: string) => {
    const isActive = activeTab === tab;
    // Map 'community' tab to 'feed' URL path
    const url = `/${subdomain}/space/${tab === 'community' ? 'feed' : tab}`;
    
    return (
      <Link 
        to={url}
        state={{ preserveSpace: true }} // Add state to indicate this is just a tab change
        onClick={(e) => {
          e.preventDefault(); // Prevent default link behavior
          handleTabChange(tab);
        }}
        className={`inline-flex items-center px-4 py-3 border-b-2 text-sm font-medium whitespace-nowrap ${
          isActive
            ? 'border-[#2AB5A0] text-[#2AB5A0] dark:text-white dark:border-white'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-300 dark:hover:text-white dark:hover:border-gray-600'
      }`}
        aria-current={isActive ? 'page' : undefined}
    >
        <span className="mr-2">{icon}</span>
      {label}
      </Link>
    );
  };
  
  // Handle tab change and synchronize with URL
  const handleTabChange = (tab: string) => {
    // First set the active tab to ensure immediate UI feedback
    setActiveTab(tab);
    
    // Store the current tab in sessionStorage to maintain it across page refreshes
    try {
      sessionStorage.setItem(`active_tab_${subdomain}`, tab);
    } catch (err) {
      console.warn('Failed to store active tab:', err);
    }
    
    // Update URL without reloading the page
    // Use the new URL structure for space navigation
    // Map 'community' tab to 'feed' URL path
    const url = `/${subdomain}/space/${tab === 'community' ? 'feed' : tab}`;
    
    // Use navigate with replace to prevent adding to the history stack
    navigate(url, { 
      replace: true,
      state: { 
        preserveSpace: true, // Add state to indicate this is just a tab change
        activeTab: tab 
      } as LocationState // Added type assertion for state
    });
  };

  // Check if this is a newly created space and show notification
  useEffect(() => {
    // Check if we should show the space creation notification
    const checkForNewSpace = () => {
      try {
        const lastCreatedSpace = localStorage.getItem('lastCreatedSpace');
        if (!lastCreatedSpace) return;
        
        const spaceData = JSON.parse(lastCreatedSpace);
        
        // If this is the same space as the current one and was created recently (within the last minute)
        if (spaceData && spaceData.subdomain === subdomain) {
          const createdAt = new Date(spaceData.created_at);
          const now = new Date();
          const timeDiffMs = now.getTime() - createdAt.getTime();
          const timeDiffSec = timeDiffMs / 1000;
          
          // If space was created in the last 60 seconds and notification hasn't been shown yet
          if (timeDiffSec < 60) {
            const notificationShownBefore = localStorage.getItem(`space_${spaceData.id}_notification_shown`);
            
            if (!notificationShownBefore) {
              // Mark that we've shown the notification for this space
              localStorage.setItem(`space_${spaceData.id}_notification_shown`, 'true');
              setNotificationShown(true);
              
              // Auto-dismiss after 5 seconds
              setTimeout(() => {
                setNotificationShown(false);
              }, 5000);
            }
          }
        }
      } catch (error) {
        console.error('Error checking for new space:', error);
      }
    };
    
    checkForNewSpace();
  }, [subdomain]);

  // Initialize space data from cached values if they exist
  useEffect(() => {
    if (settingsStoreSpace && settingsStoreSpace.id) {
      // Check if cover image URLs are stored in localStorage in the 'local:' format
      if (settingsStoreSpace.cover_image && typeof settingsStoreSpace.cover_image === 'string' && settingsStoreSpace.cover_image.startsWith('local:')) {
        // Extract key from the format 'local:space_cover_123'
        const keyParts = settingsStoreSpace.cover_image.split(':');
        if (keyParts.length >= 2) {
          const localKey = keyParts[1];
          const storedCover = localStorage.getItem(localKey);
          
          if (storedCover) {
            console.log("Restoring cover image from localStorage:", localKey);
            
            // Update directly in the UI without updating the store
            const coverElements = document.querySelectorAll(`[style*="background-image"][style*="${settingsStoreSpace.cover_image}"]`);
            coverElements.forEach(element => {
              (element as HTMLElement).style.backgroundImage = `url(${storedCover})`;
            });
          }
        }
      }
    }
  }, [settingsStoreSpace]);

  // Update active tab when URL parameter changes
  useEffect(() => {
    if (tab) {
      setActiveTab(tab);
    }
  }, [tab]);

  // Log space from settings store before render
  const { space: settingsStoreSpaceForRender } = useSpaceSettingsStore();
  console.log("[Space.tsx Render] space from useSpaceSettingsStore:", JSON.stringify(settingsStoreSpaceForRender));
  console.log("[Space.tsx Render] spaceData from useSpace context (for comparison):", JSON.stringify(spaceData));

  // Memoize a generic space object for tabs that need it.
  // This shape should be compatible with ClassroomTabProps and hopefully others.
  const memoizedSpaceDataForTabs = useMemo(() => {
    if (!spaceData && !settingsStoreSpace) return null;
    const id = settingsStoreSpace?.id || spaceData?.id;
    const name = settingsStoreSpace?.name || spaceData?.name;
    const currentSubdomain = settingsStoreSpace?.subdomain || spaceData?.subdomain;
    const currentDescription = settingsStoreSpace?.description ?? spaceData?.description;
    const currentAboutDescription = settingsStoreSpace?.about_description ?? spaceData?.about_description;
    const currentCoverImage = settingsStoreSpace?.cover_image ?? spaceData?.cover_image;
    const currentIconImage = settingsStoreSpace?.icon_image ?? spaceData?.icon_image;
    const currentOwnerId = settingsStoreSpace?.owner_id || spaceData?.owner_id;
    const currentPrimaryColor = spaceData?.primary_color || null;
    const currentPricingType = (spaceData?.pricing_type as ('free' | 'paid')) || 'free';
    if (!id || !name) return null;
    return {
      id,
      name,
      subdomain: currentSubdomain,
      description: currentDescription,
      about_description: currentAboutDescription,
      cover_image: currentCoverImage,
      icon_image: currentIconImage,
      primary_color: currentPrimaryColor,
      owner_id: currentOwnerId,
      pricing_type: currentPricingType,
    };
  }, [settingsStoreSpace, spaceData]);

  // Main loading condition changed
  if (loadingSpaceData || !user) { // Primary condition relies on context's loading and user auth
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin h-10 w-10 rounded-full border-t-2 border-b-2 border-amber-600 mb-4"></div>
          {/* "Reconnecting..." message logic updated */}
          {loadingSpaceData && quickRecoveryAttempted && <div className="text-sm text-gray-500">Reconnecting to your space...</div>}
        </div>
      </div>
    );
  }

  // Handle error state
  if (spaceError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Space</h2>
          <p className="text-gray-700 mb-4">{spaceError.message || "Failed to load space data. Please try again."}</p>
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => navigate("/discover")}
            >
              Go to Discover
            </Button>
            <Button 
              onClick={() => fetchInitialSpaceData()}
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Make sure we have space data
  if (!spaceData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <h2 className="text-xl font-semibold text-amber-600 mb-4">Space Not Found</h2>
          <p className="text-gray-700 mb-4">The space you're looking for doesn't exist or you don't have access to it.</p>
          <Button 
            onClick={() => navigate("/discover")}
            className="w-full"
          >
            Discover Spaces
          </Button>
        </div>
      </div>
    );
  }

  // Main content area
  // This is a guess, the actual structure might be different.
  // Looking for where ClassroomTab, FeedTab etc. are rendered.
  const renderActiveTabContent = () => {
    if (loadingSpaceData) { 
      return <div className="flex-grow flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    // Check if data for tabs that need it is ready
    if (!memoizedSpaceDataForTabs && (activeTab === 'classroom' || activeTab === 'calendar' || activeTab === 'leaderboard')) {
        return <div className="flex-grow flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    } 
    // Fallback for FeedTab and AboutTab if their specific data needs aren't met (e.g. spaceData for AboutTab onSpaceUpdate)
    if ((activeTab === 'feed' || activeTab === 'community' || activeTab === 'about') && !spaceData && !settingsStoreSpace) {
      return <div className="flex-grow flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    switch (activeTab) {
      case "feed":
      case "community":
        // Restore original props for FeedTab
        return <FeedTab user={user} isOwner={isOwner} isAdmin={isAdmin} />;
      case "classroom":
        return memoizedSpaceDataForTabs ? <ClassroomTab space={memoizedSpaceDataForTabs} /> : null;
      case "calendar":
        return memoizedSpaceDataForTabs ? <CalendarTab space={memoizedSpaceDataForTabs} /> : null;
      case "members":
        return <MembersTab />;
      case "leaderboard":
        return memoizedSpaceDataForTabs 
          ? <LeaderboardsTab spaceId={memoizedSpaceDataForTabs.id} spaceName={memoizedSpaceDataForTabs.name} /> 
          : null;
      case "about":
        // Restore original props/structure for AboutTab
        return <AboutTab 
                onSpaceUpdate={(updatedSpace: { about_description: string | null }) => {
                    if (settingsStoreSpace) { 
                        useSpaceSettingsStore.setState((state) => {
                        const currentStoreSpace = state.space;
                        if (!currentStoreSpace) return state;
                        return {
                            space: { ...currentStoreSpace, about_description: updatedSpace.about_description },
                            formData: { ...state.formData, about_description: updatedSpace.about_description }
                        };
                        });
                    }
                    toast({
                        title: "Space updated",
                        description: "Your space details have been refreshed.",
                    });
                }}
                />;
      default:
        // Restore original props for FeedTab
        return <FeedTab user={user} isOwner={isOwner} isAdmin={isAdmin} />;
    }
  };

  return (
    <TooltipProvider>
      <motion.div 
        className="min-h-screen bg-[#F5FAFA] flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {showConfetti && 
          <Confetti 
            recycle={false} 
            numberOfPieces={200} 
            gravity={0.1} 
            initialVelocityX={5}
            initialVelocityY={20}
            confettiSource={confettiSource}
            width={window.innerWidth}
            height={window.innerHeight}
          />
        }
        {/* Top Navigation */}
        <header className="bg-white border-b py-3 sticky top-0 z-50 shadow-sm">
          <div className="max-w-6xl mx-auto flex items-center justify-between px-4">
            {/* Left - Space Logo and Name with Switch Button */}
            <div className="flex items-center">
              {/*
              <div className="h-10 w-10 bg-[#26A69A] rounded-lg flex items-center justify-center text-white font-bold mr-3 shadow-sm relative overflow-hidden">
                {settingsStoreSpace?.icon_image ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="absolute inset-0 w-full h-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${resolveImageUrl(settingsStoreSpace.icon_image)})` }}
                  />
                ) : (
                <span>{settingsStoreSpace?.name?.charAt(0).toUpperCase()}</span>
                )}
              </div>
              */}
              <div className="flex flex-col justify-center">
                <div className="flex items-center">
                  <SpaceSwitcher // This is from src/components/spaces/SpaceSwitcher.tsx
                    currentSpaceSubdomain={subdomain || ''} 
                    currentSpaceName={settingsStoreSpace?.name}
                    userId={user?.id || ''}
                  />
                </div>
              </div>
            </div>
            
            {/* Center - Search */}
            <div className="flex-1 max-w-xl mx-8">
              <div className="relative">
                <Search 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#78909C]" 
                />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#F5FAFA] rounded-full border border-[#E0F2F1] focus:outline-none focus:ring-1 focus:ring-[#26A69A] text-sm text-[#37474F] placeholder-[#78909C] transition-all"
              />
              </div>
            </div>
            
            {/* Right - User Controls */}
            <div className="flex items-center gap-8">
              {/* Messages */}
              <div className="flex items-center justify-center">
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-[#78909C] hover:text-[#26A69A] transition-colors flex items-center justify-center p-1"
                >
                  <MessageCircle className="h-6 w-6" />
                </motion.button>
              </div>
            
              {/* Notifications */}
              <div className="flex items-center justify-center">
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-[#78909C] hover:text-[#26A69A] transition-colors flex items-center justify-center p-1"
                >
                  <BellRing className="h-6 w-6" />
                </motion.button>
              </div>
              
              {/* Profile */}
              <div className="flex items-center justify-center">
                <ProfileDropdown variant="animation" size="md" />
              </div>
            </div>
          </div>
        </header>

        {/* Space Navigation with updated design */}
        <nav className="bg-white border-b sticky top-16 z-40">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex overflow-x-auto">
              {renderTabButton("community", <MessageCircle className="h-4 w-4" />, "Feed")}
              {renderTabButton("classroom", <GraduationCap className="h-4 w-4" />, "Classroom")}
              {renderTabButton("calendar", <Calendar className="h-4 w-4" />, "Calendar")}
              {renderTabButton("members", <Users className="h-4 w-4" />, "Members")}
              {renderTabButton("leaderboard", <Trophy className="h-4 w-4" />, "Leaderboards")}
              {renderTabButton("about", <BookOpen className="h-4 w-4" />, "About")}
            </div>
          </div>
        </nav>
          
        {/* Main Content Area - where tabs are rendered */}
        <main className="flex-grow max-w-6xl mx-auto w-full px-4 py-6">
          {renderActiveTabContent()}
        </main>
        
        {/* Render the SpaceSettingsModal - It will now use the store */}
        <SpaceSettingsModal />
        
        {/* Creation Success Notification */}
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
    </motion.div>
    </TooltipProvider>
  );
} 