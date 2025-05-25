import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
  Bell, 
  MessageSquare, 
  Bookmark, 
  Search,
  ChevronDown,
  Home,
  Users,
  User as UserIcon,
  Menu,
  MoreHorizontal,
  PlusCircle,
  Compass,
  Briefcase
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
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

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
  const { user } = useAuth();
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
      <div className="container mx-auto flex items-center justify-between px-2 sm:px-4 h-full">
        {/* Left side: Hamburger Menu (Mobile) / Spaces Button & Logo (Desktop) */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Mobile Hamburger Menu for Space Navigation */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="sm:hidden">
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="w-5 h-5 text-gray-700" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 mt-1">
              <div className="p-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input type="search" placeholder="Search your spaces..." className="pl-9 h-9 text-sm" />
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/create-space')}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create a community
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/discover')}>
                <Compass className="mr-2 h-4 w-4" />
                Discover communities
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="px-2 text-xs text-gray-500">Your Spaces</DropdownMenuLabel>
              {isLoadingSpaces ? (
                <DropdownMenuItem disabled>Loading spaces...</DropdownMenuItem>
              ) : userSpaces.length > 0 ? (
                userSpaces.map(space => (
                  <DropdownMenuItem key={space.id} onClick={() => navigate(`/${space.subdomain}/space/feed`)}>
                    {space.icon_image ? (
                      <img src={space.icon_image} alt={space.name} className="mr-2 h-4 w-4 rounded-sm object-cover"/>
                    ) : (
                      <Briefcase className="mr-2 h-4 w-4 opacity-50" />
                    )}
                    {space.name}
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>No spaces joined yet.</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Desktop Logo & Spaces Button */}
          <Link to="/app" className="text-xl font-bold text-lokaa-700 hidden sm:flex items-center">
            Lokaa
          </Link>
        </div>

        {/* Center: Community Name (Mobile Only) */}
        <div className="flex-grow flex justify-center sm:hidden">
          <Link to={`/${spaceData?.subdomain}/space/feed` || '/app'} className="text-base font-semibold text-gray-800 truncate px-1">
            {currentSpaceName}
          </Link>
        </div>

        {/* Right side: Search (Mobile) / Full Search (Desktop) & Icons/Profile */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Mobile Search Icon - Placeholder, could open a search modal/page */}
          <Button variant="ghost" size="icon" className="sm:hidden h-10 w-10" onClick={() => navigate('/search-page')}>
            <Search className="w-5 h-5 text-gray-700" />
          </Button>

          {/* Desktop Full Search Bar */}
          <div className="relative w-full sm:w-64 md:w-72 hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              type="search" 
              placeholder="Search..." 
              className="w-full h-9 pl-10 pr-4 rounded-md border-gray-300 focus:ring-1 focus:ring-lokaa-500 text-sm"
            />
          </div>
          
          {/* Mobile More (...) Icon - Placeholder for more actions like in Skool */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="sm:hidden">
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <MoreHorizontal className="w-5 h-5 text-gray-700" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 mt-1">
              <DropdownMenuItem onClick={() => navigate('/notifications')}>
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/bookmarks')}>
                <Bookmark className="mr-2 h-4 w-4" />
                Bookmarks
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Desktop Icons & Profile Dropdown */}
          <div className="hidden sm:flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Bookmark className="w-5 h-5" />
            </Button>
            <ProfileDropdown variant="default" size="sm" />
          </div>
        </div>
      </div>
    </header>
  );
} 