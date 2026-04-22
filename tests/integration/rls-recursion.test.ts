import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestUsers, hasIntegrationEnv, type TestUsers } from './setup';

// RLS recursion canary. The space_members / posts / spaces policies have
// a history of circular dependencies — in 2025 this class of bug hit
// production 12 times (`fix_*_recursion` / `revert_*_recursion` migrations).
// The final fix moved everything through SECURITY DEFINER helper functions
// (check_is_space_member / check_is_space_admin). This test exists to
// catch any regression that reintroduces a cycle.
//
// Live-verified 2026-04-21 via SQL simulation with 15 members in a private
// space: member_reads_space_members returned 15 rows in 1ms,
// member_reads_posts returned 2 rows in 4ms. Baseline for the timeout
// thresholds in this file.

describe.skipIf(!hasIntegrationEnv)('RLS: recursion canary', () => {
  const MEMBER_COUNT = 15;
  let users: TestUsers;
  let spaceId: string;
  const extraUserIds: string[] = [];

  beforeAll(async () => {
    users = await createTestUsers(`rls-recursion-${Date.now()}`);
    const admin = users.admin;

    const { data: space } = await admin
      .from('spaces')
      .insert({
        name: `Recursion canary ${Date.now()}`,
        subdomain: `rls-recursion-${Date.now()}`,
        owner_id: users.owner.id,
        is_private: true,
        pricing_type: 'free',
      })
      .select('id')
      .single();
    spaceId = space!.id as string;

    // createTestUsers only provisions 4; top up to MEMBER_COUNT so we
    // actually exercise a non-trivial set of rows.
    const extras = MEMBER_COUNT - 4;
    for (let i = 0; i < extras; i++) {
      const email = `rls-recursion-extra-${Date.now()}-${i}@integration.invalid`;
      const { data } = await admin.auth.admin.createUser({
        email,
        password: 'test-password',
        email_confirm: true,
      });
      if (data?.user) extraUserIds.push(data.user.id);
    }

    const memberRows = [
      users.member1.id,
      users.member2.id,
      users.outsider.id, // in this test we make the "outsider" a member too
      ...extraUserIds,
    ].map((user_id) => ({ space_id: spaceId, user_id, role: 'member' as const, status: 'active' as const }));
    await admin.from('space_members').insert(memberRows);

    await admin.from('posts').insert([
      { space_id: spaceId, user_id: users.owner.id, title: 'Canary 1', content: 'canary post 1' },
      { space_id: spaceId, user_id: users.member1.id, title: 'Canary 2', content: 'canary post 2' },
    ]);
  });

  afterAll(async () => {
    const admin = users.admin;
    await admin.from('posts').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('notifications').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('space_access').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('space_user_points').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('space_notification_preferences').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('membership_history').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('space_members').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('space_categories').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('space_setup').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('spaces').delete().eq('id', spaceId).then(() => {}, () => {});

    // Wipe the extra top-up users' cross-schema rows, then the users.
    if (extraUserIds.length) {
      const tables = [
        'notification_preferences',
        'space_notification_preferences',
        'global_user_points',
        'space_user_points',
        'user_badges',
        'user_activity_log',
        'presence_logs',
        'presence_state',
        'presence',
        'space_access',
      ];
      for (const table of tables) {
        await admin.from(table).delete().in('user_id', extraUserIds).then(() => {}, () => {});
      }
      await admin.from('users').delete().in('id', extraUserIds).then(() => {}, () => {});
      await Promise.all(extraUserIds.map((id) => admin.auth.admin.deleteUser(id).then(() => {}, () => {})));
    }
    await users.cleanup();
  });

  // If the RLS policies ever re-cycle, these queries will either throw
  // a stack-depth error or run for many seconds. Generous but still
  // aggressive thresholds so the test catches obvious regressions.
  const SLOW_THRESHOLD_MS = 2000;

  it('active member can SELECT space_members without recursion (<2s)', async () => {
    const started = Date.now();
    const { data, error } = await users.member1.client
      .from('space_members')
      .select('id')
      .eq('space_id', spaceId);
    const elapsed = Date.now() - started;

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThanOrEqual(MEMBER_COUNT);
    expect(elapsed).toBeLessThan(SLOW_THRESHOLD_MS);
  });

  it('active member can SELECT posts without recursion (<2s)', async () => {
    const started = Date.now();
    const { data, error } = await users.member1.client
      .from('posts')
      .select('id')
      .eq('space_id', spaceId);
    const elapsed = Date.now() - started;

    expect(error).toBeNull();
    expect(data?.length).toBe(2);
    expect(elapsed).toBeLessThan(SLOW_THRESHOLD_MS);
  });

  it('active member can SELECT the space row without recursion (<2s)', async () => {
    const started = Date.now();
    const { data, error } = await users.member1.client
      .from('spaces')
      .select('id, subdomain')
      .eq('id', spaceId)
      .single();
    const elapsed = Date.now() - started;

    expect(error).toBeNull();
    expect(data?.id).toBe(spaceId);
    expect(elapsed).toBeLessThan(SLOW_THRESHOLD_MS);
  });
});
