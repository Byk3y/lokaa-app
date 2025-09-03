import { useEditor, Editor } from '@tiptap/react';
import { useMemo, useCallback } from 'react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import YoutubeExtension from '@tiptap/extension-youtube';

export interface EditorOptions {
  content?: string;
  placeholder?: string;
  onChange?: (html: string) => void;
  onUpdate?: (editor: Editor) => void;
  editable?: boolean;
}

export interface EditorConfig {
  imageConfig?: {
    inline?: boolean;
    allowBase64?: boolean;
    maxWidth?: string;
  };
  youtubeConfig?: {
    width?: number;
    height?: number;
    controls?: boolean;
  };
  linkConfig?: {
    openOnClick?: boolean;
    target?: string;
  };
}

/**
 * Custom hook for TipTap rich text editor with standard configuration
 * Provides consistent editor setup across different components
 * 
 * 🚀 PERFORMANCE OPTIMIZED:
 * - Memoized extensions to prevent unnecessary re-creation
 * - Memoized callbacks to prevent re-renders
 * - Optimized configuration objects
 */
export const useRichTextEditor = (
  options: EditorOptions,
  config: EditorConfig = {}
) => {
  const {
    content = '',
    placeholder = 'Start writing your content...',
    onChange,
    onUpdate,
    editable = true
  } = options;

  // Memoize configuration objects to prevent unnecessary re-creation
  const imageConfig = useMemo(() => ({
    inline: true,
    allowBase64: true,
    maxWidth: '65%',
    ...config.imageConfig
  }), [config.imageConfig]);

  const youtubeConfig = useMemo(() => ({
    width: 640,
    height: 360,
    controls: false,
    ...config.youtubeConfig
  }), [config.youtubeConfig]);

  const linkConfig = useMemo(() => ({
    openOnClick: false,
    target: '_blank',
    ...config.linkConfig
  }), [config.linkConfig]);

  // Memoize extensions to prevent unnecessary re-creation
  const extensions = useMemo(() => [
    StarterKit,
    Image.configure({
      inline: imageConfig.inline,
      allowBase64: imageConfig.allowBase64,
      HTMLAttributes: {
        style: `max-width: ${imageConfig.maxWidth}; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: block; margin: 16px auto;`,
      },
    }),
    YoutubeExtension.configure({
      inline: false,
      width: youtubeConfig.width,
      height: youtubeConfig.height,
      controls: youtubeConfig.controls,
      nocookie: false,
      HTMLAttributes: {
        class: 'youtube-embed',
        style: 'width: 100%; aspect-ratio: 16/9; border: 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin: 0; padding: 0; display: block;',
      },
    }),
    Link.configure({
      openOnClick: linkConfig.openOnClick,
      HTMLAttributes: {
        target: linkConfig.target,
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
  ], [imageConfig, youtubeConfig, linkConfig, placeholder]);

  // Memoize onUpdate callback to prevent unnecessary re-renders
  const handleUpdate = useCallback(({ editor }: { editor: Editor }) => {
    const html = editor.getHTML();
    onChange?.(html);
    onUpdate?.(editor);
  }, [onChange, onUpdate]);

  // Memoize editor props to prevent unnecessary re-creation
  const editorProps = useMemo(() => ({
    attributes: {
      class: 'max-w-none focus:outline-none text-gray-700 leading-relaxed [&>*:first-child]:mt-0 [&>h1:first-child]:mt-0 [&>h1:first-child]:pt-0',
    },
  }), []);

  const editor = useEditor({
    extensions,
    content,
    editable,
    onUpdate: handleUpdate,
    editorProps,
  });

  return editor;
};

export default useRichTextEditor;
