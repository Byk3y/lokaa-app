import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowUp } from 'lucide-react';

/**
 * MobileChatInput Component
 *
 * Mobile-optimized chat input with fixed overlay positioning and mobile-specific behavior.
 * This component is MOBILE-ONLY and contains NO desktop conditionals.
 *
 * Key Features:
 * - Fixed overlay positioning using mobile-chat-input-overlay CSS class
 * - Enter key ALWAYS creates newline (no keyboard send shortcut)
 * - Send button only (no keyboard shortcuts)
 * - 16px font size to prevent iOS zoom
 * - Touch-optimized with touchAction: 'manipulation'
 * - Auto-focus after send for continuous typing
 * - Auto-expanding textarea with max height 120px
 * - Safe area insets for notched devices
 *
 * CSS Classes:
 * - mobile-chat-input-overlay: Fixed position at bottom: 4rem, z-index: 100
 *
 * @param props - Chat input props
 */

interface MobileChatInputProps {
  onSendMessage: (content: string) => void;
  sending: boolean;
  recipientName: string;
  disabled?: boolean;
}

export default function MobileChatInput({
  onSendMessage,
  sending,
  recipientName,
  disabled
}: MobileChatInputProps) {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Handle form submission
   * Sends message and resets input, maintaining focus for continuous typing
   */
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
      // Keep focus on input after sending for continuous typing
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  /**
   * Handle keyboard events
   * Mobile-specific: Enter key ALWAYS creates newline, no keyboard send shortcut
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Mobile: Enter always creates new line, never sends
    // Allow natural line break behavior (no preventDefault)
    // Send is ONLY via button tap
  };

  /**
   * Auto-resize textarea as content changes
   * Max height: 120px (about 5-6 lines)
   */
  const adjustTextareaHeight = () => {
    if (inputRef.current) {
      // Reset height to auto to get the correct scrollHeight
      inputRef.current.style.height = 'auto';
      // Set height to scrollHeight, but cap it at 120px
      const maxHeight = 120;
      const newHeight = Math.min(inputRef.current.scrollHeight, maxHeight);
      inputRef.current.style.height = `${newHeight}px`;
    }
  };

  /**
   * Handle input focus
   * Input is fixed overlay, mobile keyboard adjusts viewport automatically
   */
  const handleFocus = () => {
    setIsFocused(true);
  };

  /**
   * Handle input blur
   */
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
      className={`px-2 py-1.5 bg-white dark:bg-gray-900 shadow-md flex items-center transition-all duration-200 mobile-chat-input-overlay ${
        isFocused ? 'shadow-lg' : ''
      }`}
      style={{
        minHeight: 52,
        touchAction: 'manipulation',
        overflow: 'visible',
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
          className="w-full h-auto py-1.5 pl-2 pr-12 rounded-2xl bg-white dark:bg-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-0 focus:ring-offset-0 shadow-none border-none resize-none transition-all duration-200 overflow-y-hidden !min-h-0"
          autoComplete="off"
          rows={1}
          style={{
            fontSize: '16px', // Prevent iOS zoom
            lineHeight: '1.25rem', // 20px
            touchAction: 'manipulation',
            minHeight: '28px',
            maxHeight: '120px',
            overflow: 'auto',
            outline: 'none',
            boxShadow: 'none',
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
