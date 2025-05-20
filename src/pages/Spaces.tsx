import { useState, useEffect } from "react";
import { SpaceCard } from "@/components/spaces/SpaceCard";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

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

  useEffect(() => {
    async function fetchSpaces() {
      try {
        setLoading(true);
        setError(null);

        // Fetch spaces from Supabase
        const { data, error } = await supabase
          .from('spaces')
          .select('id, name, description, cover_image, subdomain, owner_id, is_private')
          .order('created_at', { ascending: false })
          .limit(12);

        if (error) throw error;

        // Get member counts for each space
        const spacesWithMemberCounts = await Promise.all(
          data.map(async (space) => {
            const { count } = await supabase
              .from('space_access')
              .select('id', { count: 'exact', head: true })
              .eq('space_id', space.id)
              .eq('is_active', true);

            return {
              ...space,
              member_count: count || 1,
            };
          })
        );

        setSpaces(spacesWithMemberCounts as SpaceWithMemberCount[]);
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