import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { redirectToSpace, getUserSpace } from "@/utils/spaceRedirect";
import { toast } from "@/hooks/use-toast";

export default function QuickSpaceRedirect() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(true);
  const [redirectMessage, setRedirectMessage] = useState("Taking you to your space...");
  const [redirectAttempts, setRedirectAttempts] = useState(0);

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
        
        // If we've already tried redirecting once, try to get the space info directly
        if (redirectAttempts > 0) {
          console.log("QuickSpaceRedirect: Using fallback redirect method");
          const spaceData = await getUserSpace(user.id);
          
          if (spaceData && spaceData.subdomain) {
            setRedirectMessage(`Found your space! Redirecting to ${spaceData.name || 'your space'}...`);
            
            // Use the new URL format
            const spaceUrl = `/${spaceData.subdomain}`;
            navigate(spaceUrl, { replace: true });
            return;
          }
        } else {
          // Try to redirect using our enhanced utility first
          const redirected = await redirectToSpace(navigate, true);
          
          if (redirected) {
            console.log("QuickSpaceRedirect: Successfully redirected to user space");
            return;
          }
        }
        
        // If we reach here, no spaces were found or redirection failed
        console.log("QuickSpaceRedirect: No spaces found, redirecting to discover");
        setRedirectMessage("No spaces found, taking you to discover page...");
        
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
          
          setTimeout(() => {
            navigate('/discover', { replace: true });
            setIsRedirecting(false);
          }, 1000);
        }
      }
    };
    
    handleRedirection();
  }, [user, loading, navigate, redirectAttempts]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin mx-auto text-teal-600" />
        <p className="mt-4 text-lg text-gray-600">{redirectMessage}</p>
      </div>
    </div>
  );
} 