import { log } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import RichTextEditor from '@/components/ui/rich-text-editor';
import { Loader2, Save, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface LessonContentEditorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId?: string;
  moduleId: string;
  courseId: string;
  initialTitle?: string;
  initialContent?: string;
  isPublished?: boolean;
  onSave: (data: {
    title: string;
    content: string;
    isPublished: boolean;
  }) => Promise<void>;
  isLoading?: boolean;
}

export const LessonContentEditor: React.FC<LessonContentEditorProps> = ({
  isOpen,
  onOpenChange,
  lessonId,
  moduleId,
  courseId,
  initialTitle = "",
  initialContent = "",
  isPublished = false,
  onSave,
  isLoading = false,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [published, setPublished] = useState(isPublished);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Reset form when dialog opens/closes or props change
  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setContent(initialContent);
      setPublished(isPublished);
      setHasUnsavedChanges(false);
    }
  }, [isOpen, initialTitle, initialContent, isPublished]);

  // Track changes
  useEffect(() => {
    const titleChanged = title !== initialTitle;
    const contentChanged = content !== initialContent;
    const publishedChanged = published !== isPublished;
    setHasUnsavedChanges(titleChanged || contentChanged || publishedChanged);
  }, [title, content, published, initialTitle, initialContent, isPublished]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for this lesson.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        title: title.trim(),
        content,
        isPublished: published,
      });
      
      setHasUnsavedChanges(false);
      toast({
        title: "Lesson Saved",
        description: `"${title}" has been saved successfully.`,
        variant: "default"
      });
    } catch (error: any) {
      log.error('Component', 'Error saving lesson:', error);
      toast({
        title: "Error Saving Lesson",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      const confirmDiscard = window.confirm(
        "You have unsaved changes. Are you sure you want to cancel?"
      );
      if (!confirmDiscard) return;
    }
    onOpenChange(false);
  };

  const handleAddResource = (type: 'link' | 'file' | 'transcript') => {
    switch (type) {
      case 'link':
        const url = window.prompt('Enter resource URL:');
        if (url) {
          const linkHtml = `<p><a href="${url}" target="_blank" rel="noopener noreferrer">🔗 Resource Link</a></p>`;
          setContent(prev => prev + linkHtml);
        }
        break;
      case 'file':
        // In a real implementation, this would open a file picker
        toast({
          title: "File Upload",
          description: "File upload functionality coming soon!",
          variant: "default"
        });
        break;
      case 'transcript':
        const transcriptHtml = `<blockquote><p><strong>Transcript:</strong><br />Enter your transcript here...</p></blockquote>`;
        setContent(prev => prev + transcriptHtml);
        break;
    }
  };

  const handlePinPost = () => {
    toast({
      title: "Pin Community Post",
      description: "Community post pinning functionality coming soon!",
      variant: "default"
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[60vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="text-lg font-semibold">
            {lessonId ? 'Edit Lesson' : 'New Lesson'}
          </DialogTitle>
          <DialogDescription>
            Create or edit lesson content with rich text formatting
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Title Input */}
          <div className="px-6 py-4 border-b bg-gray-50 flex-shrink-0">
            <div className="space-y-2">
              <Label htmlFor="lesson-title" className="text-sm font-medium">
                Lesson Title {!title.trim() && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="lesson-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter lesson title..."
                className={`text-lg font-medium ${!title.trim() ? 'border-red-300' : ''}`}
                maxLength={100}
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  {title.length} / 100 characters
                </p>
                {!title.trim() && (
                  <p className="text-xs text-red-500">Title is required</p>
                )}
              </div>
            </div>
          </div>

          {/* Rich Text Editor */}
          <div className="flex-1 min-h-0 p-6">
            <Label className="text-sm font-medium mb-3 block">
              Lesson Content
            </Label>
            <div className="h-full">
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Start writing your lesson content..."
                className="h-full"
                onSave={(title, content) => {
                  // Handle save from the rich text editor
                  handleSave();
                }}
                onCancel={() => {
                  handleCancel();
                }}
                defaultTitle={title}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t flex justify-between items-center flex-shrink-0">
          {/* Published Toggle */}
          <div className="flex items-center gap-3">
            <div 
              role="switch"
              aria-checked={published}
              onClick={() => setPublished(prev => !prev)}
              className="flex items-center gap-2 cursor-pointer transition-all duration-200 ease-in-out"
            >
              <div 
                className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out 
                            ${published ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <div 
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out 
                              ${published ? 'translate-x-5' : 'translate-x-0'}`}
                ></div>
              </div>
              <span className={`text-sm font-medium ${published ? 'text-green-700' : 'text-gray-700'}`}>
                {published ? 'Published' : 'Draft'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              disabled={isSaving || isLoading}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={isSaving || isLoading || !title.trim()}
              className="flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LessonContentEditor; 