import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestUsers, hasIntegrationEnv, type TestUsers } from './setup';

// Regression test for the titleless-post crash.
//
// `posts.title` is nullable; `notifications.title` is NOT NULL. The old
// `create_post_notifications` trigger copied post.title straight into
// notifications.title, so any post without a title failed with a 23502
// constraint violation and took the entire INSERT with it. Migration
// 20260421185758_fix_post_notifications_titleless_crash.sql falls back
// to an excerpt of the content (then to a generic string).
//
// This test asserts the post actually lands, the notification actually
// fires, and the notification title is non-empty.

describe.skipIf(!hasIntegrationEnv)('notifications trigger: titleless posts', () => {
  let users: TestUsers;
  let spaceId: string;

  beforeAll(async () => {
    users = await createTestUsers(`notif-trigger-${Date.now()}`);
    const admin = users.admin;

    const { data: space } = await admin
      .from('spaces')
      .insert({
        name: `Titleless Check ${Date.now()}`,
        subdomain: `notif-trigger-${Date.now()}`,
        owner_id: users.owner.id,
        is_private: false,
        pricing_type: 'free',
      })
      .select('id')
      .single();
    spaceId = space!.id as string;

    // Add a member so the owner's post actually triggers a notification.
    await admin.from('space_members').insert({
      space_id: spaceId,
      user_id: users.member1.id,
      role: 'member',
      status: 'active',
    });
  });

  afterAll(async () => {
    const admin = users.admin;
    await admin.from('notifications').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('posts').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('space_access').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('space_user_points').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('space_notification_preferences').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('membership_history').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('space_members').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('space_categories').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('space_setup').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('spaces').delete().eq('id', spaceId).then(() => {}, () => {});
    await users.cleanup();
  });

  it('a post with NULL title saves without a notification crash', async () => {
    const { data, error } = await users.admin
      .from('posts')
      .insert({
        space_id: spaceId,
        user_id: users.owner.id,
        title: null,
        content: 'A completely titleless post body that should become the notification title.',
      })
      .select('id')
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();

    const { data: notif } = await users.admin
      .from('notifications')
      .select('title')
      .eq('target_id', data!.id)
      .maybeSingle();

    // Notification fired and has a non-empty title (fallback from content).
    expect(notif).toBeTruthy();
    expect(notif!.title).toBeTruthy();
    expect(notif!.title.length).toBeGreaterThan(0);
  });

  it('a post with an empty-string title also lands', async () => {
    const { error } = await users.admin.from('posts').insert({
      space_id: spaceId,
      user_id: users.owner.id,
      title: '   ',
      content: 'Whitespace-only title should also be treated as missing.',
    });
    expect(error).toBeNull();
  });
});
