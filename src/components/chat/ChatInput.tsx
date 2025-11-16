/**
 * @deprecated This unified ChatInput component is deprecated.
 * Use platform-specific components instead:
 * - Mobile: @/features/chat/components/mobile/MobileChatInput
 * - Desktop: @/features/chat/components/desktop/DesktopChatInput
 *
 * This file is kept for backward compatibility during transition.
 * New code should use the platform-specific components directly.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowUp } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  sending: boolean;
  recipientName: string;
  disabled?: boolean;
}

/**
 * @deprecated Use MobileChatInput or DesktopChatInput instead
 */
export default function ChatInput({ onSendMessage, sending, recipientName, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useMediaQuery("(max-width: 640px)");
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = message.trim();
    if (trimmedMessage && !sending) {
      onSendMessage(trimmedMessage);
      setMessage('');
      // Reset textarea height after sending
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
      // Keep focus on input after sending on mobile
      if (isMobile && inputRef.current) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (isMobile) {
        // On mobile: Enter always creates new line, never sends
        // Allow natural line break behavior (no preventDefault)
      } else {
        // On desktop: Enter sends, Shift+Enter creates new line
        if (!e.shiftKey) {
          e.preventDefault();
          handleSubmit(e as React.FormEvent);
        }
        // Shift+Enter allows natural line breaks (no preventDefault)
      }
    }
  };

  const adjustTextareaHeight = () => {
    if (inputRef.current) {
      // Reset height to auto to get the correct scrollHeight
      inputRef.current.style.height = 'auto';
      // Set height to scrollHeight, but cap it at 120px (about 5-6 lines)
      const maxHeight = 120;
      const newHeight = Math.min(inputRef.current.scrollHeight, maxHeight);
      inputRef.current.style.height = `${newHeight}px`;
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    
    // ✅ SKOOL-STYLE: Input is fixed overlay, no scrolling needed
    // Mobile keyboard will automatically adjust viewport, input stays above nav
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  // Auto-resize textarea when message changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);
  
  
  return (
    <form
      onSubmit={handleSubmit}
      className={`px-2 py-1.5 bg-white dark:bg-gray-900 shadow-md flex items-center transition-all duration-200 ${
        isFocused && isMobile ? 'shadow-lg' : ''
      } ${isMobile ? 'mobile-chat-input-overlay' : ''}`}
      style={{
        minHeight: isMobile ? 52 : 40, // Better balance - smaller than original but more comfortable
        touchAction: 'manipulation', // Allow touch but prevent unwanted scrolling
        overflow: 'visible',    // Allow content to expand
      }}
    >
      <div className="relative flex-1 flex items-center">
        <Textarea
          ref={inputRef}
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={`Message ${recipientName}`}
          disabled={disabled || sending}
          className={`w-full h-auto py-1.5 pl-2 pr-12 rounded-2xl bg-white dark:bg-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-0 focus:ring-offset-0 shadow-none border-none resize-none transition-all duration-200 overflow-y-hidden !min-h-0`}
          autoComplete="off"
          rows={1}
          style={{
            // Prevent zoom on iOS
            fontSize: isMobile ? '16px' : '14px',
            lineHeight: '1.25rem', // 20px
            touchAction: 'manipulation', // Prevent scrolling on textarea
            minHeight: '28px', // Better height - comfortable but not too large
            maxHeight: '120px', // Maximum height before scrolling
            overflow: 'auto', // Allow scrolling when max height reached
            outline: 'none', // Remove any outline
            boxShadow: 'none', // Remove any box shadow
          }}
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2">
          <Button 
            type="submit" 
            size="icon" 
            className="h-6 w-6 rounded-full bg-gray-600 hover:bg-gray-700 text-white transition-colors"
            disabled={disabled || sending || !message.trim()}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}