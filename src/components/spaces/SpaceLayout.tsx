
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SpaceTemplates } from './SpaceTemplates';
import LoadingSpinner from '@/components/discover/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
        setSpace(data);
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
