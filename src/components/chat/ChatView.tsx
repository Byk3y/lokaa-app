import { useMediaQuery } from '@/hooks/useMediaQuery';
import MobileChatView from '@/features/chat/components/mobile/MobileChatView';
import DesktopChatView from '@/features/chat/components/desktop/DesktopChatView';
import type { LegacyConversation } from '@/features/chat/types';

/**
 * ChatView Router Component
 *
 * This component acts as a router that conditionally renders platform-specific
 * chat views based on screen size. It maintains backward compatibility with the
 * unified ChatView API while delegating implementation to specialized components.
 *
 * **Routing Logic:**
 * - Mobile (viewport ≤ 640px): Renders MobileChatView
 *   - Fixed overlay input above bottom navigation
 *   - 100dvh height with non-sticky header
 *   - Enter key creates newlines, send button only
 *
 * - Desktop (viewport > 640px): Renders DesktopChatView
 *   - Static input in wrapper with border-top
 *   - Flexible height with sticky header
 *   - Enter sends message, Shift+Enter creates newlines
 *
 * **Architecture:**
 * All business logic is handled by the shared `useChatLogic` hook, and message
 * rendering is handled by the shared `MessageList` component. This router only
 * makes the platform selection decision.
 *
 * @param props - Chat view props passed through to platform-specific components
 */

interface ChatViewProps {
  conversation: LegacyConversation;
  onBack?: () => void;
  onClose?: () => void;
  onExpand?: () => void;
  isExpanded?: boolean;
  isFullScreen?: boolean;
  isModal?: boolean;
  onConversationUpdated?: () => void;
}

export default function ChatView(props: ChatViewProps) {
  const isMobile = useMediaQuery("(max-width: 640px)");

  return isMobile ? (
    <MobileChatView {...props} />
  ) : (
    <DesktopChatView {...props} />
  );
}
