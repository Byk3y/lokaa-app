import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import ChatContainer from './ChatContainer';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConversationId?: string;
}

export default function ChatModal({ isOpen, onClose, initialConversationId }: ChatModalProps) {
  const isMobile = useMediaQuery("(max-width: 640px)");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={cn(
          "p-0 overflow-hidden flex flex-col shadow-xl transition-all duration-300",
          isMobile 
            ? "w-screen h-screen max-w-full max-h-full rounded-none" 
            : isExpanded
              ? "max-w-5xl w-full h-[80vh] sm:rounded-lg"
              : "max-w-2xl w-full h-[600px] sm:rounded-lg"
        )}
        hideCloseButton={true}
        onEscapeKeyDown={onClose}
      >
        <VisuallyHidden>
          <DialogTitle>Chat</DialogTitle>
          <DialogDescription>
            Chat conversation interface
        </DialogDescription>
        </VisuallyHidden>
        <ChatContainer 
          initialConversationId={initialConversationId} 
          isModal={true} 
          onClose={onClose}
          onExpand={handleExpand}
                    isExpanded={isExpanded}
        />
      </DialogContent>
    </Dialog>
  );
} 