import { log } from '@/utils/logger';
import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Loader2 } from "lucide-react";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { checkActiveSession } from "@/utils/directAuth";
import EmergencyDatabaseRecovery from '@/utils/emergencyDatabaseRecovery';
import Discover from "./Discover";
import type { User } from "@supabase/supabase-js";
import { devLogger } from '@/utils/developmentLogger';

export default function SmartLanding() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useOptimizedAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [showDiscover, setShowDiscover] = useState(false);
  
  // Parse URL search params to check for force discovery flag
  const searchParams = new URLSearchParams(location.search);
  const forceDiscover = searchParams.get('force') === 'discover';
  
  // Function to determine if user explicitly navigated to discover page
  const isExplicitDiscoverNavigation = useCallback(() => {
    return location.pathname === '/discover' && 
           location.key !== 'default' && // Not the initial navigation
           document.referrer.includes(window.location.origin); // User came from the same origin
  }, [location.pathname, location.key]);

  useEffect(() => {
    async function checkUserSpaces() {
      // If forceDiscover is true, skip routing and show Discover
      if (forceDiscover) {
        // Force discover flag detected
        setShowDiscover(true);
        setIsChecking(false);
        return;
      }
      
      // Check if user explicitly navigated to discover page
      if (isExplicitDiscoverNavigation()) {
        // User explicitly navigated to discover
        setShowDiscover(true);
        setIsChecking(false);
        return;
      }
      
      if (!user) {
        devLogger.log('Auth', "No user found in SmartLanding context, checking for active session");
        
        try {
          // Check if there's an active session despite no user in context
          const hasActiveSession = await checkActiveSession();
          
          if (hasActiveSession) {
            devLogger.log('Auth', "SmartLanding: Active session found but no user in context");
            // Get current session to retrieve user ID
            const { data } = await getSupabaseClient().auth.getSession();
            
            if (data.session?.user) {
              devLogger.log('Auth', "SmartLanding: Retrieved user from session:", data.session.user.email);
              // Check spaces for this user
              await checkSpacesForUser(data.session.user);
            } else {
              devLogger.log('Auth', "SmartLanding: No valid user in session, showing discover");
              setShowDiscover(true);
              setIsChecking(false);
            }
          } else {
            devLogger.log('Auth', "SmartLanding: No active session, showing landing page");
            navigate('/', { replace: true });
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            log.error('Page', "SmartLanding: Error checking session:", error);
          }
          navigate('/', { replace: true });
        } finally {
          setIsChecking(false);
        }
        return;
      }
      
      // User exists in context, proceed with normal flow
      await checkSpacesForUser(user);
    }
    
    async function checkSpacesForUser(user: User) {
      devLogger.log('Auth', "SmartLanding: Checking spaces for user", user.email, user.id);
      
      try {
        // Special case for test account - redirect to discover page
        if (user.email === 'francischukwuma706@gmail.com') {
          devLogger.log('Auth', "This is the creator account, redirecting to discover page");
          setShowDiscover(true);
          setIsChecking(false);
          return;
        }
        
        // 🚨 PHASE 8: Use emergency recovery instead of direct database calls
        devLogger.log('Auth', "SmartLanding: Using emergency recovery to find user spaces");
        
        const recoveryResult = await EmergencyDatabaseRecovery.safeSpaceQuery(
          user.id,
          {
            retryAttempts: 2,
            fallbackToPublic: false,
            useCache: true
          }
        );

        if (recoveryResult.success && recoveryResult.data && recoveryResult.data.length > 0) {
          // Find a space where the user has access
          for (const space of recoveryResult.data) {
            const membershipCheck = await EmergencyDatabaseRecovery.safeMembershipCheck(
              space.id,
              user.id
            );
            
            if (membershipCheck.isMember || membershipCheck.isOwner) {
              devLogger.log('Auth', "SmartLanding: Found user space:", space.name, space.subdomain);
              const path = `/space/${space.subdomain}`;
              devLogger.log('Auth', "SmartLanding: Navigation path:", path);
              navigate(path, { replace: true });
              return;
            }
          }
          
          // If no membership found, show discover
          devLogger.log('Auth', "SmartLanding: User has no accessible spaces, showing discover");
          setShowDiscover(true);
        } else {
          // User has no spaces, show discover page
          devLogger.log('Auth', "SmartLanding: No spaces found for user, showing discover");
          setShowDiscover(true);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          log.error('Page', 'SmartLanding: Error checking user spaces:', error);
        }
        // On error, default to discover page
        setShowDiscover(true);
      } finally {
        setIsChecking(false);
      }
    }
    
    checkUserSpaces();
  }, [user, navigate, location, forceDiscover, isExplicitDiscoverNavigation]);

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