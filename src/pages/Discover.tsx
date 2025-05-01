import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Bell, MessageSquare, ChevronDown, User, Plus, Compass, LogOut, Settings, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SpaceCard } from "@/components/spaces/SpaceCard";
import { DiscoverSpaceCard } from "@/components/discover/DiscoverSpaceCard";
import { Space } from "@/types/space";
import StandaloneLoginModal from "@/components/auth/StandaloneLoginModal";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import React from "react";
import { createRoot } from "react-dom/client";
import { Button } from "@/components/ui/button";
import LoadingIndicator from "@/components/LoadingIndicator";
import authDebug from '@/utils/authDebug';
import { prepareSpaceNavigation } from '@/utils/fixSpacesAccess';
import { motion, AnimatePresence } from "framer-motion";

// Categories for the discovery section - refined selection to match Skool layout
const categories = [
  { id: 'all', label: 'All', icon: '🌟' },
  { id: 'hobbies', label: 'Hobbies', icon: '🎯' },
  { id: 'music', label: 'Music', icon: '🎵' },
  { id: 'money', label: 'Money', icon: '💰' },
  { id: 'spirituality', label: 'Spirituality', icon: '🙏' },
  { id: 'tech', label: 'Tech', icon: '💻' },
  { id: 'health', label: 'Health', icon: '🏋️' },
  { id: 'sports', label: 'Sports', icon: '⚽' },
  { id: 'self-improvement', label: 'Self-improvement', icon: '📚' },
  { id: 'relationships', label: 'Relationships', icon: '❤️' },
  { id: 'global', label: 'Global', icon: '🌍' },
  { id: 'personal-dev', label: 'Personal development', icon: '📈' },
];

// Interface for database space objects
interface DatabaseSpace {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  subdomain: string;
  cover_image: string;
  primary_color: string;
  created_at: string;
  updated_at: string;
  pricing_type: 'free' | 'paid';
  price_per_month: number | null;
  member_count?: number;
  post_count?: number;
  instructor?: string;
  // Additional fields for our frontend
  ranking?: number;
  tags?: string[];
}

// Improved login modal function using the Dialog component from UI library
const showDirectLoginModal = (e: React.MouseEvent, callback?: () => void) => {
  e.stopPropagation();
  e.preventDefault();
  
  // Create a container div for the dialog
  const modalContainer = document.createElement('div');
  modalContainer.id = 'login-modal-container';
  document.body.appendChild(modalContainer);
  
  // Create a root for React to render into
  const root = createRoot(modalContainer);
  
  // Function to close the modal
  const closeModal = () => {
    root.unmount();
    document.body.removeChild(modalContainer);
    if (callback) callback();
  };
  
  // Component for the login dialog
  const LoginDialog = () => {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [isOpen, setIsOpen] = React.useState(true);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    
    const handleClose = () => {
      setIsOpen(false);
      setTimeout(closeModal, 300); // Allow animation to complete
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError(null);
      
      try {
        // Store the redirect path before attempting login
        const redirectPath = sessionStorage.getItem('redirect_after_login') || '/discover';
        console.log('Login modal: Using redirect path:', redirectPath);
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }
        
        // If sign in successful
        if (data) {
          handleClose();
          // Let the auth context handle the redirect based on sessionStorage
        }
      } catch (err) {
        setError('An unexpected error occurred');
        setLoading(false);
      }
    };
    
    // Close on escape key
    React.useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') handleClose();
      };
      
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
    
    // Focus email input on mount
    React.useEffect(() => {
      const timer = setTimeout(() => {
        const emailInput = document.getElementById('email-input');
        if (emailInput) emailInput.focus();
      }, 100);
      
      return () => clearTimeout(timer);
    }, []);
    
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign In</DialogTitle>
            <DialogDescription>
              Sign in to your account to continue
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="email-input" className="block text-sm font-medium">
                Email
              </label>
              <input
                id="email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password-input" className="block text-sm font-medium">
                Password
              </label>
              <input
                id="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password"
                required
              />
            </div>
            
            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}
            
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  };
  
  // Render the dialog
  root.render(<LoginDialog />);
};

