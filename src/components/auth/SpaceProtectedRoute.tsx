import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function SpaceProtectedRoute() {
  const { user, loading: authLoading } = useAuth();
  const { subdomain } = useParams<{ subdomain: string }>();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const { toast } = useToast();
  
  useEffect(() => {
    async function checkAccess() {
      if (!user || !subdomain) {
        setHasAccess(false);
        setIsLoading(false);
        return;
      }
      
      try {
        console.log(`SpaceProtectedRoute: Checking access for user ${user.id} to space ${subdomain}`);
        
        // Check if space exists and get its ID
        const { data: spaceData, error: spaceError } = await supabase
          .from('spaces')
          .select('id, owner_id, is_private')
          .eq('subdomain', subdomain)
          .single();
          
        if (spaceError || !spaceData) {
          console.error("Space not found:", spaceError);
          setHasAccess(false);
          setIsLoading(false);
          return;
        }
        
        setSpaceId(spaceData.id);
        
        // Check if user is owner
        if (spaceData.owner_id === user.id) {
          console.log("User is the owner, granting access");
          setHasAccess(true);
          setIsLoading(false);
          return;
        }
        
        // If not owner, check membership in space_access table
        const { data: accessData, error: accessError } = await supabase
          .from('space_access')
          .select('id')
          .eq('space_id', spaceData.id)
          .eq('user_id', user.id)
          .eq('is_active', true);
        
        if (accessError) {
          console.error("Error checking access:", accessError);
          setHasAccess(false);
          setIsLoading(false);
          return;
        }
        
        // Grant access if user is a member
        const isMember = accessData && accessData.length > 0;
        console.log(`User ${isMember ? 'is' : 'is not'} a member of the space`);
        setHasAccess(isMember);
        setIsLoading(false);
      } catch (error) {
        console.error("Error checking space access:", error);
        setHasAccess(false);
        setIsLoading(false);
      }
    }
    
    if (!authLoading) {
      checkAccess();
    }
  }, [user, subdomain, authLoading]);
  
  // Show loading state
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="flex items-center justify-center mb-4">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-800">
              Checking space access...
            </h2>
          </div>
          <p className="text-gray-600 text-center">
            Please wait while we verify your access to this space.
          </p>
        </div>
      </div>
    );
  }
  
  // If user is not authenticated, redirect to login
  if (!user) {
    toast({
      title: "Login required",
      description: "You need to be logged in to access this space.",
      variant: "default",
    });
    return <Navigate to={`/${subdomain}/about`} state={{ loginRequired: true }} replace />;
  }
  
  // If user doesn't have access, redirect to about page
  if (!hasAccess) {
    toast({
      title: "Access denied",
      description: "You don't have permission to access this space.",
      variant: "destructive",
    });
    return <Navigate to={`/${subdomain}/about`} state={{ accessDenied: true }} replace />;
  }
  
  // User has access - allow access to protected space routes
  return <Outlet context={{ spaceId }} />;
} 