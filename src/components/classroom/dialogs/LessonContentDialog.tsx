import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Video, Edit } from "lucide-react";
import type { CourseLessonData } from '@/types/classroom';

interface LessonContentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  lesson: CourseLessonData | null;
  getEmbedUrl: (url: string | null | undefined) => string | null; 
  onEditLesson?: (lesson: CourseLessonData) => void;
  canEdit?: boolean;
}

export default function LessonContentDialog({
  isOpen,
  onOpenChange,
  lesson,
  getEmbedUrl,
  onEditLesson,
  canEdit = false,
}: LessonContentDialogProps) {

  if (!lesson) return null;

  const handleEdit = () => {
    if (onEditLesson && lesson) {
      onEditLesson(lesson);
      onOpenChange(false);
    }
  };

  // Check if content contains HTML tags
  const isRichText = lesson.content_text?.includes('<') || false;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pt-6 pb-4 px-6">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold pr-4">{lesson.title}</DialogTitle>
            {canEdit && onEditLesson && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleEdit}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>
        
        <div className="px-6 pb-6">
          {lesson.content_type === 'text' && (
            <div className="prose prose-lg max-w-none dark:prose-invert">
              {isRichText ? (
                <div 
                  dangerouslySetInnerHTML={{ __html: lesson.content_text || "" }}
                  className="rich-text-content"
                />
              ) : (
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {lesson.content_text || "No text content available."}
                </div>
              )}
            </div>
          )}
          
          {lesson.content_type === 'video_embed' && (() => {
            const embedUrl = getEmbedUrl(lesson.content_url);
            return embedUrl ? (
              <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
                <iframe 
                  className="w-full h-full"
                  src={embedUrl} 
                  title={lesson.title} 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                  allowFullScreen
                >
                </iframe>
              </div>
            ) : (
              <div className="p-4 border rounded-lg bg-gray-50 text-center">
                <Video className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-3">
                  Video preview isn't available for this link.
                </p>
                {lesson.content_url && (
                  <Button asChild variant="outline">
                    <a href={lesson.content_url} target="_blank" rel="noopener noreferrer">
                      Open Link in New Tab
                    </a>
                  </Button>
                )}
                {!lesson.content_url && (
                    <p className="text-xs text-gray-400 italic">No URL provided for this video lesson.</p>
                )}
              </div>
            );
          })()}
          
          {lesson.content_type === 'external_link' && lesson.content_url && (
            <div>
              <p className="mb-2">This lesson links to an external resource:</p>
              <Button asChild>
                <a href={lesson.content_url} target="_blank" rel="noopener noreferrer">
                  Open Link: {lesson.title}
                </a>
              </Button>
            </div>
          )}
          
          {/* Placeholder if content is missing for a type and not handled above */}
          {((lesson.content_type === 'video_embed' || lesson.content_type === 'external_link') && !lesson.content_url) && (
              <p>Content URL is missing for this lesson.</p>
          )}
        </div>
        
        <DialogFooter className="px-6 pb-6 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {/* TODO: Add Next/Prev lesson buttons if needed */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 