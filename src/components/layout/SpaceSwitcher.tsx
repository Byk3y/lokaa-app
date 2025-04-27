import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronDown, Plus, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SpaceItem {
  id: string;
  name: string;
  subdomain: string;
  primary_color: string;
}

export default function SpaceSwitcher() {
  const { user } = useAuth();
  const { subdomain } = useParams();
  const [spaces, setSpaces] = useState<SpaceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [activeSpace, setActiveSpace] = useState<SpaceItem | null>(null);
  const [isRecoveringFromError, setIsRecoveringFromError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Check if we should go into error recovery mode (for debugging)
  const checkForErrorState = () => {
    // Check if we have an error recovery flag in sessionStorage
    const inErrorRecovery = sessionStorage.getItem('space_switcher_recovery_mode') === 'true';
    
    // If coming from error state, set recovery flag
    if (inErrorRecovery) {
      console.log('SpaceSwitcher: In recovery mode - subdomain redirects paused');
      setIsRecoveringFromError(true);
      return true;
    }
    
    return false;
  };
  
  // Initialize error recovery check
  useEffect(() => {
    checkForErrorState();
  }, []);
  
  // Emergency reset function for testing
  const handleEmergencyReset = () => {
    console.log('SpaceSwitcher: Emergency reset triggered');
    
    // Clear user state storage
    sessionStorage.removeItem('selectedSpaceId');
    sessionStorage.removeItem('spaceData');
    localStorage.removeItem('selectedSpaceId');
    localStorage.removeItem('spaceData');
    
    // Set recovery mode
    sessionStorage.setItem('space_switcher_recovery_mode', 'true');
    setIsRecoveringFromError(true);
    
    // Force refresh
    window.location.href = '/discover?recovery=true';
  };

  // Fetch user's spaces
  useEffect(() => {
    if (!user) {
      setSpaces([]);
      setIsLoading(false);
      return;
    }
    
    const fetchUserSpaces = async () => {
      console.log("SpaceSwitcher: Fetching spaces for user:", user.email);
      console.log("SpaceSwitcher: Current URL subdomain param:", subdomain);
      
      try {
        // Check if we're in an error state
        if (isRecoveringFromError) {
          console.log("SpaceSwitcher: In recovery mode, not redirecting");
          setIsLoading(false);
          return;
        }
        
        // First, get the user's owned spaces (created by the user)
        const { data: ownedSpaces, error: ownedError } = await supabase
          .from('spaces')
          .select('id, name, subdomain, primary_color')
          .eq('owner_id', user.id);
          
        if (ownedError) {
          console.error("SpaceSwitcher: Error fetching owned spaces:", ownedError);
          throw ownedError;
        }
        
        console.log("SpaceSwitcher: Owned spaces found:", ownedSpaces?.length || 0, ownedSpaces);
        
        // Also get spaces the user has access to
        const { data: accessRecords, error: accessError } = await supabase
          .from('space_access')
          .select('space_id')
          .eq('user_id', user.id)
          .eq('is_active', true);
          
        if (accessError) {
          console.error("SpaceSwitcher: Error fetching space access records:", accessError);
          throw accessError;
        }
        
        console.log("SpaceSwitcher: Access records found:", accessRecords?.length || 0, accessRecords);
        
        // Fetch details of spaces user has access to
        let accessedSpaces: any[] = [];
        if (accessRecords && accessRecords.length > 0) {
          const spaceIds = accessRecords.map(access => access.space_id);
          
          const { data: spacesData, error: spacesError } = await supabase
            .from('spaces')
            .select('id, name, subdomain, primary_color')
            .in('id', spaceIds);
            
          if (spacesError) {
            console.error("SpaceSwitcher: Error fetching accessed spaces:", spacesError);
            throw spacesError;
          }
          
          accessedSpaces = spacesData || [];
          console.log("SpaceSwitcher: Accessed spaces found:", accessedSpaces.length, accessedSpaces);
        }
        
        // Combine owned and accessed spaces, removing duplicates
        const allSpaces = [
          ...(ownedSpaces || []),
          ...accessedSpaces.filter(js => 
            !ownedSpaces?.some(os => os.id === js.id)
          )
        ];
        
        console.log("SpaceSwitcher: Total spaces found:", allSpaces.length, allSpaces);
        
        // Handle case where no spaces are found
        if (allSpaces.length === 0) {
          console.log("SpaceSwitcher: No spaces found in database, redirecting to discover or create-space");
          setSpaces([]);
          
          // Redirect to /discover if not already there
          if (window.location.pathname !== '/discover' && 
              window.location.pathname !== '/create-space' && 
              window.location.pathname !== '/spaces/create') {
            console.log("SpaceSwitcher: No spaces found, redirecting to discover page");
            navigate('/discover', { replace: true });
          }
        } else {
          setSpaces(allSpaces);
          
          // Set active space based on current URL or default to first space
          if (subdomain) {
            const matchingSpace = allSpaces.find(space => space.subdomain === subdomain);
            if (matchingSpace) {
              console.log("SpaceSwitcher: Setting active space from URL param:", matchingSpace.name);
              setActiveSpace(matchingSpace);
              sessionStorage.setItem('selectedSpaceId', matchingSpace.id);
            } else {
              // Only redirect if current path isn't discover or create-space
              if (window.location.pathname !== '/discover' && 
                  window.location.pathname !== '/create-space' && 
                  window.location.pathname !== '/spaces/create') {
                console.log("SpaceSwitcher: URL param space not found, using first space:", allSpaces[0].name);
                setActiveSpace(allSpaces[0]);
                sessionStorage.setItem('selectedSpaceId', allSpaces[0].id);
                navigate(`/space/${allSpaces[0].subdomain}`, { replace: true });
              } else {
                // If on discover or create-space, just set the active space without redirect
                setActiveSpace(allSpaces[0]);
                sessionStorage.setItem('selectedSpaceId', allSpaces[0].id);
              }
            }
          } else {
            // Don't redirect if we're already on discovery or create-space pages
            if (window.location.pathname === '/discover' || 
                window.location.pathname === '/create-space' || 
                window.location.pathname === '/spaces/create') {
              console.log("SpaceSwitcher: On special page, not redirecting");
              setActiveSpace(allSpaces[0]);
              sessionStorage.setItem('selectedSpaceId', allSpaces[0].id);
            } else {
              console.log("SpaceSwitcher: No URL param, redirecting to first space:", allSpaces[0].name);
              setActiveSpace(allSpaces[0]);
              sessionStorage.setItem('selectedSpaceId', allSpaces[0].id);
              navigate(`/space/${allSpaces[0].subdomain}`, { replace: true });
            }
          }
        }
      } catch (error) {
        console.error('SpaceSwitcher: Error fetching spaces:', error);
        // For error fallback
        console.log("SpaceSwitcher: Error occurred, redirecting to discover");
        setSpaces([]);
        
        // Redirect to discover page on error
        if (window.location.pathname !== '/discover' && 
            window.location.pathname !== '/create-space' && 
            window.location.pathname !== '/spaces/create') {
          navigate('/discover', { replace: true });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserSpaces();
  }, [user, subdomain, navigate, isRecoveringFromError]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Select a space and navigate to it
  const handleSpaceSelect = (space: SpaceItem) => {
    console.log(`Selected space: ${space.name}`);
    
    setActiveSpace(space);
    sessionStorage.setItem('selectedSpaceId', space.id);
    setIsOpen(false);
    
    // Navigate to the selected space, force refresh to get updated member counts
    if (space.subdomain) {
      console.log(`Navigating to space: ${space.subdomain}`);
      navigate(`/space/${space.subdomain}`);
    }
  };

  // Get initials for the space avatar
  const getSpaceInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  useEffect(() => {
    // If recovering from error, don't do any redirects
    if (isRecoveringFromError) {
      console.log("SpaceSwitcher: In recovery mode, skipping subdomain effect");
      return;
    }
    
    // If the URL contains a subdomain, use it to set the active space
    if (subdomain && spaces.length > 0) {
      console.log("SpaceSwitcher: URL has subdomain:", subdomain);
      
      // Find the space that matches the subdomain in the URL
      const matchingSpace = spaces.find(space => space.subdomain === subdomain);
      if (matchingSpace) {
        console.log("SpaceSwitcher: Found matching space for URL subdomain:", matchingSpace.name);
        setActiveSpace(matchingSpace);
        
        // Store the selected space ID in sessionStorage
        sessionStorage.setItem('selectedSpaceId', matchingSpace.id);
      } else {
        console.log("SpaceSwitcher: No match found for URL subdomain:", subdomain);
      }
    }
    // If no subdomain in URL but we have a stored selection, retrieve it
    else if (sessionStorage.getItem('selectedSpaceId') && spaces.length > 0) {
      const storedSpaceId = sessionStorage.getItem('selectedSpaceId');
      console.log("SpaceSwitcher: Retrieved stored space ID:", storedSpaceId);
      
      const storedSpace = spaces.find(space => space.id === storedSpaceId);
      
      if (storedSpace) {
        console.log("SpaceSwitcher: Found stored space:", storedSpace.name);
        setActiveSpace(storedSpace);
        
        // Only redirect if not on special pages
        if (window.location.pathname !== '/discover' && 
            window.location.pathname !== '/create-space' && 
            window.location.pathname !== '/spaces/create') {
          navigate(`/space/${storedSpace.subdomain}`);
        }
      }
    }
  }, [subdomain, navigate, isRecoveringFromError, spaces]);

  // Emergency button for test account
  const renderEmergencyButton = () => {
    if (user?.email === 'francischukwuma706@gmail.com') {
      return (
        <div className="border-t py-1 mt-2">
          <button
            onClick={handleEmergencyReset}
            className="flex items-center w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 transition-colors duration-150"
          >
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
              <AlertTriangle size={16} className="text-red-500" />
            </div>
            <span className="text-sm font-medium">Emergency Reset</span>
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown trigger */}
      <button 
        className="flex items-center space-x-2 py-2 px-3 rounded-md hover:bg-gray-100 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        {activeSpace && (
          <>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activeSpace.primary_color || 'bg-gray-100'}`}>
              <span className="font-medium text-sm text-gray-800">
                {getSpaceInitial(activeSpace.name)}
              </span>
            </div>
            <span className="font-medium text-gray-800">{activeSpace.name}</span>
            <ChevronDown 
              size={16} 
              className={`text-gray-500 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} 
            />
          </>
        )}
        
        {!activeSpace && !isLoading && (
          <>
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100">
              <span className="font-medium text-sm text-gray-800">+</span>
            </div>
            <span className="font-medium text-gray-800">Create a space</span>
            <ChevronDown 
              size={16} 
              className={`text-gray-500 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} 
            />
          </>
        )}
        
        {isLoading && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
            <div className="w-20 h-4 bg-gray-200 animate-pulse rounded"></div>
            <ChevronDown size={16} className="text-gray-400" />
          </div>
        )}
      </button>
      
      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-md shadow-lg py-2 z-50">
          <div className="px-4 py-2 border-b">
            <h3 className="text-sm font-medium text-gray-700">Your spaces</h3>
          </div>
          
          <div className="max-h-80 overflow-y-auto py-1">
            {spaces.length > 0 ? (
              spaces.map(space => (
                <button
                  key={space.id}
                  className="flex items-center w-full text-left px-4 py-2 hover:bg-gray-100"
                  onClick={() => handleSpaceSelect(space)}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${space.primary_color || 'bg-gray-100'}`}>
                    <span className="font-medium text-sm text-gray-800">
                      {getSpaceInitial(space.name)}
                    </span>
                  </div>
                  <span className="text-sm text-gray-700">{space.name}</span>
                </button>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500">
                You haven't created or joined any spaces yet.
              </div>
            )}
          </div>
          
          <div className="border-t py-1">
            <Link
              to="/create-space"
              className="flex items-center w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors duration-150"
              onClick={(e) => {
                e.stopPropagation(); // Prevent dropdown from closing prematurely
                setIsOpen(false); // Close dropdown once link is clicked
                console.log("Create space button clicked, navigating to /create-space");
              }}
            >
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                <Plus size={16} className="text-gray-500" />
              </div>
              <span className="text-sm font-medium text-gray-800">Create a space</span>
            </Link>
          </div>
          
          {/* Emergency reset button for test account */}
          {renderEmergencyButton()}
        </div>
      )}
      
      {/* Recovery mode indicator */}
      {isRecoveringFromError && user?.email === 'francischukwuma706@gmail.com' && (
        <div className="absolute -bottom-10 left-0 right-0 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
          Recovery mode active - Redirects paused
        </div>
      )}
    </div>
  );
} 