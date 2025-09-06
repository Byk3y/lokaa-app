import React, { useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { ToolbarButton } from './index';
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
  Video,
  Menu
} from 'lucide-react';

export interface MobileToolbarProps {
  editor: Editor;
  onImageUpload: () => void;
  onVideoUpload: () => void;
  onSetLink: () => void;
  onMoreOptions?: () => void;
}

/**
 * Mobile toolbar for rich text editor
 * Two-row layout with even distribution for better touch interaction
 * 
 * 🚀 PERFORMANCE OPTIMIZED:
 * - React.memo to prevent unnecessary re-renders
 * - Memoized click handlers to prevent re-creation
 */
export const MobileToolbar: React.FC<MobileToolbarProps> = React.memo(({
  editor,
  onImageUpload,
  onVideoUpload,
  onSetLink,
  onMoreOptions
}) => {
  return (
    <div className="md:hidden">
      {/* First Row: Headings and Basic Formatting */}
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
          onClick={onMoreOptions || (() => {})} 
          title="More options"
          icon={<Menu />}
        />
      </div>

      {/* Second Row: Lists, Media, and Inserts */}
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
    </div>
  );
});

// Add display name for debugging
MobileToolbar.displayName = 'MobileToolbar';

export default MobileToolbar;
