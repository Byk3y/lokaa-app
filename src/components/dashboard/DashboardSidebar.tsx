import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Home, Compass, Plus, BookOpen, Calendar, Users, 
  CreditCard, BarChart2, RefreshCw, Smartphone, ChevronDown
} from "lucide-react";
import { Link } from "react-router-dom";
import { Space } from "../../types/space";
import { fetchUserSpaces } from "../../utils/spaceUtils";

import MobileMenuToggle from "./MobileMenuToggle";
import SidebarHeader from "./SidebarHeader";
import SidebarLink from "./SidebarLink";
import SidebarFooter from "./SidebarFooter";
import MainSidebarNav from "./MainSidebarNav";
import { userHasSpaces, getUserSpaceCounts } from "@/utils/userSpaceUtils";

export default function DashboardSidebar() {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user, userDetails, signOut } = useAuth();
  const [hasSpaces, setHasSpaces] = useState(false);
  const [spaceCounts, setSpaceCounts] = useState({ ownedCount: 0, joinedCount: 0, totalCount: 0 });
  const [userSpaces, setUserSpaces] = useState<Space[]>([]);
  const [loadingSpaces, setLoadingSpaces] = useState(true);

  const isActive = (path: string) => location.pathname.startsWith(path);
  const closeMobileSidebar = () => setIsMobileOpen(false);

  const isCreator = userDetails?.role === 'creator';
  
  // User avatar display logic
  const getUserInitial = () => {
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };
  
  // Fetch real spaces from the database when component mounts
  useEffect(() => {
    const loadUserSpaces = async () => {
      setLoadingSpaces(true);
      
      if (user) {
        try {
          // Check if user has spaces
          const hasSpacesResult = await userHasSpaces(user.id);
          setHasSpaces(hasSpacesResult);
          
          // Get space counts
          const countsResult = await getUserSpaceCounts(user.id);
          setSpaceCounts(countsResult);
          
          // Fetch actual spaces using the imported function
          const spaces = await fetchUserSpaces(user.id);
          setUserSpaces(spaces);
        } catch (error) {
          console.error('Error loading user spaces:', error);
        } finally {
          setLoadingSpaces(false);
        }
      } else {
        setHasSpaces(false);
        setSpaceCounts({ ownedCount: 0, joinedCount: 0, totalCount: 0 });
        setUserSpaces([]);
        setLoadingSpaces(false);
      }
    };
    
    loadUserSpaces();
  }, [user]);

  return (
    <>
      <MobileMenuToggle 
        isMobileOpen={isMobileOpen} 
        setIsMobileOpen={setIsMobileOpen}
        closeMobileSidebar={closeMobileSidebar}
      />

      {/* Sidebar - Updated to match Skool design */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-[#0e1726] text-white shadow-lg z-40 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* User profile section */}
          <div className="py-4 px-3 flex items-center space-x-3 border-b border-gray-700">
            <div className="flex items-center space-x-2">
              {/* User circles */}
              <div className="flex -space-x-2">
                <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                  {getUserInitial()}
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-lg">
                  C
                </div>
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold text-lg">
                  F
                </div>
              </div>
            </div>
            <div className="ml-2">
              <div className="text-lg font-bold">Coding Club</div>
              <button className="text-xs text-gray-400 flex items-center">
                <span>Switch</span>
                <ChevronDown size={12} className="ml-1" />
              </button>
            </div>
          </div>
          
          {/* Main navigation */}
          <div className="flex-1 overflow-y-auto py-4 px-3">
            {/* Getting Started section */}
            <Link to="/app" className="block mb-3">
              <div className="flex items-center bg-purple-600 text-white rounded-md px-3 py-2 mb-2">
                <span className="mr-2">✨</span>
                <span className="font-medium">Getting Started</span>
              </div>
            </Link>
            
            {/* SPACES section */}
            <div className="mb-6">
              <div className="flex items-center justify-between px-1 mb-2">
                <h3 className="uppercase text-xs font-semibold text-gray-400">SPACES</h3>
                <button className="text-gray-400 hover:text-white">
                  <RefreshCw size={14} />
                </button>
              </div>
              
              <div className="space-y-1">
                {loadingSpaces ? (
                  <div className="text-center py-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-gray-400 mx-auto"></div>
                    <div className="text-xs text-gray-400 mt-1">Loading spaces...</div>
                  </div>
                ) : userSpaces.length > 0 ? (
                  userSpaces.map(space => (
                    <Link 
                      key={space.id}
                      to={`/space/${space.subdomain}`} 
                      className="flex items-center px-3 py-2 text-gray-300 hover:bg-gray-700 hover:text-white rounded-md"
                    >
                      <span className="mr-3 w-5 flex-shrink-0 text-center">
                        {space.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-sm">{space.name}</span>
                    </Link>
                  ))
                ) : (
                  <div className="px-3 py-2 text-gray-400 text-sm">
                    No spaces yet. Create your first space!
                  </div>
                )}
                
                {/* Create space link */}
                <Link 
                  to="/create-space" 
                  className="flex items-center px-3 py-2 text-gray-300 hover:bg-gray-700 hover:text-white rounded-md"
                >
                  <span className="mr-3 w-5 flex-shrink-0">
                    <Plus size={16} />
                  </span>
                  <span className="text-sm">Create space</span>
                </Link>
              </div>
            </div>
            
            {/* LINKS section */}
            <div>
              <h3 className="uppercase text-xs font-semibold text-gray-400 px-1 mb-2">LINKS</h3>
              <div className="space-y-1">
                <Link 
                  to="/app" 
                  className="flex items-center px-3 py-2 text-gray-300 hover:bg-gray-700 hover:text-white rounded-md"
                >
                  <span className="mr-3 w-5 flex-shrink-0">
                    <Smartphone size={16} />
                  </span>
                  <span className="text-sm">Download the Android app</span>
                </Link>
                <Link 
                  to="/app" 
                  className="flex items-center px-3 py-2 text-gray-300 hover:bg-gray-700 hover:text-white rounded-md"
                >
                  <span className="mr-3 w-5 flex-shrink-0">
                    <Smartphone size={16} />
                  </span>
                  <span className="text-sm">Download the iOS app</span>
                </Link>
                <Link 
                  to="/app" 
                  className="flex items-center px-3 py-2 text-gray-300 hover:bg-gray-700 hover:text-white rounded-md"
                >
                  <span className="mr-3 w-5 flex-shrink-0">
                    <Plus size={16} />
                  </span>
                  <span className="text-sm">Add link</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Footer with signout - simplified since we're redesigning */}
          <div className="py-3 px-4 border-t border-gray-700">
            <button 
              onClick={signOut}
              className="w-full text-left text-sm text-gray-300 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
