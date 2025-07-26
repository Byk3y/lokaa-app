import { log } from '@/utils/logger';
import React, { useState, useEffect } from "react";
import { formatAsTitle } from '@/utils/textUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import RichTextEditor from "@/components/ui/rich-text-editor";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface CourseLessonData {
  id: string;
  title: string;
  content_type: 'text' | 'video_embed' | 'external_link';
  content_text: string | null;
  content_url: string | null;
  lesson_order: number;
  created_at: string;
  updated_at: string;
  module_id: string;
}

interface EditLessonDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  lessonToEdit: CourseLessonData | null;
  onUpdateLesson: (updatedLesson: Partial<CourseLessonData>) => Promise<void>;
  isUpdating: boolean;
  primaryColor: string;
}

export default function EditLessonDialog({
  isOpen,
  onOpenChange,
  lessonToEdit,
  onUpdateLesson,
  isUpdating,
  primaryColor
}: EditLessonDialogProps) {
  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState<'text' | 'video_embed' | 'external_link'>('text');
  const [contentText, setContentText] = useState("");
  const [contentUrl, setContentUrl] = useState("");
  const [useRichText, setUseRichText] = useState(true);

  useEffect(() => {
    if (isOpen && lessonToEdit) {
      setTitle(lessonToEdit.title);
      setContentType(lessonToEdit.content_type);
      setContentText(lessonToEdit.content_text || "");
      setContentUrl(lessonToEdit.content_url || "");
      
      // Check if content contains HTML - if so, use rich text editor
      const hasHtml = lessonToEdit.content_text?.includes('<') || false;
      setUseRichText(hasHtml);
    } else if (!isOpen) {
      // Reset form when dialog is closed
      setTitle("");
      setContentType('text');
      setContentText("");
      setContentUrl("");
      setUseRichText(true);
    }
  }, [isOpen, lessonToEdit]);

  const handleSubmit = async () => {
    if (!lessonToEdit) return;
    // Extract title from content if not provided
    let finalTitle = title.trim();
    
    if (!finalTitle) {
      if (contentType === 'text' && contentText.trim()) {
        // Try to extract title from the first heading in the content
        const headingMatch = contentText.match(/^#+\\s+(.+)$/m);
        if (headingMatch) {
          finalTitle = headingMatch[1].trim();
        } else {
          // Try to extract from the first line of content
          const firstLine = contentText.split('\\n')[0].trim();
          if (firstLine && firstLine.length > 0 && firstLine.length <= 100) {
            finalTitle = firstLine;
          } else {
            finalTitle = "Untitled Lesson";
          }
        }
      } else {
        finalTitle = "Untitled Lesson";
      }
    }

    let contentIsValid = true;
    let errorMessage = "";

    if (contentType === 'text' && !contentText.trim()) {
      contentIsValid = false;
      errorMessage = "Text content cannot be empty.";
    } else if ((contentType === 'video_embed' || contentType === 'external_link') && !contentUrl.trim()) {
      contentIsValid = false;
      errorMessage = "URL cannot be empty for video embeds or external links.";
    } else if ((contentType === 'video_embed' || contentType === 'external_link') && contentUrl.trim()) {
      try {
        new URL(contentUrl);
      } catch (_) {
        contentIsValid = false;
        errorMessage = "Please enter a valid URL (e.g., starting with http:// or https://).";
      }
    }

    if (!contentIsValid) {
      toast({
        title: "Validation Error",
        description: errorMessage,
        variant: "destructive"
      });
      return;
    }

    const lessonDataToUpdate: Partial<CourseLessonData> = {
      title: finalTitle,
      content_type: contentType,
      content_text: contentType === 'text' ? contentText.trim() : null,
      content_url: (contentType === 'video_embed' || contentType === 'external_link') ? contentUrl.trim() : null,
    };

    try {
      await onUpdateLesson(lessonDataToUpdate);
      onOpenChange(false);
      toast({
        title: "Lesson Updated",
        description: `"${finalTitle}" has been saved successfully.`,
        variant: "default"
      });
    } catch (error: any) {
      log.error('Component', 'Error updating lesson:', error);
      toast({
        title: "Error Updating Lesson",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  if (!lessonToEdit && isOpen) {
    log.warn('Component', "EditLessonDialog opened without lessonToEdit data.");
    return null; 
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[60vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Edit Lesson</DialogTitle>
          <DialogDescription>Update the lesson details.</DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <div className="grid gap-4 py-4 h-full">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-lesson-title-dialog">Lesson Title (optional - will be extracted from content)</Label>
              <Input 
                id="edit-lesson-title-dialog" 
                value={title} 
                onChange={(e) => setTitle(formatAsTitle(e.target.value))} 
                placeholder="e.g., Understanding Core Concepts (or leave empty to extract from content)"
                className="text-base py-2.5 px-3"
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Content Type</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {(['text', 'video_embed', 'external_link'] as const).map((type) => {
                  let labelText = "Rich Text";
                  if (type === 'video_embed') labelText = "Video Embed";
                  if (type === 'external_link') labelText = "External Link";
                  return (
                    <div 
                      key={type}
                      onClick={() => setContentType(type)}
                      className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ease-in-out text-sm 
                                  ${contentType === type 
                                    ? 'border-primary ring-2 ring-primary shadow-sm bg-primary/5' 
                                    : 'border-gray-300 hover:border-gray-400 bg-white'}`}
                    >
                      <div className="flex items-center">
                        <input 
                          type="radio" 
                          id={`edit-lesson-type-${type}`}
                          name="edit-lesson-content-type" 
                          value={type}
                          checked={contentType === type}
                          onChange={() => setContentType(type)} 
                          className="h-4 w-4 text-primary border-gray-300 focus:ring-primary mr-2 shrink-0"
                        />
                        <label htmlFor={`edit-lesson-type-${type}`} className="font-medium text-gray-700 cursor-pointer">{labelText}</label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {contentType === 'text' && (
              <div className="grid gap-1.5 flex-1 min-h-0">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-lesson-content-text-dialog">Lesson Content</Label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setUseRichText(!useRichText)}
                      className="text-xs px-2 py-1 rounded border hover:bg-gray-50 transition-colors"
                    >
                      {useRichText ? 'Switch to Plain Text' : 'Switch to Rich Text'}
                    </button>
                  </div>
                </div>
                
                {useRichText ? (
                  <div className="flex-1 min-h-0">
                    <RichTextEditor
                      content={contentText}
                      onChange={setContentText}
                      placeholder="Start writing your lesson content..."
                      defaultTitle={lessonToEdit?.title || ''}
                      className="h-[400px]"
                      onSave={(title, content) => {
                        setContentText(content);
                        setTitle(title);
                      }}
                      onCancel={() => {
                        // Handle cancel if needed
                      }}
                    />
                  </div>
                ) : (
                  <Textarea 
                    id="edit-lesson-content-text-dialog"
                    value={contentText}
                    onChange={(e) => setContentText(e.target.value)}
                    placeholder="Enter the text content for this lesson..."
                    rows={12}
                    className="text-base py-2.5 px-3 min-h-[300px] resize-none"
                  />
                )}
              </div>
            )}

            {(contentType === 'video_embed' || contentType === 'external_link') && (
              <div className="grid gap-1.5">
                <Label htmlFor="edit-lesson-content-url-dialog">
                  {contentType === 'video_embed' ? 'Video Embed URL' : 'External Link URL'}
                </Label>
                <Input 
                  id="edit-lesson-content-url-dialog"
                  type="url"
                  value={contentUrl}
                  onChange={(e) => setContentUrl(e.target.value)}
                  placeholder={contentType === 'video_embed' 
                                ? "e.g., https://www.youtube.com/embed/VIDEO_ID" 
                                : "e.g., https://example.com/resource"}
                  className="text-base py-2.5 px-3"
                />
                {contentType === 'video_embed' && (
                  <p className="text-xs text-gray-500 pl-1">Tip: Use the embed URL from YouTube, Vimeo, etc.</p>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isUpdating || !lessonToEdit} style={{ backgroundColor: primaryColor, color: 'white'}}>
            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isUpdating ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 