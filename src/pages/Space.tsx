import { useState, useEffect, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Bell, MessageSquare, User, LogOut, ChevronDown, Search, Settings, Users, Calendar, BookOpen, X, Upload, Lock, Check, Globe, Loader2, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
import useSpaceSettingsStore from "@/hooks/useSpaceSettingsStore";
import { checkSpaceAccessForUser } from '@/utils/debugTools';
import spaceAccessFix from '@/utils/spaceAccessFix';
import { fixSpaceAccessBySubdomain, directSpaceAccessCheck } from '@/utils/fixSpacesAccess';
import { ErrorRecovery } from '@/components/common/ErrorRecovery';
import AboutTab from "@/components/space/AboutTab";
import FeedTab from "@/components/space/FeedTab";
import CalendarTab from "@/components/space/CalendarTab";
import MembersTab from "@/components/space/MembersTab";
import LeaderboardsTab from "@/components/space/LeaderboardsTab";

// Initialize spaceAccessFix with the Supabase client
spaceAccessFix.init(supabase);

interface SpaceDetails {
  id: string;
  name: string;
  description: string | null;
  cover_image: string | null;
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
    cover_image: string;
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

export default function Space() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loadingSpace, setLoadingSpace] = useState(true);
  const [activeTab, setActiveTab] = useState("community");
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [setupCompletion, setSetupCompletion] = useState<Record<string, boolean>>({
    invitePeople: false,
    addDescription: false,
    setCoverImage: false,
    writeFirstPost: false
  });
  const [notificationShown, setNotificationShown] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiSource, setConfettiSource] = useState({ x: 0, y: 0 });
  
  const openSpaceSettingsModal = useSpaceSettingsModal(state => state.open);
  const { 
    space, 
    fetchSpaceSettings, 
    loading: loadingSettings,
    error: settingsError 
  } = useSpaceSettingsStore();

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

  // Fetch space details AND trigger settings fetch
  useEffect(() => {
    const fetchInitialSpaceData = async () => {
      if (!subdomain || !user) {
        console.log("No subdomain or user found, redirecting to login");
        navigate('/login', { replace: true });
        return;
      }
      
      setLoadingSpace(true);
      console.log("Space component: Starting space data fetch for subdomain:", subdomain);
      
      // Set a timeout to prevent endless loading
      const timeoutId = setTimeout(() => {
        console.error("Space loading timeout - forcing completion");
        setLoadingSpace(false);
        
        // Show a toast with a recovery option
        toast({ 
          title: "Loading Timeout", 
          description: "Could not load space data. Please try the recovery option below or go to the discover page.", 
          variant: "destructive",
          action: (
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  toast({
                    title: "Attempting recovery...",
                    description: "Trying to fix access issues for this space.",
                  });
                  
                  const success = await fixSpaceAccessBySubdomain(subdomain);
                  
                  if (success) {
                    toast({
                      title: "Recovery successful",
                      description: "Space access has been fixed. Reloading page.",
                    });
                    // Reload the page after a short delay
                    setTimeout(() => window.location.reload(), 1500);
                  } else {
                    navigate('/discover', { replace: true });
                    toast({
                      title: "Recovery failed",
                      description: "Redirecting to discover page.",
                      variant: "destructive"
                    });
                  }
                } catch (error) {
                  console.error("Recovery error:", error);
                  navigate('/discover', { replace: true });
                }
              }}
              className="bg-amber-500 text-white hover:bg-amber-600"
            >
              Recover
            </Button>
          )
        });
      }, 15000); // 15 seconds timeout
      
      try {
        // Use the RPC function to bypass RLS and get space data
        console.log("Fetching space by subdomain using admin_get_space_by_subdomain:", subdomain);
        
        // Use a more explicit approach with type casting to avoid TypeScript errors
        const { data: rpcResponse, error: rpcError } = await (supabase as any)
          .rpc('admin_get_space_by_subdomain', { target_subdomain: subdomain }) as {
            data: SpaceRPCResponse | null;
            error: any;
          };
          
        if (rpcError) {
          console.error("Error fetching space via RPC:", rpcError);
          
          // Fall back to the original method if RPC fails
          console.log("Falling back to direct spaces query");
          const { data: pageData, error: pageError } = await supabase
            .from("spaces")
            .select("id, name, description, cover_image, primary_color, member_count, pricing_type, price_per_month, subdomain, owner_id, is_private")
            .eq("subdomain", subdomain)
            .single();
            
          if (pageError) {
            console.error("Error fetching initial space data:", pageError);
            
            // Specific handling for different error types
            if (pageError.code === 'PGRST116') {
              // No rows returned
              toast({ 
                title: "Space Not Found", 
                description: "The space you're looking for doesn't exist.", 
                variant: "destructive" 
              });
              navigate('/discover', { replace: true });
            } else {
              toast({ 
                title: "Error Loading Space", 
                description: "There was a problem loading this space: " + pageError.message, 
                variant: "destructive" 
              });
            }
            
            throw pageError;
          }
          
          if (!pageData) {
            console.error("Space not found by subdomain:", subdomain);
            toast({ 
              title: "Space Not Found", 
              description: "The space you're looking for doesn't exist.", 
              variant: "destructive" 
            });
            navigate('/discover', { replace: true });
            return;
          }
          
          // Continue with the pageData from direct query
          processSpaceData(pageData);
        } else {
          // Parse RPC response
          const typedResponse = rpcResponse as unknown as SpaceRPCResponse;
          
          if (!typedResponse || !typedResponse.success) {
            console.error("Space not found or RPC returned error:", typedResponse);
            toast({ 
              title: "Space Not Found", 
              description: "The space you're looking for doesn't exist.", 
              variant: "destructive" 
            });
            navigate('/discover', { replace: true });
            return;
          }
          
          // Extract space data from RPC response
          const pageData = typedResponse.space;
          console.log("Successfully retrieved space data via RPC:", pageData);
          
          // Process the space data from RPC
          processSpaceData(pageData);
        }
      } catch (error) {
        console.error("Error loading initial space data:", error);
        toast({ 
          title: "Error", 
          description: "Failed to load space. Redirecting to discover page.", 
          variant: "destructive" 
        });
        
        // Navigate to discover page on error
        navigate('/discover', { replace: true });
      } finally {
        setLoadingSpace(false);
        // Ensure the timeout is cleared
        clearTimeout(timeoutId);
      }
    };
    
    // Helper function to process the space data
    const processSpaceData = async (pageData: any) => {
      if (!pageData || !user) {
        console.error("Missing page data or user object");
        navigate('/discover', { replace: true });
        return;
      }
      
      // Check if user is the owner or has access to this space
      const isOwner = pageData.owner_id === user.id;
      
      if (!isOwner) {
        console.log("User is not the owner, checking for access rights");
        // Check if user has access via space_access table
        const { data: accessData, error: accessError } = await supabase
          .from('space_access')
          .select('id')
          .eq('space_id', pageData.id)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
          
        if (accessError && accessError.code !== 'PGRST116') {
          console.error("Error checking space access:", accessError);
        }
        
        if (!accessData && !isOwner) {
          console.error("User does not have access to this space.");
          toast({ 
            title: "Access Denied", 
            description: "You don't have permission to access this space.", 
            variant: "destructive" 
          });
          navigate('/discover', { replace: true });
          return;
        }
        
        console.log("User has access to space via membership");
      } else {
        console.log("User is the owner of this space");
      }
      
      const typedSpaceData = pageData as any; // Use appropriate type
      document.title = `${typedSpaceData.name} | Lokaa`;
      
      // Update setup completion based on initial data
      setSetupCompletion(prev => ({
        ...prev,
        addDescription: !!typedSpaceData.description,
        setCoverImage: !!typedSpaceData.cover_image
      }));

      // NOW, trigger the fetch for the detailed settings data
      // We use pageData.id and user.id
      console.log("Triggering settings fetch for space ID:", pageData.id);
      await fetchSpaceSettings(pageData.id, user.id);
    };
    
    fetchInitialSpaceData();
  }, [subdomain, user, fetchSpaceSettings, navigate]); // Add navigate to dependencies

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

  // Determine if current user is the owner using the store's space data
  const isOwner = user?.id === space?.owner_id;

  // Expose debug utils on window for easy access in console
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).spaceDebug = {
        checkAccess: async () => {
          if (!user || !subdomain) return console.error('Missing user or subdomain');
          return await checkSpaceAccessForUser(user.id, subdomain);
        },
        directCheck: async () => {
          if (!subdomain) return console.error('Missing subdomain');
          return await directSpaceAccessCheck(subdomain);
        },
        spaceInfo: {
          subdomain,
          space,
          userId: user?.id,
          isOwner,
        },
      };
      
      console.log('Space debug utils available in console. Try: window.spaceDebug.directCheck()');
    }
    
    return () => {
      // Cleanup
      if (typeof window !== 'undefined') {
        delete (window as any).spaceDebug;
      }
    };
  }, [user, subdomain, space, isOwner]);

  // Use modern tab styles for navigation
  const renderTabButton = (tab: string, icon: JSX.Element, label: string) => (
    <motion.button 
      whileHover={{ scale: 1.02 }}
      className={`px-5 py-4 font-medium relative text-sm flex items-center gap-1.5 transition-colors ${
        activeTab === tab 
          ? 'text-[#26A69A] font-medium' 
          : 'text-[#78909C] hover:text-[#37474F]'
      }`}
      onClick={() => setActiveTab(tab)}
    >
      {icon}
      {label}
      {activeTab === tab && (
        <motion.div 
          layoutId="activeTabIndicator"
          className="absolute bottom-0 left-0 w-full h-0.5 bg-[#26A69A] shadow-[0_0_8px_rgba(38,166,154,0.5)]"
        />
      )}
    </motion.button>
  );

  // While loading or auth is in process, show only a loading screen
  if (loadingSpace || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 rounded-full border-t-2 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  // At this point, loadingSpace is false, and user exists.
  // Now check if the settings data from the store is still loading.
  if (loadingSettings) {
    // Keep showing loading spinner while settings are being fetched
    // This prevents flashing the "Not Found" page prematurely
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 rounded-full border-t-2 border-b-2 border-amber-600"></div>
      </div>
    );
  }
  
  // After initial loading and settings loading are complete, if space data is still missing or there was an error, show Space Not Found / Error Recovery
  // This condition is now more precise, only triggering after all loading is confirmed finished.
  if (!space || settingsError) {
    // Log the reason for showing the error page
    console.error('Rendering Space Not Found/Error Recovery because:', { 
      spaceExists: !!space, 
      settingsError: settingsError 
    });
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-2">Space Not Found</h1>
          <p className="text-gray-600 mb-4">The space you're looking for doesn't exist or you don't have access.</p>
          <div className="flex flex-col gap-3 items-center">
            <Button onClick={() => navigate("/discover")}>
              Go to Discover
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate("/create-space")}
              className="mt-2"
            >
              Create a Space
            </Button>
            <Button 
              variant="link"
              onClick={() => window.location.href = "/"}
              className="text-gray-500"
            >
              Return to Home
            </Button>
            
            {/* Recovery Button for Fixing Access */}
            {subdomain && (
              <Button 
                variant="outline"
                onClick={async () => {
                  try {
                    toast({
                      title: "Attempting recovery...",
                      description: "Trying to fix access issues for this space.",
                      variant: "default"
                    });
                    
                    const success = await fixSpaceAccessBySubdomain(subdomain);
                    
                    if (success) {
                      toast({
                        title: "Recovery successful",
                        description: "Space access has been fixed. Reloading page.",
                        variant: "default"
                      });
                      // Reload the page after a short delay
                      setTimeout(() => window.location.reload(), 1500);
                    } else {
                      toast({
                        title: "Recovery failed",
                        description: "Could not fix space access. Please contact support.",
                        variant: "destructive"
                      });
                    }
                  } catch (error) {
                    console.error("Recovery error:", error);
                    toast({
                      title: "Recovery error",
                      description: "An unexpected error occurred during recovery.",
                      variant: "destructive"
                    });
                  }
                }}
                className="mt-4 border-amber-500 text-amber-600 hover:bg-amber-50"
              >
                Attempt Access Recovery
              </Button>
            )}
            
            {/* Error Recovery Options */}
            <div className="w-full mt-6 pt-4 border-t border-gray-200">
              <ErrorRecovery 
                title="Advanced Troubleshooting"
                description="If you're experiencing persistent issues, try these recovery options:"
              />
            </div>
            
            {/* Emergency Reset Button */}
            {user?.email === 'francischukwuma706@gmail.com' && (
              <div className="mt-6 pt-6 border-t border-gray-200 w-full">
                <p className="text-sm text-gray-600 mb-3">
                  Special option for test account:
                </p>
                <Button
                  variant="destructive"
                  onClick={() => {
                    // Clear all storage that might cause redirection loops
                    localStorage.clear();
                    sessionStorage.clear();
                    
                    // Force a redirect to discover
                    setTimeout(() => {
                      console.log("Emergency redirect to /discover");
                      window.location.href = "/discover";
                    }, 100);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Emergency Reset
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  This will clear all cached data and redirect you to the discover page.
                </p>
              </div>
            )}
          </div>
          <div className="mt-6 text-sm text-gray-500">
            <p>If you continue to experience issues, try:</p>
            <ul className="list-disc list-inside mt-2">
              <li>Signing out and back in</li>
              <li>Checking your internet connection</li>
              <li>Contacting support at help@lokaa.com</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

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
              <div className="h-10 w-10 bg-[#26A69A] rounded-lg flex items-center justify-center text-white font-bold mr-3 shadow-sm">
                <span>{space?.name?.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex flex-col justify-center">
                <div className="flex items-center">
                  <SpaceSwitcher 
                    currentSpaceSubdomain={subdomain || ''} 
                    currentSpaceName={space?.name}
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
            <div className="flex items-center space-x-6">
              {/* Messages */}
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="text-[#78909C] hover:text-[#26A69A] transition-colors"
              >
                <MessageSquare className="h-5 w-5" />
              </motion.button>
              
              {/* Notifications */}
              <div className="relative">
                <div className="h-5 w-5 bg-[#FF6F61] rounded-full flex items-center justify-center text-white text-xs absolute -top-1.5 -right-1.5 font-medium shadow-sm">
                  1
                </div>
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-[#78909C] hover:text-[#26A69A] transition-colors"
                >
                  <Bell className="h-5 w-5" />
                </motion.button>
              </div>
              
              {/* Profile */}
              <div className="profile-dropdown-container relative">
                <div className="flex items-center">
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="h-9 w-9 rounded-full overflow-hidden border-2 border-[#26A69A] relative cursor-pointer bg-[#26A69A] shadow-sm"
                    onClick={toggleProfileDropdown}
                  >
                    {user?.user_metadata?.avatar_url ? (
                      // Show user avatar if available
                      <img 
                        src={user.user_metadata.avatar_url} 
                        alt="Profile" 
                        className="h-full w-full object-cover rounded-full"
                      />
                    ) : (
                      // Show first letter as fallback
                      <div className="bg-[#26A69A] h-full w-full flex items-center justify-center text-white font-medium">
                        {user?.email?.charAt(0).toUpperCase() || "U"}
                      </div>
                    )}
                  </motion.div>
                </div>
                
                {/* Profile Dropdown Menu */}
                {profileDropdownOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg z-50 overflow-hidden border border-[#E0F2F1]"
                  >
                    <div className="py-3 px-4 border-b border-[#E0F2F1] text-sm text-ellipsis overflow-hidden text-[#37474F]">
                      {user?.email || "francischukwuma706@gmail.com"}
                    </div>
                    
                    <div className="py-1">
                      <motion.button 
                        whileHover={{ backgroundColor: "#F5FAFA" }}
                        className="block w-full text-left px-4 py-3 text-sm text-[#37474F] transition-colors"
                      >
                        Profile
                      </motion.button>
                      <motion.button 
                        whileHover={{ backgroundColor: "#F5FAFA" }}
                        className="block w-full text-left px-4 py-3 text-sm text-[#37474F] transition-colors"
                      >
                        Settings
                      </motion.button>
                      <motion.button 
                        whileHover={{ backgroundColor: "#F5FAFA" }}
                        className="block w-full text-left px-4 py-3 text-sm text-[#37474F] transition-colors"
                      >
                        Affiliates
                      </motion.button>
                    </div>
                    
                    <div className="border-t border-[#E0F2F1]">
                      <motion.button 
                        whileHover={{ backgroundColor: "#F5FAFA" }}
                        className="block w-full text-left px-4 py-3 text-sm text-[#78909C] transition-colors"
                      >
                        Help center
                      </motion.button>
                    </div>

                    <div className="border-t border-[#E0F2F1]">
                      <motion.button 
                        whileHover={{ backgroundColor: "#F5FAFA" }}
                        className="block w-full text-left px-4 py-3 text-sm text-[#78909C] transition-colors"
                        onClick={() => navigate("/create-space")}
                      >
                        Create a space
                      </motion.button>
                      <motion.button 
                        whileHover={{ backgroundColor: "#F5FAFA" }}
                        className="block w-full text-left px-4 py-3 text-sm text-[#78909C] transition-colors"
                        onClick={() => navigate("/discover")}
                      >
                        Discover spaces
                      </motion.button>
                    </div>

                    <div className="border-t border-[#E0F2F1]">
                      <motion.button 
                        whileHover={{ backgroundColor: "#F5FAFA" }}
                        className="block w-full text-left px-4 py-3 text-sm text-[#78909C] transition-colors"
                        onClick={handleSignOut}
                      >
                        Log out
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Space Navigation with updated design */}
        <nav className="bg-white border-b sticky top-16 z-40">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex overflow-x-auto">
              {renderTabButton("community", <MessageSquare className="h-4 w-4" />, "Feed")}
              {renderTabButton("calendar", <Calendar className="h-4 w-4" />, "Calendar")}
              {renderTabButton("members", <Users className="h-4 w-4" />, "Members")}
              {renderTabButton("leaderboards", <Trophy className="h-4 w-4" />, "Leaderboards")}
              {renderTabButton("about", <BookOpen className="h-4 w-4" />, "About")}
            </div>
          </div>
        </nav>
          
        {/* Main Content */}
        <main className="flex-grow py-6">
          <div className="max-w-6xl mx-auto px-4">
          {activeTab === "about" ? (
            <AboutTab space={space} />
          ) : activeTab === "calendar" ? (
            <CalendarTab space={space} />
          ) : activeTab === "members" ? (
            <MembersTab space={space} />
          ) : activeTab === "leaderboards" ? (
            <LeaderboardsTab space={space} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Content Area */}
              <div className="md:col-span-2">
                <FeedTab space={space} user={user} />
              </div>
              
              {/* Right Sidebar */}
              <div className="space-y-4">
                {/* Cover Photo/Space Info - Adjusted layout */}
                <motion.div 
                  whileHover={{ boxShadow: "0 6px 12px rgba(0, 0, 0, 0.15)" }}
                  className="bg-white rounded-xl overflow-hidden shadow-[0_4px_6px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.08)] border border-[#E0F2F1] transition-all duration-300"
                >
                  {/* Cover Image Area */}
                  <div className="h-28 bg-[#F5FAFA] flex items-center justify-center relative">
                    {space?.cover_image ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="absolute inset-0 w-full h-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${space.cover_image || '/default-space-cover.jpg'})` }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-[#26A69A]">
                        <Upload className="h-5 w-5 mb-1" />
                        <span className="text-xs font-medium">Upload cover photo</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Space Info Content */}
                  <div className="p-4">
                    <h2 className="text-lg font-semibold text-[#37474F] mb-1">{space?.name}</h2>
                    {/* Display Subdomain URL */}
                    <p className="text-xs text-[#78909C] mb-2">lokaa.com/{space?.subdomain || 'your-subdomain'}</p>
                    {/* Description */}
                    <p className="text-sm text-[#37474F] mb-3">
                      {space?.description || `Add your space description here by clicking the "Settings" button.`}
                    </p>
                    {/* Privacy Indicator */}
                    <div className="flex items-center text-[#78909C]">
                      {space?.is_private ? (
                        <>
                          <Lock className="h-3.5 w-3.5 mr-1" />
                          <span className="text-xs">Private space</span>
                        </>
                      ) : (
                        <>
                          <Globe className="h-3.5 w-3.5 mr-1" />
                          <span className="text-xs">Public space</span>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
                
                {/* Space Stats */}
                <motion.div 
                  whileHover={{ boxShadow: "0 6px 12px rgba(0, 0, 0, 0.15)" }}
                  className="bg-gradient-to-br from-[#E0F2F1] to-[#B2DFDB] rounded-xl p-4 shadow-[0_4px_6px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-300"
                >
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-white/70 backdrop-blur-sm rounded-lg p-2">
                      <div className="text-xl font-bold text-[#26A69A]">1</div>
                      <div className="text-sm text-[#37474F]">Members</div>
                    </div>
                    <div className="bg-white/70 backdrop-blur-sm rounded-lg p-2">
                      <div className="text-xl font-bold text-[#26A69A]">0</div>
                      <div className="text-sm text-[#37474F]">Online</div>
                    </div>
                    <div className="bg-white/70 backdrop-blur-sm rounded-lg p-2">
                      <div className="text-xl font-bold text-[#26A69A]">1</div>
                      <div className="text-sm text-[#37474F]">Admins</div>
                    </div>
                  </div>
                </motion.div>
                
                {/* Settings Button - Opens settings modal */}
                {isOwner && space ? (
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button 
                      className="w-full py-2.5 bg-[#26A69A] hover:bg-[#FF6F61] rounded-xl flex items-center justify-center font-medium text-white transition-colors shadow-[0_4px_6px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.08)]"
                      onClick={() => openSpaceSettingsModal(space.id, space.subdomain)}
                      disabled={loadingSettings}
                    >
                      {loadingSettings ? 
                         <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : 
                         <Settings className="h-4 w-4 mr-2" />
                      }
                      SETTINGS
                    </Button>
                  </motion.div>
                ) : (
                  // Optionally render a disabled button or nothing if not the owner
                  <Button 
                    className="w-full py-2.5 bg-gray-100 rounded-lg flex items-center justify-center font-medium text-gray-500 text-sm border border-gray-200 cursor-not-allowed opacity-60"
                    disabled
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    SETTINGS
                  </Button>
                )}
                
                {/* Powered By */}
                <div className="text-center text-[#78909C] text-xs py-2">
                  powered by <span className="font-semibold text-[#37474F]">Lokaa</span>
                </div>
              </div>
            </div>
          )}
          </div>
        </main>
        
        {/* Render the SpaceSettingsModal - It will now use the store */}
        <SpaceSettingsModal />
        
        {/* Creation Success Notification */}
        {notificationShown && (
          <div className="fixed bottom-4 right-4 w-auto bg-gray-900 text-white px-5 py-3 rounded-lg shadow-lg flex items-center justify-between">
            <div className="text-sm mr-4">Group was created</div>
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