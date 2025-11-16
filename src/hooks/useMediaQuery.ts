import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  // ✅ OPTIMAL: Set initial state synchronously to prevent flash and unnecessary re-renders
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    // ✅ OPTIMAL: Only depend on query, not matches - prevents infinite re-render loop
    const media = window.matchMedia(query);
    
    // ✅ OPTIMAL: Use functional setState to avoid stale closure issues
    // Only update if value actually changed to prevent unnecessary re-renders
    setMatches(prevMatches => {
      if (prevMatches !== media.matches) {
        return media.matches;
      }
      return prevMatches; // Return same reference to prevent re-render
    });
    
    // ✅ OPTIMAL: Event listener handles future media query changes
    // Listener has 'media' in closure, so it always references the correct MediaQueryList
    const listener = () => {
      setMatches(prevMatches => {
        // Use functional setState to read latest value and only update if changed
        if (prevMatches !== media.matches) {
          return media.matches;
        }
        return prevMatches;
      });
    };
    
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]); // ✅ OPTIMAL: Only re-run when query changes

  return matches;
} 