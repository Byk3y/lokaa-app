import React, { useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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
  Youtube
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import clsx from 'clsx';

interface RichTextEditorProps {
  content: string;
  onChange: (richText: string) => void;
  placeholder?: string;
  defaultTitle?: string;
  onSave: (title: string, content: string) => void;
  onCancel: () => void;
  className?: string;
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
      'h-8 px-2 rounded-md border-none cursor-pointer transition-all duration-200 ease-in-out',
      'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
      {
        'bg-gray-200 text-gray-900': isActive,
        'bg-transparent': !isActive
      }
    )}
  >
    {icon ? (
      <div className={clsx(
        'w-5 h-5 flex items-center justify-center',
        'transition-colors duration-200'
      )}>
        {React.cloneElement(icon as React.ReactElement, {
          size: 18,
          strokeWidth: 1.5,
          className: 'stroke-current'
        })}
      </div>
    ) : (
      <span className={clsx(
        'text-sm font-medium leading-none px-1',
        'transition-colors duration-200'
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
}) => {
  const [title, setTitle] = useState(defaultTitle);
  const [published, setPublished] = useState(true);
  const [showTitleError, setShowTitleError] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none text-gray-700 leading-relaxed',
      },
    },
  });

  const addImage = useCallback(() => {
    const url = window.prompt('Image URL');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const setLink = useCallback(() => {
    const previousUrl = editor?.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) return;
    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addVideo = useCallback(() => {
    alert("Video embedding coming soon!");
  }, []);

  if (!editor) {
    return null;
  }

  const handleSave = () => {
    if (!title.trim()) {
      setShowTitleError(true);
      return;
    }
    setShowTitleError(false);
    onSave(title, editor.getHTML());
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey)) {
        switch (e.key) {
          case 'b':
            e.preventDefault();
            editor.chain().focus().toggleBold().run();
            break;
          case 'i':
            e.preventDefault();
            editor.chain().focus().toggleItalic().run();
            break;
          case 'k':
            e.preventDefault();
            setLink();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editor, setLink]);

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-4 py-3 bg-gray-50 border-b border-gray-200 overflow-x-auto">
        {/* Headings Group */}
        <div className="flex items-center gap-1 pr-3 border-r border-gray-300">
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
            isActive={editor.isActive('heading', { level: 1 })} 
            title="Heading 1"
            aria-pressed={editor.isActive('heading', { level: 1 })}
          >
            H1
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
            isActive={editor.isActive('heading', { level: 2 })} 
            title="Heading 2"
            aria-pressed={editor.isActive('heading', { level: 2 })}
          >
            H2
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} 
            isActive={editor.isActive('heading', { level: 3 })} 
            title="Heading 3"
            aria-pressed={editor.isActive('heading', { level: 3 })}
          >
            H3
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} 
            isActive={editor.isActive('heading', { level: 4 })} 
            title="Heading 4"
            aria-pressed={editor.isActive('heading', { level: 4 })}
          >
            H4
          </ToolbarButton>
        </div>

        {/* Text Formatting Group */}
        <div className="flex items-center gap-1 px-3 border-r border-gray-300">
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
            icon={<Code />}
            aria-pressed={editor.isActive('code')}
          />
        </div>

        {/* Lists Group */}
        <div className="flex items-center gap-1 px-3 border-r border-gray-300">
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
        </div>

        {/* Media Group */}
        <div className="flex items-center gap-1 px-3 border-r border-gray-300">
          <ToolbarButton 
            onClick={addVideo} 
            title="YouTube Video"
            icon={<Youtube />}
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
        </div>

        {/* Divider */}
        <div className="flex items-center px-3">
          <ToolbarButton 
            onClick={() => editor.chain().focus().setHorizontalRule().run()} 
            title="Divider"
            icon={<Minus />}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6 space-y-4">
        {/* Title */}
        <div className="relative">
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
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

        {/* Editor Content */}
        <div className="min-h-[200px] editor-content">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Controls Row */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="text-sm font-medium text-gray-600">
              ADD <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem><FileUp className="mr-2 h-4 w-4" /> File</DropdownMenuItem>
            <DropdownMenuItem><Code2 className="mr-2 h-4 w-4" /> Embed</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-6">
          {showTitleError && <p className="text-red-500 text-sm font-medium">Page title is required</p>}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-green-700">Published</span>
            <Switch 
              checked={published} 
              onCheckedChange={setPublished}
              className="data-[state=checked]:bg-green-600 shadow-sm" 
            />
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={onCancel} 
              className="text-gray-500 text-sm font-medium hover:underline hover:text-gray-700 transition-colors"
            >
              CANCEL
            </button>
            <button 
              onClick={handleSave} 
              disabled={!title.trim()}
              className="px-6 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-50"
              style={{ 
                backgroundColor: '#FBE496', 
                color: '#374151',
                border: 'none'
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = '#FBBF24';
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = '#FBE496';
                }
              }}
            >
              SAVE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RichTextEditor; 