import React, { useState, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
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
import VideoUploadModal from './VideoUploadModal';
import { processVideoForEditor } from '@/utils/videoUploadService';


interface RichTextEditorProps {
  content: string;
  onChange: (richText: string) => void;
  placeholder?: string;
  defaultTitle?: string;
  onSave: (title: string, content: string, published?: boolean) => void;
  onCancel: () => void;
  className?: string;
  hideTitle?: boolean; // New prop to hide title input
  isSaving?: boolean; // New prop to show saving state
  spaceId?: string; // For image uploads
  lessonId?: string; // For image uploads
  courseId?: string; // For image uploads
  isPublished?: boolean; // Current published state
  onPublishedChange?: (published: boolean) => void; // Callback when published state changes
}

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
        {React.cloneElement(icon as React.ReactElement, {
          size: 16,
          strokeWidth: 2.5,
          className: 'stroke-current'
        })}
      </div>
    ) : (
      <span className={clsx(
        'text-sm font-bold leading-none px-0.5',
        'transition-colors duration-150'
      )}>
        {children}
      </span>
    )}
  </button>
);

const ToolbarDivider = () => (
  <div 
    className="w-px h-6 bg-gray-300 flex-shrink-0" 
    style={{ marginRight: '12px' }}
  />
);

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = "Start writing your content...",
  defaultTitle = '',
  onSave,
  onCancel,
  className,
  hideTitle = false,
  isSaving = false,
  spaceId,
  lessonId,
  courseId,
  isPublished = false,
  onPublishedChange,
}) => {
  const [title, setTitle] = useState(defaultTitle);
  const [published, setPublished] = useState(isPublished);
  const [showTitleError, setShowTitleError] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Update title when defaultTitle prop changes
  React.useEffect(() => {
    if (defaultTitle && defaultTitle !== title) {
      setTitle(defaultTitle);
    }
  }, [defaultTitle, title]);

  // Update published state when prop changes
  React.useEffect(() => {
    setPublished(isPublished);
  }, [isPublished]);


  // Notify parent when published state changes
  const handlePublishedChange = (newPublished: boolean) => {
    setPublished(newPublished);
    if (onPublishedChange) {
      onPublishedChange(newPublished);
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          style: 'max-width: 65%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: block; margin: 16px auto;',
        },
      }),
      YoutubeExtension.configure({
        inline: false,
        width: 640,
        height: 360,
        controls: false,
        nocookie: false,
        HTMLAttributes: {
          style: 'width: 100%; height: 360px; border: 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin: 0; padding: 0; display: block;',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Placeholder.configure({
        placeholder: placeholder,
        showOnlyWhenEditable: true,
        showOnlyCurrent: false,
        includeChildren: false,
        emptyEditorClass: 'is-empty',
        emptyNodeClass: 'is-empty',
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'max-w-none focus:outline-none text-gray-700 leading-relaxed [&>*:first-child]:mt-0 [&>h1:first-child]:mt-0 [&>h1:first-child]:pt-0',
      },
    },
  });

  // Ensure content is properly set in the editor and placeholder is hidden
  React.useEffect(() => {
    if (editor && content !== undefined) {
      const currentContent = editor.getHTML();
      // Only update if content is actually different to prevent unnecessary re-renders
      if (currentContent !== content) {
        editor.commands.setContent(content);
      }
    }
  }, [editor, content]);

  const handleSave = () => {
    // Use the title from the title field, or default if empty
    const finalTitle = title.trim() || 'Untitled Page';
    onSave(finalTitle, editor?.getHTML() || '', published);
  };

  // Add keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [title, editor]);

  const addImage = () => {
    imageInputRef.current?.click();
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (PNG, JPG, GIF, etc.)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    try {
      let imageUrl: string;
      
      if (spaceId) {
        // Use the real upload service if spaceId is provided
        const { uploadEducationalContentImage } = await import('@/utils/imageUploadService');
        const result = await uploadEducationalContentImage(file, {
          spaceId,
          lessonId,
          courseId,
        });
        imageUrl = result.url;
      } else {
        // Fallback to local object URL for demo/testing
        imageUrl = URL.createObjectURL(file);
      }

      // Insert image with filename as alt text
      const altText = file.name.replace(/\.[^/.]+$/, "");
      editor.chain().focus().setImage({ 
        src: imageUrl, 
        alt: altText,
        title: altText
      }).run();

      toast({
        title: "Image uploaded",
        description: "Image has been inserted into your content",
        variant: "default"
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    }

    // Reset the input
    event.target.value = '';
  };

  const addVideo = () => {
    setShowVideoModal(true);
  };

  const handleVideoInsert = async (videoData: { url: string; type: 'embed' | 'upload'; file?: File }) => {
    if (!editor) return;
    
    // For uploads, we need spaceId
    if (videoData.type === 'upload' && !spaceId) {
      toast({
        title: "Upload not available",
        description: "Video upload requires space context",
        variant: "destructive"
      });
      return;
    }

    try {
      if (videoData.type === 'embed') {
        // For YouTube URLs, use the TipTap YouTube extension
        const { extractVideoInfo } = await import('@/utils/videoUploadService');
        const videoInfo = extractVideoInfo(videoData.url);
        
        if (videoInfo.provider === 'youtube' && videoInfo.videoId) {
          // Use TipTap's YouTube extension
          editor.chain().focus().setYoutubeVideo({
            src: videoData.url,
            width: 720,
            height: 405,
          }).run();

          toast({
            title: "Video embedded",
            description: "YouTube video has been inserted into your content",
            variant: "default"
          });
          return;
        } else {
          // For other video platforms, use iframe
          const result = await processVideoForEditor(videoData, {
            spaceId,
            lessonId,
            courseId,
          });
          editor.chain().focus().insertContent(result.embedHtml).run();
        }
      } else if (videoData.type === 'upload' && videoData.file) {
        // For uploaded videos, use our upload service
        const result = await processVideoForEditor(videoData, {
          spaceId,
          lessonId,
          courseId,
        });
        editor.chain().focus().insertContent(result.embedHtml).run();
      }

      toast({
        title: "Video added",
        description: `Video has been ${videoData.type === 'upload' ? 'uploaded and ' : ''}inserted into your content`,
        variant: "default"
      });

    } catch (error) {
      console.error('Video insert error:', error);
      toast({
        title: "Video insertion failed",
        description: error instanceof Error ? error.message : "Failed to add video. Please try again.",
        variant: "destructive"
      });
    }
  };

  const setLink = () => {
    const url = window.prompt('Enter URL:');
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };


  // New functions for Skool-style ADD dropdown
  const handleAddResourceLink = () => {
    const url = window.prompt('Enter resource link URL:');
    if (url && editor) {
      const linkHtml = `<p><a href="${url}" target="_blank" rel="noopener noreferrer">🔗 Resource Link</a></p>`;
      editor.chain().focus().insertContent(linkHtml).run();
    }
  };

  const handleAddResourceFile = () => {
    // In a real implementation, this would open a file picker
    const fileName = window.prompt('Enter file name:');
    if (fileName && editor) {
      const fileHtml = `<p><a href="#" class="resource-file">📎 ${fileName}</a></p>`;
      editor.chain().focus().insertContent(fileHtml).run();
    }
  };

  const handleAddTranscript = () => {
    const transcriptText = window.prompt('Enter transcript text:');
    if (transcriptText && editor) {
      const transcriptHtml = `<blockquote><p><strong>Transcript:</strong><br />${transcriptText}</p></blockquote>`;
      editor.chain().focus().insertContent(transcriptHtml).run();
    }
  };

  const handlePinCommunityPost = () => {
    // This would typically open a modal to select a community post
    const postTitle = window.prompt('Enter community post title to pin:');
    if (postTitle && editor) {
      const pinHtml = `<div class="pinned-post"><p><strong>📌 Pinned Community Post:</strong> ${postTitle}</p></div>`;
      editor.chain().focus().insertContent(pinHtml).run();
    }
  };

  const handleAddYouTubeVideo = () => {
    const url = window.prompt('Enter YouTube URL:');
    if (url && editor) {
      try {
        editor.chain().focus().setYoutubeVideo({
          src: url,
          width: 720,
          height: 405,
        }).run();
        
        toast({
          title: "YouTube video added",
          description: "Video has been embedded in your content",
          variant: "default"
        });
      } catch (error) {
        console.error('YouTube embed error:', error);
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
    <div className={clsx("bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col", className)}>
      {/* Toolbar - Single Row on Desktop, Responsive on Mobile */}
      <div className="border-b border-gray-200 bg-white flex-shrink-0">
        {/* Desktop: Single row with all tools */}
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
          <ToolbarDivider />
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

        {/* Mobile: Two rows with even distribution */}
        <div className="md:hidden">
          {/* First Row: Even distribution like Skool */}
          <div className="flex items-center justify-evenly px-3 py-2.5 border-b border-gray-100">
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
            <ToolbarButton 
              onClick={() => {}} 
              title="More options"
              icon={<Menu />}
            />
          </div>

          {/* Second Row: Even distribution like Skool */}
          <div className="flex items-center justify-evenly px-3 py-2.5">
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
      </div>

      {/* Content Area - Flexible scroll area */}
      <div className="flex-1 overflow-y-auto">
        {/* Title - Only show if not hidden */}
        {!hideTitle && (
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
        )}


        {/* Editor Content */}
        <div className="min-h-[200px] editor-content [&_h1]:text-2xl px-6 pb-6">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Controls Section - Skool Layout - Fixed at bottom */}
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
        spaceId={spaceId}
        lessonId={lessonId}
      />
    </div>
  );
};

export default RichTextEditor; 