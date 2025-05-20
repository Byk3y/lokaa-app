import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Bell, MessageSquare, ChevronDown, User, Plus, Compass, LogOut, Settings, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileImage } from "@/contexts/ProfileImageContext";
import { SpaceCard } from "@/components/spaces/SpaceCard";
import { DiscoverSpaceCard } from "@/components/discover/DiscoverSpaceCard";
import { Space } from "@/types/space";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import React from "react";
import { createRoot } from "react-dom/client";
import { Button } from "@/components/ui/button";
import LoadingIndicator from "@/components/LoadingIndicator";
import authDebug from '@/utils/authDebug';
import { motion, AnimatePresence } from "framer-motion";
import MinimalUpDownChevronIcon from "@/components/MinimalUpDownChevronIcon";
import ModernDropdownTrigger from "@/components/ModernDropdownTrigger";
import ProfileDropdown from "@/components/common/ProfileDropdown";
import SpaceSwitcher from "@/components/spaces/SpaceSwitcher";
import DiscoverSpaceCardSkeleton from "@/components/discover/DiscoverSpaceCardSkeleton";
import "../pages/UserSettingsStyles.css";

declare global {
  interface Window {
    authDebug?: typeof authDebug;
  }
}

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
  tags?: string[];
}

const showDirectLoginModal = (e: React.MouseEvent, callback?: () => void) => {
  e.stopPropagation();
  e.preventDefault();
  
  const modalContainer = document.createElement('div');
  modalContainer.id = 'login-modal-container';
  document.body.appendChild(modalContainer);
  
  const root = createRoot(modalContainer);
  
  const closeModal = () => {
    root.unmount();
    if (document.body.contains(modalContainer)) {
      document.body.removeChild(modalContainer);
    }
    if (callback) callback();
  };
  
  const LoginDialog = () => {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [isOpen, setIsOpen] = React.useState(true);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    
    const handleClose = () => {
      setIsOpen(false);
      setTimeout(closeModal, 300); 
    };

    const handleSubmit = async (event: React.FormEvent) => {
      event.preventDefault();
      setLoading(true);
      setError(null);
      try {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(signInError.message);
          setLoading(false);
          return;
        }
        if (data.session) {
          handleClose();
        }
      } catch (err) {
        setError('An unexpected error occurred. Please try again.');
        setLoading(false);
      }
    };
    
    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') handleClose(); };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
    
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
          <DialogHeader><DialogTitle>Sign In</DialogTitle><DialogDescription>Sign in to your account to continue</DialogDescription></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="email-input" className="block text-sm font-medium text-gray-700">Email</label>
              <input id="email-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" placeholder="you@example.com" required />
            </div>
            <div className="space-y-2">
              <label htmlFor="password-input" className="block text-sm font-medium text-gray-700">Password</label>
              <input id="password-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" placeholder="••••••••" required />
            </div>
            {error && (<div className="text-red-600 text-sm font-medium">{error}</div>)}
            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sign In
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  };
  root.render(<LoginDialog />); 
};

function UserProfileCard({ user, isCurrentUser }) {
  return (
    <div className="max-w-sm mx-auto bg-white rounded-2xl shadow-lg border border-gray-100 p-8 flex flex-col items-center">
      <div className="w-32 h-32 rounded-full overflow-hidden bg-black flex items-center justify-center mb-6">
        {user?.user_metadata?.avatar_url ? (
          <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl text-white font-bold">
            {user?.user_metadata?.avatarInitials || user?.email?.charAt(0).toUpperCase() || "A"}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{user?.user_metadata?.fullName || user?.user_metadata?.firstName + ' ' + user?.user_metadata?.lastName || user?.email}</div>
      <div className="text-gray-500 text-md mb-2">@{user?.user_metadata?.username || user?.email?.split("@")[0]}</div>
      <div className="text-gray-700 mb-4 text-center">{user?.user_metadata?.bio || "Here to learn"}</div>
      <div className="flex items-center gap-2 mb-4">
        <span className="flex items-center text-green-500 text-sm font-medium"><span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>Online now</span>
        <span className="text-gray-400">•</span>
        <span className="flex items-center text-gray-500 text-sm"><svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>Joined Dec 2, 2024</span>
      </div>
      <div className="flex justify-between w-full mb-6">
        <div className="flex flex-col items-center"><span className="font-bold text-lg">0</span><span className="text-xs text-gray-500">Contributions</span></div>
        <div className="flex flex-col items-center"><span className="font-bold text-lg">0</span><span className="text-xs text-gray-500">Followers</span></div>
        <div className="flex flex-col items-center"><span className="font-bold text-lg">4</span><span className="text-xs text-gray-500">Following</span></div>
      </div>
      {isCurrentUser && <button className="w-full bg-gray-100 text-gray-900 font-semibold rounded-lg py-2 mt-2 hover:bg-gray-200 transition">EDIT PROFILE</button>}
    </div>
  );
}

export default function Discover() {
  const { user, signOut, routingInProgress } = useAuth();
  const { profileImageUrl, refreshProfileImage } = useProfileImage();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSpaces, setFilteredSpaces] = useState<Space[]>([]);
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
  const [spaceSearchQuery, setSpaceSearchQuery] = useState("");

  const getUserInitials = () => {
    if (!user) return "A";
    
    if (user.user_metadata?.firstName && user.user_metadata?.lastName) {
      return `${user.user_metadata.firstName.charAt(0)}${user.user_metadata.lastName.charAt(0)}`;
    }
    
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    
    return "A";
  };

  const createFetch = useCallback(async function createFetch<T>(fetchFunction: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
    try {
      return await fetchFunction();
    } catch (error) {
      if (retries <= 0) throw error;
      
      console.log(`Fetch attempt failed, retrying in ${delay}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
      return createFetch(fetchFunction, retries - 1, delay * 1.5);
    }
  }, []);

  useEffect(() => {
    authDebug.init(supabase);
    if (typeof window !== 'undefined') {
      window.authDebug = authDebug;
      console.log('Auth debugging tools available: window.authDebug.checkSession()');
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete window.authDebug;
      }
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: Event) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchTimeoutId = setTimeout(() => {
      if (isLoading) {
        console.warn("Spaces fetch timeout reached - still loading after 15 seconds");
        setLoadError("Loading spaces is taking longer than expected. Please try again.");
        setIsLoading(false);
      }
    }, 15000);
    
    async function fetchSpaces() {
      try {
        setIsLoading(true);
        setLoadError(null);
        
        console.log('Current user in Discover:', user?.id);
        
        const timestamp = new Date().getTime();
        console.log('Fetching spaces with timestamp:', timestamp);
        
        let fetchedSpaces: DatabaseSpace[] = [];
        
        try {
          console.log('Trying to fetch spaces via RPC function');
          const { data: rpcData, error: rpcError } = await createFetch(async () => {
            return await supabase.rpc('get_public_spaces');
          });
          
          if (rpcError) {
            console.error('Error fetching spaces using RPC function:', rpcError);
          } else if (rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
            console.log('Successfully fetched spaces using RPC function:', rpcData.length);
            fetchedSpaces = rpcData;
          }
        } catch (rpcException) {
          console.error('Exception in RPC spaces fetch:', rpcException);
        }
        
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
              
              throw queryError;
            }
            
            if (queryData && queryData.length > 0) {
              console.log('Successfully fetched spaces via fallback query:', queryData.length);
              fetchedSpaces = queryData;
            } else {
              console.log('No spaces found via fallback query, trying unrestricted query');
              
              const { data: lastResortData, error: lastResortError } = await createFetch(async () => {
                return await supabase
                  .from('spaces')
                  .select('*')
                  .order('created_at', { ascending: false });
              });
                
              if (lastResortError) {
                console.error('Error in last resort query:', lastResortError);
                
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
        
        console.log('Processing fetched spaces:', fetchedSpaces.length);
        const processedSpaces = [];
        
        for (const space of fetchedSpaces) {
          try {
            if (!space || !space.id || !space.name) {
              console.warn('Skipping invalid space:', space);
              continue;
            }
            
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
                } else {
                  memberCount = (memberData?.length || 0) + 1;
                }
              }
            } catch (memberCountError) {
              console.warn(`Exception getting member count for space ${space.id}:`, memberCountError);
            }
            
            const extendedSpace = {
              ...space,
              member_count: memberCount,
              post_count: 0,
              tags: generateTags(space),
            };
            
            processedSpaces.push(extendedSpace);
          } catch (spaceProcessError) {
            console.warn(`Error processing space ${space.id}:`, spaceProcessError);
          }
        }
        
        console.log('Final processed spaces count:', processedSpaces.length);
        setSpaces(processedSpaces);
        setFilteredSpaces(processedSpaces);
      } catch (error) {
        console.error('Error fetching spaces:', error);
        let errorMessage = 'Failed to load spaces. Please try again later.';
        
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
        console.debug('Debug info:', { 
          userPresent: !!user, 
          authState: user ? 'authenticated' : 'unauthenticated',
          timestamp: new Date().toISOString(),
          retryCount
        });
      } finally {
        setIsLoading(false);
        clearTimeout(fetchTimeoutId);
      }
    }

    fetchSpaces();
    
    return () => clearTimeout(fetchTimeoutId);
  }, [user?.id, createFetch, retryCount]);

  useEffect(() => {
    let filtered = [...spaces];
    
    if (activeCategory !== 'all') {
      filtered = filtered.filter(space => 
        space.tags?.some(tag => tag.toLowerCase() === activeCategory.toLowerCase())
      );
    }
    
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
  };

  const handleSignOut = async () => {
    try {
      console.log('Discover: Starting sign out process');
      await signOut();
      
      console.log('Discover: Adding fallback redirect for Safari');
      setTimeout(() => {
        const currentPath = window.location.pathname;
        if (currentPath.includes('/discover')) {
          console.log('Discover: Still on discover page after signOut, forcing hard redirect');
          window.location.replace(`/?from=discover&t=${Date.now()}`);
        }
      }, 1000);
    } catch (error) {
      console.error('Discover: Sign out error:', error);
      window.location.replace('/');
    }
  };

  const handleSpaceSelect = (space: Space, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    setSelectedSpace(space);
  };

  const handleSignInClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    sessionStorage.setItem('redirect_after_login', location.pathname + location.search);
    navigate('/login');
  };

  const handleSignUpClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    sessionStorage.setItem('redirect_after_login', location.pathname + location.search);
    navigate('/signup');
  };

  const handleCreateSpace = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (user) {
      console.log("User logged in, navigating to create space");
      navigate('/create-space', { replace: true });
    } else {
      console.log("User not logged in, showing login modal with redirect");
      const syntheticEvent = { preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent<Element, MouseEvent>;
      showDirectLoginModal(syntheticEvent);
      sessionStorage.setItem('redirect_after_login', '/create-space');
    }
  };

  const handleRetry = () => {
    try {
      setRetryCount(prev => prev + 1);
      toast({
        title: "Reloading page",
        description: "Refreshing data to resolve loading issues...",
        variant: "default"
      });
      console.log(`Retrying Discover page load (attempt ${retryCount + 1})`);
      setLoadError(null);
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
      <header className="sticky top-0 bg-white border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-4xl font-bold leading-none hidden md:block" style={{ color: '#00A389' }}>Lokaa</h1>
            <div className="ml-2">
              <SpaceSwitcher 
                userId={user?.id || ""}
                currentSpaceName="Discover"
                currentSpaceSubdomain="_discover_"
                hideTriggerLabel={true}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <button className="relative p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
                  <MessageSquare size={20} />
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">1</span>
                </button>
                
                <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
                  <Bell size={20} />
                </button>
                
                <div className="relative">
                  <ProfileDropdown user={user} variant="animation" size="md" className="ml-4" />
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
        <section className="relative pt-10 pb-6 bg-white">
          <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 text-center">
              Discover spaces
            </h1>
            
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

        <section className="bg-white border-b border-gray-200 sticky top-16 z-10">
          <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 relative">
            <div className="absolute left-6 md:left-10 lg:left-16 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none hidden md:block"></div>
            
            <div className="absolute right-6 md:right-10 lg:right-16 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>
            
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

        <section className="py-8 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16">
            {isLoading ? (
              <div className="flex justify-center">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-8 justify-items-center">
                  {Array(6).fill(0).map((_, index) => (
                    <div key={`skeleton-${index}`} className="w-[337px]">
                      <DiscoverSpaceCardSkeleton />
                    </div>
                  ))}
                </div>
              </div>
            ) : loadError ? (
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
            ) : filteredSpaces.length === 0 ? (
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

function generateTags(space: DatabaseSpace): string[] {
  const tags: string[] = [];
  if (!space) return tags;

  const name = space.name?.toLowerCase() || '';
  const description = space.description?.toLowerCase() || '';
  
  if (name.includes('calligraphy') || name.includes('art') || name.includes('design') || 
      description.includes('calligraphy') || description.includes('art') || description.includes('design')) {
    tags.push('hobbies', 'self-improvement');
  } else if (name.includes('pickleball') || name.includes('sport') || name.includes('fitness') || 
             description.includes('sport') || description.includes('fitness') || description.includes('workout')) {
    tags.push('sports', 'health');
  } else if (name.includes('founder') || name.includes('business') || name.includes('financial') || 
             name.includes('crypto') || name.includes('investing') || 
             description.includes('founder') || description.includes('business') || 
             description.includes('financial') || description.includes('crypto') || 
             description.includes('investing')) {
    tags.push('money', 'personal-dev');
  } else if (name.includes('marketing') || name.includes('tech') || name.includes('coding') || 
             description.includes('marketing') || description.includes('tech') || 
             description.includes('coding') || description.includes('programming')) {
    tags.push('tech', 'money');
  } else if (name.includes('hormone') || name.includes('health') || name.includes('wellness') || 
             description.includes('health') || description.includes('wellness') || 
             description.includes('nutrition')) {
    tags.push('health', 'self-improvement');
  } else if (name.includes('photo') || name.includes('photography') || 
             description.includes('photo') || description.includes('photography')) {
    tags.push('hobbies', 'tech');
  } else if (name.includes('automation') || description.includes('automation')) {
    tags.push('tech', 'self-improvement');
  } else if (name.includes('music') || description.includes('music') || 
             name.includes('instrument') || description.includes('instrument')) {
    tags.push('music', 'hobbies');
  } else if (name.includes('relationship') || description.includes('relationship') || 
             name.includes('dating') || description.includes('dating')) {
    tags.push('relationships', 'self-improvement');
  } else if (name.includes('spiritual') || description.includes('spiritual') || 
             name.includes('meditation') || description.includes('meditation')) {
    tags.push('spirituality', 'self-improvement');
  }
  
  tags.push('personal-dev', 'self-improvement');
  
  return tags;
} 