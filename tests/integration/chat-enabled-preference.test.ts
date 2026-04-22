import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestUsers, hasIntegrationEnv, type TestUsers } from './setup';

// Per-space "Allow DMs from members of this group" preference.
//
// Migration 20260421191324_add_chat_enabled_preference_and_enforce_dm_block
// added chat_enabled to space_notification_preferences and taught
// get_or_create_conversation to honor it.
//
// Rules under test:
//   - chat_enabled defaults TRUE (NULL reads as TRUE)
//   - If recipient has chat_enabled=false in ALL spaces they share with
//     the sender, a NEW DM is blocked with error text that the UI can
//     match on.
//   - If recipient shares another space with sender where chat_enabled
//     is still TRUE, the DM is allowed (permissive rule — at least one
//     shared space allows).
//   - EXISTING conversations remain openable even after the toggle.

describe.skipIf(!hasIntegrationEnv)('chat_enabled preference + DM enforcement', () => {
  let users: TestUsers;
  const stamp = Date.now();
  let spaceAId: string;
  let spaceBId: string;

  beforeAll(async () => {
    users = await createTestUsers(`chat-pref-${stamp}`);
    const admin = users.admin;

    const { data: spaceA } = await admin
      .from('spaces')
      .insert({
        name: `Chat Pref A ${stamp}`,
        subdomain: `chat-pref-a-${stamp}`,
        owner_id: users.owner.id,
        is_private: false,
        pricing_type: 'free',
      })
      .select('id')
      .single();
    spaceAId = spaceA!.id as string;

    const { data: spaceB } = await admin
      .from('spaces')
      .insert({
        name: `Chat Pref B ${stamp}`,
        subdomain: `chat-pref-b-${stamp}`,
        owner_id: users.owner.id,
        is_private: false,
        pricing_type: 'free',
      })
      .select('id')
      .single();
    spaceBId = spaceB!.id as string;

    // owner and member1 both in both spaces; member2 only in A.
    await admin.from('space_members').insert([
      { space_id: spaceAId, user_id: users.member1.id, role: 'member', status: 'active' },
      { space_id: spaceAId, user_id: users.member2.id, role: 'member', status: 'active' },
      { space_id: spaceBId, user_id: users.member1.id, role: 'member', status: 'active' },
    ]);
  });

  afterAll(async () => {
    const admin = users.admin;
    const spaceIds = [spaceAId, spaceBId];

    // Wipe chat history between test users.
    const allUserIds = [users.owner.id, users.member1.id, users.member2.id, users.outsider.id];
    const { data: parts } = await admin
      .from('chat_participants')
      .select('conversation_id')
      .in('user_id', allUserIds);
    const convIds = Array.from(new Set((parts ?? []).map((p) => p.conversation_id as string)));
    if (convIds.length) {
      await admin.from('chat_messages').delete().in('conversation_id', convIds).then(() => {}, () => {});
      await admin.from('chat_participants').delete().in('conversation_id', convIds).then(() => {}, () => {});
      await admin.from('chat_conversations').delete().in('id', convIds).then(() => {}, () => {});
    }

    await admin.from('space_notification_preferences').delete().in('space_id', spaceIds).then(() => {}, () => {});
    await admin.from('space_access').delete().in('space_id', spaceIds).then(() => {}, () => {});
    await admin.from('space_user_points').delete().in('space_id', spaceIds).then(() => {}, () => {});
    await admin.from('membership_history').delete().in('space_id', spaceIds).then(() => {}, () => {});
    await admin.from('space_members').delete().in('space_id', spaceIds).then(() => {}, () => {});
    await admin.from('space_categories').delete().in('space_id', spaceIds).then(() => {}, () => {});
    await admin.from('space_setup').delete().in('space_id', spaceIds).then(() => {}, () => {});
    await admin.from('spaces').delete().in('id', spaceIds).then(() => {}, () => {});
    await users.cleanup();
  });

  it('chat_enabled defaults TRUE when no preference row exists', async () => {
    // member2 is in space A, has never toggled anything. DM from owner should work.
    const { data, error } = await users.owner.client.rpc('get_or_create_conversation', {
      user1: users.owner.id,
      user2: users.member2.id,
    });
    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  it('toggle OFF in the only shared space blocks a NEW DM', async () => {
    // member2 disables chat for space A (their only shared space with outsider-as-member-of-A).
    // Actually outsider is NOT a member of A. Set up a fresh sender: put "owner" in a new
    // ephemeral path isn't needed — we already have owner<->member2 chat from the previous
    // test. Use member1 instead, but first tear down any existing owner<->member1 convo so
    // we exercise the NEW-conversation path.

    // Arrange: member1 disables chat in space A AND space B (the two shared with owner).
    await users.member1.client
      .from('space_notification_preferences')
      .upsert(
        [
          { user_id: users.member1.id, space_id: spaceAId, chat_enabled: false },
          { user_id: users.member1.id, space_id: spaceBId, chat_enabled: false },
        ],
        { onConflict: 'user_id,space_id' }
      );

    // Purge any pre-existing owner<->member1 conversation so we test the NEW path.
    const { data: ownerParts } = await users.admin
      .from('chat_participants')
      .select('conversation_id')
      .eq('user_id', users.owner.id);
    const { data: mem1Parts } = await users.admin
      .from('chat_participants')
      .select('conversation_id')
      .eq('user_id', users.member1.id);
    const shared = (ownerParts ?? [])
      .map((p) => p.conversation_id as string)
      .filter((id) => (mem1Parts ?? []).some((p) => p.conversation_id === id));
    if (shared.length) {
      await users.admin.from('chat_messages').delete().in('conversation_id', shared);
      await users.admin.from('chat_participants').delete().in('conversation_id', shared);
      await users.admin.from('chat_conversations').delete().in('id', shared);
    }

    // Act: owner tries to start a brand-new DM with member1.
    const { error } = await users.owner.client.rpc('get_or_create_conversation', {
      user1: users.owner.id,
      user2: users.member1.id,
    });

    // Assert: blocked with the sentinel the client matches on.
    expect(error).not.toBeNull();
    expect(error?.message ?? '').toMatch(/chat_blocked_by_recipient_preference/);
  });

  it('toggle OFF in ONE of multiple shared spaces still allows (permissive rule)', async () => {
    // Flip member1's space B back to TRUE — now they share one blocked space (A)
    // and one allowing space (B). Rule says: allow.
    await users.member1.client
      .from('space_notification_preferences')
      .upsert(
        { user_id: users.member1.id, space_id: spaceBId, chat_enabled: true },
        { onConflict: 'user_id,space_id' }
      );

    const { data, error } = await users.owner.client.rpc('get_or_create_conversation', {
      user1: users.owner.id,
      user2: users.member1.id,
    });
    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  it('existing conversation remains openable even after BOTH shared spaces are blocked', async () => {
    // Previous test created a conversation between owner and member1. Now flip both
    // shared spaces to blocked. Opening the existing conversation should still work.
    await users.member1.client
      .from('space_notification_preferences')
      .upsert(
        [
          { user_id: users.member1.id, space_id: spaceAId, chat_enabled: false },
          { user_id: users.member1.id, space_id: spaceBId, chat_enabled: false },
        ],
        { onConflict: 'user_id,space_id' }
      );

    const { data, error } = await users.owner.client.rpc('get_or_create_conversation', {
      user1: users.owner.id,
      user2: users.member1.id,
    });
    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  it('sender and recipient who share NO space are unaffected by chat_enabled', async () => {
    // outsider is not a member of any of our spaces. member1 having chat_enabled=false
    // in spaceA/spaceB is irrelevant — they share zero spaces. Current open-DM semantics
    // apply (allow).
    const { data, error } = await users.outsider.client.rpc('get_or_create_conversation', {
      user1: users.outsider.id,
      user2: users.member1.id,
    });
    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });
});
