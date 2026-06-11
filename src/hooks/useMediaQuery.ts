import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  // Initialize synchronously from the current match so the first render is already
  // correct (no desktop→mobile flash, and no stale value when the viewport changes).
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const listener = () => {
      setMatches(media.matches);
    };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
} 