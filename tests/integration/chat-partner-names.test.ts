import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestUsers, hasIntegrationEnv, type TestUsers } from './setup';

// Regression test for the "Unknown User" chat bug.
//
// user_conversations_secure is a SECURITY DEFINER view that resolves the
// OTHER participant in a conversation for display in the chat list. The
// view must work even when the caller no longer shares a space with the
// partner — otherwise users see "Unknown User" for anyone they've drifted
// apart from.
//
// Migration 20260421135941_fix_user_conversations_secure_definer reverted
// this view to SECURITY DEFINER after an earlier pass (D3) switched it to
// SECURITY INVOKER, which made users RLS filter the lookup and broke
// partner display. This test locks that guarantee in.

describe.skipIf(!hasIntegrationEnv)('chat: partner names survive shared-space removal', () => {
  let users: TestUsers;
  const stamp = Date.now();
  let spaceId: string;
  let conversationId: string;

  beforeAll(async () => {
    users = await createTestUsers(`chat-partner-${stamp}`);
    const admin = users.admin;

    // Bootstrap a space both users briefly share.
    const { data: space } = await admin
      .from('spaces')
      .insert({
        name: `Chat Partner ${stamp}`,
        subdomain: `chat-partner-${stamp}`,
        owner_id: users.owner.id,
        is_private: false,
        pricing_type: 'free',
      })
      .select('id')
      .single();
    spaceId = space!.id as string;

    await admin.from('space_members').insert([
      { space_id: spaceId, user_id: users.member1.id, role: 'member', status: 'active' },
    ]);

    // Start a DM between owner and member1 while they share the space.
    // get_or_create_conversation runs as SECURITY DEFINER and returns the id.
    const { data: convId, error } = await users.owner.client.rpc('get_or_create_conversation', {
      user1: users.owner.id,
      user2: users.member1.id,
    });
    if (error) throw error;
    conversationId = convId as string;

    // Now remove member1 from the space. Soft delete (status='inactive')
    // is how the leaveSpace service handles it.
    await admin
      .from('space_members')
      .update({ status: 'inactive' })
      .eq('space_id', spaceId)
      .eq('user_id', users.member1.id);
  });

  afterAll(async () => {
    const admin = users.admin;
    if (conversationId) {
      await admin.from('chat_messages').delete().eq('conversation_id', conversationId).then(() => {}, () => {});
      await admin.from('chat_participants').delete().eq('conversation_id', conversationId).then(() => {}, () => {});
      await admin.from('chat_conversations').delete().eq('id', conversationId).then(() => {}, () => {});
    }
    if (spaceId) {
      await admin.from('space_access').delete().eq('space_id', spaceId).then(() => {}, () => {});
      await admin.from('space_user_points').delete().eq('space_id', spaceId).then(() => {}, () => {});
      await admin.from('space_notification_preferences').delete().eq('space_id', spaceId).then(() => {}, () => {});
      await admin.from('membership_history').delete().eq('space_id', spaceId).then(() => {}, () => {});
      await admin.from('space_members').delete().eq('space_id', spaceId).then(() => {}, () => {});
      await admin.from('space_categories').delete().eq('space_id', spaceId).then(() => {}, () => {});
      await admin.from('space_setup').delete().eq('space_id', spaceId).then(() => {}, () => {});
      await admin.from('spaces').delete().eq('id', spaceId).then(() => {}, () => {});
    }
    await users.cleanup();
  });

  it('owner still sees member1 as the conversation partner after member1 leaves the space', async () => {
    const { data: rows, error } = await users.owner.client
      .from('user_conversations_secure')
      .select('conversation_id, other_participants')
      .eq('conversation_id', conversationId);

    expect(error).toBeNull();
    expect(rows).toBeTruthy();
    expect(rows!.length).toBeGreaterThan(0);

    // The view returns one row per (user, conversation). The owner's row
    // should have member1 in other_participants with a resolved name.
    // View shape (per pg_get_viewdef): {user_id, full_name, avatar_url,
    // profile_url, last_seen_at, is_online}.
    const row = rows![0];
    const others = row.other_participants as Array<{
      user_id: string;
      full_name?: string | null;
      avatar_url?: string | null;
    }> | null;

    expect(others).toBeTruthy();
    expect(Array.isArray(others)).toBe(true);
    expect(others!.length).toBe(1);

    const partner = others![0];
    // The regression path was the view returning no row at all — RLS
    // filtered out the partner lookup and the client rendered "Unknown
    // User" as a fallback. The guarantee we need: the row IS returned,
    // keyed to the right user. full_name existing as a string (even if
    // empty for freshly-created test users whose public.users row
    // hasn't been enriched) is sufficient proof the view resolved the
    // user record — the regression made this null/missing entirely.
    expect(partner.user_id).toBe(users.member1.id);
    expect(typeof partner.full_name).toBe('string');
  });

  it('member1 still sees owner as the conversation partner even though they left the space', async () => {
    // Symmetric assertion from member1's side — should work identically
    // because SECURITY DEFINER is what makes this robust.
    const { data: rows, error } = await users.member1.client
      .from('user_conversations_secure')
      .select('conversation_id, other_participants')
      .eq('conversation_id', conversationId);

    expect(error).toBeNull();
    expect(rows).toBeTruthy();
    expect(rows!.length).toBeGreaterThan(0);

    const others = rows![0].other_participants as Array<{ user_id: string; full_name?: string | null }> | null;
    expect(others).toBeTruthy();
    expect(others!.length).toBe(1);
    expect(others![0].user_id).toBe(users.owner.id);
    expect(typeof others![0].full_name).toBe('string');
  });
});
