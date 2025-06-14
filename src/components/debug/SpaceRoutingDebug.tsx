import { useState, useEffect } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface SpaceInfo {
  id: string;
  name: string;
  subdomain: string;
}

export default function SpaceRoutingDebug() {
  const { user } = useOptimizedAuth();
  const [debugData, setDebugData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const fetchDebugData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const data: any = {};

      // 1. Check user's last_joined_space_id
      const { data: userDetails } = await getSupabaseClient()
        .from('users')
        .select('last_joined_space_id')
        .eq('id', user.id)
        .single();
      
      data.userLastJoinedSpaceId = userDetails?.last_joined_space_id || null;

      // 2. Get details of last joined space if it exists
      if (userDetails?.last_joined_space_id) {
        const { data: lastJoinedSpace } = await getSupabaseClient()
          .from('spaces')
          .select('id, name, subdomain')
          .eq('id', userDetails.last_joined_space_id)
          .single();
        
        data.lastJoinedSpaceFromDB = lastJoinedSpace || null;
      }

      // 3. Check localStorage
      try {
        const lastJoinedSpaceStorage = localStorage.getItem('lastJoinedSpace');
        data.lastJoinedSpaceFromStorage = lastJoinedSpaceStorage ? JSON.parse(lastJoinedSpaceStorage) : null;
      } catch (e) {
        data.lastJoinedSpaceFromStorage = 'Error parsing';
      }

      try {
        const lastCreatedSpaceStorage = localStorage.getItem('lastCreatedSpace');
        data.lastCreatedSpaceFromStorage = lastCreatedSpaceStorage ? JSON.parse(lastCreatedSpaceStorage) : null;
      } catch (e) {
        data.lastCreatedSpaceFromStorage = 'Error parsing';
      }

      // 4. Get user's active memberships
      const { data: memberships } = await getSupabaseClient()
        .from('space_members')
        .select(`
          space_id,
          role,
          status,
          spaces!inner(id, name, subdomain)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active');
      
      data.activeMemberships = memberships || [];

      // 5. Get user's owned spaces
      const { data: ownedSpaces } = await getSupabaseClient()
        .from('spaces')
        .select('id, name, subdomain')
        .eq('owner_id', user.id);
      
      data.ownedSpaces = ownedSpaces || [];

      setDebugData(data);
    } catch (error) {
      console.error('Error fetching debug data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDebugData();
    }
  }, [user]);

  const clearAllPreferences = async () => {
    try {
      // Clear localStorage
      localStorage.removeItem('lastJoinedSpace');
      localStorage.removeItem('lastCreatedSpace');
      localStorage.removeItem('lastVisitedSpace');
      
      // Clear database
      if (user) {
        await getSupabaseClient()
          .from('users')
          .update({ last_joined_space_id: null })
          .eq('id', user.id);
      }
      
      // Refresh debug data
      await fetchDebugData();
      
      alert('All space preferences cleared!');
    } catch (error) {
      console.error('Error clearing preferences:', error);
    }
  };

  const setPreferredSpace = async (spaceId: string, subdomain: string, name: string) => {
    try {
      // Update database
      await getSupabaseClient()
        .from('users')
        .update({ last_joined_space_id: spaceId })
        .eq('id', user!.id);
      
      // Update localStorage
      const spaceData = {
        id: spaceId,
        subdomain,
        name,
        joinedAt: new Date().toISOString()
      };
      localStorage.setItem('lastJoinedSpace', JSON.stringify(spaceData));
      
      // Refresh debug data
      await fetchDebugData();
      
      alert(`Set ${name} as preferred space!`);
    } catch (error) {
      console.error('Error setting preferred space:', error);
    }
  };

  if (!user) {
    return <div>Please log in to see debug data</div>;
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Space Routing Debug</CardTitle>
        <CardDescription>Debug information for space routing conflicts</CardDescription>
        <div className="flex gap-2">
          <Button onClick={fetchDebugData} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh Data'}
          </Button>
          <Button variant="destructive" onClick={clearAllPreferences}>
            Clear All Preferences
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold">Database last_joined_space_id:</h3>
          <p className="text-sm text-gray-600">
            {debugData.userLastJoinedSpaceId || 'None'}
          </p>
          {debugData.lastJoinedSpaceFromDB && (
            <p className="text-sm">
              → {debugData.lastJoinedSpaceFromDB.name} ({debugData.lastJoinedSpaceFromDB.subdomain})
            </p>
          )}
        </div>

        <Separator />

        <div>
          <h3 className="font-semibold">localStorage lastJoinedSpace:</h3>
          <pre className="text-xs bg-gray-100 p-2 rounded">
            {JSON.stringify(debugData.lastJoinedSpaceFromStorage, null, 2)}
          </pre>
        </div>

        <Separator />

        <div>
          <h3 className="font-semibold">localStorage lastCreatedSpace:</h3>
          <pre className="text-xs bg-gray-100 p-2 rounded">
            {JSON.stringify(debugData.lastCreatedSpaceFromStorage, null, 2)}
          </pre>
        </div>

        <Separator />

        <div>
          <h3 className="font-semibold">Active Memberships:</h3>
          {debugData.activeMemberships?.length > 0 ? (
            debugData.activeMemberships.map((membership: any) => (
              <div key={membership.space_id} className="flex items-center justify-between p-2 border rounded">
                <span>
                  {membership.spaces.name} ({membership.spaces.subdomain}) - {membership.role}
                </span>
                <Button 
                  size="sm" 
                  onClick={() => setPreferredSpace(membership.spaces.id, membership.spaces.subdomain, membership.spaces.name)}
                >
                  Set as Preferred
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-600">No active memberships</p>
          )}
        </div>

        <Separator />

        <div>
          <h3 className="font-semibold">Owned Spaces:</h3>
          {debugData.ownedSpaces?.length > 0 ? (
            debugData.ownedSpaces.map((space: SpaceInfo) => (
              <div key={space.id} className="flex items-center justify-between p-2 border rounded">
                <span>
                  {space.name} ({space.subdomain}) - Owner
                </span>
                <Button 
                  size="sm" 
                  onClick={() => setPreferredSpace(space.id, space.subdomain, space.name)}
                >
                  Set as Preferred
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-600">No owned spaces</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 