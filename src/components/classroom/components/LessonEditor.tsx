import React from 'react';
import RichTextEditor from '@/components/ui/rich-text-editor';
import VideoRenderer from './VideoRenderer';
import { VideoContentExtractor } from '@/utils/videoContentExtractor';
import { ensureValidContent, removeDuplicateH2Titles } from '@/utils/lessonContentUtils';
import type { CourseLesson } from '@/types/classroom/courseDetail';

export interface LessonEditorProps {
  lesson: CourseLesson;
  editingContent: string;
  isSaving: boolean;
  onContentChange: (content: string) => void;
  onSave: (title: string, content: string, published?: boolean) => void;
  onCancel: () => void;
}

/**
 * LessonEditor component handles the editing interface for lesson content
 * Includes rich text editor and video preview functionality
 * Extracted from LessonContent.tsx for better modularity
 */
const LessonEditor: React.FC<LessonEditorProps> = ({
  lesson,
  editingContent,
  isSaving,
  onContentChange,
  onSave,
  onCancel
}) => {
  const processedContent = ensureValidContent(removeDuplicateH2Titles(editingContent, lesson.title));
  
  return (
    <div className="flex flex-col h-full bg-white w-full">
      {/* Full-width rich text editor with proper spacing - consistent with normal view */}
      <div className="flex-1 pt-1 pb-6 px-6 course-content-container bg-gray-50 w-full">
        <div className="w-full h-full flex flex-col">
          {/* RichTextEditor at the top */}
          <div className="flex-1 min-h-0 w-full">
            <RichTextEditor
              content={processedContent}
              onChange={onContentChange}
              placeholder="Start writing your content..."
              defaultTitle={lesson.title}
              className="h-full w-full"
              isSaving={isSaving}
              onSave={onSave}
              onCancel={onCancel}
            />
          </div>
          
          {/* Video preview below the editor */}
          {(() => {
            const hasVideo = VideoContentExtractor.hasVideo(lesson);
            console.log('🎥 [LessonEditor] Edit mode video check:', {
              lessonId: lesson.id,
              lessonTitle: lesson.title,
              hasVideo,
              contentUrl: lesson.content_url,
              willShowVideo: hasVideo
            });
            
            if (hasVideo) {
              console.log('🎥 [LessonEditor] Rendering video in edit mode');
              return (
                <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Video Preview</h3>
                  <VideoRenderer lesson={lesson} />
                </div>
              );
            } else {
              console.log('🎥 [LessonEditor] No video to show in edit mode');
              return null;
            }
          })()}
        </div>
      </div>
    </div>
  );
};

export default LessonEditor;