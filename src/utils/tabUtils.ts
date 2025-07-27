import { log } from '@/utils/logger';
import { z } from 'zod';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { devLogger } from '@/utils/developmentLogger';

/**
 * Tab Utilities for Space Navigation
 * 
 * Provides robust tab extraction from URL pathnames, handling edge cases
 * and React Router initialization timing issues.
 */

export type SpaceTab = 'feed' | 'about' | 'members' | 'classroom' | 'calendar' | 'leaderboard';

const VALID_TABS: SpaceTab[] = ['feed', 'about', 'members', 'classroom', 'calendar', 'leaderboard'];

/**
 * Extract tab name from a space pathname
 * 
 * Handles various URL patterns:
 * - /subdomain/space -> 'feed'
 * - /subdomain/space/classroom -> 'classroom'
 * - /subdomain/space/feed -> 'feed' 
 * - /subdomain/space/invalid -> 'feed' (fallback)
 * - /subdomain/space/classroom/courseSlug -> 'classroom' (course detail routes)
 */
export function extractTabFromPathname(pathname: string): SpaceTab {
  if (!pathname || typeof pathname !== 'string') {
    return 'feed';
  }

  // Remove trailing slashes for consistent parsing
  const cleanPath = pathname.replace(/\/+$/, '');
  
  // ✅ FIX: Check if we're on a course detail route (new pattern only)
  const isCourseDetailRoute = cleanPath.match(/^\/[^\/]+\/space\/classroom\/[^\/]+$/);
  if (isCourseDetailRoute) {
    return 'classroom'; // Course detail routes should keep classroom tab active
  }
  
  // Split path into segments
  const segments = cleanPath.split('/').filter(Boolean);
  
  // Find the index of 'space' segment
  const spaceIndex = segments.findIndex(segment => segment === 'space');
  
  // If no 'space' segment found, default to feed
  if (spaceIndex === -1) {
    return 'feed';
  }
  
  // Check if there's a segment after 'space'
  const tabSegment = segments[spaceIndex + 1];
  
  // If no tab segment or at root space path, default to feed
  if (!tabSegment) {
    return 'feed';
  }
  
  // Validate the tab segment
  if (VALID_TABS.includes(tabSegment as SpaceTab)) {
    return tabSegment as SpaceTab;
  }
  
  // Invalid tab segment, fallback to feed
  return 'feed';
}

/**
 * Check if a pathname represents a root space path (should show feed)
 */
export function isRootSpacePath(pathname: string): boolean {
  if (!pathname) return false;
  
  const cleanPath = pathname.replace(/\/+$/, '');
  const segments = cleanPath.split('/').filter(Boolean);
  const spaceIndex = segments.findIndex(segment => segment === 'space');
  
  // True if path ends with '/space' (no additional segments)
  return spaceIndex !== -1 && spaceIndex === segments.length - 1;
}

/**
 * Build a space URL for a given subdomain and tab
 */
export function buildSpaceUrl(subdomain: string, tab: SpaceTab = 'feed'): string {
  if (!subdomain) return '/';
  
  if (tab === 'feed') {
    return `/${subdomain}/space`;
  }
  
  return `/${subdomain}/space/${tab}`;
}

/**
 * Normalize tab name to handle any legacy or alternative names
 */
export function normalizeTabName(tab: string | undefined): SpaceTab {
  if (!tab) return 'feed';
  
  // Handle legacy mappings
  const normalizedTab = tab.toLowerCase();
  
  switch (normalizedTab) {
    case 'community':
      return 'feed';
    case 'leaderboards':
      return 'leaderboard';
    default:
      return VALID_TABS.includes(normalizedTab as SpaceTab) ? normalizedTab as SpaceTab : 'feed';
  }
}

/**
 * Get tab display name for UI
 */
export function getTabDisplayName(tab: SpaceTab): string {
  switch (tab) {
    case 'feed':
      return 'Feed';
    case 'about':
      return 'About';
    case 'members':
      return 'Members';
    case 'classroom':
      return 'Classroom';
    case 'calendar':
      return 'Calendar';
    case 'leaderboard':
      return 'Leaderboard';
    default:
      return 'Feed';
  }
}

/**
 * Debug logging for tab determination issues
 */
export function debugTabExtraction(pathname: string, tab?: string, activeTab?: string) {
  if (process.env.NODE_ENV === 'development') {
    const extractedTab = extractTabFromPathname(pathname);
    const isRoot = isRootSpacePath(pathname);
    
    // ENHANCED DEBUG: Show both provided pathname and window.location.pathname
    const windowPathname = typeof window !== 'undefined' ? window.location.pathname : 'N/A';
    
    if (process.env.NODE_ENV === 'development') {
      log.debug('Utils', '🔍 [TabUtils] Debug info:', {
        pathname,
        windowPathname,
        pathnameDifference: pathname !== windowPathname ? 'DIFFERENT!' : 'same',
        tab,
        activeTab,
        extractedTab,
        isRoot,
        segments: pathname.split('/').filter(Boolean),
        windowSegments: windowPathname !== 'N/A' ? windowPathname.split('/').filter(Boolean) : []
      });
    }
  }
} 