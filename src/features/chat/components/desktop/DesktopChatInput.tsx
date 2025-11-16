import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowUp } from 'lucide-react';

/**
 * DesktopChatInput Component
 *
 * Desktop-optimized chat input with static positioning and keyboard shortcuts.
 * This component is DESKTOP-ONLY and contains NO mobile conditionals.
 *
 * Key Features:
 * - Static positioning (NO mobile-chat-input-overlay class)
 * - Enter key sends message, Shift+Enter creates newline
 * - 14px font size (desktop standard)
 * - Desktop hover states on buttons
 * - minHeight: 40px (desktop comfortable size)
 * - NO auto-focus after send (desktop pattern)
 * - Auto-expanding textarea with max height 120px
 *
 * Keyboard Shortcuts:
 * - Enter: Send message
 * - Shift+Enter: Create newline
 *
 * @param props - Chat input props
 */

interface DesktopChatInputProps {
  onSendMessage: (content: string) => void;
  sending: boolean;
  recipientName: string;
  disabled?: boolean;
}

export default function DesktopChatInput({
  onSendMessage,
  sending,
  recipientName,
  disabled
}: DesktopChatInputProps) {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Handle form submission
   * Sends message and resets input, NO auto-focus (desktop pattern)
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
      // NO auto-focus after send (desktop pattern - user may want to do other things)
    }
  };

  /**
   * Handle keyboard events
   * Desktop-specific: Enter sends message, Shift+Enter creates newline
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // Desktop: Enter sends, Shift+Enter creates new line
      if (!e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as React.FormEvent);
      }
      // Shift+Enter allows natural line breaks (no preventDefault)
    }
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

  // Auto-resize textarea when message changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  return (
    <form
      onSubmit={handleSubmit}
      className="px-2 py-1.5 bg-white dark:bg-gray-900 shadow-md flex items-center transition-all duration-200"
      style={{
        minHeight: 40, // Desktop size
        overflow: 'visible'
      }}
    >
      <div className="relative flex-1 flex items-center">
        <Textarea
          ref={inputRef}
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${recipientName}`}
          disabled={disabled || sending}
          className="w-full h-auto py-1.5 pl-2 pr-12 rounded-2xl bg-white dark:bg-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-0 focus:ring-offset-0 shadow-none border-none resize-none transition-all duration-200 overflow-y-hidden !min-h-0"
          autoComplete="off"
          rows={1}
          style={{
            fontSize: '14px', // Desktop font size
            lineHeight: '1.25rem', // 20px
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
