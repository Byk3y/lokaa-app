import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, Plus, Globe, Search } from 'lucide-react';
import LoadingIndicator from '@/components/LoadingIndicator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Define the space interface
interface Space {
  id: string;
  name: string;
  subdomain: string;
  owner_id: string;
}

interface SpaceSwitcherProps {
  currentSpaceSubdomain: string;
  currentSpaceName?: string;
  userId: string;
}

// Function to properly capitalize each word in a string
const capitalizeWords = (str: string): string => {
  if (!str) return '';
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export default function SpaceSwitcher({ 
  currentSpaceSubdomain,
  currentSpaceName,
  userId 
}: SpaceSwitcherProps) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch all spaces the user has access to
  useEffect(() => {
    const fetchUserSpaces = async () => {
      if (!userId) return;
      
      setLoading(true);
      
      try {
        // Fetch spaces owned by the user
        const { data: ownedSpaces, error: ownedError } = await supabase
          .from('spaces')
          .select('id, name, subdomain, owner_id')
          .eq('owner_id', userId);
          
        if (ownedError) throw ownedError;
        
        // Fetch spaces the user has access to (but doesn't own)
        const { data: accessRecords, error: accessError } = await supabase
          .from('space_access')
          .select(`
            space_id,
            spaces:space_id(id, name, subdomain, owner_id)
          `)
          .eq('user_id', userId)
          .eq('is_active', true);
          
        if (accessError) throw accessError;
        
        // Extract spaces from access records
        const joinedSpaces = accessRecords
          ?.filter(record => record.spaces) // Filter out null values
          .map(record => record.spaces as Space) || [];
          
        // Combine and deduplicate spaces
        const ownedSpacesArray = ownedSpaces || [];
        const allSpaces = [...ownedSpacesArray];
        
        // Add joined spaces only if they aren't already in the list
        joinedSpaces.forEach(joinedSpace => {
          if (!allSpaces.some(space => space.id === joinedSpace.id)) {
            allSpaces.push(joinedSpace);
          }
        });
        
        setSpaces(allSpaces);
      } catch (error) {
        console.error('Error fetching spaces:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserSpaces();
  }, [userId]);

  // Handle space selection
  const handleSpaceSelect = (subdomain: string) => {
    navigate(`/space/${subdomain}`);
  };

  // Navigate to discover spaces page
  const handleDiscoverSpaces = () => {
    navigate('/discover');
  };

  // Find the display name for the current space
  const displayName = currentSpaceName || 
    spaces.find(space => space.subdomain === currentSpaceSubdomain)?.name || 
    currentSpaceSubdomain;
    
  // Properly capitalize the display name
  const formattedDisplayName = capitalizeWords(displayName);

  return (
    <TooltipProvider>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger className="flex items-center outline-none hover:text-teal-600 transition-colors">
              <span className="font-bold text-xl mr-2 text-gray-800 tracking-tight">
                {loading ? '...' : formattedDisplayName}
              </span>
              <ChevronDown className="h-5 w-5 text-gray-700 stroke-[2.5px]" />
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Switch between your spaces</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Your Spaces</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {loading ? (
            <div className="flex justify-center items-center py-4">
              <LoadingIndicator size="small" />
            </div>
          ) : spaces.length > 0 ? (
            spaces.map((space) => (
              <DropdownMenuItem
                key={space.id}
                className={`${space.subdomain === currentSpaceSubdomain ? 'bg-gray-100 font-medium' : ''} cursor-pointer`}
                onClick={() => handleSpaceSelect(space.subdomain)}
              >
                <div className="flex items-center">
                  <div className="h-6 w-6 rounded-md bg-gray-800 flex items-center justify-center text-white mr-2">
                    {space.name.charAt(0).toUpperCase()}
                  </div>
                  <span>{capitalizeWords(space.name)}</span>
                </div>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="px-2 py-4 text-sm text-gray-500 text-center">
              No spaces found
            </div>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer" onClick={handleDiscoverSpaces}>
            <Globe className="h-4 w-4 mr-2" />
            Discover spaces
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
} 