import { useState, useEffect } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { userHasSpaces, getUserSpaceCounts } from '@/utils/userSpaceUtils';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

/**
 * Component that displays information about a user's spaces
 * Can be used to check if a user has spaces and show appropriate UI
 */
export default function UserSpaceStatus() {
  const { user } = useOptimizedAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasSpaces, setHasSpaces] = useState(false);
  const [spaceCounts, setSpaceCounts] = useState({
    ownedCount: 0,
    joinedCount: 0,
    totalCount: 0
  });

  useEffect(() => {
    const checkUserSpaces = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Check if user has any spaces
        const hasAnySpaces = await userHasSpaces(user.id);
        setHasSpaces(hasAnySpaces);

        // If user has spaces, get the counts
        if (hasAnySpaces) {
          const counts = await getUserSpaceCounts(user.id);
          setSpaceCounts(counts);
        }
      } catch (error) {
        console.error('Error checking user spaces:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUserSpaces();
  }, [user]);

  if (!user) {
    return <p className="text-gray-500">Please log in to see your spaces</p>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <p>Checking your spaces...</p>
      </div>
    );
  }

  if (!hasSpaces) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <h3 className="font-medium mb-2">You don't have any spaces yet</h3>
        <p className="text-gray-600 mb-4">Create your first space or join an existing one.</p>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/create-space')}>
            Create a Space
          </Button>
          <Button variant="outline" onClick={() => navigate('/discover')}>
            Discover Spaces
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-white">
      <h3 className="font-medium mb-2">Your Spaces</h3>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-xl font-bold">{spaceCounts.totalCount}</div>
          <div className="text-sm text-gray-500">Total</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold">{spaceCounts.ownedCount}</div>
          <div className="text-sm text-gray-500">Owned</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold">{spaceCounts.joinedCount}</div>
          <div className="text-sm text-gray-500">Joined</div>
        </div>
      </div>
      <Button 
        className="w-full" 
        onClick={() => navigate('/dashboard')}
      >
        Go to My Spaces
      </Button>
    </div>
  );
} 