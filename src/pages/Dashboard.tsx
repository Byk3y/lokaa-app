
import { useState, useEffect } from "react";
import { PlusCircle, Users, BarChart2, MessageSquare, Calendar, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import EmptyState from "@/components/dashboard/EmptyState";
import SpaceCard from "@/components/spaces/SpaceCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { userDetails } = useAuth();
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Analytics data (this would come from Supabase in a real implementation)
  const analytics = {
    totalMembers: 0,
    activeMembers: 0,
    totalPosts: 0,
    totalRevenue: 0.00
  };

  useEffect(() => {
    const fetchSpaces = async () => {
      try {
        // Fetch spaces the user has created (if creator) or joined (if member)
        // For now this just fetches all spaces visible to the user based on RLS
        const { data, error } = await supabase
          .from('spaces')
          .select('*');
        
        if (error) throw error;
        
        setSpaces(data || []);
      } catch (error) {
        console.error('Error fetching spaces:', error);
        toast({
          title: "Error loading spaces",
          description: "Could not load your spaces at this time.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSpaces();
  }, []);

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
                Welcome back, {userDetails?.username || "User"}
                {userDetails?.role === 'creator' && <span className="ml-2 px-2 py-1 text-xs bg-lokaa-100 text-lokaa-700 rounded-full">Creator</span>}
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <Button className="bg-lokaa-600 hover:bg-lokaa-700" asChild>
                <Link to="/spaces/create">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Space
                </Link>
              </Button>
            </div>
          </div>
          
          {/* Analytics Cards - Only show for creators */}
          {userDetails?.role === 'creator' && (
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
          
          {/* Your Spaces */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Your Spaces</h2>
              <Button variant="ghost" className="text-lokaa-600 hover:text-lokaa-700 hover:bg-lokaa-50">
                View All
              </Button>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lokaa-600"></div>
              </div>
            ) : spaces.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {spaces.map((space) => (
                  <div key={space.id} className="relative group">
                    <SpaceCard {...space} />
                    
                    {/* Settings button overlay for spaces owned by the user */}
                    {space.owner_id === userDetails?.id && (
                      <Link 
                        to={`/spaces/${space.id}/settings`}
                        className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Space Settings"
                      >
                        <Settings className="h-4 w-4 text-gray-600" />
                      </Link>
                    )}
                  </div>
                ))}
                <Card className="border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-6 hover:bg-gray-50 transition-colors cursor-pointer">
                  <Link to="/spaces/create" className="w-full h-full flex flex-col items-center justify-center">
                    <PlusCircle className="h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600 font-medium">Create New Space</p>
                  </Link>
                </Card>
              </div>
            ) : (
              <EmptyState
                title="No spaces yet"
                description="Create your first space to start building your community"
                actionText="Create a Space"
                actionLink="/spaces/create"
                icon={<Users className="h-8 w-8 text-lokaa-600" />}
              />
            )}
          </div>
          
          {/* Upcoming Events */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Upcoming Events</h2>
              <Button variant="ghost" className="text-lokaa-600 hover:text-lokaa-700 hover:bg-lokaa-50">
                View All
              </Button>
            </div>
            
            <EmptyState
              title="No upcoming events"
              description="Schedule your first event to engage with your community"
              actionText="Create an Event"
              actionLink="/events/create"
              icon={<Calendar className="h-8 w-8 text-lokaa-600" />}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
