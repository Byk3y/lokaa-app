-- Close a pre-launch paywall gap.
--
-- course_enrollments_insert_v2 permits any active space member to self-
-- INSERT an enrollment row for ANY course in their space — INCLUDING paid
-- courses. Live-verified 2026-04-21: a space member can run a direct
-- `.insert()` from the browser and end up with a valid enrollment for a
-- paid course without any payment.
--
-- Tighten the INSERT CHECK so self-enrollment is allowed ONLY for open
-- courses. Paid-course enrollments must go through service_role (i.e. the
-- payment-completion Edge Function we'll ship with Stripe/Paystack).

DROP POLICY IF EXISTS "course_enrollments_insert_v2" ON public.course_enrollments;

CREATE POLICY "course_enrollments_insert_v2" ON public.course_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.check_is_course_member(course_id, (SELECT auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_enrollments.course_id
        AND (c.access_type = 'open' OR c.access_type IS NULL)
    )
  );

COMMENT ON POLICY "course_enrollments_insert_v2" ON public.course_enrollments IS
  'Self-enroll is allowed ONLY for open courses. Paid-course enrollments '
  'must be inserted by the payment-completion Edge Function running as '
  'service_role. The access_type = open OR NULL clause is deliberate so '
  'that rows created before access_type was populated keep working.';
