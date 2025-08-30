import { useRef, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { toast } from '@/hooks/use-toast';

export interface ImageUploadOptions {
  spaceId?: string;
  lessonId?: string;
  courseId?: string;
}

export interface UseImageUploadProps {
  editor: Editor | null;
  options?: ImageUploadOptions;
}

/**
 * Custom hook for handling image uploads in rich text editors
 * Provides validation, upload logic, and editor integration
 */
export const useImageUpload = ({ editor, options = {} }: UseImageUploadProps) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { spaceId, lessonId, courseId } = options;

  const validateImageFile = useCallback((file: File): boolean => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (PNG, JPG, GIF, etc.)",
        variant: "destructive"
      });
      return false;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      });
      return false;
    }

    return true;
  }, []);

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor) return;

    if (!validateImageFile(file)) return;

    try {
      let imageUrl: string;
      
      if (spaceId) {
        // Use the real upload service if spaceId is provided
        const { uploadEducationalContentImage } = await import('@/utils/imageUploadService');
        const result = await uploadEducationalContentImage(file, {
          spaceId,
          lessonId,
          courseId,
        });
        imageUrl = result.url;
      } else {
        // Fallback to local object URL for demo/testing
        imageUrl = URL.createObjectURL(file);
      }

      // Insert image with filename as alt text
      const altText = file.name.replace(/\.[^/.]+$/, "");
      editor.chain().focus().setImage({ 
        src: imageUrl, 
        alt: altText,
        title: altText
      }).run();

      toast({
        title: "Image uploaded",
        description: "Image has been inserted into your content",
        variant: "default"
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    }

    // Reset the input
    event.target.value = '';
  }, [editor, spaceId, lessonId, courseId, validateImageFile]);

  const triggerImageUpload = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  return {
    imageInputRef,
    handleImageUpload,
    triggerImageUpload,
    validateImageFile
  };
};

export default useImageUpload;
