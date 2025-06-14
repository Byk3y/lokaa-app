import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
  ChevronDown,
  PlusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ProfileDropdown from "@/components/common/ProfileDropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useSpace } from "@/contexts/SpaceContext";
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { 
  NotificationIcon, 
  NavBookmarkIcon, 
  SearchIcon, 
  MenuIcon, 
  MoreIcon, 
  SpaceIcon, 
  DiscoverIcon,
  TopNavChatIcon
} from "@/components/ui/nav-icons";

interface UserSpace {
  id: string;
  name: string;
  icon_image?: string | null;
  subdomain: string;
}

export default function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { spaceData } = useSpace();
  const { user } = useOptimizedAuth();
  const [userSpaces, setUserSpaces] = useState<UserSpace[]>([]);
  const [isLoadingSpaces, setIsLoadingSpaces] = useState(false);

  const currentSpaceName = spaceData?.name || "Lokaa";

  useEffect(() => {
    if (user) {
      setIsLoadingSpaces(true);
      supabase
        .from('space_members')
        .select('spaces (id, name, icon_image, subdomain)')
        .eq('user_id', user.id)
        .then(({ data, error }) => {
          if (error) {
            console.error("Error fetching user spaces:", error);
            setUserSpaces([]);
          } else if (data) {
            const spaces = data.map(item => item.spaces).filter(Boolean) as UserSpace[];
            setUserSpaces(spaces);
          }
          setIsLoadingSpaces(false);
        });
    }
  }, [user]);
  
  return (
    <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-50 h-14 flex items-center">
      <div className="max-w-6xl mx-auto px-4 w-full">
        {/* Desktop Layout: 3-column for perfect alignment */}
        <div className="hidden sm:flex h-full items-center">
          {/* Left: Logo */}
          <div className="flex items-center flex-shrink-0" style={{ width: 120 }}>
            <Link to="/app" className="text-xl font-bold text-lokaa-700 flex items-center">
              Lokaa
            </Link>
          </div>
          {/* Center: Search Bar */}
          <div className="flex-grow flex items-center mr-8">
            <div className="w-full">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  type="search" 
                  placeholder="Search..." 
                  className="w-full h-9 pl-10 pr-4 rounded-md border-gray-300 focus:ring-1 focus:ring-lokaa-500 text-sm"
                />
              </div>
            </div>
          </div>
          {/* Right: Sidebar Icons */}
          <div className="flex items-center justify-end w-[273px] flex-shrink-0 gap-2">
            <Button variant="ghost" size="icon" className="h-10 w-10 text-gray-500">
              <TopNavChatIcon className="h-7 w-7" />
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 text-gray-500">
              <NotificationIcon className="h-7 w-7" />
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 text-gray-500">
              <NavBookmarkIcon className="h-7 w-7" />
            </Button>
            <ProfileDropdown variant="default" size="md" />
          </div>
        </div>

        {/* Mobile Layout: Simple flex layout */}
        <div className="sm:hidden flex items-center justify-between h-full">
          {/* Left: Mobile Menu */}
          <div className="flex">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <MenuIcon className="text-gray-700" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 mt-1">
                <div className="p-2">
                  <div className="relative">
                    <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input type="search" placeholder="Search your spaces..." className="pl-9 h-9 text-sm" />
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/create-space')}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create a community
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/discover')}>
                  <DiscoverIcon />
                  Discover communities
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="px-2 text-xs text-gray-500">Your Spaces</DropdownMenuLabel>
                {isLoadingSpaces ? (
                  <DropdownMenuItem disabled>Loading spaces...</DropdownMenuItem>
                ) : userSpaces.length > 0 ? (
                  userSpaces.map(space => (
                    <DropdownMenuItem key={space.id} onClick={() => navigate(`/${space.subdomain}/space`)}>
                      {space.icon_image ? (
                        <img src={space.icon_image} alt={space.name} className="mr-2 h-4 w-4 rounded-sm object-cover"/>
                      ) : (
                        <SpaceIcon className="opacity-50" />
                      )}
                      {space.name}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>No spaces joined yet.</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Center: Community Name */}
          <div className="flex-grow flex justify-center">
            <Link to={`/${spaceData?.subdomain}/space` || '/app'} className="text-base font-semibold text-gray-800 truncate px-1">
              {currentSpaceName}
            </Link>
          </div>

          {/* Right: Mobile Controls */}
          <div className="flex">
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => navigate('/search-page')}>
              <SearchIcon className="text-gray-700" />
            </Button>
            <ProfileDropdown variant="default" size="md" />
          </div>
        </div>
      </div>
    </header>
  );
} 