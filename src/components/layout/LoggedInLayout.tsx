
import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { CommunitySidebar } from "./CommunitySidebar";
import { CommunityViewSidebar } from "@/components/communities/CommunityViewSidebar";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import useCommunitiesData from "@/hooks/useCommunitiesData";

export default function LoggedInLayout() {
  const { user, loading: authLoading } = useAuth();
  const { joinedCommunities, loading: communitiesLoading } = useCommunitiesData();
  const location = useLocation();
  const navigate = useNavigate();

  // Check if we're viewing a community (URL starts with /c/)
  const isViewingCommunity = location.pathname.startsWith('/c/');
  
  // Detect if we're on the discover page
  const isDiscoverPage = location.pathname.startsWith('/discover');

  // Determine sidebar offset for main content
  const sidebarOffset = isViewingCommunity ? 'pl-[calc(72px+14rem)]' : 'pl-[72px]';

  // Redirect logic
  useEffect(() => {
    if (authLoading || communitiesLoading) return;
    
    // Skip if already in a good place
    if (isViewingCommunity || isDiscoverPage) return;

    // If on dashboard or root, decide where to go
    if (location.pathname === '/dashboard' || location.pathname === '/') {
      if (joinedCommunities.length === 0) {
        // No communities - go to discover
        navigate('/discover');
      } else {
        // Has communities - go to the first (or last active) one
        // For now we'll just use the first one
        navigate(`/c/${joinedCommunities[0].id}`);
      }
    }
  }, [authLoading, communitiesLoading, joinedCommunities, isViewingCommunity, isDiscoverPage, location.pathname, navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster />
      <Sonner />
      
      {/* Main navigation - vertical community switcher */}
      <CommunitySidebar />
      
      {/* Community sidebar - only show when viewing a community */}
      {isViewingCommunity && <CommunityViewSidebar />}
      
      {/* Header for user actions, search, notifications */}
      <DashboardHeader />
      
      {/* Main content */}
      <main className={`${sidebarOffset} pt-16`}>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
