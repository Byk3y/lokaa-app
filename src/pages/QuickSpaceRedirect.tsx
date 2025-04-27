import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { redirectToSpace } from "@/utils/spaceRedirect";

export default function QuickSpaceRedirect() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(true);
  const [redirectMessage, setRedirectMessage] = useState("Taking you to your space...");

  useEffect(() => {
    // Skip if still loading
    if (loading) return;
    
    const handleRedirection = async () => {
      if (!user) {
        console.log("QuickSpaceRedirect: No user found, redirecting to login");
        navigate('/login', { replace: true });
        setIsRedirecting(false);
        return;
      }
      
      console.log("QuickSpaceRedirect: Attempting to find and redirect to user's space");
      try {
        // Add a small delay for more reliable behavior
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Try to redirect using our enhanced utility
        const redirected = await redirectToSpace(navigate, true);
        
        if (redirected) {
          console.log("QuickSpaceRedirect: Successfully redirected to user space");
        } else {
          console.log("QuickSpaceRedirect: No spaces found, redirecting to discover");
          setRedirectMessage("No spaces found, taking you to discover page...");
          setTimeout(() => {
            navigate('/discover', { replace: true });
            setIsRedirecting(false);
          }, 1000);
        }
      } catch (error) {
        console.error("QuickSpaceRedirect: Error during redirection:", error);
        setRedirectMessage("Encountered an error, taking you to discover page...");
        setTimeout(() => {
          navigate('/discover', { replace: true });
          setIsRedirecting(false);
        }, 1000);
      }
    };
    
    handleRedirection();
  }, [user, loading, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin mx-auto text-teal-600" />
        <p className="mt-4 text-lg text-gray-600">{redirectMessage}</p>
      </div>
    </div>
  );
} 