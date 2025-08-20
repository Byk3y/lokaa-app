import React from 'react';
import { CheckCircle2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatAsTitle } from '@/utils/textUtils';
import { log } from '@/utils/logger';
import VideoRenderer from './VideoRenderer';
import { VideoContentExtractor } from '@/utils/videoContentExtractor';
import { getContentSource, removeDuplicateH2Titles, addVideoSpacing } from '@/utils/lessonContentUtils';
import type { CourseLesson } from '@/types/classroom/courseDetail';

export interface LessonViewerProps {
  lesson: CourseLesson;
  isOwner: boolean;
  isAdmin: boolean;
  completed: boolean;
  onEdit: () => void;
  onMarkAsDone?: () => void;
  isSaving?: boolean;
}

/**
 * LessonViewer component handles the read-only display of lesson content
 * Features Skool-style layout with title, actions, video, and text content
 * Extracted from LessonContent.tsx for better modularity
 */
const LessonViewer: React.FC<LessonViewerProps> = ({
  lesson,
  isOwner,
  isAdmin,
  completed,
  onEdit,
  onMarkAsDone,
  isSaving = false
}) => {
  return (
    <div className="flex flex-col h-full bg-white w-full">
      <div className="flex-1 pt-1 pb-6 px-6 course-content-container bg-gray-50 w-full">
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
                    onClick={onEdit}
                    className="flex items-center p-1 hover:bg-gray-100"
                    title="Edit"
                  >
                    <Edit className="w-5 h-5 text-gray-500" />
                  </Button>
                )}
              </div>
            </div>
            
            {/* Video content with proper spacing - only show in viewer mode (not editing) */}
            {(() => {
              const hasVideo = VideoContentExtractor.hasVideo(lesson);
              log.debug('Component', '🎥 [LessonViewer] Video rendering check:', {
                lessonId: lesson.id,
                lessonTitle: lesson.title,
                hasVideo,
                contentUrl: lesson.content_url,
                willShowDedicatedVideo: hasVideo,
                isSaving
              });
              
              if (hasVideo && !isSaving) {
                log.debug('Component', '🎥 [LessonViewer] Rendering video container div');
                return (
                  <div className="mb-2">
                    <VideoRenderer lesson={lesson} isSaving={false} />
                  </div>
                );
              } else if (hasVideo && isSaving) {
                log.debug('Component', '🎥 [LessonViewer] Showing loading state during save');
                return (
                  <div className="mb-2">
                    <VideoRenderer lesson={lesson} isSaving={true} />
                  </div>
                );
              } else {
                log.debug('Component', '🎥 [LessonViewer] No video, returning null');
                return null;
              }
            })()}
            
            {/* Text content with proper spacing */}
            <div className="prose max-w-none lesson-content">
              {(() => {
                const contentSource = getContentSource(lesson);
                let processedContent = removeDuplicateH2Titles(contentSource.content, lesson.title);
                
                // ALWAYS clean video content from HTML to prevent duplicates since VideoRenderer handles videos
                processedContent = VideoContentExtractor.cleanHTMLContent(processedContent);
                
                // Add spacing around any remaining video elements (shouldn't be any after cleaning)
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

export default LessonViewer;