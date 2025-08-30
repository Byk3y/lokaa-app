import { useEditor, Editor } from '@tiptap/react';
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

  const {
    imageConfig = {
      inline: true,
      allowBase64: true,
      maxWidth: '65%'
    },
    youtubeConfig = {
      width: 640,
      height: 360,
      controls: false
    },
    linkConfig = {
      openOnClick: false,
      target: '_blank'
    }
  } = config;

  const editor = useEditor({
    extensions: [
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
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html);
      onUpdate?.(editor);
    },
    editorProps: {
      attributes: {
        class: 'max-w-none focus:outline-none text-gray-700 leading-relaxed [&>*:first-child]:mt-0 [&>h1:first-child]:mt-0 [&>h1:first-child]:pt-0',
      },
    },
  });

  return editor;
};

export default useRichTextEditor;
