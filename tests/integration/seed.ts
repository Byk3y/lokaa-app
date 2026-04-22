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

  // The owner is auto-added by triggers on spaces INSERT
  // (auto_add_space_owner_as_admin + on_space_created_add_owner_to_members).
  // Re-inserting them here triggers a unique-constraint violation that
  // fails the ENTIRE batch — including the member rows — so member1 and
  // member2 never become active members. That silently flipped
  // "member sees all 3 posts" into "member sees only their own post".
  // Insert only the non-owner rows.
  await admin.from('space_members').insert([
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
    // Ordered to satisfy FK constraints. Triggers on `spaces` INSERT
    // auto-populate space_members, space_setup, space_categories, and
    // space_user_points for the owner; spaces DELETE leaves those
    // behind, so wipe them first.
    await admin.from('posts').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('space_access').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('space_user_points').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('space_notification_preferences').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('membership_history').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('space_members').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('space_categories').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('space_setup').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('spaces').delete().eq('id', spaceId).then(() => {}, () => {});
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

export interface SeededClassroom {
  spaceId: string;
  openCourseId: string;
  paidCourseId: string;
  openModuleId: string;
  paidModuleId: string;
  openLessonId: string;
  paidLessonId: string;
  cleanup: () => Promise<void>;
}

// Seed a space with one open course and one paid course, each with a
// published module + published lesson. Enrolls member1 in the paid course
// to simulate what the future payment-completion edge function will do;
// member2 is left un-enrolled so RLS assertions can verify they cannot see
// the paid course's modules/lessons.
export async function seedClassroomWithPaywall(
  users: TestUsers,
  subdomain: string
): Promise<SeededClassroom> {
  const admin = users.admin;

  const { data: space, error: spaceErr } = await admin
    .from('spaces')
    .insert({
      name: `Classroom: ${subdomain}`,
      subdomain,
      owner_id: users.owner.id,
      is_private: false,
      pricing_type: 'free',
    })
    .select('id')
    .single();
  if (spaceErr) throw spaceErr;
  const spaceId = space.id as string;

  // Triggers auto-add the owner. Add the two non-owner members.
  await admin.from('space_members').insert([
    { space_id: spaceId, user_id: users.member1.id, role: 'member', status: 'active' },
    { space_id: spaceId, user_id: users.member2.id, role: 'member', status: 'active' },
  ]);

  const { data: courses, error: coursesErr } = await admin
    .from('courses')
    .insert([
      { space_id: spaceId, creator_id: users.owner.id, title: 'Open Course', access_type: 'open', is_published: true },
      { space_id: spaceId, creator_id: users.owner.id, title: 'Paid Course', access_type: 'paid', price: 49, is_published: true },
    ])
    .select('id, access_type');
  if (coursesErr) throw coursesErr;
  const openCourseId = courses.find((c) => c.access_type === 'open')!.id as string;
  const paidCourseId = courses.find((c) => c.access_type === 'paid')!.id as string;

  const { data: modules, error: modulesErr } = await admin
    .from('course_modules')
    .insert([
      { course_id: openCourseId, space_id: spaceId, title: 'Open Module', module_order: 0, is_published: true },
      { course_id: paidCourseId, space_id: spaceId, title: 'Paid Module', module_order: 0, is_published: true },
    ])
    .select('id, course_id');
  if (modulesErr) throw modulesErr;
  const openModuleId = modules.find((m) => m.course_id === openCourseId)!.id as string;
  const paidModuleId = modules.find((m) => m.course_id === paidCourseId)!.id as string;

  const { data: lessons, error: lessonsErr } = await admin
    .from('course_lessons')
    .insert([
      { module_id: openModuleId, title: 'Open Lesson', content_type: 'text', is_published: true },
      { module_id: paidModuleId, title: 'Paid Lesson', content_type: 'text', is_published: true },
    ])
    .select('id, module_id');
  if (lessonsErr) throw lessonsErr;
  const openLessonId = lessons.find((l) => l.module_id === openModuleId)!.id as string;
  const paidLessonId = lessons.find((l) => l.module_id === paidModuleId)!.id as string;

  // Payment-completion stand-in: enroll member1 in the paid course.
  // member2 stays un-enrolled on purpose — they're the paywall test case.
  const { error: enrollErr } = await admin
    .from('course_enrollments')
    .insert({ course_id: paidCourseId, user_id: users.member1.id });
  if (enrollErr) throw enrollErr;

  const cleanup = async () => {
    await admin.from('course_enrollments').delete().in('course_id', [openCourseId, paidCourseId]).then(() => {}, () => {});
    await admin.from('lesson_completions').delete().in('course_id', [openCourseId, paidCourseId]).then(() => {}, () => {});
    await admin.from('course_lessons').delete().in('id', [openLessonId, paidLessonId]).then(() => {}, () => {});
    await admin.from('course_modules').delete().in('id', [openModuleId, paidModuleId]).then(() => {}, () => {});
    await admin.from('courses').delete().in('id', [openCourseId, paidCourseId]).then(() => {}, () => {});
    await admin.from('posts').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('space_access').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('space_user_points').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('space_notification_preferences').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('membership_history').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('space_members').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('space_categories').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('space_setup').delete().eq('space_id', spaceId).then(() => {}, () => {});
    await admin.from('spaces').delete().eq('id', spaceId).then(() => {}, () => {});
  };

  return {
    spaceId,
    openCourseId, paidCourseId,
    openModuleId, paidModuleId,
    openLessonId, paidLessonId,
    cleanup,
  };
}

// Helper: count modules+lessons the given client can see for a course.
export async function countVisibleCourseContent(
  client: SupabaseClient,
  courseId: string
): Promise<{ modules: number; lessons: number }> {
  const [mods, lessons] = await Promise.all([
    client.from('course_modules').select('id', { count: 'exact', head: true }).eq('course_id', courseId),
    client.from('course_lessons').select('id, module_id, course_modules!inner(course_id)', { count: 'exact', head: true })
      .eq('course_modules.course_id', courseId),
  ]);
  if (mods.error) throw mods.error;
  if (lessons.error) throw lessons.error;
  return { modules: mods.count ?? 0, lessons: lessons.count ?? 0 };
}
