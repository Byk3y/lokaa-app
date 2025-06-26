import type { PostCardProps } from '@/features/posts/types/postCard';
import type { Attachment } from '@/features/posts/types';

/**
 * Modal variant types for different platforms/contexts
 */
export type CreatePostModalVariant = 'desktop' | 'mobile' | 'fullscreen';

/**
 * Core props for all CreatePostModal variants
 */
export interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  currentUserId: string;
  spaceName: string;
  userName: string;
  userAvatarUrl?: string;
  onPostCreated?: () => void;
  editMode?: boolean;
  post?: PostCardProps;
  onPostUpdated?: (updatedPost: PostCardProps) => void;
  variant?: CreatePostModalVariant;
}

/**
 * Props for form header component
 */
export interface PostFormHeaderProps {
  userName: string;
  userAvatarUrl?: string;
  spaceName: string;
  editMode?: boolean;
}

/**
 * Props for form inputs component
 */
export interface PostFormInputsProps {
  title: string;
  setTitle: (title: string) => void;
  content: string;
  setContent: (content: string) => void;
  contentTextareaRef: React.RefObject<HTMLTextAreaElement>;
  showFunPostIdeas: boolean;
  setShowFunPostIdeas: (show: boolean) => void;
  applyPostTemplate: (template: any) => void;
}

/**
 * Props for toolbar component
 */
export interface PostFormToolbarProps {
  onAttachFile: () => void;
  onAddLink: () => void;
  onAddVideo: () => void;
  onAddGif: () => void;
  onTogglePoll: () => void;
  onToggleEmoji: () => void;
  showPollCreator: boolean;
  toolbarButtonClass: string;
  activeToolbarButtonClass: string;
}

/**
 * Props for attachment preview components
 */
export interface AttachmentPreviewGridProps {
  selectedContentGifUrls: string[];
  attachments: Attachment[];
  uploadingFiles: Set<string>;
  onRemoveContentGif: (index: number) => void;
  onRemoveAttachment: (id: string) => void;
  onVideoPreviewClick: (e: React.MouseEvent, attachment: Attachment) => void;
  formatFileSize: (bytes?: number) => string;
}

export interface AttachmentPreviewItemProps {
  attachment: Attachment;
  onRemove: (id: string) => void;
  onVideoPreviewClick?: (e: React.MouseEvent, attachment: Attachment) => void;
  formatFileSize: (bytes?: number) => string;
}

/**
 * Props for form actions component
 */
export interface PostFormActionsProps {
  categoryId: string | null;
  setCategoryId: (id: string | null) => void;
  categories: any[];
  categoriesLoading: boolean;
  categoriesError: boolean;
  toolbarButtonClass: string;
  activeToolbarButtonClass: string;
  onCancel: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  uploadingFiles: Set<string>;
  hasContent: boolean;
  editMode?: boolean;
} 