// Expose the function globally for use on any page
// @ts-ignore - Add the function to the window object
window.showDirectLoginModal = showDirectLoginModal;

// Function to handle direct redirection to Create Space
function handleCreateSpaceRedirect() {
  console.log("handleCreateSpaceRedirect called"); // Log start
  // First check if user is authenticated
  const checkAndRedirect = async () => {
    try {
      console.log("Checking auth session..."); // Log before check
      const { data } = await supabase.auth.getSession();
      console.log("Auth session check complete. Session:", data.session ? "Exists" : "Null"); // Log result
      
      if (data.session) {
        // User is authenticated, redirect to create page using React Router
        console.log("User authenticated, navigating to /create-space"); // Log redirect
        // Instead of window.location.href, use navigate from parent component
        // This will be passed when the function is called
        return true; // Signal that navigation should proceed
      } else {
        // User is not authenticated, show login modal
        console.log("User not authenticated, showing direct login modal"); // Log modal show
        // Create a synthetic event rather than a raw MouseEvent
        const syntheticEvent = { preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent<Element, MouseEvent>;
        showDirectLoginModal(syntheticEvent);
        
        // Store redirect location
        console.log("Storing redirect location: /create-space"); // Log storage
        sessionStorage.setItem('redirect_after_login', '/create-space');
        return false;
      }
    } catch (error) {
      console.error('Error checking auth:', error); // Log error
      // On error, show login modal
      console.log("Error during auth check, showing direct login modal as fallback"); // Log error fallback
      const syntheticEvent = { preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent<Element, MouseEvent>;
      showDirectLoginModal(syntheticEvent);
      return false;
    }
  };
  
  return checkAndRedirect();
}

export default function Discover() {
  const { user, signOut, signIn, routingInProgress } = useAuth();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSpaces, setFilteredSpaces] = useState<Space[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const location = useLocation();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const navigate = useNavigate();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Helper function for robust fetch with retries
  const createFetch = async (fetchFunction: () => Promise<any>, retries = 2, delay = 1000) => {
    try {
      return await fetchFunction();
    } catch (error) {
      if (retries <= 0) throw error;
      
      console.log(`Fetch attempt failed, retrying in ${delay}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
      return createFetch(fetchFunction, retries - 1, delay * 1.5);
    }
  };

  // Add this useEffect to initialize authDebug
  useEffect(() => {
    // Initialize the authDebug utility with supabase client
    authDebug.init(supabase);
    
    // Make it available globally from console
    if (typeof window !== 'undefined') {
      (window as any).authDebug = authDebug;
      console.log('Auth debugging tools available in console. Try: window.authDebug.checkSession()');
    }
    
    return () => {
      // Clean up on unmount
      if (typeof window !== 'undefined') {
        delete (window as any).authDebug;
      }
    };
  }, []);

  // Immediate redirect for authenticated users
  useEffect(() => {
    if (!user || routingInProgress) {
      console.log('🔄 Discover page - skipping redirect:', 
        !user ? 'user not logged in' : 'routing in progress');
      return;
    }
    
    console.log('🔄 Discover page - checking spaces for user:', user.id);
    
    // Only run once per component mount
    let isMounted = true;
    
    // Try to get spaces for the user
    const findUserSpaces = async () => {
      console.log('🔍 Discover page - searching for user spaces');
      
      try {
        // Use our enhanced utility for space redirection
        const { redirectToSpace } = await import('@/utils/spaceRedirect');
        
        if (isMounted) {
          // Apply a short timeout for more reliable behavior
          setTimeout(async () => {
            if (!isMounted) return;
            
            try {
              console.log('🔄 Discover page - attempting space redirection');
              
              // Use navigate for redirection
              const redirected = await redirectToSpace(navigate, true);
              
              if (isMounted) {
                if (redirected) {
                  console.log('✅ Discover page - user redirected to space');
                } else {
                  console.log('ℹ️ Discover page - no spaces found, staying on discover');
                }
              }
            } catch (error) {
              if (isMounted) {
                console.error('❌ Discover page - error during redirection:', error);
              }
            }
          }, 300);
        }
      } catch (error) {
        if (isMounted) {
          console.error('❌ Discover page - error importing redirectToSpace:', error);
        }
      }
    };
    
    findUserSpaces();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [user, routingInProgress, navigate]);

  // Close main dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: Event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch spaces from Supabase
  useEffect(() => {
    const fetchTimeoutId = setTimeout(() => {
      if (isLoading) {
        console.warn("Spaces fetch timeout reached - still loading after 15 seconds");
        setLoadError("Loading spaces is taking longer than expected. Please try again.");
        setIsLoading(false);
      }
    }, 15000); // 15-second timeout
    
    async function fetchSpaces() {
      try {
        setIsLoading(true);
        setLoadError(null);
        
        // Log current user for debugging
        console.log('Current user in Discover:', user?.id);
        
        // Attempt to fetch spaces from database with cache busting
        const timestamp = new Date().getTime();
        console.log('Fetching spaces with timestamp:', timestamp);
        
        let fetchedSpaces: DatabaseSpace[] = [];
        
        // First, try to fetch spaces via RPC with retry capability
        try {
          console.log('Trying to fetch spaces via RPC function');
          const { data: rpcData, error: rpcError } = await createFetch(async () => {
            return await supabase.rpc('get_public_spaces');
          });
          
          if (rpcError) {
            console.error('Error fetching spaces using RPC function:', rpcError);
            // Don't throw here, we'll try the fallback
          } else if (rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
            console.log('Successfully fetched spaces using RPC function:', rpcData.length);
            fetchedSpaces = rpcData;
          }
        } catch (rpcException) {
          console.error('Exception in RPC spaces fetch:', rpcException);
          // Continue to fallback
        }
        
        // If RPC didn't work, fall back to direct query
        if (fetchedSpaces.length === 0) {
          console.log('Falling back to direct query for spaces');
          
          try {
            const { data: queryData, error: queryError } = await createFetch(async () => {
              return await supabase
                .from('spaces')
                .select('*')
                .eq('is_private', false)
                .order('created_at', { ascending: false });
            });
              
            if (queryError) {
              console.error('Error in fallback query:', queryError);
              
              // No longer need the detailed RLS error handling since the policy is fixed
              throw queryError;
            }
            
            if (queryData && queryData.length > 0) {
              console.log('Successfully fetched spaces via fallback query:', queryData.length);
              fetchedSpaces = queryData;
            } else {
              console.log('No spaces found via fallback query, trying unrestricted query');
              
              // Final fallback - try without the privacy filter
              const { data: lastResortData, error: lastResortError } = await createFetch(async () => {
                return await supabase
                  .from('spaces')
                  .select('*')
                  .order('created_at', { ascending: false });
              });
                
              if (lastResortError) {
                console.error('Error in last resort query:', lastResortError);
                
                // No longer need the detailed RLS error handling since the policy is fixed
                throw lastResortError;
              }
              
              if (lastResortData && lastResortData.length > 0) {
                console.log('Successfully fetched spaces via last resort query:', lastResortData.length);
                fetchedSpaces = lastResortData;
              }
            }
          } catch (queryException) {
            console.error('Exception in fallback space query:', queryException);
            throw queryException;
          }
        }
        
        if (fetchedSpaces.length === 0) {
          console.log('No spaces found after all attempts');
          setSpaces([]);
          setFilteredSpaces([]);
          return;
        }
        
        // Process the spaces
        console.log('Processing fetched spaces:', fetchedSpaces.length);
        const processedSpaces = [];
        
        for (const space of fetchedSpaces) {
          try {
            // Skip invalid spaces
            if (!space || !space.id || !space.name) {
              console.warn('Skipping invalid space:', space);
              continue;
            }
            
            // Get member count (safely)
            let memberCount = space.member_count || 1;
            try {
              if (!space.member_count) {
                console.log(`Fetching member count for space ${space.id}`);
                const { data: memberData, error: memberError } = await supabase
                  .from('space_access')
                  .select('id', { count: 'exact' })
                  .eq('space_id', space.id)
                  .eq('is_active', true);
                  
                if (memberError) {
                  console.warn(`Error fetching member count for space ${space.id}:`, memberError);
                  // Use default value instead of failing
                } else {
                  memberCount = (memberData?.length || 0) + 1; // +1 for owner
                }
              }
            } catch (memberCountError) {
              console.warn(`Exception getting member count for space ${space.id}:`, memberCountError);
              // Continue with default value
            }
            
            // Build the extended space object
            const extendedSpace = {
              ...space,
              member_count: memberCount,
              post_count: 0, // TODO: implement this when we have posts
              ranking: Math.floor(Math.random() * 5) + 1,
              tags: generateTags(space),
            };
            
            processedSpaces.push(extendedSpace);
          } catch (spaceProcessError) {
            console.warn(`Error processing space ${space.id}:`, spaceProcessError);
            // Skip this space but continue processing others
          }
        }
        
        console.log('Final processed spaces count:', processedSpaces.length);
        setSpaces(processedSpaces);
        setFilteredSpaces(processedSpaces);
      } catch (error) {
        console.error('Error fetching spaces:', error);
        let errorMessage = 'Failed to load spaces. Please try again later.';
        
        // Provide more specific error messages based on error type
        if (error instanceof Error) {
          console.error('Error details:', error.message);
          
          if (error.message.includes('network')) {
            errorMessage = 'Network error. Please check your internet connection and try again.';
          } else if (error.message.includes('timeout')) {
            errorMessage = 'Request timed out. Server may be experiencing high load.';
          } else if (error.message.includes('permission') || error.message.includes('access')) {
            errorMessage = 'Permission error. You may not have access to view spaces.';
          }
        }
        
        setLoadError(errorMessage);
        // Log additional debug info
        console.debug('Debug info:', { 
          userPresent: !!user, 
          authState: !!user ? 'authenticated' : 'unauthenticated',
          timestamp: new Date().toISOString(),
          retryCount
        });
      } finally {
        setIsLoading(false);
        clearTimeout(fetchTimeoutId); // Clear the timeout when fetch completes
      }
    }

    fetchSpaces();
    
    return () => clearTimeout(fetchTimeoutId); // Cleanup on unmount
  }, [user?.id]); // Add user ID as dependency to refetch when user changes

  // Filter spaces when category or search query changes
  useEffect(() => {
    let filtered = [...spaces];
    
    // Filter by category if not 'all'
    if (activeCategory !== 'all') {
      filtered = filtered.filter(space => 
        space.tags?.some(tag => tag.toLowerCase() === activeCategory.toLowerCase())
      );
    }
    
    // Apply search filter if there's a query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(space => 
        space.name.toLowerCase().includes(query) || 
        space.description.toLowerCase().includes(query)
      );
    }
    
    setFilteredSpaces(filtered);
  }, [activeCategory, searchQuery, spaces]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled by the useEffect above
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      console.log('Discover: Starting sign out process');
      // Attempt to sign out using the auth context method
      await signOut();
      
      // Add Safari-specific fix
      // We'll add a safety timeout to force redirect if the auth context's redirect doesn't work
      console.log('Discover: Adding fallback redirect for Safari');
      setTimeout(() => {
        const currentPath = window.location.pathname;
        if (currentPath.includes('/discover')) {
          console.log('Discover: Still on discover page after signOut, forcing hard redirect');
          // Force a cache-busting redirect
          window.location.replace(`/?from=discover&t=${Date.now()}`);
        }
      }, 1000);
    } catch (error) {
      console.error('Discover: Sign out error:', error);
      // Force a hard redirect on error
      window.location.replace('/');
    }
  };

  const handleSpaceSelect = (space: Space, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    setSelectedSpace(space);
  };

  // Improved "Sign In" button handler
  const handleSignInClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Direct to login page instead of modal
    window.location.href = '/login';
  };

  const handleSignUpClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Direct to signup page
    window.location.href = '/signup';
  };

  // Improved "Launch your own space" handler
  const handleCreateSpace = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (user) {
      // If user is logged in, use React Router to navigate
      console.log("User logged in, navigating to create space");
      // Ensure we're using the route that exists in App.tsx
      navigate('/create-space', { replace: true });
    } else {
      // If not logged in, show login modal with redirect
      console.log("User not logged in, showing login modal with redirect");
      const syntheticEvent = { preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent<Element, MouseEvent>;
      showDirectLoginModal(syntheticEvent);
      sessionStorage.setItem('redirect_after_login', '/create-space');
    }
  };

  const handleRetry = () => {
    try {
      setRetryCount(prev => prev + 1);
      // Show a toast notification to inform the user
      toast({
        title: "Reloading page",
        description: "Refreshing data to resolve loading issues...",
        variant: "default"
      });
      // Log the retry attempt for analytics/debugging
      console.log(`Retrying Discover page load (attempt ${retryCount + 1})`);
      // Clear any existing errors
      setLoadError(null);
      // Add a small delay before reload for the toast to be visible
      setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      console.error("Error during retry attempt:", error);
      toast({
        title: "Retry failed",
        description: "Please try again or refresh the page manually",
        variant: "destructive"
      });
    }
  };

  // Prevent rendering while space routing is in progress
  if (routingInProgress) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50">
        <LoadingIndicator size="large" nonBlocking={false} />
        <p className="mt-4 text-gray-600">Loading your spaces...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Top navigation bar */}
      <header className="sticky top-0 bg-white border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 flex items-center justify-between h-16">
          {/* Lokaa logo with dropdown */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center cursor-pointer" onClick={() => setDropdownOpen(!dropdownOpen)}>
              <h1 className="text-2xl font-bold text-teal-600">Lokaa</h1>
              <ChevronDown size={16} className="ml-1 text-gray-400" />
            </div>
            
            {/* Dropdown menu */}
            {dropdownOpen && (
              <div
                ref={dropdownRef}
                className="fixed md:absolute top-14 md:top-12 left-0 md:left-auto right-0 md:right-auto md:w-48 bg-white rounded-lg shadow-lg py-1 md:py-2 z-20 border border-gray-200"
              >
                {user ? (
                  <>
                    <button 
                      onClick={() => navigate('/create-space', { replace: true })}
                      className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 flex items-center"
                    >
                      <Plus className="h-4 w-4 mr-2 text-gray-500" />
                      Create a space
                    </button>
                    
                    <Link 
                      to="/discover" 
                      className="block px-4 py-2 text-gray-800 hover:bg-gray-100 flex items-center"
                    >
                      <Compass className="h-4 w-4 mr-2 text-gray-500" />
                      Discover spaces
                    </Link>
                    
                    <hr className="my-1 border-gray-200" />
                    
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 flex items-center"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={handleSignInClick}
                      className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100"
                    >
                      Sign in
                    </button>
                    <button
                      onClick={handleSignUpClick}
                      className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100"
                    >
                      Sign up
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Right side buttons */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* Messages */}
                <button className="relative p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
                  <MessageSquare size={20} />
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">1</span>
                </button>
                
                {/* Notifications */}
                <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
                  <Bell size={20} />
                </button>
                
                {/* Profile dropdown */}
                <div className="relative" ref={profileDropdownRef}>
                  <button 
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-800 text-white"
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  >
                    {user?.email ? user.email.charAt(0).toUpperCase() : <User size={18} />}
                  </button>
                  
                  {/* Profile dropdown menu */}
                  {profileDropdownOpen && (
                    <div className="absolute top-full right-0 mt-1 w-64 bg-white rounded-md shadow-lg border border-gray-100 py-2 z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="font-medium text-gray-900">{user?.email || "User"}</p>
                        <p className="text-xs text-gray-500 mt-1">Free Plan</p>
                      </div>
                      
                      <div className="py-1">
                        <Link to="/profile" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                          <User size={16} className="mr-3 text-gray-500" />
                          Profile
                        </Link>
                        <Link to="/settings" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                          <Settings size={16} className="mr-3 text-gray-500" />
                          Settings
                        </Link>
                        <button 
                          onClick={() => navigate('/create-space', { replace: true })} 
                          className="flex items-center px-4 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-50"
                        >
                          <Plus size={16} className="mr-3 text-gray-500" />
                          Create a space
                        </button>
                      </div>
                      
                      <div className="border-t border-gray-100 pt-1 mt-1">
                        <button 
                          onClick={handleSignOut}
                          className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                        >
                          <LogOut size={16} className="mr-3" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex space-x-3">
                <Link 
                  to="/login" 
                  onClick={handleSignInClick}
                  className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 text-sm font-medium"
                >
                  Sign in
                </Link>
                <Link 
                  to="/signup" 
                  className="text-white bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-full font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero section styled to match Skool's layout */}
        <section className="relative pt-10 pb-6 bg-white">
          <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 text-center">
              Discover spaces
            </h1>
            
            {/* Search bar */}
            <div className="relative max-w-2xl mx-auto mb-8">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search for anything"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                </div>
              </form>
            </div>

            {/* CTA Button centered */}
            <div className="text-center">
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  if (user) {
                    navigate('/create-space', { replace: true });
                  } else {
                    const syntheticEvent = { preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent<Element, MouseEvent>;
                    showDirectLoginModal(syntheticEvent);
                    sessionStorage.setItem('redirect_after_login', '/create-space');
                  }
                }}
                className="inline-flex items-center px-6 py-2.5 bg-teal-600 text-white font-medium rounded-full hover:bg-teal-700 transition-colors"
              >
                Create a space
              </Button>
            </div>
          </div>
        </section>

        {/* Categories section */}
        <section className="bg-white border-b border-gray-200 sticky top-16 z-10">
          <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 relative">
            {/* Left fade indicator for scroll */}
            <div className="absolute left-6 md:left-10 lg:left-16 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none hidden md:block"></div>
            
            {/* Right fade indicator for scroll */}
            <div className="absolute right-6 md:right-10 lg:right-16 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>
            
            {/* Scrollable categories */}
            <div className="overflow-x-auto hide-scrollbar py-3">
              <div className="flex items-center space-x-3 min-w-max">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`px-4 py-2 rounded-full text-sm font-medium flex items-center transition-all ${
                    activeCategory === 'all'
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="mr-1">🌟</span> All
                </button>
                {categories.filter(cat => cat.id !== 'all').map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium flex items-center transition-all whitespace-nowrap ${
                      activeCategory === category.id
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    >
                    <span className="mr-1">{category.icon}</span> {category.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
        </section>

        {/* Space cards section */}
        <section className="py-8 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16">
            {/* Display loading state with AnimatePresence for unmounting */}
            <AnimatePresence>
            {isLoading ? (
                <motion.div 
                  className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-100"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                <div className="inline-block animate-spin w-10 h-10 border-4 border-gray-300 border-t-teal-600 rounded-full mb-4"></div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Loading spaces...</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  We're getting the latest spaces for you. This should only take a moment.
                </p>
                {/* Show a loading timeout message after 15 seconds */}
                {retryCount > 0 && (
                  <div className="mt-6 text-amber-600 max-w-md mx-auto">
                    <p className="font-medium">Taking longer than expected...</p>
                    <p className="text-sm mt-1">Please wait while we try to connect.</p>
                  </div>
                )}
                </motion.div>
              ) : null}
            </AnimatePresence>
            
            {!isLoading && loadError ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-lg shadow-sm border border-red-100">
                <div className="text-red-500 mb-2 text-5xl">
                  <X className="h-12 w-12 mx-auto mb-2" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-800">Error Loading Spaces</h3>
                <div className="text-red-600 mb-4 text-center">{loadError}</div>
                <p className="text-gray-600 mb-6 text-center max-w-lg">
                  We're having trouble loading the latest spaces. This could be due to network connectivity 
                  issues or temporary server problems.
                </p>
                <div className="flex gap-4">
                  <button 
                    onClick={handleRetry}
                    className="px-5 py-2.5 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors flex items-center"
                  >
                    <Loader2 className={`${retryCount > 0 ? 'animate-spin mr-2 h-4 w-4' : 'hidden'}`} />
                    {retryCount > 0 ? 'Trying Again...' : 'Try Again'}
                  </button>
                  <a 
                    href="/discover"
                    className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Refresh Page
                  </a>
                </div>
              </div>
            ) : !isLoading && filteredSpaces.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg shadow-sm">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Compass className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-800">No spaces found</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  {searchQuery 
                    ? `No spaces match your search for "${searchQuery}". Try a different search term or browse all spaces.`
                    : activeCategory !== 'all'
                      ? `No spaces found in the "${categories.find(c => c.id === activeCategory)?.label || activeCategory}" category. Try another category.`
                      : 'No spaces found. Be the first to create a space!'}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')} 
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      Clear Search
                    </button>
                  )}
                  {activeCategory !== 'all' && (
                    <button 
                      onClick={() => setActiveCategory('all')} 
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      View All Categories
                    </button>
                  )}
                  <Link 
                    to="/create-space"
                    className="px-4 py-2 bg-teal-600 text-white rounded-full hover:bg-teal-700 transition-colors"
                  >
                    Create a new space
                  </Link>
                </div>
              </div>
            ) : (
              /* Space cards grid - 3 columns on desktop with more horizontal spacing */
              <div className="flex justify-center">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-8 justify-items-center">
                  {filteredSpaces.map((space) => (
                    <div key={space.id} className="w-[337px]">
                      <DiscoverSpaceCard key={space.id} space={space} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

// Helper function to generate tags based on space name
function generateTags(space: any): string[] {
  // Get tags that match our actual category IDs
  const name = space.name?.toLowerCase() || '';
  const description = space.description?.toLowerCase() || '';
  
  // Assign specific tags based on space name/content
  if (name.includes('calligraphy') || name.includes('art') || name.includes('design') || 
      description.includes('calligraphy') || description.includes('art') || description.includes('design')) {
    return ['hobbies', 'self-improvement'];
  } else if (name.includes('pickleball') || name.includes('sport') || name.includes('fitness') || 
             description.includes('sport') || description.includes('fitness') || description.includes('workout')) {
    return ['sports', 'health'];
  } else if (name.includes('founder') || name.includes('business') || name.includes('financial') || 
             name.includes('crypto') || name.includes('investing') || 
             description.includes('founder') || description.includes('business') || 
             description.includes('financial') || description.includes('crypto') || 
             description.includes('investing')) {
    return ['money', 'personal-dev'];
  } else if (name.includes('marketing') || name.includes('tech') || name.includes('coding') || 
             description.includes('marketing') || description.includes('tech') || 
             description.includes('coding') || description.includes('programming')) {
    return ['tech', 'money'];
  } else if (name.includes('hormone') || name.includes('health') || name.includes('wellness') || 
             description.includes('health') || description.includes('wellness') || 
             description.includes('nutrition')) {
    return ['health', 'self-improvement'];
  } else if (name.includes('photo') || name.includes('photography') || 
             description.includes('photo') || description.includes('photography')) {
    return ['hobbies', 'tech'];
  } else if (name.includes('automation') || description.includes('automation')) {
    return ['tech', 'self-improvement'];
  } else if (name.includes('music') || description.includes('music') || 
             name.includes('instrument') || description.includes('instrument')) {
    return ['music', 'hobbies'];
  } else if (name.includes('relationship') || description.includes('relationship') || 
             name.includes('dating') || description.includes('dating')) {
    return ['relationships', 'self-improvement'];
  } else if (name.includes('spiritual') || description.includes('spiritual') || 
             name.includes('meditation') || description.includes('meditation')) {
    return ['spirituality', 'self-improvement'];
  }
  
  // Default tags for unknown spaces - changed from 'global' to more specific tags
  // that will help improve discoverability
  return ['personal-dev', 'self-improvement'];
} 