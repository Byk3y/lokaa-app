/**
 * Monitor Like Callback Bug
 * 
 * Issue: PostCard is receiving like callbacks even when real-time 
 * correctly skips own likes, causing double counting
 */

window.monitorLikeCallbackBug = {
  
  /**
   * Monitor the like callback chain to identify the bug
   */
  monitorCallbackChain() {
    console.log('🔍 [CallbackBug] Monitoring like callback chain for bugs...');
    
    let ownLikesSkipped = 0;
    let postCardCallbacks = 0;
    let optimisticUpdates = 0;
    let realtimeCallbacks = 0;
    
    // Override console.log to track the callback chain
    const originalLog = console.log;
    console.log = function(...args) {
      const message = args.join(' ');
      
      // Track when real-time correctly skips own likes
      if (message.includes('[RealtimePostLikes] Skipping own like')) {
        ownLikesSkipped++;
        console.log(`✅ [CallbackBug] Own like skipped (#${ownLikesSkipped}) - this is CORRECT`);
      }
      
      // Track PostCard callbacks (these should NOT happen when own likes are skipped)
      if (message.includes('[PostCard] Like toggled via real-time')) {
        postCardCallbacks++;
        console.error(`🚨 [CallbackBug] PostCard callback triggered (#${postCardCallbacks}) - this should NOT happen for own likes!`);
      }
      
      // Track usePostLikes real-time callbacks
      if (message.includes('[usePostLikes] Real-time like added')) {
        realtimeCallbacks++;
        console.log(`📡 [CallbackBug] usePostLikes real-time callback (#${realtimeCallbacks})`);
      }
      
      // Track optimistic updates (user actions)
      if (message.includes('✅ [usePostLikes] Deleted') || message.includes('Like successful')) {
        optimisticUpdates++;
        console.log(`👤 [CallbackBug] User action/optimistic update (#${optimisticUpdates})`);
      }
      
      return originalLog.apply(console, args);
    };
    
    // Report results after 30 seconds
    setTimeout(() => {
      console.log = originalLog;
      console.log('📊 [CallbackBug] Callback chain analysis (30s):');
      console.log(`   Own likes correctly skipped: ${ownLikesSkipped} ✅`);
      console.log(`   PostCard callbacks triggered: ${postCardCallbacks} ${postCardCallbacks > ownLikesSkipped ? '❌' : '✅'}`);
      console.log(`   usePostLikes real-time callbacks: ${realtimeCallbacks}`);
      console.log(`   User optimistic updates: ${optimisticUpdates}`);
      
      if (postCardCallbacks > 0 && ownLikesSkipped > 0) {
        console.error('🚨 BUG CONFIRMED: PostCard receiving callbacks even when own likes are skipped!');
        console.log('🔧 The issue is in the callback chain between usePostLikes and PostCard');
        console.log('💡 Expected: When real-time skips own like, NO PostCard callback should happen');
        console.log(`💡 Actual: ${postCardCallbacks} PostCard callbacks happened for ${ownLikesSkipped} skipped likes`);
      } else if (postCardCallbacks === 0 && ownLikesSkipped > 0) {
        console.log('✅ Callback filtering working correctly - no PostCard callbacks for skipped likes');
      } else {
        console.log('ℹ️ No own likes detected during monitoring period');
      }
    }, 30000);
    
    return 'Monitoring callback chain for 30 seconds... Try liking/unliking posts now.';
  },

  /**
   * Test the callback bug directly
   */
  async testCallbackBug(postId) {
    if (!postId) {
      console.error('❌ Please provide a post ID to test');
      return;
    }
    
    console.log(`🧪 [CallbackBug] Testing callback bug for post: ${postId}`);
    
    try {
      // Get current user
      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) {
        console.error('❌ No authenticated user');
        return;
      }
      
      console.log(`👤 [CallbackBug] Testing with user: ${user.id}`);
      
      // Check current like status
      const { data: currentLikes } = await window.supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id);
      
      const isCurrentlyLiked = currentLikes && currentLikes.length > 0;
      console.log(`📊 [CallbackBug] Current like status: ${isCurrentlyLiked ? 'LIKED' : 'NOT LIKED'}`);
      
      // Set up monitoring
      let callbacksReceived = [];
      const startTime = Date.now();
      
      const originalLog = console.log;
      console.log = function(...args) {
        const message = args.join(' ');
        const timestamp = Date.now() - startTime;
        
        if (message.includes('[PostCard] Like toggled via real-time')) {
          callbacksReceived.push({
            type: 'PostCard callback',
            message: message,
            timestamp: timestamp
          });
        }
        
        if (message.includes('[RealtimePostLikes] Skipping own like')) {
          callbacksReceived.push({
            type: 'Own like skipped',
            message: message,
            timestamp: timestamp
          });
        }
        
        return originalLog.apply(console, args);
      };
      
      // Perform the like action
      console.log('🎯 [CallbackBug] Performing like action...');
      
      if (isCurrentlyLiked) {
        // Unlike first
        await window.supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        console.log('✅ Unlike completed');
      }
      
      // Now like
      await window.supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: user.id });
      console.log('✅ Like completed');
      
      // Wait for real-time events to process
      setTimeout(() => {
        console.log = originalLog;
        console.log('📊 [CallbackBug] Test results:');
        console.log(`   Total events captured: ${callbacksReceived.length}`);
        
        callbacksReceived.forEach((event, i) => {
          console.log(`   ${i + 1}. [${event.timestamp}ms] ${event.type}: ${event.message.substring(0, 80)}...`);
        });
        
        const skippedEvents = callbacksReceived.filter(e => e.type === 'Own like skipped');
        const callbackEvents = callbacksReceived.filter(e => e.type === 'PostCard callback');
        
        console.log(`📊 Summary: ${skippedEvents.length} skipped, ${callbackEvents.length} callbacks`);
        
        if (callbackEvents.length > 0 && skippedEvents.length > 0) {
          console.error('🚨 BUG CONFIRMED: PostCard callback triggered despite own like being skipped!');
        } else if (callbackEvents.length === 0 && skippedEvents.length > 0) {
          console.log('✅ Working correctly: Own like skipped, no PostCard callback');
        } else {
          console.log('ℹ️ Unexpected result - check if like was actually processed');
        }
      }, 3000);
      
    } catch (error) {
      console.error('❌ Error during callback test:', error);
    }
  },

  /**
   * Identify the source of the callback bug
   */
  identifyCallbackSource() {
    console.log('🔍 [CallbackBug] Identifying callback source...');
    
    // Look for the onLikeToggled callback chain
    console.log('🔧 The bug is likely in one of these places:');
    console.log('1. usePostLikes handleRealtimeLikeAdded callback');
    console.log('2. FeedTab onPostLikeAdded handler');
    console.log('3. PostCard onLikeToggled prop chain');
    console.log('');
    console.log('🔍 Expected flow for own likes:');
    console.log('   User clicks → Optimistic update → Database INSERT');
    console.log('   → Real-time event → "Skipping own like" → NO CALLBACK');
    console.log('');
    console.log('🚨 Actual buggy flow:');
    console.log('   User clicks → Optimistic update → Database INSERT');
    console.log('   → Real-time event → "Skipping own like" → CALLBACK STILL HAPPENS');
    console.log('');
    console.log('💡 The issue is that something in the callback chain is not respecting');
    console.log('   the "skip own like" logic and is still calling onLikeToggled');
    
    return 'Callback source analysis provided';
  }
};

// Auto-initialize
console.log('🔧 [CallbackBug] Like callback bug monitor loaded');
console.log('📋 Available commands:');
console.log('   window.monitorLikeCallbackBug.monitorCallbackChain() - Monitor callback chain');
console.log('   window.monitorLikeCallbackBug.testCallbackBug(postId) - Test specific post');
console.log('   window.monitorLikeCallbackBug.identifyCallbackSource() - Show bug analysis');

// Auto-run analysis
window.monitorLikeCallbackBug.identifyCallbackSource(); 