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
    await Promise.all(
      createdIds.map((id) =>
        admin.auth.admin.deleteUser(id).catch(() => {
          // best-effort; don't fail tests on cleanup
        })
      )
    );
  };

  return { owner, member1, member2, outsider, admin, cleanup };
}
