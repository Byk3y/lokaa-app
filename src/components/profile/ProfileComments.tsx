
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import LoadingSpinner from "@/components/discover/LoadingSpinner";

interface ProfileCommentsProps {
  userId: string;
}

export default function ProfileComments({ userId }: ProfileCommentsProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('comments')
          .select('*, posts(id, content)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        setComments(data || []);
      } catch (error) {
        console.error('Error fetching comments:', error);
        toast({
          title: "Error loading comments",
          description: "Could not load comments for this user.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [userId]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <h3 className="text-lg font-medium mb-2">No Comments Yet</h3>
        <p className="text-gray-600">This user hasn't made any comments yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-6">
      {comments.map((comment) => (
        <Card key={comment.id}>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500 mb-2">
              On post: {comment.posts?.content.substring(0, 50)}...
            </div>
            <p className="text-gray-700">{comment.content}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
