import React, { useState, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { log } from '@/utils/logger';
import VideoRenderer from './VideoRenderer';
import { VideoContentExtractor } from '@/utils/videoContentExtractor';
import { ensureValidContent, removeDuplicateH2Titles } from '@/utils/lessonContentUtils';
import { formatAsTitle } from '@/utils/textUtils';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import YoutubeExtension from '@tiptap/extension-youtube';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { 
  ChevronDown, 
  FileUp, 
  Code2, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Minus, 
  Film,
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  FileText,
  Pin,
  Play,
  AlignLeft,
  Loader2,
  Menu,
  Video
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import clsx from 'clsx';
import { toast } from '@/hooks/use-toast';
import VideoUploadModal from '@/components/ui/VideoUploadModal';
import { processVideoForEditor } from '@/utils/videoUploadService';
import type { CourseLesson } from '@/types/classroom/courseDetail';

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  'aria-pressed'?: boolean;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ 
  onClick, 
  isActive = false, 
  title, 
  icon, 
  children,
  'aria-pressed': ariaPressed
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-pressed={ariaPressed ?? isActive}
    className={clsx(
      'flex items-center justify-center',
      'h-9 px-3 rounded border-none cursor-pointer transition-all duration-150 ease-in-out',
      'text-gray-600 hover:text-gray-800 hover:bg-gray-50',
      {
        'bg-gray-100 text-gray-900': isActive,
        'bg-transparent': !isActive
      }
    )}
  >
    {icon ? (
      <div className={clsx(
        'w-4 h-4 flex items-center justify-center',
        'transition-colors duration-150'
      )}>
        {icon}
      </div>
    ) : (
      <span className="text-sm font-medium">{children}</span>
    )}
  </button>
);

const ToolbarDivider = () => (
  <div className="w-px h-6 bg-gray-300 mx-1" />
);

export interface LessonEditorProps {
  lesson: CourseLesson;
  editingContent: string;
  isSaving: boolean;
  onContentChange: (content: string) => void;
  onSave: (title: string, content: string, published?: boolean, removeVideo?: boolean) => void;
  onCancel: () => void;
  onSaveComplete?: () => void;
}

/**
 * LessonEditor component handles the editing interface for lesson content
 * Custom layout: Toolbar → Title → Video → Content
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
  
  // State for title and published status
  const [title, setTitle] = useState(lesson.title);
  const [published, setPublished] = useState(lesson.is_published || false);
  const [showTitleError, setShowTitleError] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showVideo, setShowVideo] = useState(true);
  const [isSavingVideo, setIsSavingVideo] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Reset video saving state when save completes
  useEffect(() => {
    if (!isSaving && isSavingVideo) {
      setIsSavingVideo(false);
      onSaveComplete?.();
    }
  }, [isSaving, isSavingVideo, onSaveComplete]);

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link,
      Placeholder.configure({
        placeholder: 'Start writing your content...',
      }),
      YoutubeExtension,
    ],
    content: processedContent,
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML());
    },
  });

  // Handle published state change
  const handlePublishedChange = (newPublished: boolean) => {
    setPublished(newPublished);
  };

  // Handle save
  const handleSave = () => {
    if (!title.trim()) {
      setShowTitleError(true);
      return;
    }
    
    // Check if video was intentionally removed (was shown initially but now hidden)
    const hadVideoInitially = VideoContentExtractor.hasVideo(lesson);
    const videoRemoved = hadVideoInitially && !showVideo;
    
    // Check if we're adding a new video (content contains video but lesson doesn't have one)
    const contentHasVideo = editor?.getHTML().includes('youtube.com/embed') || editor?.getHTML().includes('youtube.com/watch');
    const isAddingVideo = !hadVideoInitially && contentHasVideo;
    
    if (isAddingVideo) {
      setIsSavingVideo(true);
    }
    
    onSave(title, editor?.getHTML() || '', published, videoRemoved);
  };

  // Handle image upload
  const addImage = () => {
    imageInputRef.current?.click();
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imageUrl = await processVideoForEditor(file, 'image');
      editor?.chain().focus().setImage({ src: imageUrl }).run();
      toast({
        title: "Image uploaded",
        description: "Image has been added to your content",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    }
    event.target.value = '';
  };

  // Handle video upload
  const addVideo = () => {
    setShowVideoModal(true);
  };

  const handleVideoInsert = async (videoData: { url: string; type: 'embed' | 'upload'; file?: File }) => {
    try {
      if (videoData.type === 'upload' && videoData.file) {
        const videoUrl = await processVideoForEditor(videoData.file, 'video');
        editor?.chain().focus().setYoutubeVideo({ src: videoUrl }).run();
      } else {
        editor?.chain().focus().setYoutubeVideo({ src: videoData.url }).run();
      }
      
      toast({
        title: "Video added",
        description: "Video has been embedded in your content",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Failed to add video",
        description: "Please check the URL and try again",
        variant: "destructive"
      });
    }
  };

  // Handle link
  const setLink = () => {
    const url = window.prompt('Enter URL');
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  };

  // Handle ADD dropdown items
  const handleAddResourceLink = () => {
    setLink();
  };

  const handleAddResourceFile = () => {
    // Implementation for adding resource file
  };

  const handleAddTranscript = () => {
    // Implementation for adding transcript
  };

  const handlePinCommunityPost = () => {
    // Implementation for pinning community post
  };

  const handleAddYouTubeVideo = () => {
    const url = window.prompt('Enter YouTube URL');
    if (url) {
      try {
        const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
        if (videoId) {
          editor?.chain().focus().setYoutubeVideo({ src: `https://www.youtube.com/embed/${videoId}` }).run();
          toast({
            title: "YouTube video added",
            description: "Video has been embedded in your content",
            variant: "default"
          });
        } else {
          throw new Error('Invalid YouTube URL');
        }
      } catch (error) {
        toast({
          title: "Failed to embed YouTube video",
          description: "Please check the URL and try again",
          variant: "destructive"
        });
      }
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-white w-full">
      {/* Full-width content area with proper spacing - consistent with normal view */}
      <div className="flex-1 pt-1 pb-6 px-6 course-content-container bg-gray-50 w-full">
        <div className="w-full">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col">
      {/* 1. TOOLBAR - Single Row on Desktop */}
      <div className="border-b border-gray-200 bg-white flex-shrink-0">
        <div className="hidden md:flex items-center justify-evenly px-3 py-2.5">
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
            isActive={editor.isActive('heading', { level: 1 })} 
            title="Heading 1"
            aria-pressed={editor.isActive('heading', { level: 1 })}
          >
            H₁
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
            isActive={editor.isActive('heading', { level: 2 })} 
            title="Heading 2"
            aria-pressed={editor.isActive('heading', { level: 2 })}
          >
            H₂
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} 
            isActive={editor.isActive('heading', { level: 3 })} 
            title="Heading 3"
            aria-pressed={editor.isActive('heading', { level: 3 })}
          >
            H₃
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} 
            isActive={editor.isActive('heading', { level: 4 })} 
            title="Heading 4"
            aria-pressed={editor.isActive('heading', { level: 4 })}
          >
            H₄
          </ToolbarButton>
          <ToolbarDivider />
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleBold().run()} 
            isActive={editor.isActive('bold')} 
            title="Bold"
            icon={<Bold />}
            aria-pressed={editor.isActive('bold')}
          />
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleItalic().run()} 
            isActive={editor.isActive('italic')} 
            title="Italic"
            icon={<Italic />}
            aria-pressed={editor.isActive('italic')}
          />
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleStrike().run()} 
            isActive={editor.isActive('strike')} 
            title="Strikethrough"
            icon={<Strikethrough />}
            aria-pressed={editor.isActive('strike')}
          />
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleCode().run()} 
            isActive={editor.isActive('code')} 
            title="Code"
            icon={<Code2 />}
            aria-pressed={editor.isActive('code')}
          />
          <ToolbarDivider />
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleBulletList().run()} 
            isActive={editor.isActive('bulletList')} 
            title="Bullet List"
            icon={<List />}
            aria-pressed={editor.isActive('bulletList')}
          />
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleOrderedList().run()} 
            isActive={editor.isActive('orderedList')} 
            title="Numbered List"
            icon={<ListOrdered />}
            aria-pressed={editor.isActive('orderedList')}
          />
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleBlockquote().run()} 
            isActive={editor.isActive('blockquote')} 
            title="Quote"
            icon={<Quote />}
            aria-pressed={editor.isActive('blockquote')}
          />
          <ToolbarButton 
            onClick={addImage} 
            title="Image"
            icon={<ImageIcon />}
          />
          <ToolbarButton 
            onClick={setLink} 
            title="Link"
            icon={<LinkIcon />}
          />
          <ToolbarButton 
            onClick={() => editor.chain().focus().setHorizontalRule().run()} 
            title="Divider"
            icon={<Minus />}
          />
          <ToolbarButton 
            onClick={addVideo} 
            title="Video"
            icon={<Video />}
          />
        </div>
      </div>

      {/* 2. TITLE INPUT */}
      <div className="relative mb-4 px-6 pt-6">
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(formatAsTitle(e.target.value));
            if (e.target.value.trim()) {
              setShowTitleError(false);
            }
          }}
          placeholder="Title"
          aria-invalid={showTitleError}
          className={`w-full text-xl font-bold border-0 bg-transparent outline-none focus:ring-0 p-0 placeholder-gray-400
            ${showTitleError ? 'text-red-500' : 'text-gray-900'}`}
        />
      </div>

      {/* 3. VIDEO PREVIEW */}
      {(() => {
        const hasVideo = VideoContentExtractor.hasVideo(lesson);
        if (hasVideo && showVideo && !isSavingVideo) {
          return (
            <div className="mb-8 px-6 relative group">
              <VideoRenderer lesson={lesson} />
              {/* X button to remove video - appears on hover */}
              <button
                onClick={() => setShowVideo(false)}
                className="absolute top-2 right-2 w-8 h-8 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100 z-10"
                title="Remove video"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        }
        return null;
      })()}

      {/* 4. CONTENT AREA */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-[200px] editor-content [&_h1]:text-2xl px-6 pb-6">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Controls Section - Fixed at bottom */}
      <div className="border-t border-gray-200 bg-gray-50 flex-shrink-0">
        {/* First Row: ADD dropdown + Published toggle */}
        <div className="flex items-center justify-between px-6 py-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="text-sm font-medium text-gray-600">
                ADD <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleAddResourceLink}>
                <LinkIcon className="mr-2 h-4 w-4" />
                Add resource link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddResourceFile}>
                <FileUp className="mr-2 h-4 w-4" />
                Add resource file
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddTranscript}>
                <FileText className="mr-2 h-4 w-4" />
                Add transcript
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePinCommunityPost}>
                <Pin className="mr-2 h-4 w-4" />
                Pin community post
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddYouTubeVideo}>
                <Video className="mr-2 h-4 w-4" />
                Add YouTube video
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-green-700">Published</span>
            <Switch 
              checked={published} 
              onCheckedChange={handlePublishedChange}
              className="data-[state=checked]:bg-green-600 shadow-sm" 
            />
          </div>
        </div>

        {/* Second Row: SAVE button */}
        <div className="px-6 pb-3">
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="w-full py-3 rounded-lg text-sm font-medium transition-colors bg-gray-300 text-gray-700 hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSaving ? 'SAVING...' : 'SAVE'}
          </button>
        </div>

        {/* Third Row: CANCEL button */}
        <div className="px-6 pb-4">
          <button 
            onClick={onCancel} 
            className="w-full py-3 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
          >
            CANCEL
          </button>
        </div>
      </div>

      {/* Hidden file input for image upload */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Video Upload Modal */}
      <VideoUploadModal
        isOpen={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        onVideoInsert={handleVideoInsert}
        spaceId={lesson.space_id}
        lessonId={lesson.id}
      />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonEditor;