import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Bell, 
  MessageSquare, 
  Bookmark, 
  Search,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ProfileDropdown from "@/components/common/ProfileDropdown";

export default function TopNav() {
  return (
    <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <div className="flex items-center gap-2">
          <div className="text-xl font-bold text-lokaa-700">Lokaa</div>
          
          <Button variant="outline" className="gap-2">
            Spaces
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative w-1/3 hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search" 
            className="w-full h-10 pl-10 pr-4 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-lokaa-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Bell className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm">
            <MessageSquare className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm">
            <Bookmark className="w-5 h-5" />
          </Button>
          
          <ProfileDropdown variant="minimal" size="sm" showEmail={false} />
        </div>
      </div>
    </header>
  );
} 