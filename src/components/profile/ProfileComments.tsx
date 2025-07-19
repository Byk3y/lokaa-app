import { log } from '@/utils/logger';
import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import LoadingSpinner from "@/components/discover/LoadingSpinner";
import type { PostgrestError } from "@supabase/supabase-js";
// import { Database } from "@/types/supabase"; // Commented out as 'comments' table is missing

// Define the type for a comment with its related post excerpt
interface ProfileCommentsProps {
  userId: string;
}

// Manually defined type for a comment with its related post excerpt
interface CommentWithPost {
  id: string;
  content: string; // Content of the comment itself
  created_at: string; // From the comments table, used for ordering
  user_id: string; // From the comments table
  post_id: string; // Foreign key to posts table, assumed from context
  posts: { // Joined data from posts table
    id: string;
    content: string; // Content of the post
  } | null;
  // Add other fields from comments table if they are used and known
}

export default function ProfileComments({ userId }: ProfileCommentsProps) {
  const [comments, setComments] = useState<CommentWithPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoading(true);
        // Cast to 'any' because 'comments' table is missing from generated types
        // TODO: Regenerate Supabase types to include the 'comments' table
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabaseAny = getSupabaseClient() as any;
        // Await and cast to the expected shape
        const response = await supabaseAny.from('comments')
          .select('*, posts(id, content)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }) as { data: CommentWithPost[] | null; error: PostgrestError | null };
        
        const { data, error } = response;
          
        if (error) throw error; 
        setComments(data || []);
      } catch (error) {
        let errorMessage = "Could not load comments for this user.";
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof (error as PostgrestError)?.message === 'string') {
          errorMessage = (error as PostgrestError).message;
        }
        log.error('Component', 'Error fetching comments:', error);
        toast({
          title: "Error loading comments",
          description: errorMessage,
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
