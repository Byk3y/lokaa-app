/**
 * Desktop Chat Components
 *
 * Desktop-optimized chat components with NO mobile conditionals.
 * These components implement desktop-specific behavior and styling.
 *
 * Key Desktop Features:
 * - Sticky header positioning
 * - Static input (no overlay)
 * - Enter sends, Shift+Enter newline
 * - 14px font size
 * - No auto-focus after send
 * - h-full min-h-0 container
 */

export { default as DesktopChatView } from './DesktopChatView';
export { default as DesktopChatInput } from './DesktopChatInput';
