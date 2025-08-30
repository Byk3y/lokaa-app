import { useState, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { toast } from '@/hooks/use-toast';
import { processVideoForEditor } from '@/utils/videoUploadService';

export interface VideoUploadOptions {
  spaceId?: string;
  lessonId?: string;
  courseId?: string;
}

export interface UseVideoUploadProps {
  editor: Editor | null;
  options?: VideoUploadOptions;
}

export interface VideoData {
  url: string;
  type: 'embed' | 'upload';
  file?: File;
}

/**
 * Custom hook for handling video uploads and embeds in rich text editors
 * Supports YouTube embeds, other platform embeds, and file uploads
 */
export const useVideoUpload = ({ editor, options = {} }: UseVideoUploadProps) => {
  const [showVideoModal, setShowVideoModal] = useState(false);
  const { spaceId, lessonId, courseId } = options;

  const handleVideoInsert = useCallback(async (videoData: VideoData) => {
    if (!editor) return;
    
    // For uploads, we need spaceId
    if (videoData.type === 'upload' && !spaceId) {
      toast({
        title: "Upload not available",
        description: "Video upload requires space context",
        variant: "destructive"
      });
      return;
    }

    try {
      if (videoData.type === 'embed') {
        // For YouTube URLs, use the TipTap YouTube extension
        const { extractVideoInfo } = await import('@/utils/videoUploadService');
        const videoInfo = extractVideoInfo(videoData.url);
        
        if (videoInfo.provider === 'youtube' && videoInfo.videoId) {
          // Use TipTap's YouTube extension and ensure a paragraph after the video
          editor
            .chain()
            .focus()
            .setYoutubeVideo({
              src: videoData.url,
              width: 720,
              height: 405,
            })
            .insertContent('<p></p>')
            .run();

          toast({
            title: "Video embedded",
            description: "YouTube video has been inserted into your content",
            variant: "default"
          });
          return;
        } else {
          // For other video platforms, use iframe
          const result = await processVideoForEditor(videoData, {
            spaceId,
            lessonId,
            courseId,
          });
          // Insert the embed and add a trailing paragraph so user can type below
          editor
            .chain()
            .focus()
            .insertContent(result.embedHtml)
            .insertContent('<p></p>')
            .run();
        }
      } else if (videoData.type === 'upload' && videoData.file) {
        // For uploaded videos, use our upload service
        const result = await processVideoForEditor(videoData, {
          spaceId,
          lessonId,
          courseId,
        });
        editor
          .chain()
          .focus()
          .insertContent(result.embedHtml)
          .insertContent('<p></p>')
          .run();
      }

      toast({
        title: "Video added",
        description: "Video has been inserted into your content",
        variant: "default"
      });

    } catch (error) {
      console.error('Video insertion error:', error);
      toast({
        title: "Video insertion failed",
        description: error instanceof Error ? error.message : "Failed to add video. Please try again.",
        variant: "destructive"
      });
    }
  }, [editor, spaceId, lessonId, courseId]);

  const handleAddYouTubeVideo = useCallback(() => {
    const url = window.prompt('Enter YouTube URL:');
    if (url && editor) {
      try {
        // Add a paragraph before the video if we're at the start of the document
        if (editor.state.selection.anchor === 0) {
          editor.chain().focus().insertContent('<p></p>').run();
        }
        
        editor.chain().focus().setYoutubeVideo({
          src: url,
          width: 720,
          height: 405,
        }).run();
        
        // Add a paragraph after the video for better spacing
        editor.chain().focus().insertContent('<p></p>').run();
      
        toast({
          title: "YouTube video added",
          description: "Video has been embedded in your content",
          variant: "default"
        });
      } catch (error) {
        console.error('YouTube embed error:', error);
        toast({
          title: "Failed to embed YouTube video",
          description: "Please check the URL and try again",
          variant: "destructive"
        });
      }
    }
  }, [editor]);

  const triggerVideoModal = useCallback(() => {
    setShowVideoModal(true);
  }, []);

  const closeVideoModal = useCallback(() => {
    setShowVideoModal(false);
  }, []);

  return {
    showVideoModal,
    handleVideoInsert,
    handleAddYouTubeVideo,
    triggerVideoModal,
    closeVideoModal
  };
};

export default useVideoUpload;
