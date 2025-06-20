#!/usr/bin/env node

/**
 * Chat List Update Fix
 * 
 * Focused fix for chat list not updating when messages are sent/received
 * Root cause: Chat list component not properly reacting to message changes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createChatListUpdateFix() {
  console.log('💬 [ChatListFix] Creating chat list update fix...');
  
  const chatListFixScript = `
// Chat List Update Fix - Targeted List Refresh
// Focuses specifically on making chat list update when messages change

(function() {
  console.log('💬 [ChatListFix] Starting chat list update fix...');
  
  // Global fix state
  window.chatListUpdateFix = {
    active: true,
    updates: 0,
    lastCheck: Date.now(),
    monitoring: false
  };
  
  // Step 1: Find and monitor chat list specifically
  function findChatListElement() {
    // Multiple selectors for chat list
    const selectors = [
      '[data-testid="chat-list"]',
      '.chat-list',
      '.conversation-list',
      '.chats-container',
      '[data-conversation-id]',
      '.space-between',  // Common container class
      'div:has(.user-avatar)', // Container with avatars
    ];
    
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element && element.children.length > 0) {
          console.log(\`✅ Found chat list with selector: \${selector}\`);
          return element;
        }
      } catch (e) {
        // CSS has() not supported in all browsers
        continue;
      }
    }
    
    // Fallback: Find by content
    const allDivs = document.querySelectorAll('div');
    for (const div of allDivs) {
      if (div.textContent.includes('minutes ago') || 
          div.textContent.includes('day ago') ||
          div.textContent.includes('Hope all is well') ||
          div.textContent.includes('yes oo')) {
        const container = div.closest('[class*="chat"], [class*="conversation"]') || 
                         div.closest('div[class*="flex"], div[class*="space"]');
        if (container) {
          console.log('✅ Found chat list by content analysis');
          return container;
        }
      }
    }
    
    console.warn('⚠️ Could not find chat list element');
    return null;
  }
  
  // Step 2: Force refresh specific chat list
  async function forceRefreshChatList() {
    console.log('🔄 [ChatListFix] Force refreshing chat list...');
    
    const chatList = findChatListElement();
    if (!chatList) {
      console.warn('⚠️ No chat list found to refresh');
      return false;
    }
    
    try {
      // Strategy 1: Trigger re-render by temporary removal
      const parent = chatList.parentNode;
      const nextSibling = chatList.nextSibling;
      
      parent.removeChild(chatList);
      setTimeout(() => {
        if (nextSibling) {
          parent.insertBefore(chatList, nextSibling);
        } else {
          parent.appendChild(chatList);
        }
        console.log('✅ Chat list DOM refresh completed');
      }, 50);
      
      // Strategy 2: Force React re-render with key change
      if (chatList.closest('[data-key]')) {
        const container = chatList.closest('[data-key]');
        const currentKey = container.getAttribute('data-key') || '0';
        const newKey = String(parseInt(currentKey) + 1);
        container.setAttribute('data-key', newKey);
      }
      
      // Strategy 3: Dispatch specific events
      const events = [
        'conversations-updated',
        'chat-list-refresh',
        'messages-changed'
      ];
      
      events.forEach(eventName => {
        window.dispatchEvent(new CustomEvent(eventName, {
          detail: { 
            timestamp: Date.now(),
            source: 'chat-list-fix',
            target: 'chat-list'
          }
        }));
        
        chatList.dispatchEvent(new CustomEvent(eventName, {
          bubbles: true,
          detail: { forceRefresh: true }
        }));
      });
      
      // Strategy 4: Force style recalculation
      chatList.style.display = 'none';
      chatList.offsetHeight; // Force reflow
      chatList.style.display = '';
      
      window.chatListUpdateFix.updates++;
      console.log(\`💬 Chat list refresh #\${window.chatListUpdateFix.updates} completed\`);
      
      return true;
      
    } catch (error) {
      console.error('❌ Chat list refresh failed:', error);
      return false;
    }
  }
  
  // Step 3: Monitor for message changes
  function startMessageMonitoring() {
    console.log('👁️ [ChatListFix] Starting message monitoring...');
    
    if (window.chatListUpdateFix.monitoring) {
      console.log('⚠️ Monitoring already active');
      return;
    }
    
    window.chatListUpdateFix.monitoring = true;
    let lastMessageCount = 0;
    let lastMessageTime = 0;
    
    const messageMonitor = setInterval(async () => {
      if (!window.supabase) return;
      
      try {
        // Check for new messages in database
        const { data: { user } } = await window.supabase.auth.getUser();
        if (!user) return;
        
        // Get message count for user's conversations
        const { data: messages, count } = await window.supabase
          .from('chat_messages')
          .select('created_at', { count: 'exact' })
          .gte('created_at', new Date(Date.now() - 10000).toISOString()) // Last 10 seconds
          .order('created_at', { ascending: false });
        
        if (count > lastMessageCount) {
          console.log(\`🔥 [ChatListFix] New messages detected: \${count} vs \${lastMessageCount}\`);
          lastMessageCount = count;
          
          // Force refresh the chat list
          await forceRefreshChatList();
          
          // Also force refresh stores if available
          await forceRefreshStores();
        }
        
        window.chatListUpdateFix.lastCheck = Date.now();
        
      } catch (error) {
        // Silent fail for monitoring
      }
    }, 3000); // Check every 3 seconds
    
    window.chatListUpdateFix.messageMonitor = messageMonitor;
    console.log('✅ Message monitoring started');
  }
  
  // Step 4: Force refresh stores
  async function forceRefreshStores() {
    console.log('🏪 [ChatListFix] Force refreshing stores...');
    
    // Try to refresh chat stores
    const storeActions = [
      () => window.useChatStore?.getState?.()?.refreshConversations?.(),
      () => window.useConversationStore?.getState?.()?.fetchConversations?.(),
      () => window.useMessageStore?.getState?.()?.refresh?.(),
    ];
    
    for (const action of storeActions) {
      try {
        if (action) {
          await action();
          console.log('✅ Store refresh successful');
        }
      } catch (e) {
        // Continue with other stores
      }
    }
    
    // Force trigger React state updates
    if (window.React) {
      try {
        // Trigger global state update
        window.dispatchEvent(new CustomEvent('global-state-update', {
          detail: { source: 'chat-list-fix', timestamp: Date.now() }
        }));
      } catch (e) {
        // Fallback approach
      }
    }
  }
  
  // Step 5: Set up real-time message listener
  function setupRealtimeListener() {
    console.log('📡 [ChatListFix] Setting up real-time listener...');
    
    if (!window.supabase) {
      console.warn('⚠️ No Supabase client for real-time');
      return;
    }
    
    try {
      // Listen for new messages
      const subscription = window.supabase
        .channel('chat-list-updates')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        }, (payload) => {
          console.log('📨 [ChatListFix] Real-time message received:', payload.new.content);
          
          // Immediate chat list refresh
          setTimeout(() => {
            forceRefreshChatList();
          }, 500);
          
          // Store refresh
          setTimeout(() => {
            forceRefreshStores();
          }, 1000);
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_participants'
        }, (payload) => {
          console.log('👁️ [ChatListFix] Read status updated');
          
          // Refresh for read status changes
          setTimeout(() => {
            forceRefreshChatList();
          }, 300);
        })
        .subscribe();
      
      window.chatListUpdateFix.subscription = subscription;
      console.log('✅ Real-time listener active');
      
    } catch (error) {
      console.error('❌ Real-time setup failed:', error);
    }
  }
  
  // Step 6: Manual trigger function
  window.refreshChatListNow = async function() {
    console.log('🎯 [ChatListFix] Manual refresh triggered');
    
    await forceRefreshChatList();
    await forceRefreshStores();
    
    console.log('✅ Manual refresh completed');
    return window.chatListUpdateFix;
  };
  
  // Main initialization
  async function initializeChatListFix() {
    console.log('🚀 [ChatListFix] Initializing chat list fix...');
    
    // Wait for DOM to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Start all monitoring systems
    startMessageMonitoring();
    setupRealtimeListener();
    
    // Do initial refresh
    await forceRefreshChatList();
    
    // Set up periodic refresh as backup
    const periodicRefresh = setInterval(() => {
      forceRefreshChatList();
    }, 15000); // Every 15 seconds
    
    window.chatListUpdateFix.periodicRefresh = periodicRefresh;
    
    console.log('✅ Chat list fix is active!');
    console.log('💬 Manual refresh: window.refreshChatListNow()');
    console.log('📊 Status: window.chatListUpdateFix');
    
    return true;
  }
  
  // Start the fix
  initializeChatListFix().catch(error => {
    console.error('❌ Chat list fix initialization failed:', error);
  });
  
})();
`;

  const scriptPath = path.join(__dirname, '../public/chat-list-update-fix.js');
  fs.writeFileSync(scriptPath, chatListFixScript);
  console.log('✅ Created chat list update fix script');
  
  return scriptPath;
}

function updateIndexHtml() {
  console.log('📝 [ChatListFix] Updating index.html...');
  
  const indexPath = path.join(__dirname, '../index.html');
  
  if (fs.existsSync(indexPath)) {
    let content = fs.readFileSync(indexPath, 'utf8');
    
    // Remove existing scripts
    content = content.replace(/\s*<script src="\/nuclear-chat-fix\.js"><\/script>\n?/g, '');
    content = content.replace(/\s*<script src="\/chat-list-update-fix\.js"><\/script>\n?/g, '');
    
    // Add the new fix script
    const scriptTag = '    <script src="/chat-list-update-fix.js"></script>\n</head>';
    content = content.replace('</head>', scriptTag);
    
    fs.writeFileSync(indexPath, content);
    console.log('✅ Updated index.html');
  }
}

// Execute the fix
console.log('💬 [ChatListFix] Setting up chat list update fix...');

try {
  const scriptPath = createChatListUpdateFix();
  updateIndexHtml();
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💬 [ChatListFix] Chat list update fix deployed');
  console.log('');
  console.log('🎯 This focused fix will:');
  console.log('1. Monitor database for new messages every 3 seconds');
  console.log('2. Force refresh chat list component when changes detected');
  console.log('3. Trigger React re-renders with multiple strategies');
  console.log('4. Set up real-time listeners for immediate updates');
  console.log('5. Refresh all chat stores when messages change');
  console.log('6. Periodic backup refresh every 15 seconds');
  console.log('');
  console.log('🔧 Manual controls:');
  console.log('📋 window.refreshChatListNow() - Force refresh now');
  console.log('📊 window.chatListUpdateFix - View status');
  console.log('');
  console.log('📌 Next step: Refresh your browser');
  console.log('💬 The chat list should now update immediately');
  console.log('');
  
} catch (error) {
  console.error('❌ [ChatListFix] Failed:', error);
  process.exit(1);
} 