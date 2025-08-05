import React from 'react';
import { log } from '@/utils/logger';
import { VideoContentExtractor } from '@/utils/videoContentExtractor';
import type { CourseLesson } from '@/types/classroom/courseDetail';

export interface VideoRendererProps {
  lesson: CourseLesson;
  className?: string;
}

/**
 * VideoRenderer component handles the rendering of video content for lessons
 * Extracted from LessonContent.tsx for better modularity
 */
const VideoRenderer: React.FC<VideoRendererProps> = ({ lesson, className = '' }) => {
  log.debug('Component', '🎥 [VideoRenderer] renderVideoContent called');
  
  // Use VideoContentExtractor to detect videos in both content_url and embedded HTML
  const videoInfo = VideoContentExtractor.extractVideoInfo(lesson);
  
  log.debug('Component', '🎥 [VideoRenderer] videoInfo:', videoInfo);
  
  if (!videoInfo) {
    log.debug('Component', '🎥 [VideoRenderer] No videoInfo, returning null');
    return null;
  }

  // Generate embed URL with proper parameters
  const embedUrl = VideoContentExtractor.generateEmbedUrl(videoInfo, window.location.origin);
  log.debug('Component', '🎥 [VideoRenderer] Generated embedUrl:', embedUrl);
  
  if (videoInfo.platform === 'youtube') {
    log.debug('Component', '🎥 [VideoRenderer] Rendering YouTube video with embedUrl:', embedUrl);
    log.debug('Component', '🎥 [VideoRenderer] DEBUG: About to render video container with lesson-view-video-container class');
    return (
      <div 
        className={`lesson-view-video-container ${className}`}
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
    <div className={`bg-gray-100 rounded-lg p-8 text-center ${className}`}>
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

export default VideoRenderer;