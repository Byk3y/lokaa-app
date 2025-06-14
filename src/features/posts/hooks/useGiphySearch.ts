import { useState, useRef, useEffect } from 'react';
import { Attachment } from '../types';
import { fetchGifs, fetchGifsByCategory, GIF_CATEGORIES } from '../utils/giphyUtils';

interface UseGiphySearchProps {
  onGifSelected: (gif: any) => void;
  onGifSelectedForContent?: (gifUrl: string) => void;
  disableOutsideClose?: boolean;
}

/**
 * Custom hook to manage Giphy search functionality
 */
export function useGiphySearch({ onGifSelected, onGifSelectedForContent, disableOutsideClose }: UseGiphySearchProps) {
  const [showGiphySearch, setShowGiphySearch] = useState(false);
  const [giphySearchTerm, setGiphySearchTerm] = useState('');
  const [activeGifCategory, setActiveGifCategory] = useState('trending');
  const [isContentGif, setIsContentGif] = useState(false);
  const giphyContainerRef = useRef<HTMLDivElement>(null);
  
  // Close Giphy search on click outside
  useEffect(() => {
    if (disableOutsideClose) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        giphyContainerRef.current && 
        !giphyContainerRef.current.contains(event.target as Node)
      ) {
        setShowGiphySearch(false);
      }
    }
    
    if (showGiphySearch) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showGiphySearch, disableOutsideClose]);
  
  // Function to fetch GIFs for search
  const fetchGifsForSearch = (offset: number) => {
    return fetchGifs(giphySearchTerm, offset);
  };
  
  // Function to fetch GIFs by category
  const fetchGifsForCategory = (category: string, offset: number = 0) => {
    setActiveGifCategory(category);
    return fetchGifsByCategory(category, offset);
  };
  
  // Handle GIF selection
  const handleGifSelected = (gif: any, e?: any) => {
    if (isContentGif && onGifSelectedForContent) {
      const fixedSizeGifUrl = gif.images.fixed_width.url;
      onGifSelectedForContent(fixedSizeGifUrl);
    } else {
      onGifSelected(gif);
    }
    setShowGiphySearch(false);
    setIsContentGif(false);
  };
  
  // Toggle Giphy search for attachments
  const toggleGiphySearch = () => {
    setIsContentGif(false);
    setShowGiphySearch(prev => !prev);
  };
  
  // Open Giphy search specifically for content insertion
  const openGiphySearchForContent = () => {
    if (onGifSelectedForContent) {
      setIsContentGif(true);
      setShowGiphySearch(true);
    }
  };
  
  return {
    showGiphySearch,
    setShowGiphySearch,
    giphySearchTerm,
    setGiphySearchTerm,
    activeGifCategory,
    setActiveGifCategory,
    giphyContainerRef,
    gifCategories: GIF_CATEGORIES,
    fetchGifsForSearch,
    fetchGifsForCategory,
    handleGifSelected,
    toggleGiphySearch,
    openGiphySearchForContent,
    isContentGif
  };
} 