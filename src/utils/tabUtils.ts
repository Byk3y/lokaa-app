import { log } from '@/utils/logger';
import { z } from 'zod';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { devLogger } from '@/utils/developmentLogger';

/**
 * Tab Utilities for Space Navigation
 * 
 * Phase 3.1: Updated for new URL structure
 * - Root space: /:subdomain (unified for all users)
 * - Space sections: /:subdomain/:tab (members only)
 * - Backward compatibility maintained for legacy patterns
 * 
 * Provides robust tab extraction from URL pathnames, handling edge cases
 * and React Router initialization timing issues.
 */

export type SpaceTab = 'feed' | 'about' | 'members' | 'classroom' | 'calendar' | 'leaderboard';

const VALID_TABS: SpaceTab[] = ['feed', 'about', 'members', 'classroom', 'calendar', 'leaderboard'];

/**
 * Extract tab name from a space pathname
 * 
 * Phase 3.1: Handles new URL patterns:
 * - /:subdomain -> 'feed' (unified space root)
 * - /:subdomain/about -> 'about' (member about tab)
 * - /:subdomain/members -> 'members'
 * - /:subdomain/classroom -> 'classroom'
 * - /:subdomain/courses/courseSlug -> 'classroom' (course detail routes)
 * 
 * Legacy patterns (backward compatibility):
 * - /:subdomain/space -> 'feed'
 * - /:subdomain/space/classroom -> 'classroom'
 * - /:subdomain/space/classroom/courseSlug -> 'classroom'
 */
export function extractTabFromPathname(pathname: string): SpaceTab {
  if (!pathname || typeof pathname !== 'string') {
    return 'feed';
  }

  // Remove trailing slashes for consistent parsing
  const cleanPath = pathname.replace(/\/+$/, '');
  
  // Split path into segments
  const segments = cleanPath.split('/').filter(Boolean);
  
  // Phase 3.1: Check for new URL patterns first
  if (segments.length >= 2) {
    const subdomain = segments[0];
    const secondSegment = segments[1];
    
    // Check if second segment is a valid tab (new pattern)
    if (VALID_TABS.includes(secondSegment as SpaceTab)) {
      return secondSegment as SpaceTab;
    }
    
    // Check for course detail routes in new pattern
    if (secondSegment === 'courses' && segments.length >= 3) {
      return 'classroom'; // Course detail routes should keep classroom tab active
    }
  }
  
  // Legacy pattern: Check for 'space' segment
  const spaceIndex = segments.findIndex(segment => segment === 'space');
  
  if (spaceIndex !== -1) {
    // Check if there's a segment after 'space'
    const tabSegment = segments[spaceIndex + 1];
    
    // If no tab segment or at root space path, default to feed
    if (!tabSegment) {
      return 'feed';
    }
    
    // Check for course detail routes in legacy pattern
    if (tabSegment === 'classroom' && segments.length > spaceIndex + 2) {
      return 'classroom'; // Course detail routes should keep classroom tab active
    }
    
    // Validate the tab segment
    if (VALID_TABS.includes(tabSegment as SpaceTab)) {
      return tabSegment as SpaceTab;
    }
  }
  
  // If no valid tab found, default to feed
  return 'feed';
}

/**
 * Check if a pathname represents a root space path (should show feed)
 * 
 * Phase 3.1: Updated for new URL structure
 * - /:subdomain -> true (new unified root)
 * - /:subdomain/space -> true (legacy root)
 */
export function isRootSpacePath(pathname: string): boolean {
  if (!pathname) return false;
  
  const cleanPath = pathname.replace(/\/+$/, '');
  const segments = cleanPath.split('/').filter(Boolean);
  
  // Phase 3.1: Check for new unified root pattern
  if (segments.length === 1) {
    return true; // /:subdomain is the new root
  }
  
  // Legacy pattern: Check for 'space' segment
  const spaceIndex = segments.findIndex(segment => segment === 'space');
  
  // True if path ends with '/space' (no additional segments)
  return spaceIndex !== -1 && spaceIndex === segments.length - 1;
}

/**
 * Build a space URL for a given subdomain and tab
 * 
 * Phase 3.1: Updated for new URL structure
 * - Root space: /:subdomain (unified for all users)
 * - Space sections: /:subdomain/:tab (members only)
 */
export function buildSpaceUrl(subdomain: string, tab: SpaceTab = 'feed'): string {
  if (!subdomain) return '/';
  
  // Phase 3.1: New URL structure - unified /:subdomain for root
  if (tab === 'feed') {
    return `/${subdomain}`;
  }
  
  // Phase 3.1: Direct subdomain pattern for sections
  return `/${subdomain}/${tab}`;
}

/**
 * Build a legacy space URL for backward compatibility
 * 
 * @param subdomain The space subdomain
 * @param tab The space tab
 * @returns The legacy formatted URL string
 */
export function buildLegacySpaceUrl(subdomain: string, tab: SpaceTab = 'feed'): string {
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