/**
 * Fix for Like Double-Counting Issue
 * 
 * Problem: User's own likes are being processed by real-time events
 * instead of being filtered out, causing double increments.
 * 
 * Root Cause: Real-time filter comparison not working properly
 */

window.likeDoubleCountFix = {
  
  /**
   * Diagnose the like double-counting issue
   */
  async diagnoseDoubleCount() {
    console.log('🔍 [LikeDoubleCountFix] Diagnosing like double-counting issue...');
    
    // Get current user info
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) {
      console.error('❌ No authenticated user found');
      return;
    }
    
    console.log('👤 [LikeDoubleCountFix] Current user ID:', user.id);
    
    // Monitor real-time events for the current user
    let ownLikesProcessed = 0;
    let otherLikesProcessed = 0;
    let optimisticUpdates = 0;
    
    // Override console.log to catch events
    const originalLog = console.log;
    console.log = function(...args) {
      const message = args.join(' ');
      
      // Check for real-time like events
      if (message.includes('[RealtimePostLikes] Processing like from other user')) {
        const userIdMatch = message.match(/userId: '([^']+)'/);
        if (userIdMatch) {
          const eventUserId = userIdMatch[1];
          if (eventUserId === user.id) {
            ownLikesProcessed++;
            console.warn(`🚨 [LikeDoubleCountFix] BUG: Own like processed as "other user": ${eventUserId}`);
          } else {
            otherLikesProcessed++;
            console.log(`✅ [LikeDoubleCountFix] Correct: Other user like processed: ${eventUserId}`);
          }
        }
      }
      
      // Check for skipped own likes
      if (message.includes('[RealtimePostLikes] Skipping own like')) {
        console.log('✅ [LikeDoubleCountFix] Correct: Own like skipped');
      }
      
      // Track optimistic updates
      if (message.includes('[PostCard] Like toggled via real-time')) {
        optimisticUpdates++;
      }
      
      return originalLog.apply(console, args);
    };
    
    // Restore after 30 seconds
    setTimeout(() => {
      console.log = originalLog;
      console.log('📊 [LikeDoubleCountFix] Diagnosis results (30s):');
      console.log(`   Own likes incorrectly processed: ${ownLikesProcessed} ❌`);
      console.log(`   Other user likes correctly processed: ${otherLikesProcessed} ✅`);
      console.log(`   Total optimistic updates: ${optimisticUpdates}`);
      
      if (ownLikesProcessed > 0) {
        console.error('🚨 ISSUE CONFIRMED: Own likes are being processed by real-time instead of being filtered!');
        console.log('🔧 This causes double counting: optimistic update + real-time update');
        console.log('💡 Solution: Fix the user ID comparison in useRealtimePostLikes');
      } else {
        console.log('✅ No double-counting detected. Issue may be elsewhere.');
      }
    }, 30000);
    
    return 'Monitoring for 30 seconds... Try liking/unliking posts now.';
  },

  /**
   * Check the current state of likes for a specific post
   */
  async checkPostLikes(postId) {
    if (!postId) {
      console.error('❌ Please provide a post ID');
      return;
    }
    
    console.log(`🔍 [LikeDoubleCountFix] Checking likes for post: ${postId}`);
    
    try {
      // Get current user
      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) {
        console.error('❌ No authenticated user');
        return;
      }
      
      // Count total likes for this post
      const { data: totalLikes, error: countError } = await window.supabase
        .from('post_likes')
        .select('user_id')
        .eq('post_id', postId);
      
      if (countError) {
        console.error('❌ Error counting likes:', countError);
        return;
      }
      
      // Check if current user has liked this post
      const userLikes = totalLikes.filter(like => like.user_id === user.id);
      
      console.log('📊 [LikeDoubleCountFix] Post like analysis:');
      console.log(`   Post ID: ${postId}`);
      console.log(`   Total likes: ${totalLikes.length}`);
      console.log(`   User likes: ${userLikes.length} (should be 0 or 1)`);
      
      if (userLikes.length > 1) {
        console.error(`🚨 DUPLICATE LIKES DETECTED: User has ${userLikes.length} likes on this post!`);
        console.log('🔧 This confirms the double-counting bug');
        
        // Show the duplicate like IDs
        console.log('💾 Duplicate like entries:');
        userLikes.forEach((like, i) => {
          console.log(`   ${i + 1}. Like ID: ${like.id || 'no ID'}`);
        });
        
        return {
          hasDuplicates: true,
          duplicateCount: userLikes.length,
          postId,
          totalLikes: totalLikes.length
        };
      } else {
        console.log('✅ No duplicate likes found for this post');
        return {
          hasDuplicates: false,
          userLikes: userLikes.length,
          totalLikes: totalLikes.length
        };
      }
      
    } catch (error) {
      console.error('❌ Error checking post likes:', error);
    }
  },

  /**
   * Clean up duplicate likes for the current user
   */
  async cleanupDuplicateLikes(postId) {
    if (!postId) {
      console.error('❌ Please provide a post ID');
      return;
    }
    
    console.log(`🧹 [LikeDoubleCountFix] Cleaning duplicate likes for post: ${postId}`);
    
    try {
      // Get current user
      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) {
        console.error('❌ No authenticated user');
        return;
      }
      
      // Find all likes by this user for this post
      const { data: userLikes, error: fetchError } = await window.supabase
        .from('post_likes')
        .select('id, created_at')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (fetchError) {
        console.error('❌ Error fetching user likes:', fetchError);
        return;
      }
      
      if (userLikes.length <= 1) {
        console.log('✅ No duplicates to clean up');
        return;
      }
      
      console.log(`🔍 Found ${userLikes.length} duplicate likes, keeping the most recent one`);
      
      // Keep the first (most recent) and delete the rest
      const likesToDelete = userLikes.slice(1);
      const deleteIds = likesToDelete.map(like => like.id);
      
      console.log(`🗑️ Deleting ${deleteIds.length} duplicate likes...`);
      
      const { error: deleteError } = await window.supabase
        .from('post_likes')
        .delete()
        .in('id', deleteIds);
      
      if (deleteError) {
        console.error('❌ Error deleting duplicates:', deleteError);
        return;
      }
      
      console.log('✅ Duplicate likes cleaned up successfully');
      console.log(`   Kept: ${userLikes[0].id} (${userLikes[0].created_at})`);
      console.log(`   Deleted: ${deleteIds.join(', ')}`);
      
      return {
        cleaned: true,
        deletedCount: deleteIds.length,
        keptLike: userLikes[0].id
      };
      
    } catch (error) {
      console.error('❌ Error cleaning duplicate likes:', error);
    }
  },

  /**
   * Test the like toggle functionality
   */
  async testLikeToggle(postId) {
    if (!postId) {
      console.error('❌ Please provide a post ID');
      return;
    }
    
    console.log(`🧪 [LikeDoubleCountFix] Testing like toggle for post: ${postId}`);
    
    try {
      // Check initial state
      const initialState = await this.checkPostLikes(postId);
      console.log(`📊 Initial state: ${initialState.userLikes} user likes, ${initialState.totalLikes} total`);
      
      // Get current user
      const { data: { user } } = await window.supabase.auth.getUser();
      const hasInitialLike = initialState.userLikes > 0;
      
      if (hasInitialLike) {
        console.log('🔄 User already has a like, testing unlike...');
        
        // Unlike the post
        const { error: deleteError } = await window.supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        
        if (deleteError) {
          console.error('❌ Error unliking:', deleteError);
          return;
        }
        
        console.log('✅ Unlike successful');
      }
      
      // Now test liking
      console.log('🔄 Testing like...');
      
      const { error: insertError } = await window.supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: user.id });
      
      if (insertError) {
        console.error('❌ Error liking:', insertError);
        return;
      }
      
      console.log('✅ Like successful');
      
      // Wait a moment for real-time to process
      setTimeout(async () => {
        const finalState = await this.checkPostLikes(postId);
        console.log(`📊 Final state: ${finalState.userLikes} user likes, ${finalState.totalLikes} total`);
        
        if (finalState.userLikes === 1) {
          console.log('✅ Like toggle test PASSED');
        } else {
          console.error(`🚨 Like toggle test FAILED: Expected 1 user like, got ${finalState.userLikes}`);
        }
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error testing like toggle:', error);
    }
  },

  /**
   * Quick diagnosis of the most common issue
   */
  async quickDiagnosis() {
    console.log('⚡ [LikeDoubleCountFix] Running quick diagnosis...');
    
    // Find any posts with likes in the current page
    const postElements = document.querySelectorAll('[class*="post-"], [data-post-id]');
    console.log(`📋 Found ${postElements.length} potential post elements`);
    
    // Look for like buttons
    const likeButtons = document.querySelectorAll('button[class*="flex items-center space-x-1.5"]');
    console.log(`👍 Found ${likeButtons.length} potential like buttons`);
    
    if (likeButtons.length === 0) {
      console.log('⚠️ No like buttons found. Make sure you are on a page with posts.');
      return;
    }
    
    console.log('💡 To test for double-counting:');
    console.log('1. Run: window.likeDoubleCountFix.diagnoseDoubleCount()');
    console.log('2. Click a like button on any post');
    console.log('3. Watch the console for "Own like processed as other user" messages');
    console.log('4. If you see those messages, the bug is confirmed');
    
    console.log('\n🔧 To check for existing duplicates:');
    console.log('1. Find a post ID from the console logs');
    console.log('2. Run: window.likeDoubleCountFix.checkPostLikes("POST_ID_HERE")');
    
    console.log('\n🧹 To clean up duplicates:');
    console.log('1. Run: window.likeDoubleCountFix.cleanupDuplicateLikes("POST_ID_HERE")');
  }
};

// Auto-initialize
console.log('🔧 [LikeDoubleCountFix] Like double-counting diagnostic tools loaded');
console.log('📋 Available commands:');
console.log('   window.likeDoubleCountFix.quickDiagnosis() - Quick overview');
console.log('   window.likeDoubleCountFix.diagnoseDoubleCount() - Monitor for double-counting');
console.log('   window.likeDoubleCountFix.checkPostLikes(postId) - Check specific post');
console.log('   window.likeDoubleCountFix.cleanupDuplicateLikes(postId) - Clean duplicates');
console.log('   window.likeDoubleCountFix.testLikeToggle(postId) - Test like/unlike');

// Auto-run quick diagnosis
window.likeDoubleCountFix.quickDiagnosis(); 