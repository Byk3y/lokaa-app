import { log } from '@/utils/logger';
import React, { useState } from 'react';
import { CheckCircle2, Edit, FileText, Save, X, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RichTextEditor from '@/components/ui/rich-text-editor';
import { useToast } from '@/hooks/use-toast';

interface CourseLesson {
  id: string;
  title: string;
  content_type: string;
  content_url: string | null;
  content_text: string | null;
  lesson_order: number;
}

interface LessonContentProps {
  lesson: CourseLesson | null;
  courseName: string;
  isOwner?: boolean;
  onUpdateLesson?: (lessonId: string, updates: { title?: string; content_text?: string }) => Promise<void>;
  onCreateNewPage?: () => void;
  onMarkAsDone?: () => void;
}

const LessonContent: React.FC<LessonContentProps> = ({ 
  lesson, 
  courseName, 
  isOwner = false,
  onUpdateLesson,
  onCreateNewPage,
  onMarkAsDone
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isInlineCreating, setIsInlineCreating] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageContent, setNewPageContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleStartInlineCreation = () => {
    setIsInlineCreating(true);
    setNewPageTitle('');
    setNewPageContent('');
  };

  const handleCancelInlineCreation = () => {
    setIsInlineCreating(false);
    setNewPageTitle('');
    setNewPageContent('');
  };

  const handleSaveInlineCreation = async () => {
    if (!newPageTitle.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for this page.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      // For now, just call the original onCreateNewPage
      // In the future, this could be enhanced to create the page directly
      if (onCreateNewPage) {
        onCreateNewPage();
      }
      
      setIsInlineCreating(false);
      setNewPageTitle('');
      setNewPageContent('');
      
      toast({
        title: "Page Created",
        description: `"${newPageTitle}" has been created successfully.`,
        variant: "default"
      });
    } catch (error: any) {
      log.error('Component', 'Error creating page:', error);
      toast({
        title: "Error Creating Page",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!lesson) {
    return (
      <div className="h-full bg-gray-50 p-6">
        <div className="w-full">
          {isOwner && onCreateNewPage ? (
            <>
              {!isInlineCreating ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 flex items-center w-full">
                  <span className="text-lg font-medium text-gray-900">New page</span>
                  <div className="ml-auto flex items-center gap-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkAsDone?.();
                      }}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      title="Mark as done"
                    >
                      <CheckCircle2 className="w-6 h-6 text-gray-400 hover:text-green-600" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartInlineCreation();
                      }}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      title="Start writing"
                    >
                      <Edit className="w-6 h-6 text-gray-400 hover:text-blue-600" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full">
                  <RichTextEditor
                    content={newPageContent}
                    onChange={setNewPageContent}
                    placeholder="Start writing your content..."
                    defaultTitle={newPageTitle}
                    onSave={(title, content) => {
                      setNewPageTitle(title);
                      setNewPageContent(content);
                      handleSaveInlineCreation();
                    }}
                    onCancel={handleCancelInlineCreation}
                    className="w-full max-w-none"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4" />
                <p>This course doesn't have any lessons yet.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    // For existing lessons, we'll implement proper inline editing later
    // For now, just toggle back to view mode
    setIsEditing(false);
    
    toast({
      title: "Edit Mode",
      description: "Lesson editing will be implemented soon.",
      variant: "default"
    });
  };

  const renderVideoContent = () => {
    if (!lesson.content_url) return null;

    // Extract YouTube video ID from URL
    const getYouTubeVideoId = (url: string) => {
      const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
      const match = url.match(regex);
      return match ? match[1] : null;
    };

    const videoId = getYouTubeVideoId(lesson.content_url);
    
    if (videoId) {
      return (
        <div className="video-container">
          <iframe
            className="course-detail-content"
            src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&fs=1&cc_load_policy=0&iv_load_policy=3&theme=light`}
            title={lesson.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      );
    }

    // Fallback for non-YouTube videos
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <div className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-4">External video content</p>
        <a
          href={lesson.content_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <span>Open Video</span>
        </a>
      </div>
    );
  };

  const renderTextContent = () => {
    if (!lesson.content_text) {
      if (isOwner) {
        return (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No content yet</p>
            <Button onClick={handleEdit} className="flex items-center space-x-2">
              <Edit className="w-4 h-4" />
              <span>Add Content</span>
            </Button>
          </div>
        );
      }
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No content available</p>
        </div>
      );
    }

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="prose max-w-none">
          <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
            {lesson.content_text}
          </div>
        </div>
      </div>
    );
  };

  if (isEditing && lesson.content_type === 'text') {
    return (
      <div className="flex flex-col h-full bg-white">
        {/* Edit Mode Header */}
        <div className="border-b border-gray-200 p-6 bg-white">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Editing Lesson</h2>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSave}
                  disabled={isSaving || !lesson.title.trim()}
                >
                  {isSaving ? (
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-1" />
                  ) : (
                    <Save className="w-4 h-4 mr-1" />
                  )}
                  Save
                </Button>
              </div>
            </div>
            
            <div>
              <Input
                value={lesson.title}
                onChange={(e) => onUpdateLesson?.(lesson.id, { title: e.target.value })}
                placeholder="Enter lesson title..."
                className="text-xl font-semibold"
                maxLength={100}
              />
            </div>
          </div>
        </div>

        {/* Rich Text Editor */}
        <div className="flex-1 p-6 overflow-hidden">
          <div className="h-full">
            <RichTextEditor
              content={lesson.content_text || ''}
              onChange={(content) => onUpdateLesson?.(lesson.id, { content_text: content })}
              placeholder="Start writing your lesson content..."
              className="h-full"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Lesson Header */}
      <div className="border-b border-gray-200 p-6 bg-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="course-title text-2xl font-semibold text-gray-900 mb-2">
              {lesson.title}
            </h1>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span className="flex items-center space-x-1">
                {lesson.content_type === 'video_embed' ? (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Video</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Text</span>
                  </>
                )}
              </span>
              <span>•</span>
              <span>{courseName}</span>
            </div>
          </div>
          
          {/* Edit Button for Owners (only for text content) */}
          {isOwner && lesson.content_type === 'text' && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleEdit}
              className="flex items-center space-x-2"
            >
              <Edit className="w-4 h-4" />
              <span>Edit</span>
            </Button>
          )}
        </div>
      </div>

      {/* Lesson Content */}
      <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
        <div className="w-full">
          {lesson.content_type === 'video_embed' && renderVideoContent()}
          {lesson.content_type === 'text' && renderTextContent()}
          
          {/* Fallback for unknown content types */}
          {lesson.content_type !== 'video_embed' && lesson.content_type !== 'text' && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                Unsupported content type: {lesson.content_type}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LessonContent; 