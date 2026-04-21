import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestUsers, hasIntegrationEnv, type TestUsers } from './setup';
import {
  countVisibleCourseContent,
  seedClassroomWithPaywall,
  type SeededClassroom,
} from './seed';

// Classroom paywall RLS. Live-verified against production on 2026-04-21
// via SQL simulation — creator saw 2/2/2, enrolled member 2/2/2, un-enrolled
// member 2/1/1 (courses, modules, lessons). This test file reproduces the
// same scenario through the signed-in client path so regressions get caught
// by CI before they reach prod.
//
// Payments aren't integrated yet. The fixture INSERTs a course_enrollments
// row directly via service role to simulate what the future
// payment-completion edge function will do. When payments land, ensure
// course_enrollments_insert_v2 is rewritten to reject client-side inserts
// for paid courses — this test's "enrolled member" case will still pass
// because the service role always bypasses RLS.

describe.skipIf(!hasIntegrationEnv)('RLS: classroom paywall', () => {
  let users: TestUsers;
  let seed: SeededClassroom;
  const subdomain = `rls-paywall-${Date.now()}`;

  beforeAll(async () => {
    users = await createTestUsers(`rls-paywall-${Date.now()}`);
    seed = await seedClassroomWithPaywall(users, subdomain);
  });

  afterAll(async () => {
    await seed?.cleanup();
    await users?.cleanup();
  });

  describe('course discovery (courses table)', () => {
    it('all three members see both courses', async () => {
      for (const client of [users.owner.client, users.member1.client, users.member2.client]) {
        const { count, error } = await client
          .from('courses')
          .select('id', { count: 'exact', head: true })
          .eq('space_id', seed.spaceId);
        expect(error).toBeNull();
        expect(count).toBe(2);
      }
    });
  });

  describe('open course (access_type=open)', () => {
    it('space members see its module and lesson', async () => {
      for (const client of [users.owner.client, users.member1.client, users.member2.client]) {
        const { modules, lessons } = await countVisibleCourseContent(client, seed.openCourseId);
        expect(modules).toBe(1);
        expect(lessons).toBe(1);
      }
    });

    it('non-member sees zero modules and lessons', async () => {
      const { modules, lessons } = await countVisibleCourseContent(
        users.outsider.client,
        seed.openCourseId
      );
      expect(modules).toBe(0);
      expect(lessons).toBe(0);
    });
  });

  describe('paid course (access_type=paid)', () => {
    it('creator sees its module and lesson', async () => {
      const { modules, lessons } = await countVisibleCourseContent(
        users.owner.client,
        seed.paidCourseId
      );
      expect(modules).toBe(1);
      expect(lessons).toBe(1);
    });

    it('enrolled member sees its module and lesson', async () => {
      const { modules, lessons } = await countVisibleCourseContent(
        users.member1.client,
        seed.paidCourseId
      );
      expect(modules).toBe(1);
      expect(lessons).toBe(1);
    });

    it('un-enrolled member sees ZERO modules and lessons (paywall holds)', async () => {
      const { modules, lessons } = await countVisibleCourseContent(
        users.member2.client,
        seed.paidCourseId
      );
      expect(modules).toBe(0);
      expect(lessons).toBe(0);
    });

    it('non-member sees ZERO modules and lessons', async () => {
      const { modules, lessons } = await countVisibleCourseContent(
        users.outsider.client,
        seed.paidCourseId
      );
      expect(modules).toBe(0);
      expect(lessons).toBe(0);
    });
  });
});
