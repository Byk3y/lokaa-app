import { Outlet, useNavigate } from "react-router-dom";
import TopNav from "./TopNav";
import { Home, Users, Plus, Search } from "lucide-react";
import ProfileDropdown from "@/components/common/ProfileDropdown";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

export default function BaseLayout() {
  const navigate = useNavigate();
  const { user: authUser } = useOptimizedAuth();

  function getInitials(name: string | null | undefined): string {
    if (!name) return 'U';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return name.substring(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }

  const displayName = authUser?.user_metadata?.full_name || authUser?.email || 'User';
  const avatarUrl = authUser?.user_metadata?.avatar_url;

  return (
    <div className="min-h-screen flex flex-col max-w-screen overflow-x-hidden">
      <TopNav />
      <main className="flex-1 pt-14 pb-14 sm:pb-0">
        <Outlet />
      </main>
      
      <div className="sm:hidden fixed bottom-0 left-0 right-0 w-full bg-white border-t border-gray-200 shadow-sm z-40">
        <div className="flex justify-around items-center h-14 max-w-md mx-auto">
          <button 
            onClick={() => navigate('/app')}
            className="flex flex-col items-center justify-center flex-1 py-1 h-full min-w-[44px] text-gray-600 hover:text-lokaa-500 transition-colors"
            aria-label="Home"
          >
            <Home size={22} />
          </button>
          
          <button 
            onClick={() => navigate('/app')}
            className="flex flex-col items-center justify-center flex-1 py-1 h-full min-w-[44px] text-gray-600 hover:text-lokaa-500 transition-colors"
            aria-label="Spaces"
          >
            <Users size={22} />
          </button>
          
          <button 
            onClick={() => { navigate('/create-post-modal-route') }}
            className="flex flex-col items-center justify-center flex-1 py-1 h-full min-w-[44px] text-gray-600 hover:text-lokaa-500 transition-colors"
            aria-label="Add Post"
          >
            <Plus size={26} />
          </button>
          
          <button 
            onClick={() => navigate(authUser ? `/profile/${authUser.id}` : '/settings/profile')}
            className="flex flex-col items-center justify-center flex-1 py-1 h-full min-w-[44px] text-gray-600 hover:text-lokaa-500 transition-colors"
            aria-label="Profile"
          >
            <Avatar className="h-7 w-7 text-xs">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback className="bg-gray-200 text-gray-600">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </div>
    </div>
  );
} 