
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

import MobileMenuToggle from "./MobileMenuToggle";
import SidebarHeader from "./SidebarHeader";
import MainSidebarNav from "./MainSidebarNav";
import SidebarFooter from "./SidebarFooter";

export default function DashboardSidebar() {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { userDetails, signOut } = useAuth();

  const isActive = (path: string) => location.pathname.startsWith(path);
  const closeMobileSidebar = () => setIsMobileOpen(false);

  const isCreator = userDetails?.role === 'creator';

  return (
    <>
      <MobileMenuToggle 
        isMobileOpen={isMobileOpen} 
        setIsMobileOpen={setIsMobileOpen}
        closeMobileSidebar={closeMobileSidebar}
      />

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <SidebarHeader closeMobileSidebar={closeMobileSidebar} />
          
          <div className="flex-1 overflow-y-auto py-4 px-3">
            <MainSidebarNav 
              isActive={isActive} 
              closeMobileSidebar={closeMobileSidebar}
              isCreator={isCreator}
              location={location}
            />
          </div>

          <SidebarFooter 
            isActive={isActive} 
            closeMobileSidebar={closeMobileSidebar}
            signOut={signOut}
          />
        </div>
      </aside>
    </>
  );
}
