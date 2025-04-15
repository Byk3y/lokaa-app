
import { Link } from "react-router-dom";
import { Users, BarChart2, MessageSquare } from "lucide-react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import JoinedSpacesSection from "@/components/dashboard/JoinedSpacesSection";
import FeaturedCommunities from "@/components/dashboard/FeaturedCommunities";
import TrendingCommunities from "@/components/discover/TrendingCommunities";
import { useAuth } from "@/contexts/AuthContext";
import useCommunitiesData from "@/hooks/useCommunitiesData";
import useJoinCommunity from "@/hooks/useJoinCommunity";

export default function Dashboard() {
  const { userDetails } = useAuth();
  const { 
    joinedCommunities, 
    setJoinedCommunities, 
    trendingCommunities, 
    featuredCommunities,
    loading 
  } = useCommunitiesData();
  
  const handleJoinCommunity = useJoinCommunity(setJoinedCommunities);
  
  // Analytics data (this would come from Supabase in a real implementation)
  const analytics = {
    totalMembers: 0,
    activeMembers: 0,
    totalPosts: 0,
    totalRevenue: 0.00
  };

  const isCreator = userDetails?.role === 'creator';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DashboardSidebar />
      
      <div className="flex-1 lg:ml-64">
        <DashboardHeader />
        
        <div className="p-6 mt-16">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">
                Welcome back, {userDetails?.full_name || userDetails?.username || "User"}
                {isCreator && <span className="ml-2 px-2 py-1 text-xs bg-lokaa-100 text-lokaa-700 rounded-full">Creator</span>}
              </p>
            </div>
          </div>
          
          {/* Analytics Cards - Only show for creators */}
          {isCreator && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-500 font-normal">Total Members</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-lokaa-600 mr-2" />
                    <span className="text-2xl font-bold">{analytics.totalMembers}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-500 font-normal">Active Members</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <BarChart2 className="h-5 w-5 text-lokaa-600 mr-2" />
                    <span className="text-2xl font-bold">{analytics.activeMembers}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-500 font-normal">Total Posts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <MessageSquare className="h-5 w-5 text-lokaa-600 mr-2" />
                    <span className="text-2xl font-bold">{analytics.totalPosts}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-500 font-normal">Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <span className="text-lokaa-600 font-bold mr-2">$</span>
                    <span className="text-2xl font-bold">{analytics.totalRevenue.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Joined Communities Section */}
          <JoinedSpacesSection 
            communities={joinedCommunities} 
            loading={loading} 
          />
          
          {/* Featured Communities */}
          <FeaturedCommunities 
            communities={featuredCommunities} 
            loading={loading} 
            onJoinCommunity={handleJoinCommunity} 
          />
          
          {/* Trending Communities */}
          <TrendingCommunities 
            communities={trendingCommunities} 
            loading={loading} 
            onJoinCommunity={handleJoinCommunity} 
          />
        </div>
      </div>
    </div>
  );
}
