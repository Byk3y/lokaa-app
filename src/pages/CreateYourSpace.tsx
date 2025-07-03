import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { getSupabaseClient } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import LoadingIndicator from "@/components/LoadingIndicator";
import { devLogger } from '@/utils/developmentLogger';

export default function CreateYourSpace() {
  const { user } = useOptimizedAuth();
  const navigate = useNavigate();
  const [spaceName, setSpaceName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [fromSpaceSwitcher, setFromSpaceSwitcher] = useState(false);
  const MAX_CHARS = 30;

  // Check if we came from the space switcher
  useEffect(() => {
    const fromSwitcher = sessionStorage.getItem('coming_from_space_switcher') === 'true';
    setFromSpaceSwitcher(fromSwitcher);
    
    // Clean up the flag
    if (fromSwitcher) {
      sessionStorage.removeItem('coming_from_space_switcher');
    }
  }, []);

  // Handle navigation back to discover page
  const handleBackToDiscover = () => {
    navigate('/discover');
  };

  // Handle navigation back to previous page
  const handleGoBack = () => {
    navigate(-1); // This will go back to the previous page in the browser history
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    devLogger.log('SpaceManagement', "Starting space creation process...");
    devLogger.log('SpaceManagement', "Current user:", user?.id, user?.email);
    
    if (!user) {
      if (process.env.NODE_ENV === 'development') {
        console.error("No authenticated user found");
      }
      toast({
        title: "Error",
        description: "You must be logged in to create a space",
        variant: "destructive",
      });
      return;
    }
    
    if (!spaceName.trim()) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Space name is empty");
      }
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
      const slug = spaceName.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-");
      
      devLogger.log('SpaceManagement', "Generated slug for space:", slug);
      
      // Check if space with this slug already exists
      devLogger.log('SpaceManagement', "Checking if space with slug already exists:", slug);
      const { data: existingSpace, error: checkError } = await getSupabaseClient()
        .from("spaces")
        .select("id")
        .eq("subdomain", slug)
        .single();
        
      if (checkError && !checkError.message.includes("No rows found")) {
        if (process.env.NODE_ENV === 'development') {
          console.error("Error checking for existing space:", checkError);
        }
      }
      
      if (existingSpace) {
        if (process.env.NODE_ENV === 'development') {
          console.error("Space with this slug already exists:", existingSpace);
        }
        toast({
          title: "Space name already taken",
          description: "Please try a different name",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      // Try creating the space with minimal fields
      let createdSpace = null;
      let creationSuccess = false;
      
      // First attempt - try using admin function
      try {
        devLogger.log('SpaceManagement', "[CreateSpace] Attempting to create space with admin function");
        
        // Use the admin_create_space function which bypasses RLS
        const { data, error: funcError } = await getSupabaseClient().rpc(
          'admin_create_space',
          {
            space_name: spaceName,
            space_subdomain: slug,
            owner_id: user.id
          }
        );
          
        if (funcError) {
          if (process.env.NODE_ENV === 'development') {
            console.warn("[CreateSpace] Admin function attempt failed:", funcError);
          }
          throw funcError; // Move to direct insert attempt
        }
        
        if (data) {
          devLogger.log('SpaceManagement', "[CreateSpace] Admin function succeeded:", data);
          // The admin function returns just the ID, so construct our object
          createdSpace = { id: data, subdomain: slug };
          creationSuccess = true;
        }
      } catch (adminAttemptError) {
        devLogger.log('SpaceManagement', "[CreateSpace] Admin function failed, trying direct insert");
        
        // Second attempt - standard approach
        try {
          devLogger.log('SpaceManagement', "[CreateSpace] Attempting standard insert");
          
          // Standard direct insert
          const { data, error: insertError } = await getSupabaseClient()
            .from("spaces")
            .insert({
              name: spaceName,
              subdomain: slug,
              owner_id: user.id,
              created_at: new Date().toISOString()
            })
            .select("id, subdomain")
            .single();
            
          if (insertError) {
            if (process.env.NODE_ENV === 'development') {
              console.warn("[CreateSpace] Standard insert failed:", insertError);
            }
            throw insertError; // Move to minimal fields attempt
          }
          
          if (data) {
            devLogger.log('SpaceManagement', "[CreateSpace] Standard insert succeeded:", data);
            createdSpace = data;
            creationSuccess = true;
          }
        } catch (firstAttemptError) {
          devLogger.log('SpaceManagement', "[CreateSpace] Standard insert failed, trying minimal approach");
          
          // Third attempt - even more minimal approach
          try {
            // Doing a raw insert with absolutely minimal fields
            const { data, error: insertError } = await getSupabaseClient()
              .from("spaces")
              .insert({
                name: spaceName,
                subdomain: slug,
                owner_id: user.id
              })
              .select("id, subdomain")
              .single();
            
            // If we still have the recursion error, show the SQL fix
            if (insertError && 
                (insertError.message.includes("recursion") || 
                 insertError.message.includes("policy"))) {
              
              devLogger.log('SpaceManagement', "[CreateSpace] Minimal approach failed with policy error, showing emergency fix");
              
              // Request workaround from backend team
              toast({
                title: "Database Issue Detected",
                description: "Critical database policy needs to be fixed. Check the form for emergency SQL.",
                variant: "destructive",
              });
              
              // Display helpful error for admins
              const errorDiv = document.createElement('div');
              errorDiv.style.padding = '15px';
              errorDiv.style.margin = '20px 0';
              errorDiv.style.background = '#ffe8e8';
              errorDiv.style.border = '1px solid #ff5252';
              errorDiv.style.borderRadius = '4px';
              errorDiv.style.fontFamily = 'monospace';
              errorDiv.style.whiteSpace = 'pre-wrap';
              
              errorDiv.innerHTML = `
                <h3 style="margin-top:0">EMERGENCY DATABASE FIX</h3>
                <p>Run this SQL to completely reset all space policies:</p>
                <code style="display:block;background:#333;color:white;padding:10px;margin:10px 0;overflow:auto">
-- EMERGENCY POLICY FIX
-- PART 1: Drop ALL space policies
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'spaces'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON spaces', policy_record.policyname);
  END LOOP;
END $$;

-- PART 2: Create only basic policies
CREATE POLICY "spaces_select" ON spaces FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "spaces_insert" ON spaces FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
                </code>
              `;
              
              // Append the error message to the page
              document.querySelector('form')?.appendChild(errorDiv);
              
              // If still not successful, throw final error
              if (!creationSuccess) {
                throw new Error("Database policy recursion error - need emergency SQL fix");
              }
            } else if (insertError) {
              if (process.env.NODE_ENV === 'development') {
                console.error("[CreateSpace] All attempts failed:", insertError);
              }
              throw insertError;
            } else if (data) {
              devLogger.log('SpaceManagement', "[CreateSpace] Minimal fields attempt succeeded:", data);
              createdSpace = data;
              creationSuccess = true;
            }
          } catch (thirdAttemptError) {
            if (!creationSuccess) { // Only throw if not already successful
              if (process.env.NODE_ENV === 'development') {
                console.error("[CreateSpace] All attempts failed:", thirdAttemptError);
              }
              throw thirdAttemptError;
            }
          }
        }
      }
      
      // If space creation was successful
      if (creationSuccess && createdSpace) {
        toast({
          title: "Space created!",
          description: "Your space has been successfully created.",
        });
        
        // Navigate to the new space page
        devLogger.log('SpaceManagement', "Navigating to new space with subdomain:", createdSpace.subdomain);
        navigate(`/space/${createdSpace.subdomain}`);
      } else {
        throw new Error("Failed to create space due to database policy issues");
      }
    } catch (error: unknown) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error creating space:", error);
      }
      
      // Provide more specific error messages based on error type
      let errorMessage = "Something went wrong. Please try again.";
      let errorTitle = "Error creating space";
      
      if (error instanceof Error) {
        errorMessage = error.message;
        // Check for specific error messages or codes if available
        if (error.message.includes("violates foreign key constraint")) {
          errorMessage = "There was an issue with database references. Please try again later.";
        } else if (error.message.includes("duplicate key")) {
          errorMessage = "A space with this name already exists. Please try a different name.";
        } else if (error.message.includes("violates not-null constraint")) {
          errorMessage = "Missing required information. Please check console for details.";
          if (process.env.NODE_ENV === 'development') {
            console.error("Missing field error:", error.message);
          }
        } 
        // Check for a 'code' property, common in Supabase errors
        else if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === "42703") {
          errorMessage = "Our system is being updated. Please try again in a few minutes.";
          errorTitle = "System Maintenance";
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
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
      setSpaceName(value);
      setCharCount(value.length);
    }
  };

  // Clear cached space data from local storage to fix navigation issues
  const handleResetCache = () => {
    try {
      // Clear local storage items that might cause navigation issues
      localStorage.removeItem('selectedSpaceId');
      localStorage.removeItem('lastVisitedSpace');
      sessionStorage.removeItem('selectedSpaceId');
      sessionStorage.removeItem('spaceData');
      
      toast({
        title: "Cache cleared",
        description: "Your space navigation data has been reset.",
      });
      
      // Force refresh after a brief delay
      setTimeout(() => {
        window.location.href = '/discover';
      }, 1500);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error clearing cache:", error);
      }
      toast({
        title: "Error",
        description: "Failed to clear cache. Try again or contact support.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Back button */}
      <div className="px-4 py-4">
        <button 
          onClick={handleGoBack}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
      </div>
      
      <div className="flex-grow flex flex-col md:flex-row items-start justify-center md:items-center max-w-7xl mx-auto w-full px-4 py-16 md:py-24 gap-16 md:gap-24">
        {/* Left Column - Value Props */}
        <div className="md:w-1/2 flex flex-col justify-center max-w-md">
          {/* Lokaa Logo */}
          <div className="mb-6">
            <div className="text-2xl font-bold text-[#00A389]">Lokaa</div>
          </div>
          
          {/* Headline */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
            Everything you need to build your space and make money online.
          </h1>
          
          {/* Feature List */}
          <div className="space-y-5 mt-2">
            <div className="flex items-center">
              <span className="mr-3 text-lg">✓</span>
              <span className="font-medium text-gray-700">Easy to set up</span>
            </div>
            <div className="flex items-center">
              <span className="mr-3 text-lg">❤️</span>
              <span className="font-medium text-gray-700">Your own brand</span>
            </div>
            <div className="flex items-center">
              <span className="mr-3 text-lg">💬</span>
              <span className="font-medium text-gray-700">Posts, comments, events</span>
            </div>
            <div className="flex items-center">
              <span className="mr-3 text-lg">💰</span>
              <span className="font-medium text-gray-700">Charge for access</span>
            </div>
            <div className="flex items-center">
              <span className="mr-3 text-lg">📱</span>
              <span className="font-medium text-gray-700">Works on all devices</span>
            </div>
            <div className="flex items-center">
              <span className="mr-3 text-lg">🌎</span>
              <span className="font-medium text-gray-700">Built for community creators</span>
            </div>
          </div>
          
          <div className="mt-8 text-gray-500">
            help@lokaa.com
          </div>
          
          {/* Troubleshooting section */}
          <div className="mt-6">
            <button
              onClick={() => setShowTroubleshooting(!showTroubleshooting)}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              {showTroubleshooting ? 'Hide troubleshooting' : 'Having trouble accessing spaces?'}
            </button>
            
            {showTroubleshooting && (
              <div className="mt-3 p-3 bg-gray-100 rounded-md">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Troubleshooting Options</h3>
                <p className="text-xs text-gray-500 mb-3">
                  If you're experiencing navigation issues or spaces not loading correctly, 
                  try resetting your local cache:
                </p>
                <button
                  onClick={handleResetCache}
                  className="text-xs px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded text-gray-700"
                >
                  Reset Navigation Cache
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Right Column - Create Space Form */}
        <div className="md:w-1/2 w-full">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto w-full">
            <h2 className="text-2xl font-bold text-center mb-2">Create your space</h2>
            <p className="text-center text-gray-600 mb-8">
              Free for 30 days, then $19/month. Cancel anytime.<br />
              All features. Unlimited members. No hidden fees.
            </p>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Space name
                </label>
                <input
                  type="text"
                  id="spaceName"
                  placeholder="Your Amazing Community"
                  value={spaceName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00A389]"
                  required
                />
                <div className="flex justify-between mt-1">
                  <p className="text-xs text-gray-500">You can change this later</p>
                  <p className="text-xs text-gray-500">{charCount} / {MAX_CHARS}</p>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="bg-yellow-50 rounded-md p-4">
                  <div className="flex items-center mb-2">
                    <div className="w-5 h-5 bg-[#00A389] rounded-full flex items-center justify-center mr-2">
                      <span className="text-white font-bold text-xs">!</span>
                    </div>
                    <span className="font-semibold">Your payment info is secured</span>
                  </div>
                  <p className="text-sm text-gray-600 ml-7">Payment will be set up later</p>
                </div>
              </div>
              
              <div className="mb-8 text-sm text-gray-600">
                <p>Your first charge will be on May 24th, 2025 for $19.</p>
                <p>Cancel anytime with 1-click. By continuing, you agree to our <a href="/terms" className="text-[#00A389] hover:underline">terms</a>.</p>
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 px-4 bg-[#00A389] hover:bg-[#00866f] text-white text-center font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-[#00A389] focus:ring-offset-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <LoadingIndicator size="small" nonBlocking={false} className="mr-2" />
                    Creating Space...
                  </span>
                ) : 'START FREE TRIAL'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 