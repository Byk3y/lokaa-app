
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import SearchBar from "@/components/discover/SearchBar";
import SearchResults from "@/components/discover/SearchResults";
import JoinedSpaces from "@/components/discover/JoinedSpaces";
import CreateSpaceCTA from "@/components/discover/CreateSpaceCTA";
import TrendingSpaces from "@/components/discover/TrendingSpaces";
import CategorySpaces from "@/components/discover/CategorySpaces";
import useSpacesData from "@/hooks/useSpacesData";
import useJoinSpace from "@/hooks/useJoinSpace";

export default function DiscoverCommunities() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const { 
    joinedSpaces, 
    setJoinedSpaces, 
    trendingSpaces, 
    categorySpaces, 
    loading 
  } = useSpacesData();
  
  const handleJoinSpace = useJoinSpace(setJoinedSpaces);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setIsSearching(true);
    
    try {
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .ilike('name', `%${query}%`)
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

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DashboardSidebar />
      
      <div className="flex-1 lg:ml-64">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Discover Communities</h1>
          
          <div className="mb-8">
            <SearchBar onSearch={handleSearch} isSearching={isSearching} />
          </div>
          
          <SearchResults 
            searchQuery={searchQuery} 
            results={searchResults} 
            onJoinSpace={handleJoinSpace} 
          />
          
          <JoinedSpaces spaces={joinedSpaces} loading={loading} />
          
          <CreateSpaceCTA />
          
          <TrendingSpaces 
            spaces={trendingSpaces} 
            loading={loading} 
            onJoinSpace={handleJoinSpace} 
          />
          
          <CategorySpaces 
            categorySpaces={categorySpaces} 
            loading={loading} 
            onJoinSpace={handleJoinSpace} 
          />
        </div>
      </div>
    </div>
  );
}
