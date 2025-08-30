import { useCallback } from 'react';
import { Editor } from '@tiptap/react';

export interface UseResourceHandlersProps {
  editor: Editor | null;
}

/**
 * Custom hook for handling resource insertions in rich text editors
 * Provides handlers for links, files, transcripts, and community posts
 */
export const useResourceHandlers = ({ editor }: UseResourceHandlersProps) => {
  
  const setLink = useCallback(() => {
    const url = window.prompt('Enter URL:');
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const handleAddResourceLink = useCallback(() => {
    const url = window.prompt('Enter resource link URL:');
    if (url && editor) {
      const linkHtml = `<p><a href="${url}" target="_blank" rel="noopener noreferrer">🔗 Resource Link</a></p>`;
      editor.chain().focus().insertContent(linkHtml).run();
    }
  }, [editor]);

  const handleAddResourceFile = useCallback(() => {
    // In a real implementation, this would open a file picker
    const fileName = window.prompt('Enter file name:');
    if (fileName && editor) {
      const fileHtml = `<p><a href="#" class="resource-file">📎 ${fileName}</a></p>`;
      editor.chain().focus().insertContent(fileHtml).run();
    }
  }, [editor]);

  const handleAddTranscript = useCallback(() => {
    const transcriptText = window.prompt('Enter transcript text:');
    if (transcriptText && editor) {
      const transcriptHtml = `<blockquote><p><strong>Transcript:</strong><br />${transcriptText}</p></blockquote>`;
      editor.chain().focus().insertContent(transcriptHtml).run();
    }
  }, [editor]);

  const handlePinCommunityPost = useCallback(() => {
    // This would typically open a modal to select a community post
    const postTitle = window.prompt('Enter community post title to pin:');
    if (postTitle && editor) {
      const pinHtml = `<div class="pinned-post"><p><strong>📌 Pinned Community Post:</strong> ${postTitle}</p></div>`;
      editor.chain().focus().insertContent(pinHtml).run();
    }
  }, [editor]);

  return {
    setLink,
    handleAddResourceLink,
    handleAddResourceFile,
    handleAddTranscript,
    handlePinCommunityPost
  };
};

export default useResourceHandlers;
