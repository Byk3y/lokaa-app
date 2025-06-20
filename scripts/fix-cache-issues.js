#!/usr/bin/env node

/**
 * Fix Cache Issues - Dev Utility
 * 
 * Directly fixes cache and database inconsistencies without browser console
 * Addresses the systematic caching problems across mobile/desktop
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const USER_ID = 'f6064ebb-564a-49d2-a146-fb8615fd7ae2';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixCacheIssues() {
  console.log('🔧 [FixCacheIssues] Starting comprehensive cache and database fix...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const results = {
    timestamp: new Date().toISOString(),
    stepsCompleted: 0,
    errors: [],
    conversationsFixed: 0,
    cacheFilesDeleted: []
  };

  try {
    // Step 1: Fix database - mark all conversations as read
    console.log('📊 [Step 1] Fixing database conversation states...');
    
    // Get all conversations for user
    const { data: conversations, error: fetchError } = await supabase
      .from('user_conversations')
      .select('conversation_id, unread_count, other_participants')
      .eq('user_id', USER_ID);
    
    if (fetchError) {
      throw new Error(`Failed to fetch conversations: ${fetchError.message}`);
    }
    
    console.log(`📊 Found ${conversations.length} conversations`);
    
    // Mark all conversations as read
    for (const conv of conversations) {
      if (conv.unread_count > 0) {
        const { error } = await supabase
          .from('chat_participants')
          .update({ last_read_at: new Date().toISOString() })
          .eq('conversation_id', conv.conversation_id)
          .eq('user_id', USER_ID);
        
        if (error) {
          results.errors.push(`Failed to mark ${conv.conversation_id} as read: ${error.message}`);
        } else {
          results.conversationsFixed++;
          const participantName = conv.other_participants?.[0]?.full_name || 'Unknown';
          console.log(`✅ Marked as read: ${participantName}`);
        }
      }
    }
    
    results.stepsCompleted++;
    
    // Step 2: Clear cache files from public directory
    console.log('🗑️ [Step 2] Clearing cache files...');
    
    const publicDir = path.join(__dirname, '../public');
    const cacheFiles = fs.readdirSync(publicDir).filter(file => 
      file.includes('cache') || 
      file.includes('debug') ||
      file.includes('diagnostic') ||
      file.includes('fix') ||
      file.includes('test') && file.endsWith('.js')
    );
    
    for (const file of cacheFiles) {
      const filePath = path.join(publicDir, file);
      try {
        fs.unlinkSync(filePath);
        results.cacheFilesDeleted.push(file);
        console.log(`🗑️ Deleted: ${file}`);
      } catch (error) {
        results.errors.push(`Failed to delete ${file}: ${error.message}`);
      }
    }
    
    results.stepsCompleted++;
    
    // Step 3: Create cache invalidation trigger
    console.log('🔄 [Step 3] Creating cache invalidation trigger...');
    
    const invalidationScript = `
// Cache Invalidation - Auto-generated ${new Date().toISOString()}
if (typeof window !== 'undefined') {
  // Clear all storage
  try {
    localStorage.clear();
    sessionStorage.clear();
    console.log('✅ Cleared browser storage');
  } catch (e) {
    console.warn('⚠️ Could not clear storage:', e);
  }
  
  // Reset chat stores
  const stores = ['useChatStore', 'useConversationStore', 'useMessageStore'];
  stores.forEach(storeName => {
    try {
      const store = window[storeName];
      if (store?.getState?.()?.reset) {
        store.getState().reset();
        console.log(\`✅ Reset \${storeName}\`);
      }
    } catch (e) {
      console.warn(\`⚠️ Could not reset \${storeName}:\`, e);
    }
  });
  
  // Clear IndexedDB bridge
  if (window.supabaseIndexedDBBridge?.clearCache) {
    window.supabaseIndexedDBBridge.clearCache()
      .then(() => console.log('✅ Cleared IndexedDB bridge'))
      .catch(e => console.warn('⚠️ Could not clear IndexedDB bridge:', e));
  }
  
  // Force refresh after 2 seconds
  setTimeout(() => {
    window.location.reload();
  }, 2000);
}
`;
    
    const invalidationPath = path.join(publicDir, 'cache-invalidation.js');
    fs.writeFileSync(invalidationPath, invalidationScript);
    console.log('✅ Created cache invalidation trigger');
    
    results.stepsCompleted++;
    
    // Step 4: Verify database state
    console.log('🔍 [Step 4] Verifying database state...');
    
    const { data: verifyConversations, error: verifyError } = await supabase
      .from('user_conversations')
      .select('conversation_id, unread_count, latest_message_content, other_participants')
      .eq('user_id', USER_ID)
      .order('latest_message_time', { ascending: false });
    
    if (verifyError) {
      results.errors.push(`Verification failed: ${verifyError.message}`);
    } else {
      console.log('📊 Final database state:');
      verifyConversations.forEach(conv => {
        const participantName = conv.other_participants?.[0]?.full_name || 'Unknown';
        const message = conv.latest_message_content || 'No message';
        console.log(`   - ${participantName}: "${message}" (${conv.unread_count} unread)`);
      });
    }
    
    results.stepsCompleted++;
    
    // Results
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ [FixCacheIssues] Completed ${results.stepsCompleted}/4 steps`);
    console.log(`📊 Conversations fixed: ${results.conversationsFixed}`);
    console.log(`🗑️ Cache files deleted: ${results.cacheFilesDeleted.length}`);
    
    if (results.errors.length > 0) {
      console.log('⚠️ Errors encountered:');
      results.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    console.log('');
    console.log('🎯 Next steps:');
    console.log('1. Refresh your browser to load cache invalidation script');
    console.log('2. All conversations should now show 0 unread');
    console.log('3. Mobile and desktop should be consistent');
    console.log('');
    
    return results;
    
  } catch (error) {
    console.error('❌ [FixCacheIssues] Critical error:', error);
    results.errors.push(error.message);
    return results;
  }
}

// Execute the fix
fixCacheIssues()
  .then(results => {
    console.log('🏁 Fix completed');
    if (results.errors.length > 0) {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Fix failed:', error);
    process.exit(1);
  });

export { fixCacheIssues }; 