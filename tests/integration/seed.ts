import type { SupabaseClient } from '@supabase/supabase-js';
import type { TestUsers } from './setup';

export interface SeededSpace {
  spaceId: string;
  posts: { ownerId: string; authorId: string; postId: string }[];
  cleanup: () => Promise<void>;
}

// Seed a private space with the three member users (owner + member1 +
// member2) and one post from each. The outsider is intentionally NOT a
// member, so RLS assertions can verify they see nothing.
export async function seedPrivateSpaceWithPosts(
  users: TestUsers,
  subdomain: string
): Promise<SeededSpace> {
  const admin = users.admin;

  const { data: space, error: spaceErr } = await admin
    .from('spaces')
    .insert({
      name: `Integration: ${subdomain}`,
      subdomain,
      description: 'RLS integration test fixture',
      owner_id: users.owner.id,
      is_private: true,
      pricing_type: 'free',
    })
    .select('id')
    .single();
  if (spaceErr) throw spaceErr;

  const spaceId = space.id as string;

  await admin.from('space_members').insert([
    { space_id: spaceId, user_id: users.owner.id, role: 'admin', status: 'active' },
    { space_id: spaceId, user_id: users.member1.id, role: 'member', status: 'active' },
    { space_id: spaceId, user_id: users.member2.id, role: 'member', status: 'active' },
  ]);

  const { data: posts, error: postsErr } = await admin
    .from('posts')
    .insert([
      { space_id: spaceId, user_id: users.owner.id,   content: 'post from owner' },
      { space_id: spaceId, user_id: users.member1.id, content: 'post from member1' },
      { space_id: spaceId, user_id: users.member2.id, content: 'post from member2' },
    ])
    .select('id, user_id');
  if (postsErr) throw postsErr;

  const cleanup = async () => {
    await admin.from('posts').delete().eq('space_id', spaceId);
    await admin.from('space_members').delete().eq('space_id', spaceId);
    await admin.from('spaces').delete().eq('id', spaceId);
  };

  return {
    spaceId,
    posts: posts.map((p) => ({
      ownerId: users.owner.id,
      authorId: p.user_id as string,
      postId: p.id as string,
    })),
    cleanup,
  };
}

// Helper: count rows an anon-key client can see for a given space.
export async function countVisiblePosts(
  client: SupabaseClient,
  spaceId: string
): Promise<number> {
  const { count, error } = await client
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('space_id', spaceId);
  if (error) throw error;
  return count ?? 0;
}
