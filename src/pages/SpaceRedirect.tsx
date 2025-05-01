import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

/**
 * This component redirects from legacy space URLs to the new URL structure
 * - If user is logged in, redirects to /subdomain/space/feed for member access
 * - If user is not logged in, redirects to /subdomain/about for public view
 */
export default function SpaceRedirect() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (loading) return; // Wait for auth to finish
    
    if (!subdomain) {
      // If no subdomain, redirect to discover
      navigate("/discover", { replace: true });
      return;
    }
    
    if (user) {
      // If user is logged in, try to redirect to internal space
      // The SpaceProtectedRoute will handle access verification
      console.log(`SpaceRedirect: User logged in, redirecting to /${subdomain}/space/feed`);
      navigate(`/${subdomain}/space/feed`, { replace: true });
    } else {
      // If not logged in, redirect to public about page
      console.log(`SpaceRedirect: User not logged in, redirecting to /${subdomain}/about`);
      navigate(`/${subdomain}/about`, { replace: true });
    }
  }, [subdomain, user, loading, navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600 mb-3" />
        <p className="text-gray-600">Redirecting to the correct page...</p>
      </div>
    </div>
  );
} 