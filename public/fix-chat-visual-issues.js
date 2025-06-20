/**
 * 🚀 CHAT VISUAL ISSUES FIX
 * 
 * This script fixes the visual regression caused by avatar optimization:
 * 1. Icon size reduced from h-12 w-12 to h-8 w-8
 * 2. Text too close to icons
 * 3. Poor visual hierarchy between name and last message
 */

console.log("🔧 Applying Chat Visual Issues Fix...");

// Fix function to run when DOM is ready
function fixChatVisualIssues() {
  // Find all chat avatar containers and fix sizing
  const chatAvatars = document.querySelectorAll('[class*="ChatAvatar"], .chat-avatar, [class*="chat-list-item"] img');
  
  chatAvatars.forEach(avatar => {
    // Ensure avatar is 48px (h-12 w-12)
    avatar.style.width = '48px';
    avatar.style.height = '48px';
    avatar.style.minWidth = '48px';
    avatar.style.minHeight = '48px';
    
    // Ensure proper margin
    const container = avatar.closest('[class*="flex"]');
    if (container) {
      avatar.style.marginRight = '12px'; // mr-3
    }
  });
  
  // Fix text spacing and hierarchy in chat list items
  const chatListItems = document.querySelectorAll('[class*="chat-list"], [class*="hover:bg-gray-50"]');
  
  chatListItems.forEach(item => {
    // Find name elements and ensure they're bold and properly sized
    const nameElements = item.querySelectorAll('p[class*="font-"]');
    if (nameElements.length >= 1) {
      const nameEl = nameElements[0];
      nameEl.style.fontSize = '14px'; // text-sm
      nameEl.style.fontWeight = '600'; // font-semibold
      nameEl.style.marginBottom = '2px'; // mb-1
    }
    
    // Find message preview and make it smaller and lighter
    if (nameElements.length >= 2) {
      const messageEl = nameElements[1];
      messageEl.style.fontSize = '12px'; // text-xs
      messageEl.style.fontWeight = '400'; // normal
      messageEl.style.color = '#6B7280'; // text-gray-500
    }
  });
  
  console.log("✅ Chat visual issues fixed!");
}

// Apply fix when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', fixChatVisualIssues);
} else {
  fixChatVisualIssues();
}

// Also apply fix when navigation happens (for SPA)
const observer = new MutationObserver(() => {
  fixChatVisualIssues();
});

observer.observe(document.body, { childList: true, subtree: true });

// Manual fix function
window.fixChatVisualIssues = fixChatVisualIssues;

console.log("🎯 Chat Visual Fix loaded! Run window.fixChatVisualIssues() to apply manually");
