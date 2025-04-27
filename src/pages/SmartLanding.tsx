import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getFirstUserSpace, userHasSpaces } from "@/utils/userSpaceUtils";
import { checkActiveSession } from "@/utils/directAuth";
import Discover from "./Discover";

export default function SmartLanding() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [showDiscover, setShowDiscover] = useState(false);
  
  // Parse URL search params to check for force discovery flag
  const searchParams = new URLSearchParams(location.search);
  const forceDiscover = searchParams.get('force') === 'discover';
  
  // Function to determine if user explicitly navigated to discover page
  const isExplicitDiscoverNavigation = () => {
    return location.pathname === '/discover' && 
           location.key !== 'default' && // Not the initial navigation
           document.referrer.includes(window.location.origin); // User came from the same origin
  };

  useEffect(() => {
    async function checkUserSpaces() {
      // If forceDiscover is true, skip routing and show Discover
      if (forceDiscover) {
        console.log("SmartLanding: Force discover flag detected, showing Discover page");
        setShowDiscover(true);
        setIsChecking(false);
        return;
      }
      
      // Check if user explicitly navigated to discover page
      if (isExplicitDiscoverNavigation()) {
        console.log("SmartLanding: User explicitly navigated to discover page");
        setShowDiscover(true);
        setIsChecking(false);
        return;
      }
      
      if (!user) {
        console.log("No user found in SmartLanding context, checking for active session");
        
        try {
          // Check if there's an active session despite no user in context
          const hasActiveSession = await checkActiveSession();
          
          if (hasActiveSession) {
            console.log("SmartLanding: Active session found but no user in context");
            // Get current session to retrieve user ID
            const { data } = await supabase.auth.getSession();
            
            if (data.session?.user) {
              console.log("SmartLanding: Retrieved user from session:", data.session.user.email);
              // Check spaces for this user
              await checkSpacesForUser(data.session.user);
            } else {
              console.log("SmartLanding: No valid user in session, showing discover");
              setShowDiscover(true);
              setIsChecking(false);
            }
          } else {
            console.log("SmartLanding: No active session, showing landing page");
            navigate('/', { replace: true });
          }
        } catch (error) {
          console.error("SmartLanding: Error checking session:", error);
          navigate('/', { replace: true });
        } finally {
          if (isChecking) setIsChecking(false);
        }
        return;
      }
      
      // User exists in context, proceed with normal flow
      await checkSpacesForUser(user);
    }
    
    async function checkSpacesForUser(user: any) {
      console.log("SmartLanding: Checking spaces for user", user.email, user.id);
      
      try {
        // Special case for test account - redirect to discover page
        if (user.email === 'francischukwuma706@gmail.com') {
          console.log("This is the creator account, redirecting to discover page");
          setShowDiscover(true);
          setIsChecking(false);
          return;
        }
        
        // Get the first space data including the subdomain
        console.log("SmartLanding: Fetching first space for user", user.id);
        const space = await getFirstUserSpace(user.id);
        console.log("SmartLanding: getFirstUserSpace result:", space);
        
        // Double-check with direct database query for debugging
        console.log("SmartLanding: Performing direct database check");
        const { data: directSpaces, error: directError } = await supabase
          .from('spaces')
          .select('id, subdomain, name')
          .or(`owner_id.eq.${user.id},id.in.(${
            supabase.from('space_access')
              .select('space_id')
              .eq('user_id', user.id)
              .eq('is_active', true)
          })`)
          .limit(10);
          
        console.log("SmartLanding: Direct DB check result:", directSpaces, directError);
        
        if (space) {
          // User has a space, navigate to it using subdomain
          console.log("SmartLanding: Navigating to space with subdomain:", space.subdomain);
          const path = `/space/${space.subdomain}`;
          console.log("SmartLanding: Navigation path:", path);
          navigate(path, { replace: true });
        } else {
          // User has no spaces, show discover page
          console.log("SmartLanding: No spaces found for user, showing discover");
          setShowDiscover(true);
        }
      } catch (error) {
        console.error('SmartLanding: Error checking user spaces:', error);
        // On error, default to discover page
        setShowDiscover(true);
      } finally {
        setIsChecking(false);
      }
    }
    
    checkUserSpaces();
  }, [user, navigate, location, forceDiscover]);

  // Show loading indicator while checking
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-teal-600" />
          <p className="mt-4 text-lg text-gray-600">Taking you to your space...</p>
        </div>
      </div>
    );
  }
  
  // If we've decided to show the discover page, do it
  if (showDiscover) {
    return <Discover />;
  }
  
  // This is a fallback that shouldn't normally be visible
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin mx-auto text-teal-600" />
        <p className="mt-4 text-lg text-gray-600">Redirecting you to the right place...</p>
      </div>
    </div>
  );
} 