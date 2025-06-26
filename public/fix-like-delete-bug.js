/**
 * Comprehensive Fix for Like DELETE Bug
 * 
 * Issue: Unlike operation not working - DELETE queries failing
 * causing duplicate likes instead of toggle behavior
 */

window.likeDeleteBugFix = {
  
  /**
   * Test the DELETE operation directly
   */
  async testDeleteOperation(postId) {
    if (!postId) {
      console.error('❌ Please provide a post ID to test');
      return;
    }
    
    console.log(`🧪 [DeleteFix] Testing DELETE operation for post: ${postId}`);
    
    try {
      // Get current user
      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) {
        console.error('❌ No authenticated user');
        return;
      }
      
      console.log(`👤 [DeleteFix] Testing with user ID: ${user.id}`);
      
      // First, check if user has any likes for this post
      const { data: existingLikes, error: fetchError } = await window.supabase
        .from('post_likes')
        .select('id, created_at')
        .eq('post_id', postId)
        .eq('user_id', user.id);
      
      if (fetchError) {
        console.error('❌ Error fetching existing likes:', fetchError);
        return;
      }
      
      console.log(`📊 [DeleteFix] Found ${existingLikes.length} existing likes for this user`);
      
      if (existingLikes.length === 0) {
        console.log('ℹ️ No existing likes to delete. Creating one first...');
        
        // Create a like first
        const { error: insertError } = await window.supabase
          .from('post_likes')
          .insert({ post_id: postId, user_id: user.id });
        
        if (insertError) {
          console.error('❌ Error creating test like:', insertError);
          return;
        }
        
        console.log('✅ Test like created');
      }
      
      // Now test different DELETE methods
      console.log('🔧 [DeleteFix] Testing DELETE methods...');
      
      // Method 1: Using .match() (current implementation)
      console.log('🧪 Testing Method 1: .match()');
      const { data: matchResult, error: matchError } = await window.supabase
        .from('post_likes')
        .delete()
        .match({ post_id: postId, user_id: user.id })
        .select();
      
      console.log('📊 Match method result:', { matchResult, matchError });
      
      // Check if anything was actually deleted
      const { data: remainingAfterMatch } = await window.supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id);
      
      console.log(`📊 Remaining likes after .match(): ${remainingAfterMatch?.length || 0}`);
      
      if (remainingAfterMatch && remainingAfterMatch.length > 0) {
        console.warn('⚠️ .match() method did NOT delete the like!');
        
        // Method 2: Using .eq() filters (recommended fix)
        console.log('🧪 Testing Method 2: .eq() filters');
        const { data: eqResult, error: eqError } = await window.supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .select();
        
        console.log('📊 .eq() method result:', { eqResult, eqError });
        
        // Final check
        const { data: finalCheck } = await window.supabase
          .from('post_likes')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', user.id);
        
        console.log(`📊 Final remaining likes: ${finalCheck?.length || 0}`);
        
        if (finalCheck && finalCheck.length === 0) {
          console.log('✅ .eq() method WORKED! This is the fix we need.');
          return { success: true, method: '.eq() filters' };
        } else {
          console.error('❌ Both methods failed to delete the like');
          return { success: false, reason: 'Both DELETE methods failed' };
        }
      } else {
        console.log('✅ .match() method worked (unexpected)');
        return { success: true, method: '.match()' };
      }
      
    } catch (error) {
      console.error('❌ Error during DELETE test:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Fix the usePostLikes hook with the correct DELETE method
   */
  async applyDeleteFix() {
    console.log('🔧 [DeleteFix] Applying DELETE operation fix...');
    
    // Note: This is a diagnostic message since we can't modify React hooks at runtime
    console.log('🔧 The fix needs to be applied to src/features/posts/hooks/usePostLikes.ts');
    console.log('');
    console.log('📝 Change this:');
    console.log('   const { error } = await getSupabaseClient()');
    console.log('     .from("post_likes")');
    console.log('     .delete()');
    console.log('     .match({ post_id: postId, user_id: userId });');
    console.log('');
    console.log('📝 To this:');
    console.log('   const { data, error } = await getSupabaseClient()');
    console.log('     .from("post_likes")');
    console.log('     .delete()');
    console.log('     .eq("post_id", postId)');
    console.log('     .eq("user_id", userId)');
    console.log('     .select();');
    console.log('');
    console.log('📝 And add logging:');
    console.log('   if (error) {');
    console.log('     console.error("DELETE error:", error);');
    console.log('     throw error;');
    console.log('   }');
    console.log('   console.log(`✅ Deleted ${data?.length || 0} likes`);');
    console.log('   if (!data || data.length === 0) {');
    console.log('     console.warn("⚠️ No likes were deleted - may not exist");');
    console.log('   }');
    
    return 'Fix instructions provided. Manual code update required.';
  },

  /**
   * Monitor DELETE operations in real-time
   */
  monitorDeleteOperations() {
    console.log('👀 [DeleteFix] Monitoring DELETE operations...');
    
    let deleteAttempts = 0;
    let deleteSuccesses = 0;
    let deleteFailures = 0;
    
    // Override console to catch DELETE-related logs
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = function(...args) {
      const message = args.join(' ');
      
      if (message.includes('Error toggling like:')) {
        deleteFailures++;
        console.error(`🚨 [DeleteFix] DELETE failure detected (#${deleteFailures})`);
      }
      
      return originalLog.apply(console, args);
    };
    
    console.error = function(...args) {
      const message = args.join(' ');
      
      if (message.includes('Error toggling like:')) {
        deleteFailures++;
        console.error(`🚨 [DeleteFix] DELETE error logged (#${deleteFailures})`);
      }
      
      return originalError.apply(console, args);
    };
    
    // Track any Supabase operations
    if (window.supabase) {
      const originalFrom = window.supabase.from;
      window.supabase.from = function(table) {
        const tableRef = originalFrom.call(this, table);
        
        if (table === 'post_likes') {
          const originalDelete = tableRef.delete;
          tableRef.delete = function() {
            deleteAttempts++;
            console.log(`🔍 [DeleteFix] DELETE attempt #${deleteAttempts} on post_likes table`);
            
            const deleteQuery = originalDelete.call(this);
            
            // Override the execution methods to catch results
            const originalSelect = deleteQuery.select;
            if (originalSelect) {
              deleteQuery.select = function(...args) {
                const result = originalSelect.apply(this, args);
                result.then((response) => {
                  if (response.error) {
                    deleteFailures++;
                    console.error(`❌ [DeleteFix] DELETE failed: ${response.error.message}`);
                  } else {
                    deleteSuccesses++;
                    console.log(`✅ [DeleteFix] DELETE succeeded: ${response.data?.length || 0} rows deleted`);
                  }
                }).catch((err) => {
                  deleteFailures++;
                  console.error(`❌ [DeleteFix] DELETE error:`, err);
                });
                return result;
              };
            }
            
            return deleteQuery;
          };
        }
        
        return tableRef;
      };
    }
    
    // Report results after 30 seconds
    setTimeout(() => {
      console.log = originalLog;
      console.error = originalError;
      
      console.log('📊 [DeleteFix] DELETE monitoring results (30s):');
      console.log(`   DELETE attempts: ${deleteAttempts}`);
      console.log(`   DELETE successes: ${deleteSuccesses}`);
      console.log(`   DELETE failures: ${deleteFailures}`);
      
      if (deleteFailures > 0) {
        console.error(`🚨 ${deleteFailures} DELETE failures detected!`);
        console.log('💡 Run window.likeDeleteBugFix.applyDeleteFix() for fix instructions');
      } else if (deleteAttempts > 0) {
        console.log('✅ All DELETE operations succeeded');
      } else {
        console.log('ℹ️ No DELETE operations detected during monitoring');
      }
    }, 30000);
    
    return 'Monitoring DELETE operations for 30 seconds...';
  },

  /**
   * Quick diagnosis and fix recommendation
   */
  async quickDiagnosis() {
    console.log('⚡ [DeleteFix] Running quick DELETE bug diagnosis...');
    
    console.log('🔍 Checking for duplicate likes...');
    
    try {
      // Get current user
      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) {
        console.error('❌ No authenticated user');
        return;
      }
      
      // Find posts where user has multiple likes
      const { data: allUserLikes, error } = await window.supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('❌ Error fetching user likes:', error);
        return;
      }
      
      // Count likes per post
      const likesPerPost = {};
      allUserLikes.forEach(like => {
        likesPerPost[like.post_id] = (likesPerPost[like.post_id] || 0) + 1;
      });
      
      // Find duplicates
      const duplicates = Object.entries(likesPerPost).filter(([postId, count]) => count > 1);
      
      console.log('📊 [DeleteFix] Duplicate likes analysis:');
      console.log(`   Total user likes: ${allUserLikes.length}`);
      console.log(`   Unique posts: ${Object.keys(likesPerPost).length}`);
      console.log(`   Posts with duplicates: ${duplicates.length}`);
      
      if (duplicates.length > 0) {
        console.error('🚨 DUPLICATE LIKES CONFIRMED! DELETE bug is active.');
        console.log('💾 Duplicates found:');
        duplicates.forEach(([postId, count]) => {
          console.log(`   Post ${postId}: ${count} likes`);
        });
        
        console.log('\n🔧 Recommended actions:');
        console.log('1. Run: window.likeDeleteBugFix.testDeleteOperation("POST_ID")');
        console.log('2. Apply the code fix shown in applyDeleteFix()');
        console.log('3. Clean up duplicates with cleanupDuplicateLikes()');
        
        return {
          hasDuplicates: true,
          duplicateCount: duplicates.length,
          totalDuplicates: allUserLikes.length - Object.keys(likesPerPost).length
        };
      } else {
        console.log('✅ No duplicate likes found');
        return {
          hasDuplicates: false,
          userLikes: allUserLikes.length
        };
      }
      
    } catch (error) {
      console.error('❌ Error during quick diagnosis:', error);
    }
  }
};

// Auto-initialize
console.log('🔧 [DeleteFix] Like DELETE bug fix tools loaded');
console.log('📋 Available commands:');
console.log('   window.likeDeleteBugFix.quickDiagnosis() - Find duplicate likes');
console.log('   window.likeDeleteBugFix.testDeleteOperation(postId) - Test DELETE directly');
console.log('   window.likeDeleteBugFix.monitorDeleteOperations() - Monitor DELETE attempts');
console.log('   window.likeDeleteBugFix.applyDeleteFix() - Show fix instructions');

// Auto-run quick diagnosis
window.likeDeleteBugFix.quickDiagnosis(); 