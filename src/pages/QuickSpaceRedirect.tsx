import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useSpace } from '@/contexts/SpaceContext';
import { toast } from '@/hooks/use-toast';
import { redirectToSpace } from '@/utils/spaceRedirect';
import { useEffect, useState, useCallback } from "react";

interface JoinedSpace {
  id: string;
  name: string | null;
  subdomain: string | null;
}

export default function QuickSpaceRedirect() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { fetchSpaceData } = useSpace();
  const location = useLocation();
  const [isRedirecting, setIsRedirecting] = useState(true);
  const [redirectMessage, setRedirectMessage] = useState("Initializing...");
  const [redirectAttempts, setRedirectAttempts] = useState(0);
  const [hasSpaces, setHasSpaces] = useState<boolean | null>(null);

  useEffect(() => {
    // If the current path is /discover, do not perform any redirects.
    if (location.pathname === '/discover') {
      console.log('QuickSpaceRedirect: Currently on /discover page. All automatic redirections are skipped.');
      setIsRedirecting(false);
      return;
    }

    // Only run on landing pages
    const landingPaths = ['/', '/app', '/discover'];
    if (!landingPaths.includes(location.pathname)) {
      console.log('QuickSpaceRedirect: Not on a landing page, skipping redirect:', location.pathname);
      setIsRedirecting(false);
      return;
    }
    
    // Skip if still loading
    if (authLoading) return;
    
    // Debug: Log what's happening when the component mounts
    console.log("DEBUG: QuickSpaceRedirect mounted", { 
      referrer: document.referrer,
      localStorage: localStorage.getItem('lastLocationWasDiscover'),
      sessionStorage: sessionStorage.getItem('lastLocationWasDiscover')
    });
    
    // Check if the URL contains a specific space about page path
    // This would indicate the user is trying to view a specific space's about page
    const isAboutPagePath = /\/[^/]+\/about/.test(window.location.pathname);
    
    // If the path is for a specific space's about page, don't redirect
    if (isAboutPagePath) {
      console.log("DEBUG: URL is for a specific space about page, not redirecting");
      setIsRedirecting(false);
      return;
    }
    
    // Store if the user was on the discover page
    const wasOnDiscoverPage = 
      document.referrer.includes('/discover') || 
      localStorage.getItem('lastLocationWasDiscover') === 'true' ||
      sessionStorage.getItem('lastLocationWasDiscover') === 'true';
    
    // Store this for the next time
    if (location.pathname.includes('/discover')) {
      console.log("DEBUG: Currently on discover page, storing for next navigation");
      try {
        localStorage.setItem('lastLocationWasDiscover', 'true');
        sessionStorage.setItem('lastLocationWasDiscover', 'true');
      } catch (e) {
        console.warn("Failed to store location info:", e);
      }
    } else {
      // Clear if not on discover anymore
      localStorage.removeItem('lastLocationWasDiscover');
      sessionStorage.removeItem('lastLocationWasDiscover');
    }
    
    // If coming from discover, return to discover immediately
    if (wasOnDiscoverPage) {
      console.log("DEBUG: Was on discover page, returning immediately");
      setRedirectMessage("Returning to discover page...");
      // Set flag to indicate user wants to view discover page
      sessionStorage.setItem('userWantsDiscover', 'true');
      navigate('/discover', { replace: true });
      return;
    }
    
    const handleRedirection = async () => {
      if (!user) {
        console.log("QuickSpaceRedirect: No user found, redirecting to login");
        navigate('/login', { replace: true });
        setIsRedirecting(false);
        return;
      }
      
      try {
        console.log("QuickSpaceRedirect: Checking if user has any spaces");
        
        // First, quickly check if the user has any spaces at all
        const { count, error: countError } = await supabase
          .from('space_access')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_active', true);
          
        if (countError) {
          console.error("Error checking if user has spaces:", countError);
        } else if (count === 0) {
          // User has no spaces, redirect to discover page
          console.log("QuickSpaceRedirect: User has no spaces, redirecting to discover");
          setHasSpaces(false);
          setRedirectMessage("Taking you to discover page...");
          // Set flag to indicate user wants to view discover page
          sessionStorage.setItem('userWantsDiscover', 'true');
          navigate('/discover', { replace: true });
          return;
        } else {
          // User has at least one space, continue with normal flow
          setHasSpaces(true);
          setRedirectMessage("Taking you to your space...");
        }
        
        // Track last redirect time for repeat visitors
        const now = new Date().toISOString();
        try {
          localStorage.setItem('lastRedirectAttempt', now);
        } catch (e) {
          console.warn("Failed to save redirect timestamp:", e);
        }
        
        // Add a small delay for more reliable behavior
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // PRIORITY 1: Check for recently joined space first
        try {
          const lastJoinedSpaceJson = localStorage.getItem('lastJoinedSpace');
          if (lastJoinedSpaceJson) {
            const lastJoinedSpace = JSON.parse(lastJoinedSpaceJson);
            if (lastJoinedSpace && lastJoinedSpace.subdomain) {
              console.log("Found last joined space:", lastJoinedSpace.name);
              
              // Verify the space exists and user has access
              const { data: accessCheck } = await supabase
                .from('space_access')
                .select('id')
                .eq('user_id', user.id)
                .eq('space_id', lastJoinedSpace.id)
                .eq('is_active', true)
                .maybeSingle();
                
              if (accessCheck) {
                console.log("User has active access to last joined space");
                setRedirectMessage(`Taking you to ${lastJoinedSpace.name || 'your space'}...`);
                
                // Prefetch the space data to ensure it's in cache
                await fetchSpaceData(lastJoinedSpace.subdomain);
                
                navigate(`/${lastJoinedSpace.subdomain}/space/feed`, { replace: true });
                return;
              } else {
                console.log("User no longer has access to last joined space");
              }
            }
          }
        } catch (e) {
          console.warn("Error checking last joined space:", e);
        }
        
        // PRIORITY 2: Try finding the user's most recent active space
        const { data: activeSpaces, error: spacesError } = await supabase
          .from('space_access')
          .select(`
            id,
            space_id,
            spaces:space_id (id, name, subdomain)
          `)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(5);
        
        if (spacesError) {
          console.error("Error fetching active spaces:", spacesError);
        } else if (activeSpaces && activeSpaces.length > 0) {
          // Find the first valid space with a subdomain
          const validSpace = activeSpaces.find(record => 
            record.spaces && 
            (record.spaces as JoinedSpace).subdomain
          );
          
          if (validSpace) {
            const space = validSpace.spaces as JoinedSpace;
            setRedirectMessage(`Taking you to ${space.name || 'your space'}...`);
            
            // Update lastVisitedSpace in localStorage
            try {
              localStorage.setItem('lastVisitedSpace', JSON.stringify({
                id: space.id,
                subdomain: space.subdomain,
                name: space.name
              }));
            } catch (e) {
              console.warn("Failed to save last visited space:", e);
            }
            
            // Prefetch the space data to ensure it's in cache
            await fetchSpaceData(space.subdomain);
            
            // Use the new URL format
            const spaceUrl = `/${space.subdomain}/space/feed`;
            navigate(spaceUrl, { replace: true });
            return;
          }
        }
        
        // If no active spaces found, fall back to standard redirect
        if (redirectAttempts === 0) {
          const redirected = await redirectToSpace(navigate, true);
          
          if (redirected) {
            console.log("QuickSpaceRedirect: Successfully redirected to user space");
            return;
          }
        }
        
        // Last resort - check all spaces including those not active
        if (redirectAttempts > 0) {
          console.log("QuickSpaceRedirect: Checking all user spaces as fallback");
          const { data: allSpaces } = await supabase
            .from('spaces')
            .select('id, name, subdomain')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (allSpaces && allSpaces.length > 0) {
            const space = allSpaces[0];
            setRedirectMessage(`Found your space! Taking you to ${space.name || 'your space'}...`);
            
            // Prefetch the space data to ensure it's in cache
            await fetchSpaceData(space.subdomain);
            
            navigate(`/${space.subdomain}/space/feed`, { replace: true });
            return;
          }
        }
        
        // If we reach here, no spaces were found or redirection failed
        console.log("QuickSpaceRedirect: No spaces found, redirecting to discover");
        setRedirectMessage("No spaces found, taking you to discover page...");
        
        // Set flag to indicate user wants to view discover page
        sessionStorage.setItem('userWantsDiscover', 'true');
        
        setTimeout(() => {
          navigate('/discover', { replace: true });
          setIsRedirecting(false);
        }, 1000);
      } catch (error) {
        console.error("QuickSpaceRedirect: Error during redirection:", error);
        
        // If this is the first attempt, try once more with a different approach
        if (redirectAttempts === 0) {
          setRedirectMessage("Trying alternative redirection method...");
          setRedirectAttempts(prev => prev + 1);
        } else {
          // If we've already tried multiple approaches, give up and go to discover
          setRedirectMessage("Encountered an error, taking you to discover page...");
          toast({
            title: "Navigation error",
            description: "We couldn't find your space. You've been redirected to the discover page.",
            variant: "destructive"
          });
          
          // Set flag to indicate user wants to view discover page
          sessionStorage.setItem('userWantsDiscover', 'true');
          
          setTimeout(() => {
            navigate('/discover', { replace: true });
            setIsRedirecting(false);
          }, 1000);
        }
      }
    };
    
    handleRedirection();
  }, [user, authLoading, navigate, redirectAttempts, fetchSpaceData, location.pathname]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin mx-auto text-teal-600" />
        <p className="mt-4 text-lg text-gray-600">{redirectMessage}</p>
      </div>
    </div>
  );
} 