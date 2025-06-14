import { useState, useEffect } from "react";
import { SpaceCard } from "@/components/spaces/SpaceCard";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useBatchMemberCounts } from "@/hooks/useBatchMemberCounts";

// Define an interface for the space objects with member_count
interface SpaceWithMemberCount {
  id: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  subdomain: string;
  owner_id: string;
  is_private: boolean;
  member_count: number;
  // Add other fields from your 'spaces' table if needed by SpaceCard
}

export default function Spaces() {
  const [spaces, setSpaces] = useState<SpaceWithMemberCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get space IDs for batch fetching
  const spaceIds = spaces.map(space => space.id);
  
  // Use the batch member counts hook
  const { counts: memberCounts, loading: memberCountsLoading } = useBatchMemberCounts(spaceIds);

  useEffect(() => {
    async function fetchSpaces() {
      try {
        setLoading(true);
        setError(null);

        // Fetch spaces from Supabase
        const { data, error } = await getSupabaseClient()
          .from('spaces')
          .select('id, name, description, cover_image, subdomain, owner_id, is_private, member_count')
          .order('created_at', { ascending: false })
          .limit(12);

        if (error) throw error;

        // Set initial spaces with default member count
        const spacesWithDefaultCount = data.map(space => ({
              ...space,
          member_count: space.member_count || 0,
        }));

        setSpaces(spacesWithDefaultCount as SpaceWithMemberCount[]);
      } catch (err: unknown) {
        console.error("Error fetching spaces:", err);
        const message = err instanceof Error ? err.message : "Failed to load spaces";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchSpaces();
  }, []);
  
  // Update spaces with accurate member counts when the batch counts are loaded
  useEffect(() => {
    if (!memberCountsLoading && Object.keys(memberCounts).length > 0) {
      setSpaces(currentSpaces => 
        currentSpaces.map(space => ({
          ...space,
          member_count: memberCounts[space.id]?.totalMembers || space.member_count || 0
        }))
      );
    }
  }, [memberCounts, memberCountsLoading]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Discover Spaces</h1>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="p-6 text-center text-red-500">
          <p>{error}</p>
        </div>
      ) : spaces.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          <p>No spaces found. Try creating a new space!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {spaces.map((space) => (
            <SpaceCard key={space.id} space={space} openInModal={true} />
          ))}
        </div>
      )}
    </div>
  );
} 