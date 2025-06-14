import { useState, useRef, useEffect } from 'react';

interface UseEmojiPickerProps {
  onEmojiSelect: (emoji: any) => void;
}

/**
 * Custom hook to manage the emoji picker functionality
 */
export function useEmojiPicker({ onEmojiSelect }: UseEmojiPickerProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  
  // Handle emoji selection
  const handleEmojiSelect = (emoji: any) => {
    onEmojiSelect(emoji);
  };
  
  // Toggle emoji picker visibility
  const toggleEmojiPicker = () => {
    setShowEmojiPicker(prev => !prev);
  };
  
  return {
    showEmojiPicker,
    setShowEmojiPicker,
    emojiPickerRef,
    handleEmojiSelect,
    toggleEmojiPicker
  };
} 