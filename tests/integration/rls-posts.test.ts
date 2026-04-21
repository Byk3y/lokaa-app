import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestUsers, hasIntegrationEnv, type TestUsers } from './setup';
import { countVisiblePosts, seedPrivateSpaceWithPosts, type SeededSpace } from './seed';

// Proof-of-concept integration test. Recreates the private-space visibility
// scenario that motivated migration 20260421081852. Running this against any
// future posts_select_* rewrite will catch the "blank feed for private-space
// members" regression in seconds instead of in production.

describe.skipIf(!hasIntegrationEnv)('RLS: posts in a private space', () => {
  let users: TestUsers;
  let seed: SeededSpace;
  const subdomain = `rls-posts-${Date.now()}`;

  beforeAll(async () => {
    users = await createTestUsers(`rls-posts-${Date.now()}`);
    seed = await seedPrivateSpaceWithPosts(users, subdomain);
  });

  afterAll(async () => {
    await seed?.cleanup();
    await users?.cleanup();
  });

  it('owner sees all three posts', async () => {
    expect(await countVisiblePosts(users.owner.client, seed.spaceId)).toBe(3);
  });

  it('active member sees all three posts', async () => {
    expect(await countVisiblePosts(users.member1.client, seed.spaceId)).toBe(3);
    expect(await countVisiblePosts(users.member2.client, seed.spaceId)).toBe(3);
  });

  it('non-member sees zero posts in a private space', async () => {
    expect(await countVisiblePosts(users.outsider.client, seed.spaceId)).toBe(0);
  });
});
