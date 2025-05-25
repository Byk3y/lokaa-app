import { Outlet, useNavigate } from "react-router-dom";
import TopNav from "./TopNav";
import { Home, Users, Plus, User, Search } from "lucide-react";

export default function BaseLayout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col max-w-screen overflow-x-hidden">
      <TopNav />
      <main className="flex-1 pb-16 sm:pb-0">
        <Outlet />
      </main>
      
      {/* Mobile Bottom Navigation - Styled like Skool */}
      <div className="sm:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 shadow-sm z-40">
        <div className="flex justify-around items-center h-14">
          <button 
            onClick={() => navigate('/app')} 
            className="flex flex-col items-center justify-center flex-1 py-2 h-full min-w-[44px]"
            aria-label="Home"
          >
            <Home size={24} className="text-gray-700" />
          </button>
          
          <button 
            onClick={() => navigate('/app')}
            className="flex flex-col items-center justify-center flex-1 py-2 h-full min-w-[44px]"
            aria-label="Spaces"
          >
            <Users size={24} className="text-gray-700" />
          </button>
          
          <button 
            onClick={() => {/* TODO: Open Create Post Modal */}} 
            className="flex flex-col items-center justify-center flex-1 py-2 h-full min-w-[44px]"
            aria-label="Add Post"
          >
            <Plus size={28} className="text-gray-700" />
          </button>
          
          <button 
            onClick={() => navigate('/settings/profile')} 
            className="flex flex-col items-center justify-center flex-1 py-2 h-full min-w-[44px]"
            aria-label="Profile"
          >
            <User size={24} className="text-gray-700" />
          </button>
        </div>
      </div>
    </div>
  );
} 