import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MoreHorizontal, CheckCircle2, Link, Copy, Edit } from 'lucide-react';
import { formatAsTitle } from '@/utils/textUtils';
import BottomNav from '@/components/mobile/BottomNav';
import { VideoContentExtractor } from '@/utils/videoContentExtractor';
import MobileLessonEditor from './MobileLessonEditor';

interface CourseLesson {
  id: string;
  title: string;
  content_type: string;
  content_url: string | null;
  content_text: string | null;
  lesson_order: number;
  module_id?: string;
  content_id?: string | null;
  is_published: boolean;
  page_type?: string;
  estimated_duration?: number | null;
  difficulty_level?: string | null;
  created_at?: string;
  updated_at?: string;
  completed?: boolean;
  educational_content?: {
    id: string;
    title: string;
    content_type: string;
    text_content: string | null;
    media_url: string | null;
    embed_data: any;
    estimated_duration: number | null;
    difficulty_level: string | null;
  } | null;
}

interface CourseDetailData {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  estimated_duration: number | null;
  difficulty_level: string | null;
  course_order: number;
  short_id: string | null;
  space_id: string;
  created_at: string;
  updated_at: string;
  modules: any[];
  progress?: number;
}

interface Space {
  id: string;
  name: string;
  subdomain: string;
  avatar_url?: string | null;
  icon_image?: string | null;
}

interface MobileLessonViewProps {
  lesson: CourseLesson;
  course: CourseDetailData;
  space?: Space | null;
  onBackToMenu: () => void;
  onNextLesson: () => void;
  onMarkAsDone?: () => void;
  isOwner?: boolean;
  hasNextLesson?: boolean;
  onEditLesson?: (lessonData: Partial<CourseLesson>) => Promise<void>;
}

