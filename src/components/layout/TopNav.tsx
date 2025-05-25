import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  MoreHorizontal
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

export default function TopNav() {
  const navigate = useNavigate();
  
  return (
    <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-50 h-14 flex items-center">
      <div className="container mx-auto flex items-center justify-between px-2 sm:px-4">
        {/* Left side: Hamburger Menu (Mobile) / Spaces Button (Desktop) */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Mobile Hamburger Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="sm:hidden">
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="w-5 h-5 text-gray-700" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Navigation</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/app')}>
                <Users className="mr-2 h-4 w-4" />
                Spaces
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings/profile')}>
                <UserIcon className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              {/* Add other main nav items here if needed */}
              <DropdownMenuSeparator className="sm:hidden"/>
              <DropdownMenuItem className="sm:hidden" onClick={() => navigate('/notifications')}> {/* Placeholder URL */}
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </DropdownMenuItem>
              <DropdownMenuItem className="sm:hidden" onClick={() => navigate('/chat')}> {/* Placeholder URL */}
                <MessageSquare className="mr-2 h-4 w-4" />
                Chat
              </DropdownMenuItem>
              <DropdownMenuItem className="sm:hidden" onClick={() => navigate('/bookmarks')}> {/* Placeholder URL */}
                <Bookmark className="mr-2 h-4 w-4" />
                Bookmarks
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Desktop Spaces Button & Logo */}
          <Link to="/app" className="text-xl font-bold text-lokaa-700 hidden sm:block">
            Lokaa
          </Link>
          <Button variant="outline" className="gap-2 hidden sm:flex">
            Spaces
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        {/* Center: Community Name (Mobile) / Search (Desktop) */}
        {/* Mobile Community Name - centered (flex-grow helps achieve this against left/right fixed widths) */}
        <div className="flex-grow flex justify-center sm:hidden">
          <Link to="/app" className="text-lg font-semibold text-gray-800">
            Lokaa
          </Link>
        </div>

        {/* Desktop Search Bar */}
        <div className="relative w-2/5 hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full h-9 pl-10 pr-4 rounded-md border border-gray-300 focus:outline-none focus:ring-1 focus:ring-lokaa-500 focus:border-transparent text-sm"
          />
        </div>
        
        {/* Right side: Search (Mobile) / Icons & Profile (Desktop) */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Mobile Search Icon */}
          <Button variant="ghost" size="icon" className="sm:hidden h-10 w-10">
            <Search className="w-5 h-5 text-gray-700" />
          </Button>

          {/* Desktop Icons */}
          <Button variant="ghost" size="icon" className="hidden sm:flex h-9 w-9">
            <Bell className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden sm:flex h-9 w-9">
            <MessageSquare className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden sm:flex h-9 w-9">
            <Bookmark className="w-5 h-5" />
          </Button>
          
          {/* Profile Dropdown - consistent size */}
          <ProfileDropdown variant="default" size="sm" />
        </div>
      </div>
    </header>
  );
} 