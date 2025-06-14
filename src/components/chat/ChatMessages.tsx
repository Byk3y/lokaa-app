import React, { useRef } from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';
import { format, parseISO, isSameDay } from 'date-fns';
import ChatMessageItem from './ChatMessageItem';

interface Sender {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  is_edited?: boolean;
  attachment_url?: string | null;
  attachment_type?: string | null;
  sender?: Sender;
  message_type?: 'user' | 'system' | 'icebreaker';
}

interface ChatMessagesProps {
  messages: Message[];
  loading: boolean;
  currentUserId: string | undefined;
  messageEndRef: React.RefObject<HTMLDivElement>;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ 
  messages, 
  loading, 
  currentUserId,
  messageEndRef 
}) => {

  const renderMessagesWithSeparators = () => {
    const messageElements: React.ReactNode[] = [];
    let lastDate: string | null = null;

    messages.forEach((message, index) => {
      const messageDate = parseISO(message.created_at);
      const currentDateString = format(messageDate, 'MMM do, yyyy');

      if (lastDate !== currentDateString) {
        messageElements.push(
          <div 
            key={`date-${currentDateString}`}
            className="relative text-center my-4">
            <span className="px-2.5 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-full shadow-sm">
              {currentDateString}
            </span>
          </div>
        );
        lastDate = currentDateString;
      }

      if (message.message_type === 'icebreaker') {
        messageElements.push(
          <div key={`${message.id}-icebreaker`} className="text-center text-xs text-gray-500 dark:text-gray-400 py-2 my-1 italic">
            {message.content}
          </div>
        );
      }

      const prevMessage = messages[index - 1];
      const nextMessage = messages[index + 1];
      
      const isFirstInSequence = !prevMessage || 
                               prevMessage.sender_id !== message.sender_id || 
                               !isSameDay(parseISO(prevMessage.created_at), messageDate) ||
                               prevMessage.message_type !== message.message_type;
                               
      const isLastInSequence = !nextMessage || 
                              nextMessage.sender_id !== message.sender_id || 
                              !isSameDay(parseISO(nextMessage.created_at), messageDate) ||
                              nextMessage.message_type !== message.message_type;
      
      const hasSpecialStatus = message.sender?.id === 'kia_ghasem_id';

      messageElements.push(
        <ChatMessageItem 
          key={message.id} 
          message={message} 
          currentUserId={currentUserId}
          isFirstInSequence={isFirstInSequence}
          isLastInSequence={isLastInSequence}
          hasSpecialStatus={hasSpecialStatus}
        />
      );
    });
    
    return messageElements;
  };

  return (
    <div className="px-2 sm:px-3 py-2 bg-white dark:bg-gray-850">
      {loading && messages.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-full py-8">
          <Loader2 className="h-6 w-6 text-gray-400 dark:text-gray-500 animate-spin mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
            Loading messages...
          </p>
        </div>
      ) : !loading && messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 py-8">
          <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 mb-3">
            <MessageSquare className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="font-semibold text-base text-gray-700 dark:text-gray-200">No messages yet</h3>
          <p className="text-xs mt-1">Send a message to start the conversation.</p>
        </div>
      ) : (
        <div className="pb-2">
          {renderMessagesWithSeparators()}
          <div ref={messageEndRef} />
        </div>
      )}
    </div>
  );
};

export default ChatMessages; 