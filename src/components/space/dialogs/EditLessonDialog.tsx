import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import type { CourseLessonData } from "../ClassroomTab"; // Adjust path if necessary
import type { Tables } from "@/types/supabase"; // For lessonDataToUpdate type

interface EditLessonDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  lessonToEdit: CourseLessonData | null;
  onUpdateLesson: (lessonId: string, updates: Partial<Tables<'course_lessons'>>) => Promise<void>;
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

  useEffect(() => {
    if (isOpen && lessonToEdit) {
      setTitle(lessonToEdit.title);
      setContentType(lessonToEdit.content_type);
      setContentText(lessonToEdit.content_text || "");
      setContentUrl(lessonToEdit.content_url || "");
    } else if (!isOpen) {
      // Reset form when dialog is closed, though lessonToEdit changing also handles initialization
      setTitle("");
      setContentType('text');
      setContentText("");
      setContentUrl("");
    }
  }, [isOpen, lessonToEdit]);

  const handleSubmit = async () => {
    if (!lessonToEdit) return;
    if (!title.trim()) {
      alert("Lesson title required"); // Replace with toast if available in this component
      return;
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
      alert(errorMessage); // Replace with toast
      return;
    }

    const lessonDataToUpdate: Partial<Tables<'course_lessons'>> = {
      title: title.trim(),
      content_type: contentType,
      content_text: contentType === 'text' ? contentText.trim() : null,
      content_url: (contentType === 'video_embed' || contentType === 'external_link') ? contentUrl.trim() : null,
    };

    await onUpdateLesson(lessonToEdit.id, lessonDataToUpdate);
  };
  
  if (!lessonToEdit && isOpen) {
    // This case should ideally not happen if parent logic is correct,
    // but it prevents trying to render with a null lessonToEdit when open.
    console.warn("EditLessonDialog opened without lessonToEdit data.");
    return null; 
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Lesson</DialogTitle>
          {lessonToEdit && (
            <DialogDescription>
              Editing: {lessonToEdit.title}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-1.5">
            <Label htmlFor="edit-lesson-title-dialog">Lesson Title</Label>
            <Input 
              id="edit-lesson-title-dialog" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="e.g., Understanding Core Concepts"
              className="text-base py-2.5 px-3"
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Content Type</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {(['text', 'video_embed', 'external_link'] as const).map((type) => {
                let labelText = "Text";
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
            <div className="grid gap-1.5">
              <Label htmlFor="edit-lesson-content-text-dialog">Lesson Content</Label>
              <Textarea 
                id="edit-lesson-content-text-dialog"
                value={contentText}
                onChange={(e) => setContentText(e.target.value)}
                placeholder="Enter the text content for this lesson..."
                rows={6}
                className="text-base py-2.5 px-3 min-h-[120px]"
              />
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
        <DialogFooter>
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