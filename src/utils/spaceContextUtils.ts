/**
 * Space Context Utilities - Enhanced Content URL Support
 * 
 * This utility manages space context for all content URLs including:
 * - Space routes: /:subdomain/space/*
 * - Post routes: /:subdomain/post/:slug
 * - Profile routes: /:subdomain/profile/:username
 * - Course routes: /:subdomain/space/classroom/:courseSlug
 * - Lesson routes: /:subdomain/space/classroom/:courseSlug/:lessonSlug
 */

import { NavigateFunction } from 'react-router-dom';

export interface SpaceContext {
  id: string;
  name: string;
  subdomain: string;
}

/**
 * Content URL parsing utilities for space context detection
 */
export function isContentUrl(pathname: string): boolean {
  const pathParts = pathname.split('/').filter(Boolean);
  if (pathParts.length < 2) return false;
  
  return (
    pathParts[1] === 'post' ||           // /:subdomain/post/:slug
    pathParts[1] === 'profile' ||        // /:subdomain/profile/:username
    (pathParts[1] === 'space' && pathParts[2] === 'classroom') // /:subdomain/space/classroom/:courseSlug
  );
}

export function isSpaceRelatedUrl(pathname: string): boolean {
  const pathParts = pathname.split('/').filter(Boolean);
  if (pathParts.length < 2) return false;
  
  return (
    pathParts[1] === 'space' ||          // /:subdomain/space/*
    pathParts[1] === 'post' ||           // /:subdomain/post/:slug
    pathParts[1] === 'profile' ||        // /:subdomain/profile/:username
    (pathParts[1] === 'space' && pathParts[2] === 'classroom') // /:subdomain/space/classroom/*
  );
}

export function extractSpaceFromUrl(pathname: string): string | null {
  const pathParts = pathname.split('/').filter(Boolean);
  return pathParts[0] || null;
}

export function getContentTypeFromUrl(pathname: string): string | null {
  const pathParts = pathname.split('/').filter(Boolean);
  if (pathParts.length < 2) return null;
  
  if (pathParts[1] === 'space') {
    return pathParts[2] === 'classroom' ? 'course/lesson' : 'space';
  }
  
  return pathParts[1]; // 'post', 'profile', etc.
}

/**
 * Generate a profile URL with optional space context
 */
export function generateProfileUrl(profileSlug: string, spaceContext?: SpaceContext | null): string {
  const baseUrl = `/profile/${profileSlug}`;
  
  if (spaceContext && spaceContext.subdomain) {
    return `${baseUrl}?space=${spaceContext.subdomain}`;
  }
  
  return baseUrl;
}

/**
 * Extract space context from URL search parameters
 */
export function getSpaceContextFromUrl(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('space');
}

/**
 * Get current space context from various sources
 */
export function getCurrentSpaceContext(): SpaceContext | null {
  // First, try to get from URL query parameter (if we're already on a profile with space context)
  const spaceFromUrl = getSpaceContextFromUrl();
  if (spaceFromUrl) {
    // Try to get full space details from localStorage
    try {
      const storedSpaces = localStorage.getItem('lastVisitedSpace');
      if (storedSpaces) {
        const parsedSpace = JSON.parse(storedSpaces);
        if (parsedSpace && parsedSpace.subdomain === spaceFromUrl) {
          return parsedSpace;
        }
      }
    } catch (e) {
      // Silent fallback
    }
    
    // Fallback: return minimal context from URL
    return {
      id: '',
      name: spaceFromUrl.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      subdomain: spaceFromUrl
    };
  }
  
  // Try to get from current URL path if we're in a space
  const pathname = window.location.pathname;
  const spaceMatch = pathname.match(/\/([^\/]+)\/space/);
  if (spaceMatch && spaceMatch[1]) {
    const subdomain = spaceMatch[1];
    
    // Try to get full details from localStorage
    try {
      const storedSpaces = localStorage.getItem('lastVisitedSpace');
      if (storedSpaces) {
        const parsedSpace = JSON.parse(storedSpaces);
        if (parsedSpace && parsedSpace.subdomain === subdomain) {
          return parsedSpace;
        }
      }
    } catch (e) {
      // Silent fallback
    }
    
    // Fallback: create minimal context from URL
    return {
      id: '',
      name: subdomain.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      subdomain: subdomain
    };
  }
  
  // Last resort: check if there's any space data in localStorage that might be relevant
  try {
    const storedSpaces = localStorage.getItem('lastVisitedSpace');
    if (storedSpaces) {
      const parsedSpace = JSON.parse(storedSpaces);
      if (parsedSpace && parsedSpace.subdomain) {
        return parsedSpace;
      }
    }
  } catch (e) {
    // Silent fallback
  }
  
  return null;
}

/**
 * Get space context for display purposes (includes legacy sessionStorage support)
 */
export function getDisplaySpaceContext(): SpaceContext | null {
  // First check URL query parameters
  const urlContext = getCurrentSpaceContext();
  if (urlContext) {
    return urlContext;
  }
  
  // Legacy: check sessionStorage for backward compatibility
  try {
    const legacyContext = sessionStorage.getItem('navigatedFromSpace');
    if (legacyContext) {
      const parsed = JSON.parse(legacyContext);
      if (parsed && parsed.subdomain) {
        return parsed;
      }
    }
  } catch (e) {
    // Silent fallback
  }
  
  return null;
}

/**
 * Clear space context from URL and storage
 */
export function clearSpaceContext(): void {
  // Remove query parameter from URL
  const url = new URL(window.location.href);
  url.searchParams.delete('space');
  window.history.replaceState({}, '', url.toString());
  
  // Clear legacy sessionStorage
  try {
    sessionStorage.removeItem('navigatedFromSpace');
  } catch (e) {
    // Silent fallback
  }
}

/**
 * Navigate to profile with space context (Skool-style)
 */
export function navigateToProfileWithContext(
  profileSlug: string, 
  navigate: NavigateFunction,
  customSpaceContext?: SpaceContext
): void {
  // Use custom context or get current context
  const spaceContext = customSpaceContext || getCurrentSpaceContext();
  
  // Generate URL with space context
  const profileUrl = generateProfileUrl(profileSlug, spaceContext);
  
  // Clear legacy sessionStorage to avoid conflicts
  try {
    sessionStorage.removeItem('navigatedFromSpace');
  } catch (e) {
    // Silent fallback
  }
  
  // Navigate using React Router
  navigate(profileUrl);
}

/**
 * Get back-to-space URL from current context
 */
export function getBackToSpaceUrl(): string | null {
  const spaceContext = getDisplaySpaceContext();
  if (spaceContext && spaceContext.subdomain) {
    return `/${spaceContext.subdomain}/space`;
  }
  return null;
}

/**
 * Check if we should show space context banner
 */
export function shouldShowSpaceContext(): boolean {
  const spaceContext = getDisplaySpaceContext();
  const isProfilePage = window.location.pathname.startsWith('/profile/');
  return isProfilePage && !!spaceContext && !!spaceContext.subdomain;
} 