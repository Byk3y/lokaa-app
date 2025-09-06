import React, { useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { ToolbarButton, ToolbarDivider } from './index';
import {
  Bold,
  Italic,
  Strikethrough,
  Code2,
  List,
  ListOrdered,
  Quote,
  Image as ImageIcon,
  Link as LinkIcon,
  Minus,
  Video
} from 'lucide-react';

export interface DesktopToolbarProps {
  editor: Editor;
  onImageUpload: () => void;
  onVideoUpload: () => void;
  onSetLink: () => void;
}

/**
 * Desktop toolbar for rich text editor
 * Single row layout with all formatting and media tools
 * 
 * 🚀 PERFORMANCE OPTIMIZED:
 * - React.memo to prevent unnecessary re-renders
 * - Memoized click handlers to prevent re-creation
 */
export const DesktopToolbar: React.FC<DesktopToolbarProps> = React.memo(({
  editor,
  onImageUpload,
  onVideoUpload,
  onSetLink
}) => {
  // Memoize click handlers to prevent unnecessary re-creation
  const handleHeading1 = useCallback(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), [editor]);
  const handleHeading2 = useCallback(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), [editor]);
  const handleHeading3 = useCallback(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), [editor]);
  const handleHeading4 = useCallback(() => editor.chain().focus().toggleHeading({ level: 4 }).run(), [editor]);

  return (
    <div className="hidden md:flex items-center justify-evenly px-3 py-2.5">
      {/* Heading Buttons */}
      <ToolbarButton 
        onClick={handleHeading1} 
        isActive={editor.isActive('heading', { level: 1 })} 
        title="Heading 1"
        aria-pressed={editor.isActive('heading', { level: 1 })}
      >
        H₁
      </ToolbarButton>
      <ToolbarButton 
        onClick={handleHeading2} 
        isActive={editor.isActive('heading', { level: 2 })} 
        title="Heading 2"
        aria-pressed={editor.isActive('heading', { level: 2 })}
      >
        H₂
      </ToolbarButton>
      <ToolbarButton 
        onClick={handleHeading3} 
        isActive={editor.isActive('heading', { level: 3 })} 
        title="Heading 3"
        aria-pressed={editor.isActive('heading', { level: 3 })}
      >
        H₃
      </ToolbarButton>
      <ToolbarButton 
        onClick={handleHeading4} 
        isActive={editor.isActive('heading', { level: 4 })} 
        title="Heading 4"
        aria-pressed={editor.isActive('heading', { level: 4 })}
      >
        H₄
      </ToolbarButton>

      <ToolbarDivider />

      {/* Text Formatting */}
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

      {/* Lists and Blocks */}
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

      {/* Media and Inserts */}
      <ToolbarButton 
        onClick={onImageUpload} 
        title="Image"
        icon={<ImageIcon />}
      />
      <ToolbarButton 
        onClick={onSetLink} 
        title="Link"
        icon={<LinkIcon />}
      />
      <ToolbarButton 
        onClick={() => editor.chain().focus().setHorizontalRule().run()} 
        title="Divider"
        icon={<Minus />}
      />
      <ToolbarButton 
        onClick={onVideoUpload} 
        title="Video"
        icon={<Video />}
      />
    </div>
  );
});

// Add display name for debugging
DesktopToolbar.displayName = 'DesktopToolbar';

export default DesktopToolbar;
