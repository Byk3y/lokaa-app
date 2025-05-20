import { Navigate, Outlet, useLocation, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSpace } from "@/contexts/SpaceContext";
import { useMembership } from "@/contexts/MembershipContext";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

interface PublicJoinSpaceResult {
  success: boolean;
  message?: string;
}

export default function SpaceProtectedRoute() {
  const { user, loading: authLoading } = useAuth();
  const { spaceData, loading: spaceLoading, error: spaceError, fetchSpaceData: refreshSpaceDataFallback } = useSpace();
  const { isMember, isOwner, loading: membershipLoading, refreshMembership, error: membershipError } = useMembership();
  const { subdomain } = useParams<{ subdomain: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingDirectly, setIsCheckingDirectly] = useState(false);
  const [directMembershipCheck, setDirectMembershipCheck] = useState<boolean | null>(null);
  const [initialSpaceFetchAttempted, setInitialSpaceFetchAttempted] = useState(false);
  
  console.log('[SPP Debug] State Snapshot:', {
    userId: user?.id,
    authLoading,
    spaceId: spaceData?.id,
    spaceSubdomain: spaceData?.subdomain,
    spaceLoading,
    spaceErrorMsg: spaceError?.message,
    isMember,
    isOwner,
    membershipLoading,
    membershipErrorMsg: membershipError?.message,
    directMembershipCheck,
    isCheckingDirectly,
    retryCount,
    currentPath: location.pathname
  });
  
  const userHasAccess = isMember || isOwner || directMembershipCheck;
  
  useEffect(() => {
    console.log('[SPP Pre-Fetch Check]', {
      authLoading,
      userAvailable: !!user,
      subdomain,
      spaceDataAvailable: !!spaceData,
      spaceDataMatchesSubdomain: spaceData?.subdomain === subdomain,
      initialSpaceFetchAttempted
    });

    if (!authLoading && user && subdomain && subdomain !== ":subdomain" && (!spaceData || spaceData.subdomain !== subdomain) && !initialSpaceFetchAttempted) {
      console.log(`[SpaceProtectedRoute] Auth ready, space data for ${subdomain} missing or mismatched. Attempting to call refreshSpaceDataFallback.`);
      if (refreshSpaceDataFallback) {
        refreshSpaceDataFallback(subdomain, true);
        setInitialSpaceFetchAttempted(true);
      } else {
        console.error("[SpaceProtectedRoute] refreshSpaceDataFallback is not defined. Cannot fetch space data.");
      }
    }
  }, [authLoading, user, subdomain, spaceData, refreshSpaceDataFallback, initialSpaceFetchAttempted]);
  
  const checkMembershipDirectly = useCallback(async () => {
    setIsCheckingDirectly(true);
    setError(null);
    
    if (!user || !spaceData?.id) {
      setDirectMembershipCheck(false);
      setIsCheckingDirectly(false);
      return;
    }
    
    try {
      if (spaceData?.id) {
        const localFlag = localStorage.getItem(`joined_space_${spaceData.id}`);
        if (localFlag === "true") {
          console.log("[SpaceProtectedRoute] Found membership in localStorage");
          setDirectMembershipCheck(true);
          setIsCheckingDirectly(false);
          return;
        }
      }
      
      if (spaceData?.owner_id === user.id) {
        console.log("[SpaceProtectedRoute] User is the owner");
        setDirectMembershipCheck(true);
        setIsCheckingDirectly(false);
        return;
      }
      
      try {
        const result = await supabase.rpc(
          'public_join_space',
          { space_id_param: spaceData.id }
        );

        const rpcError = result.error;
        const data = result.data as unknown as PublicJoinSpaceResult;
        
        if (!rpcError && data && data.success) {
          console.log("[SpaceProtectedRoute] Confirmed membership via RPC");
          setDirectMembershipCheck(true);
          localStorage.setItem(`joined_space_${spaceData.id}`, "true");
        } else {
          console.log("[SpaceProtectedRoute] Not a member via RPC:", rpcError || data);
          setDirectMembershipCheck(false);
        }
      } catch (e) {
        console.error("[SpaceProtectedRoute] Error in RPC check:", e);
        const sessionFlag = sessionStorage.getItem(`can_post_in_${spaceData.id}`);
        setDirectMembershipCheck(sessionFlag === "true");
      }
    } catch (err) {
      console.error("[SpaceProtectedRoute] Direct check error:", err);
      setError("Failed to check membership status directly");
      setDirectMembershipCheck(false);
    } finally {
      setIsCheckingDirectly(false);
    }
  }, [user, spaceData]);
  
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined = undefined;
    if (membershipLoading && retryCount > 1 && !directMembershipCheck) {
      timeoutId = setTimeout(() => {
        console.log("[SpaceProtectedRoute] Membership check taking too long, trying direct check");
        checkMembershipDirectly();
      }, 3000);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [membershipLoading, retryCount, checkMembershipDirectly, directMembershipCheck]);
  
  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined = undefined;
    if (retryCount > 0 && retryCount < 4 && !userHasAccess) {
      intervalId = setInterval(() => {
        console.log(`[SpaceProtectedRoute] Retrying membership check (${retryCount}/3)...`);
        refreshMembership();
      }, 2000);
      return () => clearInterval(intervalId);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [retryCount, refreshMembership, userHasAccess]);
  
  useEffect(() => {
    if (membershipLoading && retryCount === 0) {
      setRetryCount(1);
    }
  }, [membershipLoading, retryCount]);
  
  const isLoading = authLoading || !spaceData || membershipLoading || isCheckingDirectly;
  
  const handleManualRefresh = () => {
    setRetryCount(prev => prev + 1);
    setError(null);
    if (spaceError && refreshSpaceDataFallback && subdomain) {
        console.log("[SpaceProtectedRoute] Retrying space data fetch...");
        refreshSpaceDataFallback(subdomain, true);
    }
    refreshMembership();
  };
  
  if (user && spaceData && user.id === spaceData.owner_id) {
    console.log("[SpaceProtectedRoute] User is owner, rendering Outlet.");
    return <Outlet />;
  }
  
  if (isLoading && retryCount < 4) {
    console.log('[SPP Debug] Rendering Loading State:', {
      authLoading,
      isSpaceDataMissing: !spaceData,
      spaceLoading,
      membershipLoading,
      isCheckingDirectly,
      retryCount
    });
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            {authLoading ? "Authenticating..." : 
             !spaceData ? "Loading space details..." : 
             (membershipLoading || isCheckingDirectly) ? "Checking membership..." :
             "Please wait..."}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {retryCount > 0 && (membershipLoading || isCheckingDirectly) ? 
              `Retrying membership check (${retryCount}/3)...` : 
              "Verifying your access to this space"}
          </p>
        </div>
      </div>
    );
  }
  
  if (userHasAccess) {
    console.log("[SpaceProtectedRoute] User has access, rendering Outlet.");
    return <Outlet />;
  }
  
  let finalError = "We couldn't verify your membership status for this space.";
  if (spaceError) {
      finalError = `Error loading space details: ${spaceError.message}`;
  } else if (membershipError) {
      finalError = `Membership check error: ${membershipError.message}`;
  } else if (error) {
      finalError = error;
  } else if (retryCount >=4) {
      finalError = "Membership verification timed out after multiple retries."
  }

  console.log(`[SpaceProtectedRoute] Access denied or error. isLoading: ${isLoading}, userHasAccess: ${userHasAccess}, spaceError: ${spaceError?.message}, membershipError: ${membershipError?.message}, localError: ${error}, retryCount: ${retryCount}`);
  console.log('[SPP Debug] Rendering Access Denied State:', {
    finalError,
    userHasAccess,
    isMember,
    isOwner,
    directMembershipCheck,
    spaceErrorMsg: spaceError?.message,
    membershipErrorMsg: membershipError?.message,
    localError: error,
    retryCount
  });
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          {finalError}
        </AlertDescription>
      </Alert>
      
      <div className="flex space-x-4 mt-6">
        <Button 
          variant="outline"
          onClick={handleManualRefresh}
          className="flex items-center space-x-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Try again</span>
        </Button>
        
        <Button 
          onClick={() => {
            if (subdomain) {
            navigate(`/${subdomain}/about`, { 
              state: { accessDenied: true } 
            });
            } else {
              navigate('/discover'); 
              toast({ title: "Navigation error", description: "Could not determine the space to navigate to.", variant: "destructive"});
            }
          }}
        >
          Go to Space About Page
        </Button>
      </div>
    </div>
  );
} 