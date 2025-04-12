
import { useState } from "react";
import { PlusCircle, Users, BarChart2, MessageSquare, Calendar } from "lucide-react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import EmptyState from "@/components/dashboard/EmptyState";
import SpaceCard from "@/components/spaces/SpaceCard";

export default function Dashboard() {
  // This state would normally come from an auth context or API
  const [user] = useState({
    name: "John Doe",
    avatar: "/lovable-uploads/3df25f54-2ad0-4da7-ace5-23cbdb81a334.png"
  });
  
  // Mock spaces data - in a real app, this would come from an API
  const [spaces] = useState([
    {
      id: "1",
      name: "Design Community",
      description: "A space for designers to share work, get feedback, and discuss design trends.",
      coverImage: "/lovable-uploads/133af0aa-ab1a-40f2-921a-ff85fcef82f0.png",
      memberCount: 238,
      postCount: 56,
      upcomingEvents: 2,
      isPaid: false
    },
    {
      id: "2",
      name: "Tech Entrepreneurs",
      description: "Connect with fellow tech founders to share insights and grow your business.",
      coverImage: "/lovable-uploads/f2c1a9ce-a72f-423c-b708-8163076b9d26.png",
      memberCount: 124,
      postCount: 38,
      upcomingEvents: 1,
      isPaid: true,
      price: 9.99
    }
  ]);
  
  // Mock analytics data
  const analytics = {
    totalMembers: 362,
    activeMembers: 145,
    totalPosts: 94,
    totalRevenue: 842.50
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DashboardSidebar />
      
      <div className="flex-1 lg:ml-64">
        <div className="p-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user.name}</p>
            </div>
            <div className="mt-4 md:mt-0">
              <Button className="bg-lokaa-600 hover:bg-lokaa-700">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Space
              </Button>
            </div>
          </div>
          
          {/* Analytics Cards */}
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
          
          {/* Your Spaces */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Your Spaces</h2>
              <Button variant="ghost" className="text-lokaa-600 hover:text-lokaa-700 hover:bg-lokaa-50">
                View All
              </Button>
            </div>
            
            {spaces.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {spaces.map((space) => (
                  <SpaceCard key={space.id} {...space} />
                ))}
                <Card className="border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-6 hover:bg-gray-50 transition-colors cursor-pointer">
                  <PlusCircle className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 font-medium">Create New Space</p>
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
