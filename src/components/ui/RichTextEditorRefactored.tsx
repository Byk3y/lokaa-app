import React, { useEffect } from 'react';
import { EditorContent } from '@tiptap/react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ChevronDown, FileUp, FileText, Pin, Video } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link as LinkIcon } from 'lucide-react';
import clsx from 'clsx';

// Import our extracted components and hooks
import { DesktopToolbar, MobileToolbar } from '@/components/editor/toolbar';
import { 
  useRichTextEditor, 
  useEditorActions, 
  useImageUpload, 
  useVideoUpload, 
  useResourceHandlers 
} from '@/hooks/editor';
import VideoUploadModal from './VideoUploadModal';

export interface RichTextEditorProps {
  content: string;
  onChange: (richText: string) => void;
  placeholder?: string;
  defaultTitle?: string;
  onSave: (title: string, content: string, published?: boolean) => void;
  onCancel: () => void;
  className?: string;
  hideTitle?: boolean;
  isSaving?: boolean;
  spaceId?: string;
  lessonId?: string;
  courseId?: string;
  isPublished?: boolean;
  onPublishedChange?: (published: boolean) => void;
}

/**
 * Refactored Rich Text Editor using extracted components and hooks
 * Significantly reduced complexity through modular architecture
 */
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
  // Initialize editor with custom hook
  const editor = useRichTextEditor({
    content,
    placeholder,
    onChange
  });

  // Handle actions (save, cancel, published state)
  const {
    title,
    published,
    showTitleError,
    handleTitleChange,
    handlePublishedChange,
    handleSaveWithValidation
  } = useEditorActions({
    defaultTitle,
    isPublished,
    onSave,
    onCancel,
    onPublishedChange,
    editor
  });

  // Handle image uploads
  const { imageInputRef, handleImageUpload, triggerImageUpload } = useImageUpload({
    editor,
    options: { spaceId, lessonId, courseId }
  });

  // Handle video uploads and embeds
  const {
    showVideoModal,
    handleVideoInsert,
    handleAddYouTubeVideo,
    triggerVideoModal,
    closeVideoModal
  } = useVideoUpload({
    editor,
    options: { spaceId, lessonId, courseId }
  });

  // Handle resource insertions
  const {
    setLink,
    handleAddResourceLink,
    handleAddResourceFile,
    handleAddTranscript,
    handlePinCommunityPost
  } = useResourceHandlers({ editor });

  // Ensure content is properly set in the editor
  useEffect(() => {
    if (editor && content !== undefined) {
      const currentContent = editor.getHTML();
      if (currentContent !== content) {
        editor.commands.setContent(content);
      }
    }
  }, [editor, content]);

  if (!editor) {
    return (
      <div className={clsx("bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col h-96", className)}>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className={clsx("bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col", className)}>
      {/* Toolbar */}
      <div className="border-b border-gray-200 bg-white flex-shrink-0">
        <DesktopToolbar
          editor={editor}
          onImageUpload={triggerImageUpload}
          onVideoUpload={triggerVideoModal}
          onSetLink={setLink}
        />
        <MobileToolbar
          editor={editor}
          onImageUpload={triggerImageUpload}
          onVideoUpload={triggerVideoModal}
          onSetLink={setLink}
        />
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Title Input */}
        {!hideTitle && (
          <div className="relative px-6 pt-6 pb-4 bg-white sticky top-0 z-10 border-b border-gray-100">
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Title"
              aria-invalid={showTitleError}
              className={`w-full text-xl font-bold border-0 bg-transparent outline-none focus:ring-0 p-0 placeholder-gray-400
                ${showTitleError ? 'text-red-500' : 'text-gray-900'}`}
            />
          </div>
        )}

        {/* Editor Content */}
        <div className="min-h-[200px] editor-content [&_h1]:text-2xl px-6 pb-6 pt-6">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Controls Section */}
      <div className="border-t border-gray-200 bg-gray-50 flex-shrink-0">
        {/* ADD dropdown + Published toggle */}
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

        {/* SAVE button */}
        <div className="px-6 pb-3">
          <button 
            onClick={handleSaveWithValidation}
            disabled={isSaving}
            className="w-full py-3 rounded-lg text-sm font-medium transition-colors bg-gray-300 text-gray-700 hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSaving ? 'SAVING...' : 'SAVE'}
          </button>
        </div>

        {/* CANCEL button */}
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
        onClose={closeVideoModal}
        onVideoInsert={handleVideoInsert}
        spaceId={spaceId}
        lessonId={lessonId}
      />
    </div>
  );
};

export default RichTextEditor;
