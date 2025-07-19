import { log } from '@/utils/logger';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { X, Save } from 'lucide-react';
import type { PostCardProps } from '@/components/space/PostCard';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PostEditProps {
  post: PostCardProps;
  onCancel: () => void;
  onSave: (updatedPost: PostCardProps) => void;
}

/**
 * Component for editing post title and content
 */
export default function PostEdit({ post, onCancel, onSave }: PostEditProps) {
  const [title, setTitle] = useState(post?.title || '');
  const [content, setContent] = useState(post?.content || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) {
      toast({
        title: "Content required",
        description: "Post content cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const { data, error } = await getSupabaseClient()
        .from('posts')
        .update({
          title: title.trim() || null,
          content: content.trim(),
          updated_at: new Date().toISOString(),
          edited_at: new Date().toISOString()
        })
        .eq('id', post.id)
        .select()
        .single();

      if (error) throw error;

      // Create updated post object to pass back to parent component
      const updatedPost: PostCardProps = {
        ...post,
        title: data.title,
        content: data.content,
        editedAt: data.edited_at
      };

      toast({
        title: "Post updated",
        description: "Your post has been updated successfully",
        variant: "default",
      });

      onSave(updatedPost);
    } catch (error: any) {
      log.error('Component', 'Error updating post:', error);
      toast({
        title: "Error updating post",
        description: error.message || "Failed to update post",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 pt-2">
      {/* Post Title Input */}
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Post Title (optional)"
        className="text-xl font-bold text-gray-900 mb-4 focus:ring-2 focus:ring-blue-500"
      />
      
      {/* Post Content Textarea */}
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your post content here..."
        className="text-gray-700 text-base min-h-[200px] resize-y focus:ring-2 focus:ring-blue-500 mb-6"
        required
      />

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <Button
          onClick={onCancel}
          variant="outline"
          size="sm"
          className="flex items-center"
          disabled={isSaving}
        >
          <X className="w-4 h-4 mr-1" /> Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="default"
          size="sm"
          className="flex items-center bg-blue-600 hover:bg-blue-700"
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-1" /> Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
} 