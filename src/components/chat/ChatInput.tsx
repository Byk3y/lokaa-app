import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  sending: boolean;
  recipientName: string;
  disabled?: boolean;
}

export default function ChatInput({ onSendMessage, sending, recipientName, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = message.trim();
    if (trimmedMessage && !sending) {
      onSendMessage(trimmedMessage);
      setMessage('');
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };
  
  const handleAttachmentClick = () => {
    toast({
      title: "Attachments",
      description: "File attachments are not yet implemented.",
      variant: "default",
    });
  };
  
  return (
    <form onSubmit={handleSubmit} className="px-2 py-2 bg-white dark:bg-gray-900 shadow-md rounded-t-none rounded-b-2xl flex items-center" style={{minHeight: 64}}>
      <div className="relative flex-1 flex items-center">
        <Textarea
          ref={inputRef}
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${recipientName}`}
          disabled={disabled || sending}
          className="w-full h-12 pl-4 pr-36 rounded-2xl bg-white dark:bg-gray-900 text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-none border-none resize-none"
          autoComplete="off"
          rows={1}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
          <button type="button" className="p-1 hover:bg-gray-100 rounded-full" tabIndex={-1} disabled={disabled} onClick={handleAttachmentClick}>
            <Paperclip className="h-5 w-5 text-gray-500" />
          </button>
          <Button 
            type="submit" 
            size="icon" 
            className="h-8 w-8 rounded-full bg-teal-500 hover:bg-teal-600"
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