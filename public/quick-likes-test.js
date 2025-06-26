/**
 * Quick Real-Time Likes Test
 * 
 * A simplified test to quickly verify that real-time likes are working
 * after fixing the filter syntax issue.
 */

window.quickLikesTest = {
  testActive: false,
  eventsReceived: { postLikes: 0, commentLikes: 0 },

  async start() {
    if (this.testActive) {
      console.log('⚠️ [QuickLikesTest] Test already active');
      return;
    }

    console.log('🚀 [QuickLikesTest] Starting quick real-time likes test...');
    this.testActive = true;
    this.eventsReceived = { postLikes: 0, commentLikes: 0 };

    if (!window.supabase && !window._supabaseClient) {
      console.error('❌ [QuickLikesTest] Supabase client not available');
      return;
    }

    const supabase = window.supabase || window._supabaseClient;

    // Test post likes
    const postLikesChannel = supabase
      .channel('quick-test-post-likes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, (payload) => {
        this.eventsReceived.postLikes++;
        console.log('✅ [QuickLikesTest] Post like event received!', { 
          event: payload.eventType, 
          count: this.eventsReceived.postLikes 
        });
      })
      .subscribe();

    // Test comment likes
    const commentLikesChannel = supabase
      .channel('quick-test-comment-likes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comment_likes' }, (payload) => {
        this.eventsReceived.commentLikes++;
        console.log('✅ [QuickLikesTest] Comment like event received!', { 
          event: payload.eventType, 
          count: this.eventsReceived.commentLikes 
        });
      })
      .subscribe();

    // Store channels for cleanup
    this.channels = { postLikesChannel, commentLikesChannel };

    console.log('🔔 [QuickLikesTest] Subscriptions active! Try liking posts/comments to test.');
    console.log('💡 [QuickLikesTest] Open another browser and like something to see real-time events');
    console.log('🛑 [QuickLikesTest] Run window.quickLikesTest.stop() to end test');
  },

  stop() {
    if (!this.testActive) {
      console.log('⚠️ [QuickLikesTest] No test currently active');
      return;
    }

    console.log('🛑 [QuickLikesTest] Stopping test...');
    
    if (this.channels) {
      const supabase = window.supabase || window._supabaseClient;
      if (supabase) {
        Object.values(this.channels).forEach(channel => {
          if (channel) supabase.removeChannel(channel);
        });
      }
    }

    console.log('📊 [QuickLikesTest] Final Results:');
    console.log(`   Post likes events: ${this.eventsReceived.postLikes}`);
    console.log(`   Comment likes events: ${this.eventsReceived.commentLikes}`);
    console.log(`   Total events: ${this.eventsReceived.postLikes + this.eventsReceived.commentLikes}`);

    if (this.eventsReceived.postLikes > 0 || this.eventsReceived.commentLikes > 0) {
      console.log('🎉 [QuickLikesTest] SUCCESS! Real-time likes are working!');
    } else {
      console.log('⚠️ [QuickLikesTest] No events received - try liking something to test');
    }

    this.testActive = false;
    this.channels = null;
  },

  status() {
    console.log('📋 [QuickLikesTest] Current Status:');
    console.log(`   Test active: ${this.testActive}`);
    console.log(`   Post likes events: ${this.eventsReceived.postLikes}`);
    console.log(`   Comment likes events: ${this.eventsReceived.commentLikes}`);
  }
};

console.log('⚡ [QuickLikesTest] Quick likes test loaded');
console.log('📋 Commands:');
console.log('   window.quickLikesTest.start() - Start monitoring');
console.log('   window.quickLikesTest.stop() - Stop and show results');
console.log('   window.quickLikesTest.status() - Show current status'); 