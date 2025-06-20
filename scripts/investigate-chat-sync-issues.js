#!/usr/bin/env node

/**
 * Chat Sync Investigation & Fix
 * 
 * Investigates and fixes:
 * 1. Chat list not updating with latest messages
 * 2. Read status not syncing between chat view and database
 * 3. Cache layer disconnects between chat list and chat view
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createComprehensiveInvestigationScript() {
  console.log('🔍 [ChatSyncInvestigation] Creating comprehensive investigation script...');
  
  const investigationScript = `
// Comprehensive Chat Sync Investigation & Fix
// Addresses chat list vs chat view disconnect and read status issues

(function() {
  console.log('🔍 [ChatSyncFix] Starting comprehensive chat sync investigation...');
  
  // Step 1: Database State Investigation
  async function investigateDatabaseState() {
    console.log('📊 [Database] Investigating current database state...');
    
    if (!window.supabase) {
      console.error('❌ Supabase client not available');
      return null;
    }
    
    try {
      // Get current user
      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) {
        console.error('❌ No authenticated user');
        return null;
      }
      
      console.log('👤 Current user:', user.id);
      
      // Fetch all conversations with detailed info
      const { data: conversations, error: convError } = await window.supabase
        .from('chat_conversations')
        .select(\`
          id,
          last_message_at,
          updated_at,
          chat_participants!inner (
            user_id,
            last_read_at
          ),
          chat_messages (
            id,
            content,
            sender_id,
            created_at
          )
        \`)
        .eq('chat_participants.user_id', user.id)
        .order('last_message_at', { ascending: false });
      
      if (convError) {
        console.error('❌ Error fetching conversations:', convError);
        return null;
      }
      
      console.log('📊 Database conversations:', conversations?.length || 0);
      
      // Get latest message for each conversation
      const conversationsWithLatest = await Promise.all(
        (conversations || []).map(async (conv) => {
          const { data: latestMessage } = await window.supabase
            .from('chat_messages')
            .select('id, content, sender_id, created_at, users!sender_id(full_name)')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          const participant = conv.chat_participants.find(p => p.user_id === user.id);
          
          return {
            ...conv,
            latestMessage,
            lastReadAt: participant?.last_read_at,
            isUnread: participant?.last_read_at ? 
              new Date(participant.last_read_at) < new Date(conv.last_message_at) : 
              true
          };
        })
      );
      
      console.log('📊 Conversations with latest messages:', conversationsWithLatest);
      return { user, conversations: conversationsWithLatest };
      
    } catch (error) {
      console.error('❌ Database investigation failed:', error);
      return null;
    }
  }
  
  // Step 2: Frontend Cache Investigation
  function investigateFrontendCaches() {
    console.log('💾 [Cache] Investigating frontend cache states...');
    
    const cacheStates = {};
    
    // Check Zustand stores
    const storeNames = [
      'useChatStore',
      'useConversationStore', 
      'useMessageStore',
      'useRealtimeStore',
      'useNavigationStore'
    ];
    
    storeNames.forEach(storeName => {
      try {
        if (window[storeName]) {
          const store = window[storeName];
          if (store.getState) {
            cacheStates[storeName] = {
              conversations: store.getState().conversations || [],
              messages: Object.keys(store.getState().messages || {}).length,
              hasInitialized: store.getState().hasInitialized,
              loading: store.getState().loading,
              lastUpdate: store.getState().lastUpdate
            };
            console.log(\`📦 \${storeName}:\`, cacheStates[storeName]);
          }
        }
      } catch (e) {
        console.warn(\`⚠️ Could not read \${storeName}:\`, e);
      }
    });
    
    // Check localStorage/sessionStorage
    const storageKeys = {
      localStorage: Object.keys(localStorage).filter(k => 
        k.includes('chat') || k.includes('conversation') || k.includes('message')
      ),
      sessionStorage: Object.keys(sessionStorage).filter(k => 
        k.includes('chat') || k.includes('conversation') || k.includes('message')
      )
    };
    
    console.log('🗄️ Storage keys:', storageKeys);
    
    // Check supabaseIndexedDBBridge
    if (window.supabaseIndexedDBBridge) {
      console.log('🌉 supabaseIndexedDBBridge available');
      if (window.supabaseIndexedDBBridge.cache) {
        console.log('💾 Bridge cache keys:', Object.keys(window.supabaseIndexedDBBridge.cache));
      }
    }
    
    return { cacheStates, storageKeys };
  }
  
  // Step 3: Component State Investigation
  function investigateComponentStates() {
    console.log('🧩 [Components] Investigating component states...');
    
    const componentStates = {};
    
    // Check if chat components are mounted
    const chatElements = {
      chatList: document.querySelector('[data-testid="chat-list"], .chat-list'),
      chatView: document.querySelector('[data-testid="chat-view"], .chat-view, .chat-container'),
      chatButton: document.querySelector('[data-testid="chat-button"], .chat-button'),
      unreadBadge: document.querySelector('.unread-count, .chat-badge, [data-testid="unread-count"]')
    };
    
    Object.entries(chatElements).forEach(([name, element]) => {
      componentStates[name] = {
        exists: !!element,
        visible: element ? window.getComputedStyle(element).display !== 'none' : false,
        classList: element ? Array.from(element.classList) : []
      };
    });
    
    console.log('🧩 Component states:', componentStates);
    return componentStates;
  }
  
  // Step 4: Fix Chat List Update Issue
  async function fixChatListUpdate(databaseState) {
    console.log('🔧 [Fix] Attempting to fix chat list update issue...');
    
    if (!databaseState) return false;
    
    try {
      // Force refresh conversation store
      if (window.useConversationStore) {
        const store = window.useConversationStore;
        if (store.getState && store.setState) {
          const currentState = store.getState();
          
          // Update with fresh database data
          store.setState({
            ...currentState,
            conversations: databaseState.conversations,
            hasInitialized: true,
            loading: false,
            lastUpdate: Date.now()
          });
          
          console.log('✅ Updated conversation store with fresh data');
        }
      }
      
      // Force refresh main chat store
      if (window.useChatStore) {
        const store = window.useChatStore;
        if (store.getState && store.setState) {
          const currentState = store.getState();
          
          store.setState({
            ...currentState,
            conversations: databaseState.conversations,
            lastUpdate: Date.now()
          });
          
          console.log('✅ Updated main chat store with fresh data');
        }
      }
      
      // Trigger custom events for components
      window.dispatchEvent(new CustomEvent('chat-conversations-updated', {
        detail: { conversations: databaseState.conversations }
      }));
      
      window.dispatchEvent(new CustomEvent('force-chat-list-refresh'));
      
      return true;
    } catch (error) {
      console.error('❌ Failed to fix chat list update:', error);
      return false;
    }
  }
  
  // Step 5: Fix Read Status Sync
  async function fixReadStatusSync(databaseState) {
    console.log('🔧 [Fix] Attempting to fix read status sync...');
    
    if (!databaseState || !window.supabase) return false;
    
    try {
      const unreadConversations = databaseState.conversations.filter(conv => conv.isUnread);
      console.log(\`📬 Found \${unreadConversations.length} unread conversations\`);
      
      // For each unread conversation, check if user is currently viewing it
      const currentUrl = window.location.href;
      const isInChatView = currentUrl.includes('/chat') || document.querySelector('.chat-view');
      
      if (isInChatView) {
        // Extract conversation ID from URL or DOM
        let activeConversationId = null;
        
        // Try to find active conversation from URL
        const urlMatch = currentUrl.match(/chat.*[?&]id=([^&]+)/);
        if (urlMatch) {
          activeConversationId = urlMatch[1];
        }
        
        // Try to find from DOM data attributes
        if (!activeConversationId) {
          const chatView = document.querySelector('[data-conversation-id]');
          if (chatView) {
            activeConversationId = chatView.getAttribute('data-conversation-id');
          }
        }
        
        console.log('👁️ Active conversation ID:', activeConversationId);
        
        if (activeConversationId) {
          // Mark this conversation as read
          const { error: readError } = await window.supabase
            .from('chat_participants')
            .update({ 
              last_read_at: new Date().toISOString()
            })
            .eq('conversation_id', activeConversationId)
            .eq('user_id', databaseState.user.id);
          
          if (readError) {
            console.error('❌ Error marking conversation as read:', readError);
          } else {
            console.log('✅ Marked active conversation as read');
            
            // Update local state
            if (window.useMessageStore) {
              const store = window.useMessageStore;
              if (store.getState && store.setState) {
                const currentState = store.getState();
                store.setState({
                  ...currentState,
                  lastReadUpdate: Date.now()
                });
              }
            }
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to fix read status sync:', error);
      return false;
    }
  }
  
  // Step 6: Force UI Refresh
  function forceUIRefresh() {
    console.log('🔄 [Refresh] Forcing UI refresh...');
    
    // Trigger React component re-renders
    const events = [
      'chat-data-updated',
      'conversations-changed', 
      'messages-updated',
      'read-status-changed'
    ];
    
    events.forEach(eventName => {
      window.dispatchEvent(new CustomEvent(eventName, {
        detail: { timestamp: Date.now() }
      }));
    });
    
    // Force re-render of chat components
    setTimeout(() => {
      const chatElements = document.querySelectorAll(
        '.chat-list, .chat-view, .chat-button, [data-testid*="chat"]'
      );
      
      chatElements.forEach(element => {
        // Trigger a subtle DOM change to force React re-render
        const currentDisplay = element.style.display;
        element.style.display = 'none';
        element.offsetHeight; // Force reflow
        element.style.display = currentDisplay;
      });
      
      console.log('✅ Forced UI refresh for chat components');
    }, 100);
  }
  
  // Main execution
  async function runInvestigation() {
    console.log('🚀 Starting comprehensive chat sync investigation...');
    
    // Step 1: Investigate database
    const databaseState = await investigateDatabaseState();
    
    // Step 2: Investigate frontend caches
    const frontendState = investigateFrontendCaches();
    
    // Step 3: Investigate component states
    const componentState = investigateComponentStates();
    
    // Step 4: Apply fixes
    const chatListFixed = await fixChatListUpdate(databaseState);
    const readStatusFixed = await fixReadStatusSync(databaseState);
    
    // Step 5: Force UI refresh
    forceUIRefresh();
    
    // Step 6: Summary report
    const report = {
      database: databaseState,
      frontend: frontendState,
      components: componentState,
      fixes: {
        chatListUpdate: chatListFixed,
        readStatusSync: readStatusFixed
      },
      timestamp: new Date().toISOString()
    };
    
    // Store report globally for debugging
    window.chatSyncInvestigationReport = report;
    
    console.log('📋 Investigation complete! Check window.chatSyncInvestigationReport for details');
    console.log('✅ Fixes applied:', report.fixes);
    
    return report;
  }
  
  // Run the investigation
  runInvestigation().catch(error => {
    console.error('❌ Investigation failed:', error);
  });
  
})();
`;

  const scriptPath = path.join(__dirname, '../public/chat-sync-investigation.js');
  fs.writeFileSync(scriptPath, investigationScript);
  console.log('✅ Created investigation script');
  
  return scriptPath;
}

function addInvestigationToIndex() {
  console.log('📝 [ChatSyncInvestigation] Adding investigation script to index.html...');
  
  const indexPath = path.join(__dirname, '../index.html');
  
  if (fs.existsSync(indexPath)) {
    let content = fs.readFileSync(indexPath, 'utf8');
    
    // Remove any existing investigation script
    content = content.replace(/\s*<script src="\/chat-sync-investigation\.js"><\/script>\n?/g, '');
    
    // Add the new investigation script
    const scriptTag = '    <script src="/chat-sync-investigation.js"></script>\n</head>';
    content = content.replace('</head>', scriptTag);
    
    fs.writeFileSync(indexPath, content);
    console.log('✅ Added investigation script to HTML');
  }
}

// Execute the investigation setup
console.log('🔍 [ChatSyncInvestigation] Setting up comprehensive chat sync investigation...');

try {
  const scriptPath = createComprehensiveInvestigationScript();
  addInvestigationToIndex();
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ [ChatSyncInvestigation] Investigation script deployed');
  console.log('');
  console.log('🔍 This will automatically:');
  console.log('1. Investigate database state vs frontend caches');
  console.log('2. Identify chat list vs chat view disconnect');
  console.log('3. Fix read status synchronization issues');
  console.log('4. Force UI refresh for all chat components');
  console.log('5. Generate comprehensive diagnostic report');
  console.log('');
  console.log('📊 Next step: Refresh your browser');
  console.log('🔍 The investigation will run automatically');
  console.log('📋 Check browser console for detailed results');
  console.log('🐛 Access window.chatSyncInvestigationReport for debugging');
  console.log('');
  
} catch (error) {
  console.error('❌ [ChatSyncInvestigation] Failed:', error);
  process.exit(1);
} 