import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import type { CourseLessonData, CourseModuleWithLessons } from "../ClassroomTab"; // Adjust path as necessary

interface AddLessonDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  moduleId: string | null;
  // Pass only the target module's title for description, or full modules list if needed for other reasons
  targetModuleTitle: string | undefined; 
  onCreateLesson: (lessonData: Omit<CourseLessonData, 'id' | 'created_at' | 'updated_at' | 'module_id' | 'lesson_order'> & { module_id: string, lesson_order: number }) => Promise<void>;
  isCreating: boolean;
  primaryColor: string;
  currentLessonCount: number; // To calculate next lesson_order
}

export default function AddLessonDialog({
  isOpen,
  onOpenChange,
  moduleId,
  targetModuleTitle,
  onCreateLesson,
  isCreating,
  primaryColor,
  currentLessonCount
}: AddLessonDialogProps) {
  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState<'text' | 'video_embed' | 'external_link'>('text');
  const [contentText, setContentText] = useState("");
  const [contentUrl, setContentUrl] = useState("");

  useEffect(() => {
    if (isOpen) {
      // Reset form when dialog opens
      setTitle("");
      setContentType('text');
      setContentText("");
      setContentUrl("");
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!moduleId) {
      // This should ideally be handled by parent disabling open, but good to have a check
      console.error("Module ID is missing in AddLessonDialog");
      return;
    }
    if (!title.trim()) {
      alert("Lesson title required"); // Replace with toast if available
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

    const newLessonOrder = currentLessonCount + 1;

    const lessonDataToCreate = {
      module_id: moduleId,
      title: title.trim(),
      content_type: contentType,
      lesson_order: newLessonOrder,
      content_text: contentType === 'text' ? contentText.trim() : null,
      content_url: (contentType === 'video_embed' || contentType === 'external_link') ? contentUrl.trim() : null,
    };

    await onCreateLesson(lessonDataToCreate);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Lesson</DialogTitle>
          {targetModuleTitle && (
            <DialogDescription>
              To module: {targetModuleTitle}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-1.5">
            <Label htmlFor="lesson-title-add">Lesson Title</Label>
            <Input 
              id="lesson-title-add" 
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
                        id={`lesson-type-add-${type}`}
                        name="lesson-content-type-add" 
                        value={type}
                        checked={contentType === type}
                        onChange={() => setContentType(type)} 
                        className="h-4 w-4 text-primary border-gray-300 focus:ring-primary mr-2 shrink-0"
                      />
                      <label htmlFor={`lesson-type-add-${type}`} className="font-medium text-gray-700 cursor-pointer">{labelText}</label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {contentType === 'text' && (
            <div className="grid gap-1.5">
              <Label htmlFor="lesson-content-text-add">Lesson Content</Label>
              <Textarea 
                id="lesson-content-text-add"
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
              <Label htmlFor="lesson-content-url-add">
                {contentType === 'video_embed' ? 'Video Embed URL' : 'External Link URL'}
              </Label>
              <Input 
                id="lesson-content-url-add"
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isCreating || !moduleId} style={{ backgroundColor: primaryColor, color: 'white'}}>
            {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isCreating ? "Adding..." : "Add Lesson"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 