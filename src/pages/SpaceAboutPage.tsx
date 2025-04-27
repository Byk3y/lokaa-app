import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChevronLeft, Globe, Lock, Star, Users, Circle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

// Space data interface
interface SpaceData {
  id: string;
  name: string;
  subdomain: string;
  description: string | null;
  cover_image: string | null;
  owner_id: string;
  is_private: boolean;
  pricing_type: 'free' | 'paid';
  price_per_month: number | null;
  member_count: number;
  primary_color: string | null;
  created_at: string;
}

// API response interface
interface ApiResponse {
  success: boolean;
  message?: string;
  space?: SpaceData;
}

// Owner data interface
interface OwnerData {
  id: string;
  email: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

// User data from database
interface UserData {
  id: string;
  email?: string;
  username?: string;
}

export default function SpaceAboutPage() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const navigate = useNavigate();
  const [spaceData, setSpaceData] = useState<SpaceData | null>(null);
  const [ownerData, setOwnerData] = useState<OwnerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch space data
  useEffect(() => {
    const fetchSpaceData = async () => {
      if (!subdomain) {
        setError("No subdomain provided");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        console.log(`Fetching space data for subdomain: ${subdomain}`);
        
        // Use the new about_page_get_space function with type assertion
        const { data, error: rpcError } = await (supabase
          .rpc as any)('about_page_get_space', { target_subdomain: subdomain });

        console.log("RPC response:", data);
        
        if (rpcError) {
          console.error("Error from RPC call:", rpcError);
          setError("Failed to load space information");
          setLoading(false);
          return;
        }

        // Parse the response
        const response = data as unknown as ApiResponse;
        
        if (!response || !response.success) {
          setError(response?.message || "Space not found");
          setLoading(false);
          return;
        }

        if (!response.space) {
          setError("Space data is missing");
          setLoading(false);
          return;
        }

        const spaceInfo = response.space;
        setSpaceData(spaceInfo);
        console.log("Space data loaded:", spaceInfo);

        // Fetch owner information if we have the space
        if (spaceInfo.owner_id) {
          try {
            const { data: userData, error: ownerError } = await supabase
              .from('users')
              .select('id, email, username')
              .eq('id', spaceInfo.owner_id)
              .single();

            if (!ownerError && userData) {
              // Cast to our UserData type to handle any type mismatches
              const typedUserData = userData as any;
              
              // Convert the user data to match our OwnerData interface
              setOwnerData({
                id: typedUserData.id,
                email: typedUserData.email || null,
                username: typedUserData.username || null,
                display_name: typedUserData.username || (typedUserData.email ? typedUserData.email.split('@')[0] : 'Anonymous'),
                avatar_url: null
              });
              console.log("Owner data loaded:", typedUserData);
            } else {
              console.warn("Could not fetch owner data:", ownerError);
              // Set a default owner display when we can't fetch the actual owner
              setOwnerData({
                id: spaceInfo.owner_id,
                email: null,
                username: null,
                display_name: 'Space Creator',
                avatar_url: null
              });
            }
          } catch (userErr) {
            console.warn("Error fetching user data:", userErr);
            // Set a default owner even when errors occur
            setOwnerData({
              id: spaceInfo.owner_id,
              email: null,
              username: null,
              display_name: 'Space Creator',
              avatar_url: null
            });
          }
        }
      } catch (err) {
        console.error("Exception fetching space:", err);
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchSpaceData();
  }, [subdomain]);

  // Generate a gradient background color based on primary color or default
  const generateGradientBackground = () => {
    if (!spaceData?.primary_color) return 'linear-gradient(to right, #10b981, #3b82f6)'; // Default teal to blue
    
    const primaryColor = spaceData.primary_color;
    // Create a slightly different shade for the gradient end
    const secondaryColor = primaryColor.replace(/^#/, '');
    
    // Simple logic to create a complementary color for the gradient
    // This is a very basic approach - a more sophisticated color theory approach would be better
    const r = parseInt(secondaryColor.substring(0, 2), 16);
    const g = parseInt(secondaryColor.substring(2, 4), 16);
    const b = parseInt(secondaryColor.substring(4, 6), 16);
    
    // Shift the hue for the second color
    const newR = (r + 40) % 255;
    const newG = (g + 20) % 255;
    const newB = (b + 60) % 255;
    
    const secondColor = `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    
    return `linear-gradient(to right, ${primaryColor}, ${secondColor})`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-12 h-12 animate-spin text-teal-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900">Loading space information...</h2>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg shadow-sm">
            <div className="text-red-500 mb-4 text-6xl">
              <span>🔍</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Space Not Found</h2>
            <p className="text-gray-600 mb-8 text-center max-w-md">
              {error === "Space not found" 
                ? `We couldn't find a space with the subdomain "${subdomain}".` 
                : error}
            </p>
            <Button 
              onClick={() => navigate('/discover')}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Return to Discover
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // No space data state
  if (!spaceData) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-gray-600">No space information available</p>
            <Button 
              onClick={() => navigate('/discover')}
              className="mt-4 bg-teal-600 hover:bg-teal-700"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Return to Discover
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Main render with space data
  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>{spaceData.name} - About | Lokaa Connect</title>
        <meta name="description" content={spaceData.description || `Learn more about ${spaceData.name} on Lokaa Connect.`} />
        <meta property="og:title" content={`${spaceData.name} - About | Lokaa Connect`} />
        <meta property="og:description" content={spaceData.description || `Learn more about ${spaceData.name} on Lokaa Connect.`} />
        {spaceData.cover_image && <meta property="og:image" content={spaceData.cover_image} />}
      </Helmet>
      
      {/* Header and Cover Image */}
      <div className="relative">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="h-64 w-full" 
          style={{
            background: spaceData.cover_image 
              ? `url(${spaceData.cover_image})` 
              : generateGradientBackground(),
            backgroundColor: spaceData.primary_color || '#10b981',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />

        {/* Back button overlay */}
        <div className="absolute top-4 left-4">
          <Button 
            onClick={() => navigate('/discover')} 
            variant="outline" 
            className="bg-white/80 backdrop-blur-sm hover:bg-white/90"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Discover
          </Button>
        </div>
      </div>

      {/* Space Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Space Header */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{spaceData.name}</h1>
                <div className="flex items-center mt-2 text-sm text-gray-600">
                  <span className="inline-flex items-center">
                    {spaceData.is_private ? (
                      <><Lock className="h-4 w-4 mr-1" /> Private</>
                    ) : (
                      <><Globe className="h-4 w-4 mr-1" /> Public</>
                    )}
                  </span>
                  <span className="mx-2">•</span>
                  <span>{spaceData.pricing_type === 'paid' && spaceData.price_per_month 
                    ? `$${spaceData.price_per_month}/month` 
                    : 'Free'}
                  </span>
                  <span className="mx-2">•</span>
                  <span>lokaa.com/{spaceData.subdomain}</span>
                </div>
              </div>
              <a href={`/space/${spaceData.subdomain}`} className="no-underline">
                <Button className="bg-teal-600 hover:bg-teal-700 px-6 py-2 text-base">
                  Join Space
                </Button>
              </a>
            </div>
          </div>

          {/* Main content */}
          <div className="p-6">
            {/* Description */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">About this space</h2>
              <p className="text-gray-700">
                {spaceData.description || "This space hasn't added a description yet."}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <Users className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                <p className="text-lg font-semibold">{spaceData.member_count || 1}</p>
                <p className="text-xs text-gray-500">Members</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <Circle className="h-5 w-5 mx-auto mb-1 text-green-500 fill-green-500" />
                <p className="text-lg font-semibold">2</p>
                <p className="text-xs text-gray-500">Online Now</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <Shield className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                <p className="text-lg font-semibold">1</p>
                <p className="text-xs text-gray-500">Admins</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <Star className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                <p className="text-lg font-semibold">5.0</p>
                <p className="text-xs text-gray-500">Rating</p>
              </div>
            </div>

            {/* Media Gallery */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Gallery</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <div 
                    key={item} 
                    className="aspect-video bg-gray-100 rounded-lg overflow-hidden"
                  >
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="w-full h-full bg-cover bg-center"
                      style={{ backgroundImage: `url(https://picsum.photos/400/225?random=${item})` }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Testimonials */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">What members are saying</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 italic mb-3">"This space has been amazing for learning and connecting with others!"</p>
                  <p className="text-sm text-gray-600 font-medium">— Sarah J.</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 italic mb-3">"Worth every penny. The resources here have transformed my skills."</p>
                  <p className="text-sm text-gray-600 font-medium">— Michael T.</p>
                </div>
              </div>
            </div>

            {/* Creator Info */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Created by</h2>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden mr-4">
                  {ownerData?.avatar_url ? (
                    <img 
                      src={ownerData.avatar_url} 
                      alt={ownerData.display_name || 'Space creator'} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget;
                        // Fall back to the initial display if image fails to load
                        target.parentElement?.classList.add('img-error');
                        // Add owner initial or question mark as fallback content
                        const initialDiv = document.createElement('div');
                        initialDiv.className = "w-full h-full flex items-center justify-center bg-teal-600 text-white font-semibold text-lg";
                        initialDiv.textContent = ownerData?.display_name?.charAt(0) || '?';
                        target.parentElement?.appendChild(initialDiv);
                        // Hide the failed image
                        target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-teal-600 text-white font-semibold text-lg">
                      {ownerData?.display_name?.charAt(0) || '?'}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium">
                    {ownerData?.display_name || 'Space Creator'}
                  </p>
                  <p className="text-sm text-gray-600">Space Creator</p>
                </div>
              </div>
            </div>
          </div>

          {/* Call to action */}
          <div className="p-6 bg-gray-50 border-t border-gray-100">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Ready to join this space?</h3>
              <p className="text-gray-600 mb-4">Get access to everything this space has to offer.</p>
              <a href={`/space/${spaceData.subdomain}`} className="no-underline">
                <Button className="bg-teal-600 hover:bg-teal-700 px-8 py-2.5 text-base font-medium">
                  Join Space
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 