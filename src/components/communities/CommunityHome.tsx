
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import LoadingSpinner from "@/components/discover/LoadingSpinner";
import CreatorDashboard from "@/pages/CreatorDashboard";

interface Community {
  id: string;
  name: string;
  description: string;
  cover_image: string;
  member_count: number;
  is_paid: boolean;
  price_per_month: number;
  owner_id: string;
}

export default function CommunityHome() {
  const { communityId } = useParams();
  const { user } = useAuth();
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const fetchCommunity = async () => {
      if (!communityId) return;
      
      try {
        const { data, error } = await supabase
          .from('communities')
          .select('*')
          .eq('id', communityId)
          .single();
          
        if (error) throw error;
        setCommunity(data);
        
        // Check if user is the owner
        if (user && data.owner_id === user.id) {
          setIsOwner(true);
        }
      } catch (error) {
        console.error('Error fetching community:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCommunity();
  }, [communityId, user]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!community) {
    return <div className="text-center p-8">Community not found</div>;
  }

  // Show Creator Dashboard if the user is the owner
  if (isOwner) {
    return <CreatorDashboard />;
  }

  // Show Member View for non-owners
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{community.name}</h1>
        <p className="text-gray-600">{community.description}</p>
      </div>
      
      {community.cover_image && (
        <div className="rounded-lg overflow-hidden h-48 mb-6">
          <img 
            src={community.cover_image} 
            alt={community.name} 
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-2">Members</h3>
          <p className="text-3xl font-bold">{community.member_count}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-2">Spaces</h3>
          <p className="text-3xl font-bold">0</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-2">Activity</h3>
          <p className="text-3xl font-bold">-</p>
        </div>
      </div>
    </div>
  );
}
