import { useState, useEffect } from 'react';
import { SpaceService, type Space } from '@/services/supabase';

export function SupabaseSpacesList() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSpaces() {
      try {
        setLoading(true);
        
        const { data, error } = await SpaceService.getSpaces(10);
        
        if (error) {
          throw new Error(error.message);
        }
        
        setSpaces(data || []);
      } catch (err) {
        console.error('Error fetching spaces:', err);
        setError(err instanceof Error ? err.message : 'Failed to load spaces');
      } finally {
        setLoading(false);
      }
    }
    
    fetchSpaces();
  }, []);

  if (loading) {
    return <div className="p-4">Loading spaces...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  if (spaces.length === 0) {
    return <div className="p-4">No spaces found.</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Spaces</h2>
      <div className="space-y-4">
        {spaces.map((space) => (
          <div key={space.id} className="border p-4 rounded-lg">
            <h3 className="font-semibold text-lg">{space.name}</h3>
            {space.description && <p className="text-gray-600 mt-1">{space.description}</p>}
            <div className="flex items-center mt-2 text-sm text-gray-500">
              <span>{space.member_count || 0} members</span>
              <span className="mx-2">•</span>
              <span>Created {new Date(space.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 