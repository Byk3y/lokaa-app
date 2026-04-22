import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Read env up-front so tests can bail cleanly with one clear message
// instead of cascading supabase auth errors.
const SUPABASE_URL = process.env.SUPABASE_INT_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_INT_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_INT_SERVICE_ROLE_KEY;

export const hasIntegrationEnv =
  !!SUPABASE_URL && !!SUPABASE_ANON_KEY && !!SUPABASE_SERVICE_ROLE_KEY;

export function requireEnv(): {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
} {
  if (!hasIntegrationEnv) {
    throw new Error(
      'Integration tests require SUPABASE_INT_URL, SUPABASE_INT_ANON_KEY, ' +
        'and SUPABASE_INT_SERVICE_ROLE_KEY. Run against a branch, not prod.'
    );
  }
  return {
    url: SUPABASE_URL!,
    anonKey: SUPABASE_ANON_KEY!,
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY!,
  };
}

export interface TestUsers {
  owner: TestUser;
  member1: TestUser;
  member2: TestUser;
  outsider: TestUser;
  admin: SupabaseClient;
  cleanup: () => Promise<void>;
}

export interface TestUser {
  id: string;
  email: string;
  client: SupabaseClient;
}

const TEST_PASSWORD = 'integration-test-password-not-a-secret';

// Provision four signed-in clients. Idempotent: re-uses users if they exist,
// creates them otherwise. Returns a cleanup function that deletes every user
// (and their data via CASCADE) when the suite finishes.
export async function createTestUsers(prefix: string): Promise<TestUsers> {
  const { url, anonKey, serviceRoleKey } = requireEnv();

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const roles = ['owner', 'member1', 'member2', 'outsider'] as const;
  const createdIds: string[] = [];

  const provision = async (role: (typeof roles)[number]): Promise<TestUser> => {
    const email = `${prefix}-${role}@integration-test.invalid`;

    // Try to create; if already exists, look it up instead.
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: TEST_PASSWORD,
      email_confirm: true,
    });

    let id: string;
    if (createErr && !/already.+registered/i.test(createErr.message)) {
      throw createErr;
    }
    if (created?.user) {
      id = created.user.id;
      createdIds.push(id);
    } else {
      const { data: existing } = await admin.auth.admin.listUsers();
      const found = existing?.users.find((u) => u.email === email);
      if (!found) throw new Error(`Could not provision ${email}`);
      id = found.id;
    }

    const client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signInErr } = await client.auth.signInWithPassword({
      email,
      password: TEST_PASSWORD,
    });
    if (signInErr) throw signInErr;

    return { id, email, client };
  };

  const [owner, member1, member2, outsider] = await Promise.all(
    roles.map(provision)
  );

  const cleanup = async () => {
    // The handle_new_user trigger + downstream triggers populate several
    // public-schema tables (users, global_user_points, notification_prefs,
    // presence_logs, user_activity_log, space_user_points, etc.) whose FKs
    // point at auth.users WITHOUT ON DELETE CASCADE. admin.auth.admin
    // .deleteUser() therefore fails with "still referenced" errors until
    // those rows are removed. Clean them up first, then delete the user.
    const ids = createdIds;
    if (ids.length === 0) return;

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
      'user_follows', // by follower_id / following_id, handled below
      'membership_history',
    ] as const;

    for (const table of tables) {
      if (table === 'user_follows') {
        await admin.from(table).delete().in('follower_id', ids).then(() => {}, () => {});
        await admin.from(table).delete().in('following_id', ids).then(() => {}, () => {});
        continue;
      }
      await admin.from(table).delete().in('user_id', ids).then(() => {}, () => {});
    }
    // public.users.id has a FK to auth.users; delete public.users first.
    await admin.from('users').delete().in('id', ids).then(() => {}, () => {});

    await Promise.all(
      ids.map((id) =>
        admin.auth.admin.deleteUser(id).catch(() => {
          // best-effort; don't fail tests on cleanup
        })
      )
    );
  };

  return { owner, member1, member2, outsider, admin, cleanup };
}
