
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SpaceTemplates } from './SpaceTemplates';
import LoadingSpinner from '@/components/discover/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Define a more comprehensive SpaceData interface that includes all fields we'll use
interface SpaceData {
  id: string;
  name: string;
  description: string;
  type: string;
  color: string;
  slug: string;
  owner_id: string;
  community_id: string;
  created_at: string;
  settings: Record<string, any>;
  // Additional fields from spaces_new table
  cover_image?: string;
  icon?: string;
  is_locked?: boolean;
  price_to_unlock?: number;
  space_type?: string;
  updated_at?: string;
}

export default function SpaceLayout() {
  const { communityId, spaceSlug } = useParams();
  const [space, setSpace] = useState<SpaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSpace = async () => {
      try {
        if (!communityId || !spaceSlug) {
          throw new Error('Community ID or Space slug is missing');
        }

        const { data, error } = await supabase
          .from('spaces_new')
          .select('*')
          .eq('community_id', communityId)
          .eq('slug', spaceSlug)
          .single();

        if (error) throw error;
        
        // Transform spaces_new data to match SpaceData interface
        const spaceData: SpaceData = {
          id: data.id,
          name: data.name,
          description: data.description || '',
          // Map space_type from database to type field in our interface
          type: data.space_type || 'posts', 
          // These fields might not exist in the database, so provide defaults
          color: data.color || '#7c3aed', // Default color
          slug: spaceSlug,
          owner_id: data.owner_id || '', // Default empty string for owner_id
          community_id: data.community_id,
          created_at: data.created_at,
          settings: data.settings || {}, // Default empty settings object
          // Include the rest of the fields from the database
          cover_image: data.cover_image,
          icon: data.icon,
          is_locked: data.is_locked,
          price_to_unlock: data.price_to_unlock,
          space_type: data.space_type,
          updated_at: data.updated_at
        };
        
        setSpace(spaceData);
      } catch (err: any) {
        console.error('Error fetching space:', err);
        setError(err.message || 'Failed to load space');
      } finally {
        setLoading(false);
      }
    };

    fetchSpace();
  }, [communityId, spaceSlug]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !space) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          {error || 'Space not found'}
        </h2>
        <p className="text-gray-600">
          Please check the URL or return to the community page.
        </p>
      </div>
    );
  }

  // Render the appropriate template based on space type
  const renderSpaceContent = () => {
    switch (space.type) {
      case 'posts':
        return SpaceTemplates.posts();
      case 'events':
        return SpaceTemplates.events();
      case 'chat':
        return SpaceTemplates.chat();
      case 'course':
        return SpaceTemplates.course();
      case 'members':
        return SpaceTemplates.members();
      case 'images':
        return SpaceTemplates.images();
      default:
        return SpaceTemplates.posts(); // Default to posts if type is unknown
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl font-bold" style={{ color: space.color }}>
            {space.name}
          </CardTitle>
          {space.description && (
            <p className="text-gray-600 mt-1">{space.description}</p>
          )}
        </CardHeader>
        <CardContent>
          {renderSpaceContent()}
        </CardContent>
      </Card>
    </div>
  );
}
