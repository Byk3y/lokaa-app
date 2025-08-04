import { log } from '@/utils/logger';
import React, { useState, useCallback, useRef } from 'react';
import { formatAsTitle } from '@/utils/textUtils';
import { CheckCircle2, Edit, FileText, Save, X, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RichTextEditor from '@/components/ui/rich-text-editor';
import { useToast } from '@/hooks/use-toast';
import { VideoContentExtractor } from '@/utils/videoContentExtractor';
import type { CourseLesson, LessonContentProps } from '@/types/classroom/courseDetail';

const LessonContent: React.FC<LessonContentProps> = ({ 
  lesson, 
  courseName, 
  isOwner = false,
  isAdmin = false,
  completed = false,
  onUpdateLesson,
  onCreateNewPage,
  onMarkAsDone
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isInlineCreating, setIsInlineCreating] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageContent, setNewPageContent] = useState('');
  const [editingContent, setEditingContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  // Debouncing refs
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveDataRef = useRef<{title?: string, content?: string} | null>(null);

  const getContentSource = () => {
    if (lesson?.educational_content?.text_content) {
      return {
        content: lesson.educational_content.text_content,
        isEducationalContent: true,
        source: 'educational_content'
      };
    }
    
    // Check if we have content_text in the lesson (legacy field)
    if (lesson?.content_text) {
      return {
        content: lesson.content_text,
        isEducationalContent: false,
        source: 'legacy_content_text'
      };
    }
    
    // Check if we have content in the posts table
    if (lesson?.posts?.content) {
      return {
        content: lesson.posts.content,
        isEducationalContent: false,
        source: 'posts_content'
      };
    }
    
    return {
      content: '',
      isEducationalContent: false,
      source: 'no_content'
    };
  };

  // Helper function to ensure content is properly formatted for TipTap
  const ensureValidContent = (content: string): string => {
    if (!content || content.trim() === '') return '';
    
    // If content contains video embeds, ensure it's properly formatted
    if (content.includes('data-youtube-video') || content.includes('iframe') || content.includes('embed')) {
      // Add a non-breaking space after video embeds to ensure TipTap recognizes it as non-empty
      const videoContent = content.trim();
      // If the content ends with video embed, add a paragraph to ensure it's recognized as non-empty
      if (videoContent.includes('</div>') && !videoContent.includes('<p>')) {
        return videoContent + '<p>&nbsp;</p>';
      }
      return videoContent;
    }
    
    // If content is just whitespace or empty tags, return empty
    const stripped = content.replace(/<[^>]*>/g, '').trim();
    if (stripped === '') return '';
    
    // Ensure content has at least one valid HTML element
    if (!content.includes('<')) {
      return `<p>${content}</p>`;
    }
    
    return content;
  };

  // Helper function to remove only duplicate H2 titles for edit mode
  const removeDuplicateH2Titles = (content: string | null): string => {
    if (!content) return '';
    
    // Remove the hr tag if it exists
    let cleaned = content.replace(/<hr[^>]*>/gi, '');
    
    // Remove H1 tags that contain the exact lesson title (since title is shown separately)
    const titleToRemove = lesson.title;
    if (titleToRemove) {
      // Remove H1 tags containing the title
      cleaned = cleaned.replace(new RegExp(`<h1[^>]*>\\s*${titleToRemove.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</h1>`, 'gi'), '');
      // Remove H2 tags containing the title
      cleaned = cleaned.replace(new RegExp(`<h2[^>]*>\\s*${titleToRemove.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</h2>`, 'gi'), '');
    }
    
    // Remove any leading whitespace and empty paragraphs
    cleaned = cleaned.replace(/^\s*<p>\s*<\/p>\s*/i, '').trim();
    
    // Ensure we don't return empty content if there was valid content
    if (cleaned === '' && content.trim() !== '') {
      // If we accidentally removed all content, return the original content
      return content.trim();
    }
    
    return cleaned;
  };

  // Helper function to add spacing around video elements
  const addVideoSpacing = (content: string): string => {
    if (!content) return content;
    
    // Add spacing after iframe elements (most common for YouTube embeds)
    let processed = content.replace(
      /(<iframe[^>]*>.*?<\/iframe>)/gi,
      '$1<div style="margin-bottom: 3rem; height: 0;"></div>'
    );
    
    // Add spacing after video elements
    processed = processed.replace(
      /(<video[^>]*>.*?<\/video>)/gi,
      '$1<div style="margin-bottom: 3rem; height: 0;"></div>'
    );
    
    return processed;
  };

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
    // Extract title from content if not provided
    let finalTitle = newPageTitle.trim();
    
    if (!finalTitle) {
      // Try to extract title from the first heading in the content (HTML format)
      const headingMatch = newPageContent.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
      if (headingMatch) {
        finalTitle = headingMatch[1].replace(/<[^>]*>/g, '').trim();
      } else {
        // Try to extract from the first paragraph
        const paragraphMatch = newPageContent.match(/<p[^>]*>(.*?)<\/p>/i);
        if (paragraphMatch) {
          const text = paragraphMatch[1].replace(/<[^>]*>/g, '').trim();
          if (text && text.length <= 100) {
            finalTitle = text;
          } else {
            finalTitle = "Untitled Page";
          }
        } else {
          // Try to extract from plain text (fallback)
          const firstLine = newPageContent.split('\\n')[0].trim();
          if (firstLine && firstLine.length > 0 && firstLine.length <= 100) {
            finalTitle = firstLine;
          } else {
            // If no content yet, use a default title
            finalTitle = "Untitled Page";
          }
        }
      }
    }

    setIsSaving(true);
    try {
      // Create the page with the extracted title
      if (onCreateNewPage) {
        // Update the title with the extracted one
        setNewPageTitle(finalTitle);
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

  const handleEdit = () => {
    const contentSource = getContentSource();
    setEditingContent(contentSource.content);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingContent('');
  };

  const debouncedSave = useCallback(async (title?: string, content?: string) => {
    
    if (!lesson || !onUpdateLesson) {
      setIsEditing(false);
      return;
    }

    // Prevent concurrent saves
    if (isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const finalContent = content || editingContent;
      
      // Extract video URL from HTML content if available
      let finalVideoUrl: string | null = null;
      let cleanedContent = finalContent;
      
      if (finalContent) {
        // Extract video URL from HTML content
        const iframeMatch = finalContent.match(/src=["']([^"']*youtube\.com\/embed\/[^"']*)["']/) ||
                            finalContent.match(/src=([^\s>]*youtube\.com\/embed\/[^\s>]*)/);
        
        if (iframeMatch && iframeMatch[1]) {
          finalVideoUrl = iframeMatch[1];
        } else {
          // Look for direct YouTube URLs in the content
          const youtubeMatch = finalContent.match(/(https?:\/\/(?:www\.)?youtube\.com\/watch\?v=[^\s"']+)/);
          if (youtubeMatch) {
            finalVideoUrl = youtubeMatch[1];
          }
        }
      }

      // Clean the content by removing embedded video iframes (since we store video URL separately)
      if (finalContent && finalVideoUrl) {
        cleanedContent = VideoContentExtractor.cleanHTMLContent(finalContent);
      }


      // Prepare update object - only include content_url if we found a video
      const updateData: any = {
        title: title || lesson.title,
        content_text: cleanedContent
      };
      
      // Only update content_url if we found a video URL in the content
      if (finalVideoUrl) {
        updateData.content_url = finalVideoUrl;
      } else {
      }

      // Update the lesson
      await onUpdateLesson(lesson.id, updateData);
      
      
      setIsEditing(false);
      setEditingContent('');
      
      toast({
        title: "Lesson Updated",
        description: "Your changes have been saved successfully.",
        variant: "default"
      });
    } catch (error) {
      console.error('🎓 [LessonContent] Error in debouncedSave:', error);
      log.error('Component', 'Error saving lesson:', error);
      // Note: Error toast is now handled by the handleUpdateLesson function
      // to avoid duplicate error messages
    } finally {
      setIsSaving(false);
    }
  }, [lesson, onUpdateLesson, editingContent, isSaving, toast]);

  const handleSave = useCallback((title?: string, content?: string) => {
    console.log('🎓 [LessonContent] handleSave called with:', { title, contentLength: content?.length });
    
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Store the save data for comparison
    const currentSaveData = { title, content };
    
    // Check if this is the same data as the last save attempt
    if (lastSaveDataRef.current && 
        lastSaveDataRef.current.title === title && 
        lastSaveDataRef.current.content === content) {
      console.log('🎓 [LessonContent] Duplicate save detected, ignoring');
      return;
    }
    
    lastSaveDataRef.current = currentSaveData;
    
    // Debounce the save operation
    saveTimeoutRef.current = setTimeout(() => {
      console.log('🎓 [LessonContent] Executing debounced save');
      debouncedSave(title, content);
    }, 500); // 500ms debounce
  }, [debouncedSave]);

  const renderVideoContent = () => {
    console.log('🎥 [LessonContent] renderVideoContent called');
    
    // Use VideoContentExtractor to detect videos in both content_url and embedded HTML
    const videoInfo = VideoContentExtractor.extractVideoInfo(lesson);
    
    console.log('🎥 [LessonContent] videoInfo:', videoInfo);
    
    if (!videoInfo) {
      console.log('🎥 [LessonContent] No videoInfo, returning null');
      return null;
    }

    // Generate embed URL with proper parameters
    const embedUrl = VideoContentExtractor.generateEmbedUrl(videoInfo, window.location.origin);
    console.log('🎥 [LessonContent] Generated embedUrl:', embedUrl);
    
    if (videoInfo.platform === 'youtube') {
      console.log('🎥 [LessonContent] Rendering YouTube video with embedUrl:', embedUrl);
      console.log('🎥 [LessonContent] DEBUG: About to render video container with lesson-view-video-container class');
      return (
        <div 
          className="lesson-view-video-container"
          style={{
            /* Video sizing - much larger and properly styled */
            position: 'relative',
            margin: '1.5rem auto 2.5rem auto',
            width: '100%',
            maxWidth: '1200px', /* Much larger for better visibility */
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: '0',
            /* 16:9 aspect ratio using padding-bottom technique */
            paddingBottom: '56.25%',
            height: '0'
          }}
        >
          <iframe
            src={embedUrl}
            title={lesson.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            style={{
              position: 'absolute',
              top: '0',
              left: '0',
              width: '100%',
              height: '100%',
              border: '0',
              borderRadius: '12px',
              display: 'block',
              margin: '0',
              padding: '0',
              background: 'transparent'
            }}
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
          href={videoInfo.embedUrl || lesson.content_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <span>Open Video</span>
        </a>
      </div>
    );
  };

  // --- Main render block ---
  if (!lesson) {
    return (
      <div className="h-full bg-gray-50 p-6">
        <div className="w-full">
          {(isOwner || isAdmin) && onCreateNewPage ? (
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

  if (isEditing && (lesson.content_type === 'text' || lesson.content_type === 'rich_text')) {
    const processedContent = ensureValidContent(removeDuplicateH2Titles(editingContent));
    
    return (
      <div className="flex flex-col h-full bg-white">
        {/* Full-width rich text editor with proper spacing */}
        <div className="flex-1 pt-1 pb-6 px-6 overflow-hidden bg-gray-50">
          <div className="w-full h-full flex flex-col">
            {/* RichTextEditor at the top */}
            <div className="flex-1 min-h-0">
              <RichTextEditor
                content={processedContent}
                onChange={(content) => {
                  setEditingContent(content);
                }}
                placeholder="Start writing your content..."
                defaultTitle={lesson.title}
                className="h-full"
                isSaving={isSaving}
                              onSave={(title, content, published) => {
                setEditingContent(content);
                handleSave(title, content);
              }}
              onCancel={handleCancel}
            />
            </div>
            
            {/* Video preview below the editor */}
            {(() => {
              const hasVideo = VideoContentExtractor.hasVideo(lesson);
              console.log('🎥 [LessonContent] Edit mode video check:', {
                lessonId: lesson.id,
                lessonTitle: lesson.title,
                hasVideo,
                contentUrl: lesson.content_url,
                willShowVideo: hasVideo
              });
              
              if (hasVideo) {
                console.log('🎥 [LessonContent] Rendering video in edit mode');
                return (
                  <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Video Preview</h3>
                    {renderVideoContent()}
                  </div>
                );
              } else {
                console.log('🎥 [LessonContent] No video to show in edit mode');
                return null;
              }
            })()}
          </div>
        </div>
      </div>
    );
  }

  // --- Skool-style: title left, actions right inside content card ---
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 pt-1 pb-6 px-6 overflow-y-auto bg-gray-50">
        <div className="w-full">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="course-title text-2xl font-semibold text-gray-900 mb-0">
                  {formatAsTitle(lesson.title)}
                </h1>
                {!lesson.is_published && (isOwner || isAdmin) && (
                  <span className="inline-block mt-1 text-sm font-medium text-yellow-600">Draft</span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {/* Mark as done button (show for non-owners or as needed) */}
                {onMarkAsDone && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onMarkAsDone}
                    className="flex items-center p-1 hover:bg-gray-100"
                    title={completed ? "Mark as incomplete" : "Mark as done"}
                  >
                    <CheckCircle2 className={`w-7 h-7 ${completed ? 'text-green-600 font-bold' : 'text-gray-400 hover:text-green-600'}`} strokeWidth={completed ? 2.5 : 2} />
                  </Button>
                )}
                {/* Edit button for owners */}
                {(isOwner || isAdmin) && (lesson.content_type === 'text' || lesson.content_type === 'rich_text') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEdit}
                    className="flex items-center p-1 hover:bg-gray-100"
                    title="Edit"
                  >
                    <Edit className="w-5 h-5 text-gray-500" />
                  </Button>
                )}
              </div>
            </div>
            {/* Video content with proper spacing - always show dedicated video if content_url exists */}
            {(() => {
              const hasVideo = VideoContentExtractor.hasVideo(lesson);
              console.log('🎥 [LessonContent] Video rendering check:', {
                lessonId: lesson.id,
                lessonTitle: lesson.title,
                hasVideo,
                contentUrl: lesson.content_url,
                willShowDedicatedVideo: hasVideo
              });
              
              if (hasVideo) {
                console.log('🎥 [LessonContent] Rendering video container div');
                return (
                  <div className="mb-8">
                    {renderVideoContent()}
                  </div>
                );
              } else {
                console.log('🎥 [LessonContent] No video, returning null');
                return null;
              }
            })()}
            
            {/* Text content with proper spacing */}
            <div className="prose max-w-none lesson-content">
              {(() => {
                const contentSource = getContentSource();
                let processedContent = removeDuplicateH2Titles(contentSource.content);
                
                // Add spacing around video elements
                processedContent = addVideoSpacing(processedContent);
                
                return (
                  <div 
                    className="text-gray-700 leading-relaxed lesson-content-inner ProseMirror"
                    dangerouslySetInnerHTML={{ 
                      __html: processedContent
                    }}
                  />
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonContent; 