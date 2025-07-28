import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  sending: boolean;
  recipientName: string;
  disabled?: boolean;
}

export default function ChatInput({ onSendMessage, sending, recipientName, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const isMobile = useMediaQuery("(max-width: 640px)");
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = message.trim();
    if (trimmedMessage && !sending) {
      onSendMessage(trimmedMessage);
      setMessage('');
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
      e.preventDefault();
      handleSubmit(e as React.FormEvent);
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
  
  const handleAttachmentClick = () => {
    toast({
      title: "Attachments",
      description: "File attachments are not yet implemented.",
      variant: "default",
    });
  };
  
  return (
    <form 
      onSubmit={handleSubmit} 
      className={`px-2 py-2 bg-white dark:bg-gray-900 shadow-md flex items-center transition-all duration-200 ${
        isFocused && isMobile ? 'shadow-lg' : ''
      } ${isMobile ? 'mobile-chat-input-overlay' : 'rounded-t-none rounded-b-2xl'}`} 
      style={{
        minHeight: isMobile ? 60 : 32, // Appropriate height for mobile
        touchAction: 'manipulation', // Allow touch but prevent unwanted scrolling
        overflow: 'hidden',    // Ensure no overflow
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
          className={`w-full h-auto py-1.5 pl-3 pr-20 rounded-2xl bg-white dark:bg-gray-900 text-base placeholder-gray-400 focus:outline-none focus:ring-0 shadow-none border-none resize-none transition-all duration-200 overflow-y-hidden`}
          autoComplete="off"
          rows={1}
          style={{
            // Prevent zoom on iOS
            fontSize: isMobile ? '16px' : '14px',
            lineHeight: '1.25rem', // 20px
            touchAction: 'manipulation', // Prevent scrolling on textarea
          }}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
          <button 
            type="button" 
            className="p-1 hover:bg-gray-100 rounded-full transition-colors" 
            tabIndex={-1} 
            disabled={disabled} 
            onClick={handleAttachmentClick}
          >
            <Paperclip className="h-5 w-5 text-gray-500" />
          </button>
          <Button 
            type="submit" 
            size="icon" 
            className="h-7 w-7 rounded-full bg-teal-500 hover:bg-teal-600 transition-colors"
            disabled={disabled || sending || !message.trim()}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}