const MobileLessonView: React.FC<MobileLessonViewProps> = ({
  lesson,
  course,
  space,
  onBackToMenu,
  onNextLesson,
  onMarkAsDone,
  isOwner = false,
  hasNextLesson = false,
  onEditLesson,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Function to copy lesson URL
  const copyLessonUrl = async () => {
    try {
      const currentUrl = window.location.href;
      await navigator.clipboard.writeText(currentUrl);
      setCopySuccess(true);
      setShowDropdown(false);
      
      // Reset copy success message after 2 seconds
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  // Function to handle lesson editing
  const handleEditLesson = () => {
    setShowDropdown(false);
    setShowEditor(true);
  };

  // Function to save lesson changes
  const handleSaveLesson = async (updatedData: Partial<CourseLesson>) => {
    if (onEditLesson) {
      await onEditLesson(updatedData);
      setShowEditor(false);
    }
  };

  // Helper function to get lesson content
  const getContentSource = () => {
    if (lesson?.educational_content?.text_content) {
      return {
        content: lesson.educational_content.text_content,
        isEducationalContent: true,
        source: 'educational_content'
      };
    }
    
    if (lesson?.content_text) {
      return {
        content: lesson.content_text,
        isEducationalContent: false,
        source: 'legacy_content_text'
      };
    }
    
    return {
      content: '',
      isEducationalContent: false,
      source: 'no_content'
    };
  };

  // Helper function to remove duplicate H2 titles and clean video content
  const processContentForDisplay = (content: string | null): string => {
    if (!content) return '';
    
    // First, remove any embedded videos to prevent duplicates
    let cleaned = VideoContentExtractor.cleanHTMLContent(content);
    
    // Remove the hr tag if it exists
    cleaned = cleaned.replace(/<hr[^>]*>/gi, '');
    
    // Remove H1/H2 tags that contain the exact lesson title
    const titleToRemove = lesson.title;
    if (titleToRemove) {
      cleaned = cleaned.replace(new RegExp(`<h1[^>]*>\\s*${titleToRemove.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</h1>`, 'gi'), '');
      cleaned = cleaned.replace(new RegExp(`<h2[^>]*>\\s*${titleToRemove.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</h2>`, 'gi'), '');
    }
    
    // Remove any leading whitespace and empty paragraphs
    cleaned = cleaned.replace(/^\s*<p>\s*<\/p>\s*/i, '').trim();
    
    return cleaned;
  };

  // Helper function to render video content using the new extractor
  const renderVideoContent = () => {
    const videoInfo = VideoContentExtractor.extractVideoInfo(lesson);
    
    if (!videoInfo) return null;
    
    const embedUrl = VideoContentExtractor.generateEmbedUrl(videoInfo, window.location.origin);
    
    return (
      <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ paddingBottom: '56.25%' }}>
        <iframe
          className="absolute top-0 left-0 w-full h-full"
          src={embedUrl}
          title={lesson.title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  };

  const contentSource = getContentSource();
  const processedContent = processContentForDisplay(contentSource.content);

  return (
    <div className="min-h-screen bg-white">
      {/* Fixed Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-1.5 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onBackToMenu}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          
          {/* Space branding */}
          <div className="flex items-center space-x-2">
            {space?.icon_image ? (
              <img 
                src={space.icon_image} 
                alt={space.name}
                className="w-8 h-8 bg-gray-200 rounded-lg object-cover"
              />
            ) : (
              <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">
                  {space?.name?.charAt(0).toUpperCase() || 'S'}
                </span>
              </div>
            )}
            <span className="font-bold text-gray-900">
              {space?.name || 'Space'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {onMarkAsDone && (
            <button 
              onClick={onMarkAsDone}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <CheckCircle2 
                className={`w-6 h-6 ${lesson.completed ? 'text-green-600' : 'text-gray-400'}`}
                strokeWidth={lesson.completed ? 2.5 : 2}
              />
            </button>
          )}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MoreHorizontal className="w-5 h-5 text-gray-600" />
            </button>
            
            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 top-12 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px]">
                <button
                  onClick={copyLessonUrl}
                  className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Copy className="w-4 h-4 mr-3" />
                  Copy page link
                </button>
                {isOwner && onEditLesson && (
                  <button
                    onClick={handleEditLesson}
                    className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                  >
                    <Edit className="w-4 h-4 mr-3" />
                    Edit
                  </button>
                )}
              </div>
            )}
            
            {/* Copy Success Message */}
            {copySuccess && (
              <div className="absolute right-0 top-12 bg-green-500 text-white px-3 py-2 rounded-lg shadow-lg z-50 text-sm">
                Link copied!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Content - starts after fixed header */}
      <div className="pt-12 pb-20">
        {/* Lesson Title */}
        <div className="px-4 pt-2 pb-2">
          <div className="flex items-center gap-3 flex-wrap">
            {!lesson.is_published && isOwner && (
              <span className="inline-block px-2 py-1 text-sm font-medium bg-yellow-100 text-yellow-800 rounded-full flex-shrink-0">
                Draft
              </span>
            )}
            <h1 className="text-xl font-bold text-gray-900">
              {formatAsTitle(lesson.title)}
            </h1>
          </div>
        </div>

        {/* Video Content */}
        {VideoContentExtractor.hasVideo(lesson) && (
          <div className="px-4 mb-3">
            {renderVideoContent()}
          </div>
        )}

        {/* Navigation Buttons - Below Video */}
        <div className="flex justify-between items-center px-4 mb-6">
          <button 
            onClick={onBackToMenu}
            className="text-blue-600 font-medium hover:text-blue-700 transition-colors"
          >
            ← Menu
          </button>
          {hasNextLesson && (
            <button 
              onClick={onNextLesson}
              className="text-blue-600 font-medium hover:text-blue-700 transition-colors"
            >
              Next →
            </button>
          )}
        </div>

        {/* Lesson Content */}
        <div className="px-4 pb-6">
          {processedContent ? (
            <div 
              className="prose max-w-none text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: processedContent }}
            />
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p>No content available for this lesson.</p>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Navigation - Only show when not editing */}
      {!showEditor && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <BottomNav />
        </div>
      )}

      {/* Mobile Lesson Editor */}
      {showEditor && (
        <MobileLessonEditor
          lesson={lesson}
          space={space}
          isOpen={showEditor}
          onClose={() => setShowEditor(false)}
          onSave={handleSaveLesson}
        />
      )}
    </div>
  );
};

export default MobileLessonView;