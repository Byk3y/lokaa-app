import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { getSupabaseClient } from "@/integrations/supabase/client";
import { redirectToSpace } from '../utils/spaceRedirect';
import type { Space } from '@/types/space';
import { toast } from "@/hooks/use-toast";
import { devLogger } from '@/utils/developmentLogger';
import { SpaceRedirectData } from "@/utils/spaceRedirect";

export default function CreateSpace() {
  const { user } = useOptimizedAuth();
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const MAX_CHARS = 30;

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a space",
        variant: "destructive",
      });
      return;
    }
    
    if (!groupName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a space name",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Generate a slug from the space name
      const slug = groupName.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-");
      
      // Check if space with this slug already exists
      const { data: existingSpace } = await getSupabaseClient()
        .from("spaces")
        .select("id")
        .eq("subdomain", slug)
        .single();
        
      if (existingSpace) {
        toast({
          title: "Space name already taken",
          description: "Please try a different name",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      // Create the space record with modern styling info
      const { data: newSpace, error } = await getSupabaseClient()
        .from("spaces")
        .insert({
          name: groupName,
          subdomain: slug,
          description: `${groupName} - a space to build and learn together.`,
          owner_id: user.id,
          member_count: 1,
          pricing_type: "free", // Initially free during trial
          price_per_month: 99, // Will be charged after trial
          cover_image: "/default-space-cover.jpg",
          primary_color: "#10b981",
          instructor: user.email?.split("@")[0] || "Space Leader",
          creatorEmail: user.email
        })
        .select()
        .single();
        
      if (error) {
        throw error;
      }

      // Explicitly create a space_members record for the owner (as a backup)
      // This should be handled by the database trigger, but we add this for extra reliability
      const { error: accessError } = await getSupabaseClient()
        .from("space_members")
        .insert({
          space_id: newSpace.id,
          user_id: user.id,
          status: 'active',
          role: "admin"
        })
        .select()
        .single();
      
      if (accessError) {
        if (process.env.NODE_ENV === 'development') {
          console.error("Error adding owner access record:", accessError);
        }
        // We don't throw here since the space was created successfully
        // and the database trigger should have added the access record
      }
      
      // Cache the newly created space in localStorage for future redirects
      try {
        devLogger.log('SpaceManagement', '🚀 Caching newly created space:', newSpace.subdomain, newSpace.id);
        
        // First clear any stale cached spaces to prevent confusion
        // Clear any outdated selections that might cause confusion
        localStorage.removeItem('selectedSpaceId');
        
        // Store complete space data for redirection
        const lastVisitedSpace = {
          id: newSpace.id,
          name: newSpace.name,
          subdomain: newSpace.subdomain,
          isOwner: true,
          lastVisited: new Date().toISOString()
        };
        localStorage.setItem('lastVisitedSpace', JSON.stringify(lastVisitedSpace));
        devLogger.log('SpaceManagement', '✅ lastVisitedSpace cached:', lastVisitedSpace);
        
        // Also store as selectedSpaceId for components that use that
        localStorage.setItem('selectedSpaceId', newSpace.id);
        devLogger.log('SpaceManagement', '✅ selectedSpaceId cached:', newSpace.id);
        
        // Store additional identifying data as lastCreatedSpace (highest priority for redirects)
        const lastCreatedSpace = {
          id: newSpace.id,
          subdomain: newSpace.subdomain,
          name: newSpace.name,
          created_at: new Date().toISOString()
        };
        localStorage.setItem('lastCreatedSpace', JSON.stringify(lastCreatedSpace));
        devLogger.log('SpaceManagement', '✅ lastCreatedSpace cached:', lastCreatedSpace);
        
        // Verify the cache worked
        const verifyCachedSpace = localStorage.getItem('lastCreatedSpace');
        devLogger.log('SpaceManagement', '✅ Cache verification:', verifyCachedSpace ? 'Space successfully cached' : 'Cache failed');
      } catch (cacheError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('⚠️ Failed to cache space in localStorage:', cacheError);
        }
        // Continue even if caching fails
      }
      
      // Navigate to the new space with a small delay to ensure data is saved
      devLogger.log('SpaceManagement', '➡️ Navigating to newly created space:', newSpace.subdomain);
      
      // Try the enhanced redirectToSpace utility
      try {
        devLogger.log('SpaceManagement', '🔀 Attempting space redirection with enhanced utility...');
        const { redirectToSpace } = await import("@/utils/spaceRedirect");
        
        // Use a brief delay to allow the database transaction to complete
        setTimeout(async () => {
          const redirected = await redirectToSpace(navigate, true);
          if (!redirected) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('⚠️ Direct redirection failed, using hard navigation to space');
            }
            navigate(`/space/${newSpace.subdomain}`, { replace: true });
          }
        }, 300);
      } catch (redirectError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('⚠️ Error using redirectToSpace utility:', redirectError);
        }
        
        // Fallback to direct navigation
        setTimeout(() => {
          devLogger.log('SpaceManagement', '➡️ Falling back to direct navigation to:', newSpace.subdomain);
          navigate(`/space/${newSpace.subdomain}`, { replace: true });
        }, 300);
      }
      
    } catch (error: unknown) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error creating space:", error);
      }
      const message = error instanceof Error ? error.message : String(error);
      toast({
        title: "Error creating space",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input change and update character count
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_CHARS) {
      setGroupName(value);
      setCharCount(value.length);
  }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <Link to="/" className="flex items-center">
            <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-red-500 to-yellow-500">
              skool
            </div>
          </Link>
          <div>
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{user.email}</span>
                <div className="h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center text-white text-sm">
                  {user.email?.charAt(0).toUpperCase() || "U"}
                </div>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center">
        <div className="grid grid-cols-1 md:grid-cols-2 max-w-7xl w-full px-4 py-8 gap-8">
          {/* Left Column - Info */}
          <div className="flex flex-col justify-center">
            <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-red-500 to-yellow-500 mb-2">
              skool
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything you need to build community and make money online.
            </h1>
            
            <div className="space-y-4 mt-6">
              <div className="flex items-center">
                <span className="mr-3 text-lg">📈</span>
                <span className="font-medium">Highly engaged</span>
              </div>
              <div className="flex items-center">
                <span className="mr-3 text-lg">❤️</span>
                <span className="font-medium">Simple to setup</span>
              </div>
              <div className="flex items-center">
                <span className="mr-3 text-lg">😀</span>
                <span className="font-medium">Fun to use</span>
              </div>
              <div className="flex items-center">
                <span className="mr-3 text-lg">💰</span>
                <span className="font-medium">Charge for membership</span>
              </div>
              <div className="flex items-center">
                <span className="mr-3 text-lg">📱</span>
                <span className="font-medium">iOS + Android apps</span>
              </div>
              <div className="flex items-center">
                <span className="mr-3 text-lg">🌎</span>
                <span className="font-medium">Millions of users daily</span>
              </div>
            </div>
            
            <div className="mt-8 text-gray-500">
              help@skool.com
            </div>
          </div>
          
          {/* Right Column - Form */}
          <div className="flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md">
              <h2 className="text-2xl font-bold text-center mb-2">Create your space</h2>
              <p className="text-center text-gray-600 mb-6">
                Free for 14 days, then $99/month. Cancel anytime.<br />
                All features. Unlimited everything. No hidden fees.
              </p>
              
              <div className="mb-6 text-center">
                <p className="text-sm text-gray-600">
                  You were referred by <span className="font-medium">Paul Dittus</span>
                </p>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <label htmlFor="groupName" className="sr-only">
                    Space name
                  </label>
                  <input
                    type="text"
                    id="groupName"
                    placeholder="Space name"
                    value={groupName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-gray-500">You can change this later</p>
                    <p className="text-xs text-gray-500">{charCount} / {MAX_CHARS}</p>
                  </div>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Your first charge will be on June 28th, 2024 for $99.
                    Cancel anytime with 1-click. By clicking below, you accept our 
                    <Link to="/terms" className="text-blue-600 hover:underline ml-1">
                      terms
                    </Link>.
                  </p>
                </div>
                
                <button
                  type="submit"
                  className={`w-full py-3 text-center font-medium text-white bg-gray-400 rounded-md uppercase transition-colors ${
                    isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-gray-700 hover:bg-gray-800"
                  }`}
                  disabled={isLoading}
                >
                  {isLoading ? "Creating..." : "START FREE TRIAL"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
      </div>
  );
}
