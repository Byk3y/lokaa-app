import { log } from '@/utils/logger';
import type { LegacyConversation } from '@/features/chat/types';
import { useChatLogic } from '@/features/chat/hooks/useChatLogic';
import { MessageList } from '@/features/chat/components/shared/MessageList';
import ChatHeader from '@/components/chat/ChatHeader';
import DesktopChatInput from './DesktopChatInput';

/**
 * DesktopChatView Component
 *
 * Desktop-optimized chat view with sticky header and static input positioning.
 * This component is DESKTOP-ONLY and contains NO mobile conditionals.
 *
 * Key Features:
 * - h-full min-h-0 container (NOT 100dvh)
 * - Sticky header at top (desktop pattern)
 * - Messages container with standard padding (no mobile overlay padding)
 * - DesktopChatInput rendered in wrapper div with border-top
 * - Uses shared useChatLogic hook for business logic
 * - Uses shared MessageList component for rendering
 *
 * Desktop Behavior:
 * - Sticky header remains visible during scroll
 * - Input at bottom with border separator
 * - Enter key sends message
 * - Shift+Enter creates newline
 * - No auto-focus after send
 *
 * @param props - Chat view props
 */

interface DesktopChatViewProps {
  conversation: LegacyConversation;
  onBack?: () => void;
  onClose?: () => void;
  onExpand?: () => void;
  isExpanded?: boolean;
  isFullScreen?: boolean;
  isModal?: boolean;
  onConversationUpdated?: () => void;
}

export default function DesktopChatView({
  conversation: initialConversation,
  onBack,
  onClose,
  onExpand,
  isExpanded,
  isFullScreen = false,
  isModal: _isModal = false,
  onConversationUpdated
}: DesktopChatViewProps) {
  // Use the shared useChatLogic hook to handle all business logic
  const {
    messages,
    isLoading,
    sending,
    handleSendMessage,
    currentConversation,
    otherParticipant,
    shouldShowConnectionContext,
    isConnectionContextLoading,
    handleConnectionContextLoadingChange,
    messagesEndRef,
    messagesContainerRef,
    isInitialLoad,
    previousMessagesLength,
    hasScrolledToBottom,
    user
  } = useChatLogic(initialConversation, onConversationUpdated);

  // DEBUG: Log conversation data
  log.debug('Component', '🗨️ [DesktopChatView] Rendered with conversation:', {
    conversationId: initialConversation?.conversation_id,
    conversationName: initialConversation?.conversation_name,
    isGroup: initialConversation?.is_group,
    otherParticipants: initialConversation?.other_participants?.length || 0,
    shouldShowConnectionContext,
    user: user?.id,
    hasUser: !!user
  });

  return (
    <div className="flex flex-col bg-white dark:bg-gray-800 h-full min-h-0">
      {/* Header - STICKY for desktop */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <ChatHeader
          conversation={currentConversation}
          onBack={onBack}
          onClose={onClose}
          onExpand={onExpand}
          isExpanded={isExpanded}
          showBackButton={isFullScreen}
          showCloseButton={!!onClose}
        />
      </div>

      {/* Messages container - NO mobile padding */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 chat-messages-container min-h-0"
        style={{
          scrollBehavior: 'auto'
        }}
        data-chat-container="true"
      >
        <MessageList
          messages={messages}
          user={user}
          messagesEndRef={messagesEndRef}
          messagesContainerRef={messagesContainerRef}
          shouldShowConnectionContext={shouldShowConnectionContext}
          isConnectionContextLoading={isConnectionContextLoading}
          onConnectionContextLoadingChange={handleConnectionContextLoadingChange}
          otherParticipant={otherParticipant}
          isLoading={isLoading}
          isInitialLoad={isInitialLoad}
          previousMessagesLength={previousMessagesLength}
          hasScrolledToBottom={hasScrolledToBottom}
        />
      </div>

      {/* Desktop input in wrapper div with border */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
        <DesktopChatInput
          onSendMessage={handleSendMessage}
          sending={sending}
          recipientName={currentConversation.other_participants?.[0]?.full_name || currentConversation.conversation_name || 'user'}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}
