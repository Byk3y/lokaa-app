import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users } from 'lucide-react';

interface MembershipSpacesListProps {
  userId: string;
}

interface Space {
  id: string;
  name: string;
  icon_image?: string | null;
  pricing_type?: 'free' | 'paid' | string;
  member_count?: number;
  owner_id?: string;
}

const MembershipSpacesList: React.FC<MembershipSpacesListProps> = ({ userId }) => {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMembershipSpaces = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch joined spaces via space_access join, but not owned
        const { data, error } = await supabase
          .from('space_access')
          .select('space_id, spaces:space_id(id, name, icon_image, pricing_type, member_count, owner_id)')
          .eq('user_id', userId)
          .eq('is_active', true);
        if (error) throw error;
        // Filter out spaces where the user is the owner
        const joinedSpaces = (data || [])
          .map((record: any) => record.spaces as Space)
          .filter((space: Space) => space && space.owner_id !== userId);
        setSpaces(joinedSpaces);
      } catch (err: any) {
        setError('Failed to load membership spaces');
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchMembershipSpaces();
  }, [userId]);

  return (
    <div className="bg-white rounded-2xl shadow border border-gray-100 p-6">
      <h3 className="text-lg font-semibold mb-4">Memberships</h3>
      {loading ? (
        <div className="h-20 flex items-center justify-center text-gray-400">
          <span>Loading...</span>
        </div>
      ) : error ? (
        <div className="h-20 flex items-center justify-center text-red-400">
          <span>{error}</span>
        </div>
      ) : spaces.length === 0 ? (
        <div className="h-20 flex items-center justify-center text-gray-400">
          <span>Spaces you are a member of will appear here.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {spaces.map(space => (
            <div key={space.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:shadow transition bg-gray-50">
              {space.icon_image ? (
                <img src={space.icon_image} alt={space.name} className="h-10 w-10 rounded-md bg-gray-200 object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-md bg-gray-200 flex items-center justify-center font-bold text-lg text-gray-500">
                  {space.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <div className="font-semibold text-base">{space.name}</div>
                <div className="flex items-center text-xs text-gray-500 mt-1 gap-2">
                  <Users className="h-4 w-4 mr-1" />
                  {space.member_count?.toLocaleString() || 0} members
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${space.pricing_type === 'free' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{space.pricing_type === 'free' ? 'Free' : 'Paid'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MembershipSpacesList; 