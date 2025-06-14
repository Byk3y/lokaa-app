import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Home, Search, User, PlusCircle } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();
  const { user, signOut } = useOptimizedAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
      // Force refresh as a last resort
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md max-w-md w-full p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Page Not Found</h1>
        
        <p className="text-gray-600 mb-8">
          We couldn't find the page you were looking for. It might have been removed, 
          renamed, or didn't exist in the first place.
        </p>
        
        <div className="grid grid-cols-1 gap-4 mb-6">
          <Button onClick={() => navigate("/discover")} className="flex items-center justify-center">
            <Search className="mr-2 h-4 w-4" />
            Browse Spaces
          </Button>
          
          {user && (
            <Button onClick={() => navigate("/create-space")} variant="outline" className="flex items-center justify-center">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Space
            </Button>
          )}
          
          <Button onClick={() => navigate("/")} variant="outline" className="flex items-center justify-center">
            <Home className="mr-2 h-4 w-4" />
            Return to Home
          </Button>
        </div>
        
        {user && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-4">
              If you're experiencing persistent issues:
            </p>
            <Button onClick={handleSignOut} variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50">
              Sign Out and Try Again
            </Button>
          </div>
        )}
        
        <p className="text-xs text-gray-400 mt-8">
          If you continue to experience issues, please contact support at help@lokaa.com
        </p>
      </div>
    </div>
  );
}
