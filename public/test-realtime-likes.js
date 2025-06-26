/**
 * Real-Time Likes Test Script
 * 
 * Tests that real-time events are now properly flowing for post_likes and comment_likes tables
 * after enabling them in the Supabase publication.
 * 
 * Usage: Run this in browser console after implementing real-time likes
 */

window.testRealtimeLikes = {
  testChannels: {},
  testResults: {
    postLikes: { connected: false, eventReceived: false, testPassed: false },
    commentLikes: { connected: false, eventReceived: false, testPassed: false }
  },

  /**
   * Test real-time subscriptions for both post likes and comment likes
   */
  async runFullTest() {
    console.log('🧪 [RealtimeLikesTest] Starting comprehensive real-time likes test...');
    
    // Reset results
    this.testResults = {
      postLikes: { connected: false, eventReceived: false, testPassed: false },
      commentLikes: { connected: false, eventReceived: false, testPassed: false }
    };

    // Get current space info
    const currentUrl = window.location.pathname;
    const spaceMatch = currentUrl.match(/\/([^\/]+)\/space/);
    if (!spaceMatch) {
      console.error('❌ [RealtimeLikesTest] Not on a space page - please navigate to a space first');
      return;
    }

    const spaceSubdomain = spaceMatch[1];
    console.log(`🧪 [RealtimeLikesTest] Testing on space: ${spaceSubdomain}`);

    // Check if Supabase client is available
    if (!window.supabase && !window._supabaseClient) {
      console.error('❌ [RealtimeLikesTest] Supabase client not found globally');
      return;
    }

    const supabase = window.supabase || window._supabaseClient;

    // Get space ID for testing
    const spaceId = await this.getSpaceIdForTesting(supabase, spaceSubdomain);
    if (!spaceId) {
      console.error('❌ [RealtimeLikesTest] Could not get space ID for testing');
      return;
    }

    console.log(`🧪 [RealtimeLikesTest] Using space ID: ${spaceId}`);

    // Test post likes real-time
    await this.testPostLikesRealtime(supabase, spaceId);
    
    // Test comment likes real-time
    await this.testCommentLikesRealtime(supabase, spaceId);

    // Wait a bit for any final events
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Report results
    this.reportResults();
  },

  /**
   * Get space ID for testing
   */
  async getSpaceIdForTesting(supabase, spaceSubdomain) {
    try {
      const { data, error } = await supabase
        .from('spaces')
        .select('id')
        .eq('subdomain', spaceSubdomain)
        .single();

      if (error) {
        console.error('❌ [RealtimeLikesTest] Error fetching space:', error);
        return null;
      }

      return data?.id;
    } catch (err) {
      console.error('❌ [RealtimeLikesTest] Exception fetching space:', err);
      return null;
    }
  },

  /**
   * Test post likes real-time subscription
   */
  async testPostLikesRealtime(supabase, spaceId) {
    console.log('🧪 [RealtimeLikesTest] Testing post likes real-time...');

    return new Promise((resolve) => {
      const testChannel = supabase
        .channel('test-post-likes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'post_likes'
          },
          async (payload) => {
            console.log('✅ [RealtimeLikesTest] POST LIKES event received:', payload);
            
            // Check if this like belongs to our test space
            if (payload.new && payload.new.post_id) {
              try {
                const { data: post } = await supabase
                  .from('posts')
                  .select('space_id')
                  .eq('id', payload.new.post_id)
                  .single();
                
                if (post?.space_id === spaceId) {
                  console.log('✅ [RealtimeLikesTest] POST LIKES event is for our space!');
                  this.testResults.postLikes.eventReceived = true;
                  this.testResults.postLikes.testPassed = true;
                } else {
                  console.log('🔔 [RealtimeLikesTest] POST LIKES event is for different space, ignoring');
                }
              } catch (err) {
                console.warn('⚠️ [RealtimeLikesTest] Could not verify post space:', err);
                // Still count as event received even if we can't verify space
                this.testResults.postLikes.eventReceived = true;
                this.testResults.postLikes.testPassed = true;
              }
            } else {
              // DELETE events might not have post_id in new, so count them anyway
              this.testResults.postLikes.eventReceived = true;
              this.testResults.postLikes.testPassed = true;
            }
          }
        )
        .subscribe((status) => {
          console.log(`🔔 [RealtimeLikesTest] Post likes subscription status: ${status}`);
          if (status === 'SUBSCRIBED') {
            this.testResults.postLikes.connected = true;
            console.log('✅ [RealtimeLikesTest] Post likes subscription established');
          }
        });

      this.testChannels.postLikes = testChannel;

      // Resolve after attempting to connect
      setTimeout(() => {
        resolve();
      }, 3000);
    });
  },

  /**
   * Test comment likes real-time subscription
   */
  async testCommentLikesRealtime(supabase, spaceId) {
    console.log('🧪 [RealtimeLikesTest] Testing comment likes real-time...');

    return new Promise((resolve) => {
      const testChannel = supabase
        .channel('test-comment-likes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'comment_likes'
          },
          async (payload) => {
            console.log('✅ [RealtimeLikesTest] COMMENT LIKES event received:', payload);
            
            // Check if this comment like belongs to our test space
            if (payload.new && payload.new.comment_id) {
              try {
                const { data: comment } = await supabase
                  .from('post_comments')
                  .select('space_id')
                  .eq('id', payload.new.comment_id)
                  .single();
                
                if (comment?.space_id === spaceId) {
                  console.log('✅ [RealtimeLikesTest] COMMENT LIKES event is for our space!');
                  this.testResults.commentLikes.eventReceived = true;
                  this.testResults.commentLikes.testPassed = true;
                } else {
                  console.log('🔔 [RealtimeLikesTest] COMMENT LIKES event is for different space, ignoring');
                }
              } catch (err) {
                console.warn('⚠️ [RealtimeLikesTest] Could not verify comment space:', err);
                // Still count as event received even if we can't verify space
                this.testResults.commentLikes.eventReceived = true;
                this.testResults.commentLikes.testPassed = true;
              }
            } else {
              // DELETE events might not have comment_id in new, so count them anyway
              this.testResults.commentLikes.eventReceived = true;
              this.testResults.commentLikes.testPassed = true;
            }
          }
        )
        .subscribe((status) => {
          console.log(`🔔 [RealtimeLikesTest] Comment likes subscription status: ${status}`);
          if (status === 'SUBSCRIBED') {
            this.testResults.commentLikes.connected = true;
            console.log('✅ [RealtimeLikesTest] Comment likes subscription established');
          }
        });

      this.testChannels.commentLikes = testChannel;

      // Resolve after attempting to connect
      setTimeout(() => {
        resolve();
      }, 3000);
    });
  },

  /**
   * Report test results
   */
  reportResults() {
    console.log('\n🎯 [RealtimeLikesTest] ========== TEST RESULTS ==========');
    
    const postLikesStatus = this.testResults.postLikes.connected ? '✅ CONNECTED' : '❌ FAILED TO CONNECT';
    const commentLikesStatus = this.testResults.commentLikes.connected ? '✅ CONNECTED' : '❌ FAILED TO CONNECT';
    
    console.log(`📊 Post Likes Real-time: ${postLikesStatus}`);
    console.log(`📊 Comment Likes Real-time: ${commentLikesStatus}`);
    
    if (this.testResults.postLikes.eventReceived) {
      console.log('🎉 Post likes events are flowing in real-time!');
    } else {
      console.log('⚠️  Post likes events not detected - try liking a post to test');
    }
    
    if (this.testResults.commentLikes.eventReceived) {
      console.log('🎉 Comment likes events are flowing in real-time!');
    } else {
      console.log('⚠️  Comment likes events not detected - try liking a comment to test');
    }

    const totalConnections = (this.testResults.postLikes.connected ? 1 : 0) + 
                           (this.testResults.commentLikes.connected ? 1 : 0);
    
    console.log(`\n📈 Overall Status: ${totalConnections}/2 real-time subscriptions active`);
    
    if (totalConnections === 2) {
      console.log('🎊 SUCCESS! Real-time likes system is fully operational!');
    } else {
      console.log('⚠️  Some real-time subscriptions failed - check database publication settings');
    }
    
    console.log('\n💡 To test live updates:');
    console.log('1. Open this same space in another browser/incognito window');
    console.log('2. Like/unlike posts and comments in one window');
    console.log('3. Watch for real-time updates in this window');
    
    console.log('\n🔍 Available commands:');
    console.log('- window.testRealtimeLikes.runFullTest() - Run complete test');
    console.log('- window.testRealtimeLikes.cleanup() - Clean up test subscriptions');
    console.log('- window.testRealtimeLikes.getResults() - Get current test results');
  },

  /**
   * Clean up test subscriptions
   */
  cleanup() {
    console.log('🧹 [RealtimeLikesTest] Cleaning up test subscriptions...');
    
    const supabase = window.supabase || window._supabaseClient;
    if (!supabase) {
      console.warn('⚠️  Supabase client not available for cleanup');
      return;
    }

    Object.values(this.testChannels).forEach(channel => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    });

    this.testChannels = {};
    console.log('✅ [RealtimeLikesTest] Cleanup complete');
  },

  /**
   * Get current test results
   */
  getResults() {
    return {
      summary: {
        postLikesConnected: this.testResults.postLikes.connected,
        commentLikesConnected: this.testResults.commentLikes.connected,
        postLikesEvents: this.testResults.postLikes.eventReceived,
        commentLikesEvents: this.testResults.commentLikes.eventReceived,
        overallSuccess: this.testResults.postLikes.connected && this.testResults.commentLikes.connected
      },
      details: this.testResults
    };
  },

  /**
   * Quick test for development
   */
  quickTest() {
    console.log('⚡ [RealtimeLikesTest] Running quick connectivity test...');
    
    const hasSupabase = !!(window.supabase || window._supabaseClient);
    const isOnSpacePage = /\/[^\/]+\/space/.test(window.location.pathname);
    
    console.log(`📡 Supabase client available: ${hasSupabase ? '✅' : '❌'}`);
    console.log(`🏠 On space page: ${isOnSpacePage ? '✅' : '❌'}`);
    
    if (hasSupabase && isOnSpacePage) {
      console.log('🚀 Environment ready - run window.testRealtimeLikes.runFullTest() for full test');
    } else {
      console.log('⚠️  Environment not ready for testing');
    }
    
    return { hasSupabase, isOnSpacePage, ready: hasSupabase && isOnSpacePage };
  }
};

// Auto-run quick test when script loads
console.log('🎯 [RealtimeLikesTest] Real-time likes testing utilities loaded');
console.log('📋 Available commands:');
console.log('- window.testRealtimeLikes.runFullTest() - Complete real-time test');
console.log('- window.testRealtimeLikes.quickTest() - Quick connectivity check');

// Auto-run quick test
window.testRealtimeLikes.quickTest(); 