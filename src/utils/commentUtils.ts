import { log } from '@/utils/logger';
/**
 * Enhanced Session-Aware Comment Time Utilities
 * Shows "New comment" for comments posted after user's session start AND within time window
 * Shows "Last comment" for older comments
 */

export interface CommentDisplayInfo {
  displayText: 'New comment' | 'Last comment';
  timeText: string;
  commentTime: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
}

/**
 * Get or initialize session start time
 */
function getSessionStartTime(): Date {
  const sessionKey = 'lokaa_session_start';
  const stored = sessionStorage.getItem(sessionKey);
  
  if (stored) {
    return new Date(stored);
  }
  
  // First time - initialize session start time
  const now = new Date();
  sessionStorage.setItem(sessionKey, now.toISOString());
  return now;
}

/**
 * Format comment time in a user-friendly way
 */
export function formatCommentTime(timestamp: string): string {
  const now = new Date();
  const commentTime = new Date(timestamp);
  const diffInMinutes = Math.floor((now.getTime() - commentTime.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) {
    return 'just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInMinutes < 24 * 60) {
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffInMinutes / (24 * 60));
    return `${days}d ago`;
  }
}

/**
 * Check if comment is recent based on adaptive time windows
 */
export function isCommentRecent(
  timestamp: string, 
  spaceActivity: 'high' | 'medium' | 'low' = 'medium'
): boolean {
  const now = new Date();
  const commentTime = new Date(timestamp);
  const diffInHours = (now.getTime() - commentTime.getTime()) / (1000 * 60 * 60);
  
  // Adaptive time windows based on space activity
  const timeWindows = {
    high: 0.5,    // 30 minutes for very active spaces
    medium: 2,    // 2 hours for normal spaces  
    low: 6        // 6 hours for quiet spaces
  };
  
  return diffInHours <= timeWindows[spaceActivity];
}

/**
 * Check if comment is new to the current user session
 */
function isCommentNewToSession(timestamp: string, spaceActivity: 'high' | 'medium' | 'low' = 'medium'): boolean {
  const sessionStart = getSessionStartTime();
  const commentTime = new Date(timestamp);
  
  // Must be after session start AND within recent time window
  const isAfterSession = commentTime > sessionStart;
  const isRecent = isCommentRecent(timestamp, spaceActivity);
  
  return isAfterSession && isRecent;
}

/**
 * Get enhanced comment display info with session awareness
 */
export function getSimpleCommentInfo(
  comments: any[], 
  currentUserId: string,
  spaceActivity: 'high' | 'medium' | 'low' = 'medium'
): CommentDisplayInfo | null {
  if (!comments?.length) return null;
  
  // Filter out user's own comments AND comments with null authors
  const otherComments = comments.filter(comment => 
    comment.author?.id && comment.author.id !== currentUserId
  );
  
  if (!otherComments.length) return null;
  
  // Find the most recent comment from others
  const mostRecent = otherComments.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0];
  
  // Double-check that author exists (safety check)
  if (!mostRecent.author) {
    log.warn('Utils', '[CommentUtils] Most recent comment has null author, skipping');
    return null;
  }
  
  const timeText = formatCommentTime(mostRecent.created_at);
  const isNew = isCommentNewToSession(mostRecent.created_at, spaceActivity);
  
  return {
    displayText: isNew ? 'New comment' : 'Last comment',
    timeText,
    commentTime: mostRecent.created_at,
    author: {
      id: mostRecent.author.id,
      name: mostRecent.author.name || mostRecent.author.full_name || 'Unknown User',
      avatar: mostRecent.author.avatar || mostRecent.author.avatar_url
    }
  };
}

/**
 * Update session start time (call when user explicitly refreshes or navigates)
 */
export function updateSessionStartTime(): void {
  const now = new Date();
  sessionStorage.setItem('lokaa_session_start', now.toISOString());
}

/**
 * Get session duration in minutes
 */
export function getSessionDuration(): number {
  const sessionStart = getSessionStartTime();
  const now = new Date();
  return Math.floor((now.getTime() - sessionStart.getTime()) / (1000 * 60));
}

/**
 * Debug info for testing
 */
export function getSessionDebugInfo() {
  const sessionStart = getSessionStartTime();
  const duration = getSessionDuration();
  
  return {
    sessionStart: sessionStart.toISOString(),
    sessionDuration: `${duration} minutes`,
    sessionAge: duration > 60 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : `${duration}m`
  };
} 