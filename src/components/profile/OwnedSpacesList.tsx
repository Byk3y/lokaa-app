import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { Users } from 'lucide-react';
import { SpaceAssetsUtils } from '@/shared/utils/space-assets-utils';

interface OwnedSpacesListProps {
  userId: string;
}

interface Space {
  id: string;
  name: string;
  icon_image?: string | null;
  pricing_type?: 'free' | 'paid' | string;
  member_count?: number;
}

const OwnedSpacesList: React.FC<OwnedSpacesListProps> = ({ userId }) => {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOwnedSpaces = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await getSupabaseClient()
          .from('spaces')
          .select('id, name, icon_image, pricing_type, member_count')
          .eq('owner_id', userId);
        if (error) throw error;
        setSpaces(data || []);
      } catch (err: any) {
        setError('Failed to load owned spaces');
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchOwnedSpaces();
  }, [userId]);

  // Only render if loading, error, or there are owned spaces
  if (!loading && !error && spaces.length === 0) return null;

  return (
    <div className="w-full">
      {loading ? (
        <div className="h-20 flex items-center justify-center text-gray-400">
          <span>Loading...</span>
        </div>
      ) : error ? (
        <div className="h-20 flex items-center justify-center text-red-400">
          <span>{error}</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {spaces.map(space => {
            const spaceAssets = SpaceAssetsUtils.resolveSpaceAssets(space);
            const placeholder = SpaceAssetsUtils.getPlaceholderConfig(space);
            
            return (
              <div 
                key={space.id} 
                className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:shadow-[0_10px_30px_rgba(0,_0,_0,_0.08)] hover:border-gray-50 transition-all duration-300 bg-white transform hover:-translate-y-1"
              >
                {spaceAssets.hasIcon && spaceAssets.iconUrl ? (
                  <img src={spaceAssets.iconUrl} alt={space.name} className="h-10 w-10 rounded-md shadow-sm bg-gray-200 object-cover ring-2 ring-gray-50" />
                ) : (
                  <div 
                    className="h-10 w-10 rounded-md flex items-center justify-center font-bold text-lg shadow-sm ring-2 ring-gray-50"
                    style={{
                      background: `linear-gradient(135deg, ${placeholder.gradientFrom}, ${placeholder.gradientTo})`,
                      color: placeholder.textColor
                    }}
                  >
                    {placeholder.initials}
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">{space.name}</div>
                  <div className="flex items-center text-xs text-gray-500 mt-1.5 gap-2">
                    <div className="flex items-center">
                      <Users className="h-3.5 w-3.5 mr-1 text-blue-400" />
                      {space.member_count?.toLocaleString() || 0} members
                    </div>
                    <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      space.pricing_type === 'free' 
                        ? 'bg-green-100 text-green-700 ring-1 ring-green-200' 
                        : 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200'
                    }`}>
                      {space.pricing_type === 'free' ? 'Free' : 'Paid'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OwnedSpacesList; 