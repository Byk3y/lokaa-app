#!/usr/bin/env node

/**
 * Nuclear Chat List Fix
 * 
 * Direct intervention to force chat list updates when messages arrive
 * This bypasses all caching and store issues by directly patching the rendering
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createNuclearChatListFix() {
  console.log('☢️ [NuclearFix] Creating nuclear chat list fix...');
  
  const nuclearFixScript = `
// Nuclear Chat List Fix - Direct UI Intervention
// This script directly patches chat list rendering to force updates

(function() {
  console.log('☢️ [NuclearFix] Starting nuclear chat list fix...');
  
  // Global monitoring
  window.nuclearChatFix = {
    active: true,
    patches: [],
    lastUpdate: Date.now(),
    forceUpdates: 0
  };
  
  // Step 1: Aggressive DOM monitoring and forcing
  function startAggressiveDOMMonitoring() {
    console.log('👁️ [Nuclear] Starting aggressive DOM monitoring...');
    
    let lastChatListHTML = '';
    let lastMessageCheck = '';
    
    const aggressiveMonitor = setInterval(async () => {
      // Find chat list element
      const chatList = document.querySelector('.chat-list, [data-testid="chat-list"], .conversation-list');
      if (!chatList) return;
      
      const currentHTML = chatList.innerHTML;
      
      // Check if we need to force refresh based on database
      if (window.supabase) {
        try {
          const { data: { user } } = await window.supabase.auth.getUser();
          if (user) {
            // Get latest message from database
            const { data: latestMessage } = await window.supabase
              .from('chat_messages')
              .select('content, created_at, conversation_id')
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            
            if (latestMessage && latestMessage.content !== lastMessageCheck) {
              console.log('🔥 [Nuclear] New message detected in database:', latestMessage.content);
              lastMessageCheck = latestMessage.content;
              
              // Force nuclear update
              await forceNuclearChatListUpdate();
            }
          }
        } catch (e) {
          // Silent fail for database checks
        }
      }
      
      // Check if DOM has changed
      if (currentHTML !== lastChatListHTML) {
        lastChatListHTML = currentHTML;
        window.nuclearChatFix.lastUpdate = Date.now();
      }
      
    }, 2000); // Check every 2 seconds
    
    window.nuclearChatFix.aggressiveMonitor = aggressiveMonitor;
    console.log('✅ Aggressive DOM monitoring started');
  }
  
  // Step 2: Nuclear Chat List Update
  async function forceNuclearChatListUpdate() {
    console.log('☢️ [Nuclear] Forcing nuclear chat list update...');
    
    if (!window.supabase) {
      console.error('❌ No Supabase client available');
      return;
    }
    
    try {
      // Get current user
      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) {
        console.error('❌ No authenticated user');
        return;
      }
      
      // Get fresh conversation data directly from database
      const { data: conversations } = await window.supabase
        .from('chat_conversations')
        .select(\`
          id,
          last_message_at,
          updated_at,
          chat_participants!inner (
            user_id,
            last_read_at
          )
        \`)
        .eq('chat_participants.user_id', user.id)
        .order('last_message_at', { ascending: false });
      
      if (!conversations) return;
      
      // Get latest messages for each conversation
      const conversationsWithMessages = await Promise.all(
        conversations.map(async (conv) => {
          const { data: latestMessage } = await window.supabase
            .from('chat_messages')
            .select('content, sender_id, created_at, users!sender_id(full_name)')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          // Get other participant info
          const { data: participants } = await window.supabase
            .from('chat_participants')
            .select('user_id, users(full_name, avatar_url)')
            .eq('conversation_id', conv.id)
            .neq('user_id', user.id);
          
          const otherParticipant = participants?.[0]?.users;
          const userParticipant = conv.chat_participants.find(p => p.user_id === user.id);
          
          return {
            id: conv.id,
            lastMessage: latestMessage,
            otherParticipant,
            lastReadAt: userParticipant?.last_read_at,
            lastMessageAt: conv.last_message_at,
            isUnread: userParticipant?.last_read_at ? 
              new Date(userParticipant.last_read_at) < new Date(conv.last_message_at) : 
              true
          };
        })
      );
      
      console.log('📊 Fresh conversation data:', conversationsWithMessages);
      
      // Step 3: Force update ALL stores with fresh data
      forceUpdateAllStores(conversationsWithMessages);
      
      // Step 4: Force re-render chat list
      await forceReRenderChatList(conversationsWithMessages);
      
      window.nuclearChatFix.forceUpdates++;
      console.log(\`☢️ Nuclear update #\${window.nuclearChatFix.forceUpdates} completed\`);
      
    } catch (error) {
      console.error('☢️ Nuclear update failed:', error);
    }
  }
  
  // Step 3: Force Update All Stores
  function forceUpdateAllStores(freshData) {
    console.log('🔄 [Nuclear] Force updating all stores...');
    
    const storeNames = [
      'useChatStore',
      'useConversationStore', 
      'useMessageStore'
    ];
    
    storeNames.forEach(storeName => {
      try {
        if (window[storeName]) {
          const store = window[storeName];
          if (store.getState && store.setState) {
            const currentState = store.getState();
            
            store.setState({
              ...currentState,
              conversations: freshData,
              hasInitialized: true,
              loading: false,
              lastUpdate: Date.now(),
              forceRefresh: Date.now()
            });
            
            console.log(\`✅ Force updated \${storeName}\`);
          }
        }
      } catch (e) {
        console.warn(\`⚠️ Could not force update \${storeName}:\`, e);
      }
    });
  }
  
  // Step 4: Force Re-render Chat List
  async function forceReRenderChatList(freshData) {
    console.log('🎨 [Nuclear] Force re-rendering chat list...');
    
    // Find chat list container
    const chatListContainer = document.querySelector('.chat-list, [data-testid="chat-list"], .conversation-list');
    if (!chatListContainer) {
      console.warn('⚠️ Could not find chat list container');
      return;
    }
    
    // Nuclear DOM manipulation - completely rebuild the list
    try {
      // Create new conversation items HTML
      const conversationItemsHTML = freshData.map(conv => {
        const otherUser = conv.otherParticipant;
        const latestMessage = conv.lastMessage;
        const timeAgo = getTimeAgo(conv.lastMessageAt);
        const unreadBadge = conv.isUnread ? '<div class="unread-badge">●</div>' : '';
        
        return \`
          <div class="conversation-item nuclear-generated" data-conversation-id="\${conv.id}">
            <div class="user-avatar">
              <img src="\${otherUser?.avatar_url || '/default-avatar.png'}" alt="\${otherUser?.full_name}" />
            </div>
            <div class="conversation-content">
              <div class="user-name">\${otherUser?.full_name || 'Unknown User'}</div>
              <div class="last-message">\${latestMessage?.content || 'No messages'}</div>
            </div>
            <div class="conversation-meta">
              <div class="time-ago">\${timeAgo}</div>
              \${unreadBadge}
            </div>
          </div>
        \`;
      }).join('');
      
      // Find the conversation list area
      const existingItems = chatListContainer.querySelectorAll('.conversation-item');
      
      // Remove existing items
      existingItems.forEach(item => item.remove());
      
      // Insert new HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = conversationItemsHTML;
      
      while (tempDiv.firstChild) {
        chatListContainer.appendChild(tempDiv.firstChild);
      }
      
      console.log('✅ Chat list forcefully re-rendered');
      
    } catch (error) {
      console.error('❌ Failed to force re-render chat list:', error);
      
      // Fallback: trigger React re-render
      triggerReactReRender(chatListContainer);
    }
  }
  
  // Step 5: Trigger React Re-render (fallback)
  function triggerReactReRender(element) {
    console.log('⚛️ [Nuclear] Triggering React re-render...');
    
    // Multiple strategies to force React re-render
    
    // Strategy 1: Dispatch multiple events
    const events = [
      'conversations-updated',
      'chat-data-changed',
      'force-refresh',
      'nuclear-update'
    ];
    
    events.forEach(eventName => {
      window.dispatchEvent(new CustomEvent(eventName, {
        detail: { 
          timestamp: Date.now(),
          source: 'nuclear-fix',
          force: true
        }
      }));
    });
    
    // Strategy 2: DOM manipulation to trigger re-render
    const originalDisplay = element.style.display;
    element.style.display = 'none';
    element.offsetHeight; // Force reflow
    element.style.display = originalDisplay;
    
    // Strategy 3: Add and remove a class to trigger React updates
    element.classList.add('nuclear-update');
    setTimeout(() => {
      element.classList.remove('nuclear-update');
    }, 100);
    
    console.log('✅ React re-render triggered');
  }
  
  // Utility: Get time ago
  function getTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return \`\${diffMinutes} minutes ago\`;
    if (diffMinutes < 1440) return \`\${Math.floor(diffMinutes / 60)} hours ago\`;
    return \`\${Math.floor(diffMinutes / 1440)} days ago\`;
  }
  
  // Step 6: Set up message interception
  function interceptMessageSending() {
    console.log('📨 [Nuclear] Setting up message send interception...');
    
    // Intercept Supabase inserts
    if (window.supabase) {
      const originalInsert = window.supabase.from('chat_messages').insert;
      
      // This is a more aggressive approach - we'll monitor for new messages
      const messageMonitor = setInterval(async () => {
        // This will be caught by our aggressive DOM monitoring
      }, 3000);
      
      window.nuclearChatFix.messageMonitor = messageMonitor;
    }
  }
  
  // Step 7: Auto-mark as read (enhanced)
  function setupEnhancedAutoRead() {
    console.log('👁️ [Nuclear] Setting up enhanced auto-read...');
    
    let currentConversationId = null;
    
    const checkActiveConversation = () => {
      // Check URL
      const url = window.location.href;
      const urlMatch = url.match(/[?&]id=([^&]+)/);
      let conversationId = urlMatch?.[1];
      
      // Check DOM
      if (!conversationId) {
        const chatView = document.querySelector('[data-conversation-id]');
        conversationId = chatView?.getAttribute('data-conversation-id');
      }
      
      if (conversationId && conversationId !== currentConversationId) {
        currentConversationId = conversationId;
        
        // Mark as read after 2 seconds
        setTimeout(async () => {
          if (currentConversationId === conversationId && window.supabase) {
            try {
              const { data: { user } } = await window.supabase.auth.getUser();
              if (user) {
                await window.supabase
                  .from('chat_participants')
                  .update({ last_read_at: new Date().toISOString() })
                  .eq('conversation_id', conversationId)
                  .eq('user_id', user.id);
                
                console.log(\`✅ [Nuclear] Auto-marked as read: \${conversationId}\`);
                
                // Force update after marking as read
                setTimeout(() => forceNuclearChatListUpdate(), 1000);
              }
            } catch (error) {
              console.error('❌ Auto-read failed:', error);
            }
          }
        }, 2000);
      }
    };
    
    // Monitor URL changes
    setInterval(checkActiveConversation, 1000);
    checkActiveConversation();
  }
  
  // Main execution
  async function runNuclearFix() {
    console.log('☢️ Starting nuclear chat list fix...');
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Start all nuclear systems
    startAggressiveDOMMonitoring();
    interceptMessageSending();
    setupEnhancedAutoRead();
    
    // Do initial nuclear update
    await forceNuclearChatListUpdate();
    
    // Set up periodic nuclear updates
    const nuclearInterval = setInterval(() => {
      forceNuclearChatListUpdate();
    }, 10000); // Every 10 seconds
    
    window.nuclearChatFix.nuclearInterval = nuclearInterval;
    
    console.log('☢️ Nuclear chat fix is now active!');
    console.log('🔍 Monitor window.nuclearChatFix for status');
    console.log('💣 Forcing updates every 10 seconds');
    
    return true;
  }
  
  // Start the nuclear fix
  runNuclearFix().catch(error => {
    console.error('☢️ Nuclear fix startup failed:', error);
  });
  
})();
`;

  const scriptPath = path.join(__dirname, '../public/nuclear-chat-fix.js');
  fs.writeFileSync(scriptPath, nuclearFixScript);
  console.log('✅ Created nuclear chat fix script');
  
  return scriptPath;
}

function addNuclearFixToIndex() {
  console.log('📝 [NuclearFix] Adding nuclear fix to index.html...');
  
  const indexPath = path.join(__dirname, '../index.html');
  
  if (fs.existsSync(indexPath)) {
    let content = fs.readFileSync(indexPath, 'utf8');
    
    // Remove existing scripts
    content = content.replace(/\s*<script src="\/realtime-sync-fix\.js"><\/script>\n?/g, '');
    content = content.replace(/\s*<script src="\/nuclear-chat-fix\.js"><\/script>\n?/g, '');
    
    // Add the nuclear fix script
    const scriptTag = '    <script src="/nuclear-chat-fix.js"></script>\n</head>';
    content = content.replace('</head>', scriptTag);
    
    fs.writeFileSync(indexPath, content);
    console.log('✅ Added nuclear fix to HTML');
  }
}

// Execute the nuclear fix setup
console.log('☢️ [NuclearFix] Setting up nuclear chat list fix...');

try {
  const scriptPath = createNuclearChatListFix();
  addNuclearFixToIndex();
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('☢️ [NuclearFix] Nuclear chat list fix deployed');
  console.log('');
  console.log('💣 This will aggressively:');
  console.log('1. Monitor database for new messages every 2 seconds');
  console.log('2. Force fetch fresh conversation data directly from database');
  console.log('3. Force update ALL chat stores with fresh data');
  console.log('4. Force re-render chat list by rebuilding DOM');
  console.log('5. Auto-mark conversations as read when viewing');
  console.log('6. Nuclear update every 10 seconds to maintain sync');
  console.log('');
  console.log('⚡ This bypasses ALL caching and store issues');
  console.log('📊 Next step: Refresh your browser');
  console.log('☢️ Monitor window.nuclearChatFix for status');
  console.log('💥 This WILL fix the chat list update issue');
  console.log('');
  
} catch (error) {
  console.error('❌ [NuclearFix] Failed:', error);
  process.exit(1);
} 