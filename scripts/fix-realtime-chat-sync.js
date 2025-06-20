#!/usr/bin/env node

/**
 * Real-time Chat Sync Investigation & Fix
 * 
 * Investigates and fixes:
 * 1. New messages appearing in chat view but not chat list
 * 2. Read status not syncing between chat view and chat list
 * 3. Real-time subscription disconnects
 * 4. Conversation list not updating when new messages arrive
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createRealtimeSyncFixScript() {
  console.log('🔄 [RealtimeSyncFix] Creating comprehensive real-time sync fix script...');
  
  const realtimeSyncScript = `
// Real-time Chat Sync Investigation & Fix
// Addresses chat view vs chat list real-time sync issues

(function() {
  console.log('🔄 [RealtimeSyncFix] Starting real-time chat sync investigation...');
  
  // Global state for monitoring
  window.realtimeSyncMonitor = {
    subscriptions: [],
    messageUpdates: [],
    conversationUpdates: [],
    readStatusUpdates: [],
    lastMessageSent: null,
    lastReadUpdate: null
  };
  
  // Step 1: Enhanced Real-time Subscription for Conversation Updates
  async function setupEnhancedRealtimeSync() {
    console.log('🔧 [Fix] Setting up enhanced real-time sync...');
    
    if (!window.supabase) {
      console.error('❌ Supabase client not available');
      return false;
    }
    
    try {
      // Get current user
      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) {
        console.error('❌ No authenticated user');
        return false;
      }
      
      console.log('👤 Setting up real-time sync for user:', user.id);
      
      // Create comprehensive real-time subscription
      const syncChannel = window.supabase
        .channel('comprehensive-chat-sync')
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages'
          },
          async (payload) => {
            console.log('📨 [Realtime] New message detected:', payload.new);
            
            const newMessage = payload.new;
            const conversationId = newMessage.conversation_id;
            
            // Update conversation's last_message_at immediately
            await updateConversationTimestamp(conversationId, newMessage.created_at);
            
            // Force conversation list refresh
            setTimeout(() => {
              forceConversationListRefresh();
              updateUnreadCounts();
            }, 500);
            
            window.realtimeSyncMonitor.messageUpdates.push({
              timestamp: Date.now(),
              message: newMessage,
              conversationId
            });
          }
        )
        .on('postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chat_participants',
            filter: \`user_id=eq.\${user.id}\`
          },
          (payload) => {
            console.log('👁️ [Realtime] Read status updated:', payload.new);
            
            const participant = payload.new;
            updateReadStatus(participant.conversation_id, participant.last_read_at);
            
            setTimeout(() => {
              updateUnreadCounts();
              forceConversationListRefresh();
            }, 200);
            
            window.realtimeSyncMonitor.readStatusUpdates.push({
              timestamp: Date.now(),
              participant
            });
          }
        )
        .subscribe();
        
      window.realtimeSyncMonitor.subscriptions.push(syncChannel);
      console.log('✅ Enhanced real-time sync subscription created');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to setup enhanced real-time sync:', error);
      return false;
    }
  }
  
  // Step 2: Update Conversation Timestamp
  async function updateConversationTimestamp(conversationId, messageTime) {
    console.log(\`🕒 [Update] Updating conversation timestamp: \${conversationId}\`);
    
    // Update conversation store
    if (window.useConversationStore) {
      try {
        const store = window.useConversationStore;
        const currentState = store.getState();
        
        const updatedConversations = currentState.conversations.map(conv => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              last_message_at: messageTime,
              updated_at: messageTime
            };
          }
          return conv;
        });
        
        // Re-sort by latest message
        updatedConversations.sort((a, b) => 
          new Date(b.last_message_at) - new Date(a.last_message_at)
        );
        
        store.setState({
          ...currentState,
          conversations: updatedConversations,
          lastUpdate: Date.now()
        });
        
        console.log('✅ Updated conversation store timestamp');
      } catch (e) {
        console.warn('⚠️ Could not update conversation store:', e);
      }
    }
    
    // Update main chat store
    if (window.useChatStore) {
      try {
        const store = window.useChatStore;
        const currentState = store.getState();
        
        const updatedConversations = currentState.conversations.map(conv => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              last_message_at: messageTime,
              updated_at: messageTime
            };
          }
          return conv;
        });
        
        // Re-sort by latest message
        updatedConversations.sort((a, b) => 
          new Date(b.last_message_at) - new Date(a.last_message_at)
        );
        
        store.setState({
          ...currentState,
          conversations: updatedConversations,
          lastUpdate: Date.now()
        });
        
        console.log('✅ Updated main chat store timestamp');
      } catch (e) {
        console.warn('⚠️ Could not update main chat store:', e);
      }
    }
  }
  
  // Step 3: Update Read Status
  function updateReadStatus(conversationId, lastReadAt) {
    console.log(\`👁️ [ReadStatus] Updating read status: \${conversationId}\`);
    
    // Update conversation store read status
    if (window.useConversationStore) {
      try {
        const store = window.useConversationStore;
        const currentState = store.getState();
        
        const updatedConversations = currentState.conversations.map(conv => {
          if (conv.id === conversationId) {
            const isUnread = lastReadAt ? 
              new Date(lastReadAt) < new Date(conv.last_message_at) : 
              true;
            
            return {
              ...conv,
              lastReadAt: lastReadAt,
              isUnread: isUnread
            };
          }
          return conv;
        });
        
        store.setState({
          ...currentState,
          conversations: updatedConversations,
          lastReadUpdate: Date.now()
        });
        
        console.log('✅ Updated conversation store read status');
      } catch (e) {
        console.warn('⚠️ Could not update read status:', e);
      }
    }
  }
  
  // Step 4: Force Conversation List Refresh
  function forceConversationListRefresh() {
    console.log('🔄 [Refresh] Forcing conversation list refresh...');
    
    // Dispatch multiple refresh events
    const refreshEvents = [
      'conversations-updated',
      'chat-list-refresh', 
      'conversation-order-changed',
      'realtime-sync-update'
    ];
    
    refreshEvents.forEach(eventName => {
      window.dispatchEvent(new CustomEvent(eventName, {
        detail: { 
          timestamp: Date.now(), 
          source: 'realtime-sync-fix',
          type: 'conversation-list-refresh'
        }
      }));
    });
    
    // Force DOM refresh of chat list elements
    const chatListSelectors = [
      '.chat-list',
      '[data-testid="chat-list"]',
      '.conversation-list',
      '.chat-sidebar',
      '[class*="chat"]'
    ];
    
    chatListSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        // Trigger re-render by subtle DOM manipulation
        const originalTransform = element.style.transform;
        element.style.transform = 'translateZ(0)';
        element.offsetHeight; // Force reflow
        element.style.transform = originalTransform;
      });
    });
    
    console.log('✅ Conversation list refresh triggered');
  }
  
  // Step 5: Update Unread Counts
  function updateUnreadCounts() {
    console.log('🔢 [Unread] Updating unread counts...');
    
    let totalUnread = 0;
    
    // Calculate from conversation store
    if (window.useConversationStore) {
      try {
        const conversations = window.useConversationStore.getState().conversations;
        totalUnread = conversations.filter(conv => conv.isUnread).length;
        console.log(\`📊 Total unread conversations: \${totalUnread}\`);
      } catch (e) {
        console.warn('⚠️ Could not calculate unread count:', e);
      }
    }
    
    // Update chat button badges
    const chatButtonSelectors = [
      '.chat-button',
      '[data-testid="chat-button"]', 
      '[class*="chat-button"]'
    ];
    
    chatButtonSelectors.forEach(selector => {
      const buttons = document.querySelectorAll(selector);
      buttons.forEach(button => {
        const badges = button.querySelectorAll('.unread-count, .chat-badge, .badge, [class*="unread"]');
        badges.forEach(badge => {
          if (totalUnread > 0) {
            badge.textContent = totalUnread.toString();
            badge.style.display = 'flex';
            badge.style.visibility = 'visible';
          } else {
            badge.style.display = 'none';
            badge.style.visibility = 'hidden';
          }
        });
      });
    });
    
    // Update individual conversation badges
    const conversationItems = document.querySelectorAll('[data-conversation-id]');
    conversationItems.forEach(item => {
      const conversationId = item.getAttribute('data-conversation-id');
      if (conversationId && window.useConversationStore) {
        try {
          const conversation = window.useConversationStore.getState()
            .conversations.find(c => c.id === conversationId);
          
          const badges = item.querySelectorAll('.unread-indicator, .unread-badge, [class*="unread"]');
          badges.forEach(badge => {
            if (conversation && conversation.isUnread) {
              badge.style.display = 'block';
              badge.style.visibility = 'visible';
            } else {
              badge.style.display = 'none';
              badge.style.visibility = 'hidden';
            }
          });
        } catch (e) {
          console.warn('⚠️ Could not update conversation badge:', e);
        }
      }
    });
    
    console.log(\`✅ Updated unread counts: \${totalUnread}\`);
  }
  
  // Step 6: Auto-mark as read when viewing
  function setupAutoMarkAsRead() {
    console.log('👁️ [AutoRead] Setting up auto-mark-as-read...');
    
    let currentConversationId = null;
    let readTimer = null;
    
    function checkAndMarkAsRead() {
      // Extract conversation ID from URL
      const url = window.location.href;
      let conversationId = null;
      
      const urlMatch = url.match(/[?&]id=([^&]+)/);
      if (urlMatch) {
        conversationId = urlMatch[1];
      }
      
      // Extract from DOM if not in URL
      if (!conversationId) {
        const chatView = document.querySelector('[data-conversation-id]');
        if (chatView) {
          conversationId = chatView.getAttribute('data-conversation-id');
        }
      }
      
      if (conversationId && conversationId !== currentConversationId) {
        // Clear previous timer
        if (readTimer) {
          clearTimeout(readTimer);
        }
        
        currentConversationId = conversationId;
        console.log(\`👁️ [AutoRead] Now viewing conversation: \${conversationId}\`);
        
        // Mark as read after 3 seconds of viewing
        readTimer = setTimeout(async () => {
          if (currentConversationId === conversationId && window.supabase) {
            try {
              const { data: { user } } = await window.supabase.auth.getUser();
              if (user) {
                const { error } = await window.supabase
                  .from('chat_participants')
                  .update({ last_read_at: new Date().toISOString() })
                  .eq('conversation_id', conversationId)
                  .eq('user_id', user.id);
                  
                if (!error) {
                  console.log(\`✅ [AutoRead] Marked as read: \${conversationId}\`);
                  
                  // Update local read status immediately
                  updateReadStatus(conversationId, new Date().toISOString());
                  
                  // Update UI
                  setTimeout(() => {
                    updateUnreadCounts();
                    forceConversationListRefresh();
                  }, 100);
                } else {
                  console.error('❌ [AutoRead] Failed to mark as read:', error);
                }
              }
            } catch (error) {
              console.error('❌ [AutoRead] Error:', error);
            }
          }
        }, 3000);
      }
    }
    
    // Monitor for conversation changes
    let lastUrl = window.location.href;
    const urlCheckInterval = setInterval(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        checkAndMarkAsRead();
      }
    }, 1000);
    
    // Monitor DOM changes
    const observer = new MutationObserver(() => {
      checkAndMarkAsRead();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-conversation-id']
    });
    
    // Initial check
    checkAndMarkAsRead();
    
    console.log('✅ Auto-mark-as-read enabled');
    
    return { urlCheckInterval, observer };
  }
  
  // Step 7: Periodic sync verification
  function setupPeriodicSyncVerification() {
    console.log('🔍 [Verification] Setting up periodic sync verification...');
    
    const verificationInterval = setInterval(async () => {
      if (!window.supabase) return;
      
      try {
        // Get fresh conversation data from database
        const { data: { user } } = await window.supabase.auth.getUser();
        if (!user) return;
        
        const { data: freshConversations } = await window.supabase
          .from('chat_conversations')
          .select(\`
            id,
            last_message_at,
            chat_participants!inner (
              user_id,
              last_read_at
            )
          \`)
          .eq('chat_participants.user_id', user.id)
          .order('last_message_at', { ascending: false })
          .limit(5);
        
        if (freshConversations && window.useConversationStore) {
          const localConversations = window.useConversationStore.getState().conversations;
          
          // Check for timestamp mismatches
          freshConversations.forEach(freshConv => {
            const localConv = localConversations.find(c => c.id === freshConv.id);
            if (localConv) {
              const freshTime = new Date(freshConv.last_message_at);
              const localTime = new Date(localConv.last_message_at);
              
              if (Math.abs(freshTime - localTime) > 5000) { // 5 second tolerance
                console.log(\`⚠️ [Verification] Timestamp mismatch detected for \${freshConv.id}\`);
                console.log(\`Database: \${freshConv.last_message_at}, Local: \${localConv.last_message_at}\`);
                
                // Force sync this conversation
                updateConversationTimestamp(freshConv.id, freshConv.last_message_at);
                
                setTimeout(() => {
                  forceConversationListRefresh();
                }, 500);
              }
            }
          });
        }
      } catch (error) {
        console.warn('⚠️ [Verification] Sync verification error:', error);
      }
    }, 30000); // Check every 30 seconds
    
    console.log('✅ Periodic sync verification enabled');
    return verificationInterval;
  }
  
  // Main execution
  async function runRealtimeSyncFix() {
    console.log('🚀 Starting comprehensive real-time sync fix...');
    
    // Setup enhanced real-time sync
    const realtimeSyncEnabled = await setupEnhancedRealtimeSync();
    
    // Setup auto-mark-as-read
    const autoReadHandlers = setupAutoMarkAsRead();
    
    // Setup periodic verification
    const verificationInterval = setupPeriodicSyncVerification();
    
    // Initial refresh
    forceConversationListRefresh();
    updateUnreadCounts();
    
    const report = {
      timestamp: new Date().toISOString(),
      fixes: {
        enhancedRealtimeSync: realtimeSyncEnabled,
        autoMarkAsRead: !!autoReadHandlers,
        periodicVerification: !!verificationInterval
      },
      monitoring: {
        subscriptions: window.realtimeSyncMonitor.subscriptions.length,
        messageUpdates: window.realtimeSyncMonitor.messageUpdates.length,
        readStatusUpdates: window.realtimeSyncMonitor.readStatusUpdates.length
      }
    };
    
    window.realtimeSyncFixReport = report;
    
    console.log('📋 Real-time sync fix completed!');
    console.log('✅ Enhanced real-time subscriptions active');
    console.log('👁️ Auto-mark-as-read enabled');
    console.log('🔍 Periodic sync verification running');
    console.log('📊 Check window.realtimeSyncFixReport for details');
    console.log('📈 Monitor window.realtimeSyncMonitor for live updates');
    
    return report;
  }
  
  // Run the fix immediately
  runRealtimeSyncFix().catch(error => {
    console.error('❌ Real-time sync fix failed:', error);
  });
  
})();
`;

  const scriptPath = path.join(__dirname, '../public/realtime-sync-fix.js');
  fs.writeFileSync(scriptPath, realtimeSyncScript);
  console.log('✅ Created real-time sync fix script');
  
  return scriptPath;
}

function addRealtimeSyncFixToIndex() {
  console.log('📝 [RealtimeSyncFix] Adding real-time sync fix to index.html...');
  
  const indexPath = path.join(__dirname, '../index.html');
  
  if (fs.existsSync(indexPath)) {
    let content = fs.readFileSync(indexPath, 'utf8');
    
    // Remove existing scripts
    content = content.replace(/\s*<script src="\/chat-sync-investigation\.js"><\/script>\n?/g, '');
    content = content.replace(/\s*<script src="\/realtime-sync-fix\.js"><\/script>\n?/g, '');
    
    // Add the real-time sync fix script
    const scriptTag = '    <script src="/realtime-sync-fix.js"></script>\n</head>';
    content = content.replace('</head>', scriptTag);
    
    fs.writeFileSync(indexPath, content);
    console.log('✅ Added real-time sync fix to HTML');
  }
}

// Execute the real-time sync fix setup
console.log('🔄 [RealtimeSyncFix] Setting up comprehensive real-time sync fix...');

try {
  const scriptPath = createRealtimeSyncFixScript();
  addRealtimeSyncFixToIndex();
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ [RealtimeSyncFix] Real-time sync fix deployed');
  console.log('');
  console.log('🔄 This will automatically:');
  console.log('1. Monitor real-time message flow and fix sync breaks');
  console.log('2. Fix conversation list not updating when messages arrive');
  console.log('3. Fix read status not syncing between chat view and list');
  console.log('4. Enhanced real-time subscriptions with immediate updates');
  console.log('5. Auto-mark conversations as read when viewing (3s delay)');
  console.log('6. Periodic sync verification to catch missed updates');
  console.log('7. Force conversation list refresh and unread count updates');
  console.log('');
  console.log('📊 Next step: Refresh your browser');
  console.log('🔄 The fix will run automatically on page load');
  console.log('📋 Check browser console for real-time sync monitoring');
  console.log('🐛 Access window.realtimeSyncFixReport for diagnostics');
  console.log('👁️ Monitor window.realtimeSyncMonitor for live message flow');
  console.log('');
  
} catch (error) {
  console.error('❌ [RealtimeSyncFix] Failed:', error);
  process.exit(1);
} 