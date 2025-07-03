import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { SpaceAssetsUtils } from '@/shared/utils/space-assets-utils';

interface MembershipSpacesListProps {
  userId: string;
  className?: string;
  includeOwned?: boolean;
}

interface Space {
  id: string;
  name: string;
  icon_image?: string | null;
  pricing_type?: 'free' | 'paid' | string;
  member_count?: number;
  owner_id?: string;
  subdomain?: string;
  inCommon?: boolean;
  isOwner?: boolean;
}

const MembershipSpacesList: React.FC<MembershipSpacesListProps> = ({ 
  userId, 
  className = '',
  includeOwned = true
}) => {
  const { user } = useOptimizedAuth();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commonSpacesCount, setCommonSpacesCount] = useState(0);
  const isCurrentUser = user?.id === userId;

  useEffect(() => {
    const fetchMembershipSpaces = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: memberData, error: memberError } = await getSupabaseClient()
          .from('space_members')
          .select('space_id, spaces:space_id(id, name, icon_image, pricing_type, member_count, owner_id, subdomain)')
          .eq('user_id', userId)
          .eq('status', 'active');
        if (memberError) throw memberError;

        let ownedSpaces: Space[] = [];
        if (includeOwned) {
          const { data: ownerData, error: ownerError } = await getSupabaseClient()
            .from('spaces')
            .select('id, name, icon_image, pricing_type, member_count, owner_id, subdomain')
            .eq('owner_id', userId);
          if (ownerError) throw ownerError;
          ownedSpaces = (ownerData || []).map(space => ({
            ...space,
            isOwner: true
          }));
        }

        let memberSpaces = (memberData || [])
          .map((record: any) => record.spaces as Space)
          .filter((space: Space) => space);

        memberSpaces = memberSpaces.map(space => ({
          ...space,
          isOwner: space.owner_id === userId
        }));

        const allSpacesMap = new Map<string, Space>();
        memberSpaces.forEach(space => {
          allSpacesMap.set(space.id, space);
        });
        ownedSpaces.forEach(space => {
          allSpacesMap.set(space.id, space);
        });
        let allSpaces = Array.from(allSpacesMap.values());

        if (!isCurrentUser && user?.id) {
          const { data: currentUserData } = await getSupabaseClient()
            .from('space_members')
            .select('space_id')
            .eq('user_id', user.id)
            .eq('status', 'active');
          if (currentUserData && currentUserData.length > 0) {
            const currentUserSpaceIds = new Set(currentUserData.map(item => item.space_id));
            allSpaces = allSpaces.map(space => ({
              ...space,
              inCommon: currentUserSpaceIds.has(space.id)
            }));
            const commonCount = allSpaces.filter(space => space.inCommon).length;
            setCommonSpacesCount(commonCount);
          }
        }
        setSpaces(allSpaces);
      } catch (err: any) {
        console.error('Failed to load membership spaces', err);
        setError('Failed to load membership spaces');
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchMembershipSpaces();
  }, [userId, user?.id, isCurrentUser, includeOwned]);

  const sectionTitle = !isCurrentUser && commonSpacesCount > 0
    ? `Memberships (${commonSpacesCount} in common)`
    : 'Memberships';

  const renderSpaceCard = (space: Space) => {
    const spaceAssets = SpaceAssetsUtils.resolveSpaceAssets(space);
    const placeholder = SpaceAssetsUtils.getPlaceholderConfig(space);
    
    return (
      <Link
        to={`/${space.subdomain}`}
        key={space.id}
        className="group flex items-center w-full bg-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-gray-100 p-4 mb-3 hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)] hover:border-gray-50 transition-all duration-300 gap-3 transform hover:-translate-y-1"
      >
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-md overflow-hidden shadow-sm ring-2 ring-gray-50">
          {spaceAssets.hasIcon && spaceAssets.iconUrl ? (
            <img
              src={spaceAssets.iconUrl}
              alt={space.name}
              className="w-full h-full object-cover rounded-md"
            />
          ) : (
            <div 
              className="w-full h-full flex items-center justify-center font-bold text-lg"
              style={{
                background: `linear-gradient(135deg, ${placeholder.gradientFrom}, ${placeholder.gradientTo})`,
                color: placeholder.textColor
              }}
            >
              {placeholder.initials}
            </div>
          )}
        </div>
        {/* Info */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="font-semibold text-gray-800 truncate mb-0 flex items-center">
            {space.name}
            {space.isOwner && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700 font-medium ring-1 ring-yellow-200">Owner</span>
            )}
            {space.inCommon && !space.isOwner && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-medium ring-1 ring-blue-200">In Common</span>
            )}
          </div>
          <div className="flex items-center text-xs text-gray-500 font-medium mt-1.5 gap-2">
            <div className="flex items-center">
              <Users className="h-3.5 w-3.5 mr-1 text-blue-400" />
              {space.member_count ?
                (space.member_count > 1000 ? `${(space.member_count / 1000).toFixed(1)}k` : space.member_count)
                : 0
              } members
            </div>
            <span className={`ml-0 px-2 py-0.5 rounded-full text-xs ${
              space.pricing_type === 'free' 
                ? 'bg-green-100 text-green-700 ring-1 ring-green-200' 
                : 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200'
            }`}>
              {space.pricing_type === 'free' ? 'Free' : 'Paid'}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors duration-300">
          <span className="text-gray-400 group-hover:text-blue-500 transition-colors duration-300">→</span>
        </div>
      </Link>
    );
  };

  return (
    <div className={`w-full ${className}`}>
      {loading ? (
        <div className="h-20 flex items-center justify-center text-gray-400">
          <span className="animate-pulse">Loading...</span>
        </div>
      ) : error ? (
        <div className="h-20 flex items-center justify-center text-red-400 bg-red-50 rounded-lg p-4">
          <span>{error}</span>
        </div>
      ) : spaces.length === 0 ? (
        <div className="h-24 flex flex-col items-center justify-center text-gray-500 bg-gray-50 rounded-xl p-6">
          <span className="text-sm">{isCurrentUser ? 'You have not joined any spaces yet.' : 'Not a member of any spaces yet.'}</span>
          {isCurrentUser && (
            <span className="text-xs mt-2 text-gray-400">Explore and join communities to connect with others.</span>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {spaces.map(space => renderSpaceCard(space))}
        </div>
      )}
    </div>
  );
};

export default MembershipSpacesList; 