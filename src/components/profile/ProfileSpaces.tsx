import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { SpaceCard } from "@/components/spaces/SpaceCard";
import LoadingSpinner from "@/components/discover/LoadingSpinner";

interface ProfileSpacesProps {
  userId: string;
  isCreator: boolean;
}

export default function ProfileSpaces({ userId, isCreator }: ProfileSpacesProps) {
  const [createdSpaces, setCreatedSpaces] = useState<any[]>([]);
  const [joinedSpaces, setJoinedSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpaces = async () => {
      try {
        setLoading(true);
        
        // Fetch spaces created by user if they're a creator
        if (isCreator) {
          const { data: ownedData, error: ownedError } = await getSupabaseClient()
            .from('spaces')
            .select('*')
            .eq('owner_id', userId);
            
          if (ownedError) throw ownedError;
          setCreatedSpaces(ownedData || []);
        }
        
        // Fetch spaces joined by user
        const { data: memberRecords, error: memberError } = await getSupabaseClient()
          .from('space_members')
          .select('space_id')
          .eq('user_id', userId)
          .eq('status', 'active');
          
        if (memberError) throw memberError;
        
        if (memberRecords && memberRecords.length > 0) {
          const spaceIds = memberRecords.map(member => member.space_id);
          
          const { data: spacesData, error: spacesError } = await getSupabaseClient()
            .from('spaces')
            .select('*')
            .in('id', spaceIds);
            
          if (spacesError) throw spacesError;
          setJoinedSpaces(spacesData || []);
        }
      } catch (error) {
        console.error('Error fetching spaces:', error);
        toast({
          title: "Error loading spaces",
          description: "Could not load spaces for this user.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSpaces();
  }, [userId, isCreator]);

  if (loading) {
    return <LoadingSpinner />;
  }

  const hasSpaces = createdSpaces.length > 0 || joinedSpaces.length > 0;

  if (!hasSpaces) {
    return (
      <div className="text-center py-8 px-4">
        <h3 className="text-lg font-medium mb-2">No Spaces Yet</h3>
        <p className="text-gray-600">This user hasn't joined or created any communities yet.</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {createdSpaces.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-medium mb-4">Created Spaces</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {createdSpaces.map((space) => (
              <div key={space.id} className="relative">
                <SpaceCard space={space} />
                <Link to={space.subdomain ? `/space/${space.subdomain}` : `/space/${space.id}`} className="absolute inset-0" aria-label={`Visit ${space.name}`}></Link>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {joinedSpaces.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-4">Joined Spaces</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {joinedSpaces.map((space) => (
              <div key={space.id} className="relative">
                <SpaceCard space={space} />
                <Link to={space.subdomain ? `/space/${space.subdomain}` : `/space/${space.id}`} className="absolute inset-0" aria-label={`Visit ${space.name}`}></Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
