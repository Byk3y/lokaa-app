
import { Link } from "react-router-dom";
import { Users, BarChart2, MessageSquare, Calendar } from "lucide-react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import JoinedSpacesSection from "@/components/dashboard/JoinedSpacesSection";
import FeaturedSpaces from "@/components/dashboard/FeaturedSpaces";
import TrendingSpaces from "@/components/discover/TrendingSpaces";
import { useAuth } from "@/contexts/AuthContext";
import useSpacesData from "@/hooks/useSpacesData";
import useJoinSpace from "@/hooks/useJoinSpace";

export default function Dashboard() {
  const { userDetails } = useAuth();
  const { 
    joinedSpaces, 
    setJoinedSpaces, 
    trendingSpaces, 
    featuredSpaces,
    loading 
  } = useSpacesData();
  
  const handleJoinSpace = useJoinSpace(setJoinedSpaces);
  
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
        <div className="p-6">
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
          
          {/* Joined Spaces Section */}
          <JoinedSpacesSection spaces={joinedSpaces} loading={loading} />
          
          {/* Featured Spaces */}
          <FeaturedSpaces 
            spaces={featuredSpaces} 
            loading={loading} 
            onJoinSpace={handleJoinSpace} 
          />
          
          {/* Trending Spaces */}
          <TrendingSpaces 
            spaces={trendingSpaces} 
            loading={loading} 
            onJoinSpace={handleJoinSpace} 
          />
        </div>
      </div>
    </div>
  );
}
