
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function useSpacesData() {
  const { user } = useAuth();
  const [joinedSpaces, setJoinedSpaces] = useState([]);
  const [trendingSpaces, setTrendingSpaces] = useState([]);
  const [featuredSpaces, setFeaturedSpaces] = useState([]);
  const [categorySpaces, setCategorySpaces] = useState({
    music: [],
    tech: [],
    gaming: [],
    education: []
  });
  const [loading, setLoading] = useState(true);

  // Fetch joined spaces
  useEffect(() => {
    const fetchJoinedSpaces = async () => {
      try {
        if (!user) {
          setJoinedSpaces([]);
          return;
        }
        
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

  // Fetch trending and category spaces
  useEffect(() => {
    const fetchSpaces = async () => {
      try {
        setLoading(true);
        
        // Get trending spaces
        const { data: trendingData, error: trendingError } = await supabase
          .from('spaces')
          .select('*')
          .order('member_count', { ascending: false })
          .limit(6);
        
        if (trendingError) throw trendingError;
        setTrendingSpaces(trendingData || []);
        
        // Get featured spaces (for now, we'll use the top 3 most popular)
        const { data: featuredData, error: featuredError } = await supabase
          .from('spaces')
          .select('*')
          .order('member_count', { ascending: false })
          .limit(3);
        
        if (featuredError) throw featuredError;
        setFeaturedSpaces(featuredData || []);
        
        // Get spaces by category
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

  return {
    joinedSpaces,
    setJoinedSpaces,
    trendingSpaces,
    featuredSpaces,
    categorySpaces,
    loading
  };
}
