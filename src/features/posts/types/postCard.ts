import type { Attachment } from './postTypes';

/**
 * Author information for a post or comment
 */
export interface Author {
  id: string;
  name: string;
  avatar?: string | null;
  profile_url?: string | null;
  activity_score?: number | null;
}

/**
 * Category information for a post
 */
export interface Category {
  id: string;
  name: string;
  icon?: string | null;
}

/**
 * Props for the PostCard component
 */
export interface PostCardProps {
  id: string;
  spaceId: string;
  currentUserId?: string | null;
  author: Author;
  title?: string | null;
  content: string;
  content_gif_url?: string | null;
  createdAt: string | Date;
  editedAt?: string | null;
  category?: Category | null;
  likes?: number;
  comments?: number;
  className?: string;
  media_urls?: Attachment[] | null;
  isPinned?: boolean;
  pinCategory?: string | null;
  isAdmin?: boolean;
  poll_data?: string[] | null;
  slug?: string | null;
  onPostClick?: (post: PostCardProps) => void;
  onLikeToggled?: (postId: string, newLikeCount: number) => void;
  onPinToggled?: (postId: string, isPinned: boolean, category?: string | null) => void;
}

/**
 * Comment author information
 */
export interface CommentAuthor {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

/**
 * Structure of a comment returned from the API
 */
export interface FetchedComment {
  id: string;
  content: string;
  created_at: string;
  author: CommentAuthor | null;
  post_id?: string;
  space_id?: string;
  parent_comment_id?: string | null;
  reply_count?: number;
  like_count?: number;
  isLiked?: boolean;
}

/**
 * Video information for display
 */
export interface VideoDisplay {
  url: string;
  videoId?: string | null;
  platform?: string;
} 