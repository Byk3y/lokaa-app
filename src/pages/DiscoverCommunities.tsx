import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, TrendingUp, Music, Code, Gamepad2, GraduationCap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SpaceCard from "@/components/spaces/SpaceCard";
import EmptyState from "@/components/dashboard/EmptyState";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";

export default function DiscoverCommunities() {
  const { user, userDetails } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [joinedSpaces, setJoinedSpaces] = useState([]);
  const [trendingSpaces, setTrendingSpaces] = useState([]);
  const [categorySpaces, setCategorySpaces] = useState({
    music: [],
    tech: [],
    gaming: [],
    education: []
  });
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const fetchJoinedSpaces = async () => {
      try {
        if (!user) return;
        
        const { data, error } = await supabase
          .from('memberships')
          .select('space_id')
          .eq('user_id', user.id)
          .eq('is_active', true);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const spaceIds = data.map(membership => membership.space_id);
          
          const { data: spacesData, error: spacesError } = await supabase
            .from('spaces')
            .select('*')
            .in('id', spaceIds);
          
          if (spacesError) throw spacesError;
          
          setJoinedSpaces(spacesData || []);
        } else {
          setJoinedSpaces([]);
        }
      } catch (error) {
        console.error('Error fetching joined spaces:', error);
        toast({
          title: "Error loading joined spaces",
          description: "Could not load your spaces at this time.",
          variant: "destructive"
        });
      }
    };

    fetchJoinedSpaces();
  }, [user]);

  useEffect(() => {
    const fetchSpaces = async () => {
      try {
        setLoading(true);
        
        const { data: trendingData, error: trendingError } = await supabase
          .from('spaces')
          .select('*')
          .order('member_count', { ascending: false })
          .limit(6);
        
        if (trendingError) throw trendingError;
        setTrendingSpaces(trendingData || []);
        
        const categories = ['music', 'tech', 'gaming', 'education'];
        const categorizedSpaces = {
          music: [],
          tech: [],
          gaming: [],
          education: []
        };
        
        const { data: allSpaces, error: allSpacesError } = await supabase
          .from('spaces')
          .select('*')
          .limit(20);
        
        if (allSpacesError) throw allSpacesError;
        
        if (allSpaces) {
          allSpaces.forEach(space => {
            const randomCategoryIndex = Math.floor(Math.random() * categories.length);
            const category = categories[randomCategoryIndex];
            if (categorizedSpaces[category].length < 6) {
              categorizedSpaces[category].push(space);
            }
          });
        }
        
        setCategorySpaces(categorizedSpaces);
      } catch (error) {
        console.error('Error fetching spaces:', error);
        toast({
          title: "Error loading spaces",
          description: "Could not load spaces at this time.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSpaces();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .ilike('name', `%${searchQuery}%`)
        .order('member_count', { ascending: false });
      
      if (error) throw error;
      
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching spaces:', error);
      toast({
        title: "Search error",
        description: "Could not perform search at this time.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleJoinSpace = async (spaceId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    try {
      const { data: existingMembership, error: checkError } = await supabase
        .from('memberships')
        .select('*')
        .eq('user_id', user.id)
        .eq('space_id', spaceId)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      if (existingMembership) {
        if (!existingMembership.is_active) {
          const { error: updateError } = await supabase
            .from('memberships')
            .update({ is_active: true })
            .eq('id', existingMembership.id);
          
          if (updateError) throw updateError;
        } else {
          toast({
            title: "Already a member",
            description: "You are already a member of this space.",
          });
          return;
        }
      } else {
        const { error: insertError } = await supabase
          .from('memberships')
          .insert({
            user_id: user.id,
            space_id: spaceId,
            is_active: true
          });
        
        if (insertError) throw insertError;
      }
      
      toast({
        title: "Joined space",
        description: "You have successfully joined this space.",
      });
      
      const { data: joinedData, error: joinedError } = await supabase
        .from('spaces')
        .select('*')
        .eq('id', spaceId)
        .single();
      
      if (joinedError) throw joinedError;
      
      setJoinedSpaces(prev => [...prev, joinedData]);
    } catch (error) {
      console.error('Error joining space:', error);
      toast({
        title: "Error joining space",
        description: "Could not join this space at this time.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DashboardSidebar />
      
      <div className="flex-1 lg:ml-64">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Discover Communities</h1>
          
          <div className="mb-8">
            <div className="relative">
              <Input
                placeholder="Search for spaces..."
                className="pl-10 pr-4 py-2"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Search 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                size={18} 
              />
              <Button 
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 px-3 bg-lokaa-600 hover:bg-lokaa-700"
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
              >
                {isSearching ? "Searching..." : "Search"}
              </Button>
            </div>
          </div>
          
          {searchQuery && searchResults.length > 0 ? (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Search Results</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.map((space) => (
                  <div key={space.id} className="relative">
                    <SpaceCard {...space} />
                    <Button
                      className="absolute bottom-4 right-4 bg-lokaa-600 hover:bg-lokaa-700"
                      onClick={() => handleJoinSpace(space.id)}
                    >
                      Join Space
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Spaces You've Joined</h2>
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lokaa-600"></div>
              </div>
            ) : joinedSpaces.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {joinedSpaces.map((space) => (
                  <SpaceCard key={space.id} {...space} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No spaces joined yet"
                description="Join spaces to connect with communities you're interested in"
                actionText="Browse Spaces"
                actionLink="#trending-spaces"
                icon={<TrendingUp className="h-8 w-8 text-lokaa-600" />}
              />
            )}
          </div>
          
          <div className="mb-10 bg-lokaa-50 rounded-xl p-6 border border-lokaa-100">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Want to build your own Space?</h3>
              <p className="text-gray-600 mb-4">Start your community and monetize your passion.</p>
              <Button 
                className="bg-lokaa-600 hover:bg-lokaa-700 px-6 py-2 text-lg"
                onClick={() => navigate('/spaces/create')}
              >
                Create My Space
              </Button>
            </div>
          </div>
          
          <div className="mb-8" id="trending-spaces">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Trending Spaces</h2>
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lokaa-600"></div>
              </div>
            ) : trendingSpaces.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trendingSpaces.map((space) => (
                  <div key={space.id} className="relative">
                    <SpaceCard {...space} />
                    <Button
                      className="absolute bottom-4 right-4 bg-lokaa-600 hover:bg-lokaa-700"
                      onClick={() => handleJoinSpace(space.id)}
                    >
                      Join Space
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No trending spaces available"
                description="Check back later for trending spaces"
                actionText="Create a Space"
                actionLink="/spaces/create"
                icon={<TrendingUp className="h-8 w-8 text-lokaa-600" />}
              />
            )}
          </div>
          
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Browse by Category</h2>
            <Tabs defaultValue="music">
              <TabsList className="mb-4">
                <TabsTrigger value="music" className="flex items-center">
                  <Music className="mr-2 h-4 w-4" /> Music
                </TabsTrigger>
                <TabsTrigger value="tech" className="flex items-center">
                  <Code className="mr-2 h-4 w-4" /> Tech
                </TabsTrigger>
                <TabsTrigger value="gaming" className="flex items-center">
                  <Gamepad2 className="mr-2 h-4 w-4" /> Gaming
                </TabsTrigger>
                <TabsTrigger value="education" className="flex items-center">
                  <GraduationCap className="mr-2 h-4 w-4" /> Education
                </TabsTrigger>
              </TabsList>
              
              {Object.keys(categorySpaces).map((category) => (
                <TabsContent key={category} value={category}>
                  {loading ? (
                    <div className="flex justify-center items-center h-40">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lokaa-600"></div>
                    </div>
                  ) : categorySpaces[category].length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {categorySpaces[category].map((space) => (
                        <div key={space.id} className="relative">
                          <SpaceCard {...space} />
                          <Button
                            className="absolute bottom-4 right-4 bg-lokaa-600 hover:bg-lokaa-700"
                            onClick={() => handleJoinSpace(space.id)}
                          >
                            Join Space
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title={`No ${category} spaces available`}
                      description={`Check back later for ${category} spaces`}
                      actionText="Explore Other Categories"
                      actionLink="#trending-spaces"
                      icon={<TrendingUp className="h-8 w-8 text-lokaa-600" />}
                    />
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
