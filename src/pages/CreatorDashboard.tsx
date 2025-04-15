
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle2, Circle, Users, BarChart2, MessageSquare, Grid3X3, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import LoadingSpinner from "@/components/discover/LoadingSpinner";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export default function CreatorDashboard() {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const { userDetails } = useAuth();
  const [loading, setLoading] = useState(true);
  const [community, setCommunity] = useState<any>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([
    {
      id: "profile",
      title: "Complete your profile",
      description: "Add a bio, profile picture, and other details",
      completed: false
    },
    {
      id: "branding",
      title: "Customize branding",
      description: "Add cover image and set your community colors",
      completed: false
    },
    {
      id: "spaces",
      title: "Create your first space",
      description: "Spaces are where members interact with content",
      completed: false
    },
    {
      id: "invite",
      title: "Invite members",
      description: "Grow your community by inviting members",
      completed: false
    },
    {
      id: "content",
      title: "Create your first post",
      description: "Share content with your community",
      completed: false
    }
  ]);

  // Analytics data
  const [analytics, setAnalytics] = useState({
    totalMembers: 0,
    activeMembers: 0,
    totalSpaces: 0,
    totalPosts: 0
  });

  // Fetch community details
  useEffect(() => {
    const fetchCommunityDetails = async () => {
      if (!communityId) return;
      
      try {
        // Fetch community details
        const { data, error } = await supabase
          .from('communities')
          .select('*')
          .eq('id', communityId)
          .single();
          
        if (error) throw error;
        setCommunity(data);
        
        // Update checklist items based on community data
        const updatedChecklist = [...checklistItems];
        
        // Check if profile is complete
        if (userDetails?.full_name && userDetails?.avatar_url) {
          updatedChecklist[0].completed = true;
        }
        
        // Check if branding is complete
        if (data.cover_image && data.primary_color) {
          updatedChecklist[1].completed = true;
        }
        
        // Check for spaces
        const { data: spacesData } = await supabase
          .from('spaces_new')
          .select('id')
          .eq('community_id', communityId);
          
        if (spacesData && spacesData.length > 0) {
          updatedChecklist[2].completed = true;
          setAnalytics(prev => ({ ...prev, totalSpaces: spacesData.length }));
        }
        
        // Check for members
        setAnalytics(prev => ({ ...prev, totalMembers: data.member_count || 0 }));
        
        // Check for posts
        const { data: postsData } = await supabase
          .from('posts')
          .select('id')
          .eq('community_id', communityId);
          
        if (postsData && postsData.length > 0) {
          updatedChecklist[4].completed = true;
          setAnalytics(prev => ({ ...prev, totalPosts: postsData.length }));
        }
        
        // Update checklist
        setChecklistItems(updatedChecklist);
      } catch (error) {
        console.error('Error fetching community:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCommunityDetails();
  }, [communityId, userDetails]);

  const completionPercentage = Math.round(
    (checklistItems.filter(item => item.completed).length / checklistItems.length) * 100
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!community) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No Community Found</h2>
        <p className="text-gray-600 mb-6">This community doesn't exist or you don't have access to it.</p>
        <Button onClick={() => navigate('/discover')}>
          Browse Communities
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {community.name} Dashboard
          </h1>
          <p className="text-gray-600">
            Manage your community and grow your audience
          </p>
        </div>
        
        <Button 
          className="mt-4 md:mt-0 bg-lokaa-600 hover:bg-lokaa-700"
          onClick={() => navigate(`/c/${communityId}/spaces/create`)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Space
        </Button>
      </div>
      
      {/* Setup progress */}
      <Card className="mb-8">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center">
            Setup Progress
            <span className="ml-auto text-base font-normal text-gray-500">{completionPercentage}% complete</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={completionPercentage} className="h-2 mb-6" />
          
          <div className="space-y-4">
            {checklistItems.map((item) => (
              <div key={item.id} className="flex items-start">
                {item.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-lokaa-600 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <h3 className="font-medium text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
                {!item.completed && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="ml-auto"
                    onClick={() => {
                      switch(item.id) {
                        case "profile":
                          navigate("/profile/edit");
                          break;
                        case "branding":
                          navigate(`/c/${communityId}/settings`);
                          break;
                        case "spaces":
                          navigate(`/c/${communityId}/spaces/create`);
                          break;
                        case "invite":
                          navigate(`/c/${communityId}/members`);
                          break;
                        case "content":
                          navigate(`/c/${communityId}/feed`);
                          break;
                        default:
                          break;
                      }
                    }}
                  >
                    Complete
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Analytics Cards */}
      <h2 className="text-xl font-semibold mb-4">Community Overview</h2>
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
            <CardTitle className="text-sm text-gray-500 font-normal">Total Spaces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Grid3X3 className="h-5 w-5 text-lokaa-600 mr-2" />
              <span className="text-2xl font-bold">{analytics.totalSpaces}</span>
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
      </div>
      
      {/* Quick Actions */}
      <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-medium text-lg mb-2">Invite Members</h3>
            <p className="text-gray-500 text-sm mb-4">Grow your community by inviting new members.</p>
            <Button variant="outline" className="w-full" onClick={() => navigate(`/c/${communityId}/members`)}>
              Manage Members
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-medium text-lg mb-2">Create Content</h3>
            <p className="text-gray-500 text-sm mb-4">Post updates, resources, or start discussions.</p>
            <Button variant="outline" className="w-full" onClick={() => navigate(`/c/${communityId}/feed`)}>
              Go to Feed
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-medium text-lg mb-2">Customize Community</h3>
            <p className="text-gray-500 text-sm mb-4">Update branding, settings, and permissions.</p>
            <Button variant="outline" className="w-full" onClick={() => navigate(`/c/${communityId}/settings`)}>
              Community Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
