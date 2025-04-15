
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import CommunityCard from "@/components/communities/CommunityCard";
import LoadingSpinner from "@/components/discover/LoadingSpinner";
import useCommunitiesData from "@/hooks/useCommunitiesData";
import useJoinCommunity from "@/hooks/useJoinCommunity";

export default function DiscoverCommunities() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const { 
    joinedCommunities, 
    setJoinedCommunities, 
    trendingCommunities, 
    loading 
  } = useCommunitiesData();
  
  const handleJoinCommunity = useJoinCommunity(setJoinedCommunities);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    
    try {
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .ilike('name', `%${searchQuery}%`)
        .order('member_count', { ascending: false });
      
      if (error) throw error;
      
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching communities:', error);
      toast({
        title: "Search error",
        description: "Could not perform search at this time.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Discover Communities</h1>
        
        <Button asChild className="bg-lokaa-600 hover:bg-lokaa-700">
          <Link to="/communities/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Community
          </Link>
        </Button>
      </div>
      
      {/* Search form */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            type="search"
            placeholder="Search communities..."
            className="pl-10 py-3 text-base"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button 
            type="submit" 
            className="absolute right-2.5 bottom-2.5 bg-lokaa-600 hover:bg-lokaa-700 py-2"
            disabled={isSearching}
          >
            {isSearching ? <LoadingSpinner size="sm" /> : 'Search'}
          </Button>
        </div>
      </form>
      
      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Search Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {searchResults.map((community) => (
              <div key={community.id} className="relative">
                <CommunityCard {...community} />
                {!joinedCommunities.some(c => c.id === community.id) && (
                  <Button
                    className="absolute bottom-4 right-4 bg-lokaa-600 hover:bg-lokaa-700"
                    onClick={() => handleJoinCommunity(community.id)}
                  >
                    Join Community
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Trending communities */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Trending Communities</h2>
        {loading ? (
          <LoadingSpinner />
        ) : trendingCommunities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendingCommunities.map((community) => (
              <div key={community.id} className="relative">
                <CommunityCard {...community} />
                {!joinedCommunities.some(c => c.id === community.id) && (
                  <Button
                    className="absolute bottom-4 right-4 bg-lokaa-600 hover:bg-lokaa-700"
                    onClick={() => handleJoinCommunity(community.id)}
                  >
                    Join Community
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-600">No trending communities available</p>
          </div>
        )}
      </div>
      
      {/* Categories - we could add this later */}
    </div>
  );
}
