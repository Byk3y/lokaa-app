import React, { useState, useEffect } from 'react';
import { Search, Eye } from 'lucide-react';
import { SettingsTabProps } from '../../../types/settings';
import { Space } from '@/types/space';
import { useMembershipStore } from '@/features/spaces/store/membership-store';
import { getSupabaseClient } from '@/integrations/supabase/client';

// Pin icon component
const PinIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 13L15 16M9 9L7 7M15 8L17 6M8 15L6 17M12.5 7.5L16.5 11.5C17.7 12.7 17.7 14.5 16.5 15.7L15.7 16.5C14.5 17.7 12.7 17.7 11.5 16.5L7.5 12.5C6.3 11.3 6.3 9.5 7.5 8.3L8.3 7.5C9.5 6.3 11.3 6.3 12.5 7.5Z" stroke="#888888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Interface for space member records from database
interface SpaceMemberRecord {
  space_id: string;
  spaces: Space | null; // The nested space object
}

export default function SpacesSettingsTab({ user }: SettingsTabProps) {
  const { refreshSpacesTrigger } = useMembershipStore();
  const [spaceSearchQuery, setSpaceSearchQuery] = useState("");
  const [userSpaces, setUserSpaces] = useState<Space[]>([]);
  const [loadingSpaces, setLoadingSpaces] = useState(true);

  // Fetch user spaces
  useEffect(() => {
    const fetchUserSpaces = async () => {
      if (!user || !user.id) {
        setUserSpaces([]);
        setLoadingSpaces(false);
        return;
      }

      setLoadingSpaces(true);

      try {
        // Fetch spaces owned by the user
        const { data: ownedSpaces, error: ownedError } = await getSupabaseClient()
          .from('spaces')
          .select('id, name, subdomain, owner_id, icon_image, member_count, description')
          .eq('owner_id', user.id);

        if (ownedError) {
          console.error('Error fetching owned spaces:', ownedError);
        }

        // Fetch spaces the user has access to via space_members table
        const { data: memberRecords, error: memberError } = await getSupabaseClient()
          .from('space_members')
          .select(`
            space_id,
            spaces:space_id(id, name, subdomain, owner_id, icon_image, member_count, description)
          `)
          .eq('user_id', user.id)
          .returns<SpaceMemberRecord[]>();

        if (memberError) {
          console.error('Error fetching joined spaces:', memberError);
        }

        const ownedSpacesArray = ownedSpaces || [];
        const joinedSpaces = memberRecords
          ?.filter((record) => record.spaces !== null)
          .map((record) => record.spaces as Space) || [];

        // Combine and deduplicate spaces
        const allSpacesMap = new Map<string, Space>();
        
        ownedSpacesArray.forEach(space => allSpacesMap.set(space.id, space));
        joinedSpaces.forEach(space => allSpacesMap.set(space.id, space));
        
        const allSpaces = Array.from(allSpacesMap.values());
        setUserSpaces(allSpaces);
      } catch (error) {
        console.error('Error fetching user spaces:', error);
        setUserSpaces([]);
      } finally {
        setLoadingSpaces(false);
      }
    };

    fetchUserSpaces();
  }, [user, refreshSpacesTrigger]);

  // Filter spaces based on search query
  const filteredSpaces = userSpaces.filter(space =>
    space.name.toLowerCase().includes(spaceSearchQuery.toLowerCase())
  );

  return (
    <div className="spaces-card max-w-[760px] mx-auto bg-white rounded-[20px] py-8 px-6 shadow-[0px_4px_16px_rgba(0,0,0,0.08)]">
      <h1 className="text-[24px] font-semibold text-[#111111]" style={{ fontFamily: 'Inter, sans-serif' }}>
        Spaces
      </h1>
      <p className="text-[14px] text-[#777777] mt-2 mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
        Drag and drop to reorder, pin to sidebar, or hide.
      </p>
      
      {/* Search bar */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
          placeholder="Search spaces..."
          value={spaceSearchQuery}
          onChange={(e) => setSpaceSearchQuery(e.target.value)}
        />
      </div>

      {/* Spaces list */}
      <div className="space-y-3">
        {loadingSpaces ? (
          <div className="py-4 flex justify-center items-center">
            <div className="animate-spin h-6 w-6 rounded-full border-t-2 border-b-2 border-teal-500"></div>
          </div>
        ) : filteredSpaces.length > 0 ? (
          filteredSpaces.map((space) => (
            <div key={space.id} className="flex items-center justify-between bg-transparent">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-[10px] flex items-center justify-center text-lg font-bold text-white overflow-hidden" style={{ backgroundColor: '#74B9FF' }}>
                  {space.icon_image ? (
                    <img src={space.icon_image} alt={space.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{space.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <div className="font-bold text-[17px] text-[#111111]">{space.name}</div>
                  <div className="text-[14px] text-gray-500">{space.member_count || 0} members</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <PinIcon />
                </button>
                <button className="p-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <Eye size={20} className="text-gray-500" />
                </button>
              </div>
            </div>
          ))
        ) : spaceSearchQuery ? (
          <div className="py-4 text-center text-gray-500">
            <p>No spaces found matching "{spaceSearchQuery}"</p>
          </div>
        ) : (
          <div className="py-4 text-center text-gray-500">
            <p>You haven't joined any spaces yet.</p>
          </div>
        )}
      </div>
    </div>
  );
} 