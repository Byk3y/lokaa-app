/**
 * Test script for Phase 2.5 Smart Batching System
 * 
 * This script demonstrates the "Francis and 5 others liked your post" functionality
 * Run this in the browser console to test the batching system
 */

import { notificationService } from '@/services/NotificationService';
import { notificationBatchManager } from '@/services/NotificationBatchManager';
import { log } from '@/utils/logger';

export class BatchingSystemTest {
  
  /**
   * Test batching for post likes
   */
  async testPostLikeBatching(): Promise<void> {
    console.log('🧪 Testing Post Like Batching System...');
    
    const testData = {
      recipientId: 'user-123',
      postId: 'post-456',
      postTitle: 'HOW TO USE AI 🚀',
      spaceId: 'space-789',
      actors: [
        { id: 'francis-id', name: 'Francis Chukwuma' },
        { id: 'sarah-id', name: 'Sarah Johnson' },
        { id: 'mike-id', name: 'Mike Chen' },
        { id: 'alex-id', name: 'Alex Rodriguez' },
        { id: 'emma-id', name: 'Emma Thompson' },
        { id: 'david-id', name: 'David Wilson' }
      ]
    };

    try {
      // Create multiple post likes - should batch into one notification
      for (const actor of testData.actors) {
        await notificationService.createPostLikeNotification({
          recipientId: testData.recipientId,
          actorId: actor.id,
          postId: testData.postId,
          postTitle: testData.postTitle,
          spaceId: testData.spaceId
        });
        
        // Small delay to simulate real-world timing
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('✅ Post like batching test completed');
      console.log('Expected result: "Francis Chukwuma and 5 others liked your post HOW TO USE AI 🚀"');
    } catch (error) {
      console.error('❌ Post like batching test failed:', error);
    }
  }

  /**
   * Test batching for space joins
   */
  async testSpaceJoinBatching(): Promise<void> {
    console.log('🧪 Testing Space Join Batching System...');
    
    const testData = {
      recipientId: 'space-owner-123',
      spaceId: 'space-789',
      spaceName: 'Web Development Community',
      actors: [
        { id: 'john-id', name: 'John Doe' },
        { id: 'jane-id', name: 'Jane Smith' },
        { id: 'bob-id', name: 'Bob Johnson' }
      ]
    };

    try {
      // Create multiple space joins - should batch into one notification
      for (const actor of testData.actors) {
        await notificationService.createSpaceJoinNotification({
          recipientId: testData.recipientId,
          actorId: actor.id,
          spaceId: testData.spaceId,
          spaceName: testData.spaceName
        });
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('✅ Space join batching test completed');
      console.log('Expected result: "John Doe and 2 others joined Web Development Community"');
    } catch (error) {
      console.error('❌ Space join batching test failed:', error);
    }
  }

  /**
   * Test that mentions are NOT batched (they should remain individual)
   */
  async testMentionNoBatching(): Promise<void> {
    console.log('🧪 Testing Mention Non-Batching...');
    
    const testData = {
      recipientId: 'user-123',
      postId: 'post-456',
      postTitle: 'Discussion about AI trends',
      spaceId: 'space-789',
      actors: [
        { id: 'alice-id', name: 'Alice Williams' },
        { id: 'charlie-id', name: 'Charlie Brown' }
      ]
    };

    try {
      // Create multiple mentions - should NOT batch (each should be separate)
      for (const actor of testData.actors) {
        await notificationService.createMentionNotification({
          recipientId: testData.recipientId,
          actorId: actor.id,
          postId: testData.postId,
          postTitle: testData.postTitle,
          spaceId: testData.spaceId,
          mentionText: `@user-123 what do you think about this?`
        });
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('✅ Mention non-batching test completed');
      console.log('Expected result: 2 separate notifications, NOT batched');
    } catch (error) {
      console.error('❌ Mention non-batching test failed:', error);
    }
  }

  /**
   * Test batch display formatting
   */
  async testBatchDisplayFormatting(): Promise<void> {
    console.log('🧪 Testing Batch Display Formatting...');
    
    const mockNotifications = [
      {
        id: '1',
        actor_count: 1,
        actor_names: [],
        actor: { full_name: 'Francis Chukwuma' },
        type: 'post_like'
      },
      {
        id: '2',
        actor_count: 3,
        actor_names: ['Sarah Johnson', 'Mike Chen'],
        actor: { full_name: 'Francis Chukwuma' },
        type: 'post_like'
      },
      {
        id: '3',
        actor_count: 15,
        actor_names: ['Sarah Johnson', 'Mike Chen', 'Alex Rodriguez'],
        actor: { full_name: 'Francis Chukwuma' },
        type: 'post_like'
      }
    ];

    try {
      for (const notification of mockNotifications) {
        const batchInfo = notificationBatchManager.getBatchDisplayInfo(notification as any);
        const actionText = notificationBatchManager.getBatchedActionText(notification as any);
        
        console.log(`📊 Batch Info:`, {
          displayText: batchInfo.displayText,
          actionText: actionText,
          totalCount: batchInfo.totalCount
        });
      }

      console.log('✅ Batch display formatting test completed');
    } catch (error) {
      console.error('❌ Batch display formatting test failed:', error);
    }
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Phase 2.5 Smart Batching System Tests...');
    console.log('='.repeat(60));

    await this.testPostLikeBatching();
    console.log('-'.repeat(40));
    
    await this.testSpaceJoinBatching();
    console.log('-'.repeat(40));
    
    await this.testMentionNoBatching();
    console.log('-'.repeat(40));
    
    await this.testBatchDisplayFormatting();
    console.log('='.repeat(60));
    
    console.log('🎉 All batching system tests completed!');
    console.log('Check your notification center to see the batched notifications.');
  }
}

// Export for console testing
export const batchingTest = new BatchingSystemTest();

// Auto-run if in development
if (process.env.NODE_ENV === 'development') {
  console.log('Phase 2.5 Smart Batching System Test available:');
  console.log('Run: batchingTest.runAllTests()');
}