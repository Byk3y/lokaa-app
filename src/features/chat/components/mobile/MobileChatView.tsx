import { log } from '@/utils/logger';
import type { LegacyConversation } from '@/features/chat/types';
import { useChatLogic } from '@/features/chat/hooks/useChatLogic';
import { MessageList } from '@/features/chat/components/shared/MessageList';
import ChatHeader from '@/components/chat/ChatHeader';
import MobileChatInput from './MobileChatInput';

/**
 * MobileChatView Component
 *
 * Mobile-optimized chat view with fixed overlay input and 100dvh layout.
 * This component is MOBILE-ONLY and contains NO desktop conditionals.
 *
 * Key Features:
 * - 100dvh height container with overflow hidden
 * - Non-sticky header (mobile pattern)
 * - Messages container with 10rem bottom padding for input overlay
 * - MobileChatInput rendered as fixed overlay at bottom
 * - Uses shared useChatLogic hook for business logic
 * - Uses shared MessageList component for rendering
 *
 * CSS Classes:
 * - mobile-chat-view-simplified: 100dvh height, overflow hidden
 * - mobile-chat-messages-simplified: Mobile messages styling
 *
 * @param props - Chat view props
 */

interface MobileChatViewProps {
  conversation: LegacyConversation;
  onBack?: () => void;
  onClose?: () => void;
  onExpand?: () => void;
  isExpanded?: boolean;
  isFullScreen?: boolean;
  isModal?: boolean;
  onConversationUpdated?: () => void;
}

export default function MobileChatView({
  conversation: initialConversation,
  onBack,
  onClose,
  onExpand,
  isExpanded,
  isFullScreen = false,
  isModal: _isModal = false,
  onConversationUpdated
}: MobileChatViewProps) {
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
  log.debug('Component', '🗨️ [MobileChatView] Rendered with conversation:', {
    conversationId: initialConversation?.conversation_id,
    conversationName: initialConversation?.conversation_name,
    isGroup: initialConversation?.is_group,
    otherParticipants: initialConversation?.other_participants?.length || 0,
    shouldShowConnectionContext,
    user: user?.id,
    hasUser: !!user
  });

  return (
    <div
      className="flex flex-col bg-white dark:bg-gray-800 mobile-chat-view-simplified"
      style={{ height: '100dvh' }}
    >
      {/* Header - NO sticky positioning for mobile */}
      <div className="z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
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

      {/* Messages container with mobile padding for fixed input overlay */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 chat-messages-container mobile-chat-messages-simplified min-h-0"
        style={{
          paddingBottom: '10rem',
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

      {/* Mobile input as fixed overlay - NO wrapper div */}
      <MobileChatInput
        onSendMessage={handleSendMessage}
        sending={sending}
        recipientName={currentConversation.other_participants?.[0]?.full_name || currentConversation.conversation_name || 'user'}
        disabled={isLoading}
      />
    </div>
  );
}
