import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import LoadingSpinner from "@/components/discover/LoadingSpinner";
import { MessageSquare, ThumbsUp } from "lucide-react";
import { Database } from "@/types/supabase";

interface ProfilePostsProps {
  userId: string;
}

export default function ProfilePosts({ userId }: ProfilePostsProps) {
  const [posts, setPosts] = useState<Database['public']['Tables']['posts']['Row'][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        setPosts(data || []);
      } catch (error) {
        console.error('Error fetching posts:', error);
        toast({
          title: "Error loading posts",
          description: "Could not load posts for this user.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [userId]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <h3 className="text-lg font-medium mb-2">No Posts Yet</h3>
        <p className="text-gray-600">This user hasn't created any posts yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-6">
      {posts.map((post) => (
        <Card key={post.id}>
          <CardContent className="p-4">
            <div className="mb-2">
              <p className="text-gray-700">{post.content}</p>
            </div>
            
            <div className="flex items-center text-gray-500 text-sm mt-4">
              <div className="flex items-center mr-4">
                <ThumbsUp className="h-4 w-4 mr-1" />
                <span>{post.like_count || 0}</span>
              </div>
              <div className="flex items-center">
                <MessageSquare className="h-4 w-4 mr-1" />
                <span>{post.comment_count || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
