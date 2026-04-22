import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createTestUsers, hasIntegrationEnv, requireEnv, type TestUsers } from './setup';

// Paywall INSERT gate. A prior version of course_enrollments_insert_v2 let
// any active space member self-insert an enrollment row for any course in
// their space — including paid courses. That's a paywall bypass: once
// Stripe ships, a malicious user would run a one-line `.insert()` from the
// browser console and skip payment entirely.
//
// Migration 20260421161545_block_self_enrollment_in_paid_courses.sql
// tightens the policy so self-enroll only works for access_type='open'.
// These tests lock that in.

describe.skipIf(!hasIntegrationEnv)('RLS: course_enrollments INSERT gate', () => {
  let users: TestUsers;
  const subdomain = `rls-enroll-${Date.now()}`;
  let spaceId: string;
  let openCourseId: string;
  let paidCourseId: string;

  beforeAll(async () => {
    users = await createTestUsers(`rls-enroll-${Date.now()}`);
    const admin = users.admin;

    const { data: space } = await admin
      .from('spaces')
      .insert({
        name: `Integration: ${subdomain}`,
        subdomain,
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

    const { data: courses } = await admin
      .from('courses')
      .insert([
        { space_id: spaceId, creator_id: users.owner.id, title: 'Open Course', access_type: 'open', is_published: true },
        { space_id: spaceId, creator_id: users.owner.id, title: 'Paid Course', access_type: 'paid', price: 49, is_published: true },
      ])
      .select('id, access_type');
    openCourseId = courses!.find((c) => c.access_type === 'open')!.id as string;
    paidCourseId = courses!.find((c) => c.access_type === 'paid')!.id as string;
  });

  afterAll(async () => {
    const admin = users.admin;
    await admin.from('course_enrollments').delete().in('course_id', [openCourseId, paidCourseId]).then(() => {}, () => {});
    await admin.from('courses').delete().in('id', [openCourseId, paidCourseId]).then(() => {}, () => {});
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

  it('active space member CAN self-enroll in an OPEN course', async () => {
    const { error } = await users.member1.client
      .from('course_enrollments')
      .insert({ course_id: openCourseId, user_id: users.member1.id });
    expect(error).toBeNull();
  });

  it('active space member CANNOT self-enroll in a PAID course', async () => {
    const { error } = await users.member1.client
      .from('course_enrollments')
      .insert({ course_id: paidCourseId, user_id: users.member1.id });
    // RLS rejection surfaces as a PGRST... / 42501 error, not as silent zero rows.
    expect(error).not.toBeNull();
    // Confirm no row was actually written via a service-role read.
    const { count } = await users.admin
      .from('course_enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', paidCourseId)
      .eq('user_id', users.member1.id);
    expect(count).toBe(0);
  });

  it('outsider CANNOT self-enroll in a PAID course either', async () => {
    const { error } = await users.outsider.client
      .from('course_enrollments')
      .insert({ course_id: paidCourseId, user_id: users.outsider.id });
    expect(error).not.toBeNull();
  });

  it('payment-completion edge function (service_role) CAN enroll a member in a PAID course', async () => {
    // Standing in for the future Stripe/Paystack completion Edge Function.
    const { error } = await users.admin
      .from('course_enrollments')
      .insert({ course_id: paidCourseId, user_id: users.member1.id });
    expect(error).toBeNull();
    // Clean up so the next assertion starts fresh.
    await users.admin
      .from('course_enrollments')
      .delete()
      .eq('course_id', paidCourseId)
      .eq('user_id', users.member1.id);
  });
});
