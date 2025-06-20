/**
 * Utility functions for handling avatars and user display
 */

/**
 * 🎯 UNIFIED initials function - replaces ALL duplicate implementations
 * Extract initials from a name for avatar fallback
 * @param name Full name to extract initials from
 * @returns Initials (1-2 characters), 'U' for unknown
 */
export function getInitials(name: string | null | undefined): string {
  if (!name?.trim()) return 'U'; // Standardized default
  
  const cleaned = name.trim().replace(/[^a-zA-Z\s]/g, '');
  const parts = cleaned.split(/\s+/).filter(Boolean);
  
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  
  // Get initials from first and last name
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Generate a deterministic color based on a string (typically a user ID)
 * @param str String to generate color from
 * @returns HEX color code
 */
export function getAvatarColor(str: string): string {
  // Define a set of pleasant, accessible colors
  const colors = [
    '#3B82F6', // blue
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#F97316', // orange
    '#10B981', // emerald
    '#14B8A6', // teal
    '#0EA5E9', // sky blue
    '#8B5CF6', // violet
    '#F59E0B', // amber
    '#6366F1', // indigo
  ];
  
  // Create a simple hash of the string
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Use the hash to pick a color
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

/**
 * 🔄 BACKWARD COMPATIBILITY: Alias for getInitials
 * @deprecated Use getInitials() instead
 */
export const getInitial = getInitials;

// ========================================
// 🚀 UNIFIED AVATAR RESOLUTION SYSTEM
// ========================================

interface AvatarUser {
  id?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

interface AvatarOptions {
  size?: number;
  fallbackType?: 'initials' | 'default';
  backgroundColor?: string;
}

interface AvatarResult {
  url: string | null;
  initials: string;
  backgroundColor: string;
  hasImage: boolean;
  source: 'database' | 'auth' | 'fallback';
}

/**
 * 🎯 UNIFIED AVATAR RESOLVER - Single source of truth for all avatar logic
 * Replaces inconsistent avatar handling across components
 */
export class AvatarUtils {
  private static readonly ENHANCED_COLORS = [
    '#F87171', '#FB923C', '#FBBF24', '#A3E635', '#34D399',
    '#22D3EE', '#60A5FA', '#A78BFA', '#F472B6', '#FB7185'
  ];

  /**
   * 🎨 Generate deterministic color from user ID (enhanced version)
   */
  static getEnhancedAvatarColor(userId?: string): string {
    if (!userId) return this.ENHANCED_COLORS[0];
    
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash + userId.charCodeAt(i)) & 0xffffffff;
    }
    
    return this.ENHANCED_COLORS[Math.abs(hash) % this.ENHANCED_COLORS.length];
  }

  /**
   * 🚀 MAIN RESOLVER - handles all avatar logic consistently
   */
  static resolveAvatar(user: AvatarUser, options: AvatarOptions = {}): AvatarResult {
    const { fallbackType = 'initials' } = options;
    
    // Primary: Database avatar_url
    if (user.avatar_url?.trim()) {
      return {
        url: user.avatar_url,
        initials: getInitials(user.full_name),
        backgroundColor: this.getEnhancedAvatarColor(user.id),
        hasImage: true,
        source: 'database'
      };
    }

    // Fallback: Generate initials
    const initials = getInitials(user.full_name || user.first_name || user.last_name);
    const backgroundColor = options.backgroundColor || this.getEnhancedAvatarColor(user.id);

    return {
      url: null,
      initials,
      backgroundColor,
      hasImage: false,
      source: 'fallback'
    };
  }

  /**
   * 🔍 Validate avatar URL format
   */
  static isValidAvatarUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.hostname.includes('supabase.co') && 
             parsed.pathname.includes('/storage/v1/object/public/avatars/');
    } catch {
      return false;
    }
  }
}

// 🎯 React Hook for easy component integration
import { useMemo } from 'react';

export function useAvatar(user: AvatarUser, options: AvatarOptions = {}) {
  return useMemo(() => AvatarUtils.resolveAvatar(user, options), [user, options]);
} 