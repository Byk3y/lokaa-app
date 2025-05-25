import { Outlet, useNavigate } from "react-router-dom";
import TopNav from "./TopNav";
import { Home, Search, Users, User } from "lucide-react";

export default function BaseLayout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col max-w-screen overflow-x-hidden">
      <TopNav />
      <main className="flex-1 pb-16 sm:pb-0">
        <Outlet />
      </main>
      
      {/* Mobile Bottom Navigation */}
      <div className="sm:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 shadow-sm z-40">
        <div className="flex justify-around items-center h-16">
          <button 
            onClick={() => navigate('/app')} 
            className="flex flex-col items-center justify-center h-11 w-11 min-h-[44px] min-w-[44px] p-2"
          >
            <Home size={24} className="text-gray-600" />
            <span className="text-xs text-gray-600">Home</span>
          </button>
          
          <button 
            onClick={() => navigate('/app')} 
            className="flex flex-col items-center justify-center h-11 w-11 min-h-[44px] min-w-[44px] p-2"
          >
            <Users size={24} className="text-gray-600" />
            <span className="text-xs text-gray-600">Spaces</span>
          </button>
          
          <button 
            onClick={() => navigate('/discover')} 
            className="flex flex-col items-center justify-center h-11 w-11 min-h-[44px] min-w-[44px] p-2"
          >
            <Search size={24} className="text-gray-600" />
            <span className="text-xs text-gray-600">Search</span>
          </button>
          
          <button 
            onClick={() => navigate('/settings/profile')} 
            className="flex flex-col items-center justify-center h-11 w-11 min-h-[44px] min-w-[44px] p-2"
          >
            <User size={24} className="text-gray-600" />
            <span className="text-xs text-gray-600">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
} 