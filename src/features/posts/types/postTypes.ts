import type { PostCardProps } from '@/features/posts/types/postCard';

/**
 * Represents a file, link, or video attachment in a post
 */
export interface Attachment {
  id: string; // Unique ID for React key and removal
  type: 'file' | 'link' | 'video';
  url: string;
  name?: string; // For files and potentially fetched link titles
  fileType?: string; // MIME type for files
  fileSize?: number; // Optional: for display
  videoPlatform?: 'youtube' | 'vimeo' | 'other'; // For video embeds
  videoId?: string | null;
  thumbnailUrl?: string | null;
  isLoading?: boolean; // To show loading state for individual file uploads
  storagePath?: string; // Storage path for uploaded files (for deletion)
}

/**
 * Post interface that matches database structure
 */
export interface Post {
  id: string;
  space_id: string;
  user_id: string;
  title?: string | null;
  content: string;
  created_at?: string | null;
  updated_at?: string | null;
  category_id?: string | null;
  media_urls?: Attachment[] | null;
  like_count?: number | null;
  comment_count?: number | null;
  is_pinned?: boolean | null;
  pinned_at?: string | null;
  pinned_by?: string | null;
  pin_position?: number | null;
  pin_category?: string | null;
  poll_data?: string[] | null;
  edited_at?: string | null;
  slug?: string | null; // Slug for SEO-friendly URLs
}

/**
 * Props for the video link modal component
 */
export interface VideoLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string) => void;
}

/**
 * Props for the link modal component
 */
export interface LinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string) => void;
}

/**
 * Props for the create post modal component
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
}

/**
 * Represents a poll option in a post
 */
export interface PollOption {
  id: string;
  text: string;
}

/**
 * Video information extracted from a URL
 */
export interface VideoInfo {
  platform: 'youtube' | 'vimeo' | 'other';
  videoId: string | null;
  thumbnailUrl: string | null;
}

/**
 * Response structure from post creation or update API calls
 */
export type PostApiResponse = {
  success: boolean;
  postId?: string;
  error?: string;
};

/**
 * Type for JSON data
 */
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

/**
 * Pre-written post content templates with emojis
 */
export const POST_TEMPLATES = {
  introduction: {
    title: "👋 Quick Introductions",
    content: "Hello everyone!\n\nLet's get to know each other. Share a bit about yourself:\n\n• Your name/role\n• What brings you to this community\n• One thing you're excited about right now\n\nLooking forward to connecting with you all!"
  },
  favorites: {
    title: "💡 Question for the Community",
    content: "Hey everyone!\n\nI'd love to hear your thoughts on this:\n\nWhat's one tool, resource, or practice that has made a positive difference for you recently?\n\nShare your recommendations below!"
  }
}; 