# Pre-launch checklist

Things that were intentionally deferred during the pre-launch hardening pass
and need to happen before (or shortly after) you put Lokaa in front of real
users. Ordered roughly by "will bite you first."

## Must do before opening the doors

### 1. Upgrade Supabase project from Free → Pro, then flip leaked-password protection

The advisor warning `auth_leaked_password_protection` can't be closed on the
Free plan. On Pro or higher:

1. Dashboard → Authentication → Providers → click **Email**.
2. Scroll down to **"Prevent the use of leaked passwords."**
3. Toggle on, save.

Direct link:
`https://supabase.com/dashboard/project/nmddvthcsyppyjncqfsk/auth/providers?provider=Email`

Docs: <https://supabase.com/docs/guides/auth/password-security>

Uses the HaveIBeenPwned Pwned Passwords API.

### 2. Stand up the RLS integration test harness against a Supabase branch

Scaffold is at `tests/integration/` (README in the same folder). What's left:

1. Create a long-lived test branch via the Supabase MCP
   (`mcp__supabase__create_branch`) or Dashboard → Branches.
2. Grab the branch's URL, anon key, and service-role key.
3. Set them locally as `SUPABASE_INT_URL`, `SUPABASE_INT_ANON_KEY`,
   `SUPABASE_INT_SERVICE_ROLE_KEY`.
4. Run `npm run test:integration`. The proof-of-concept test
   (`tests/integration/rls-posts.test.ts`) should pass.
5. Wire the command into CI as a required gate for any PR that touches
   `supabase/migrations/**`.
6. Extend with the eight scenarios from
   `docs/guides/integration-test-plan.md` — add one test file at a time.

Blocks several other items below (don't tighten RLS without the safety net).

### 3. Verify the three hardened surfaces actually work end-to-end

Pre-launch smoke test, manually in the browser:

* **Private-space feed**: flip a space to `is_private = true`, invite a
  second member, confirm both see each other's posts. (Fixed in migration
  `20260421081852`; the integration test from #2 would automate this.)
* **Classroom paywall**: mark a course `access_type = 'paid'`, add a
  non-enrolled member, confirm they see the course card but no lessons or
  content blocks. Creator/admin still sees drafts. (Migration
  `20260421082141`.)
* **Chat partner names**: confirm names still appear for DM partners who
  don't currently share a space with you. (Reverted via migration
  `20260421135941`.)

### 4. Wire up payments before enabling paid courses in the UI

Today, `course_enrollments` has `FOR INSERT WITH CHECK (user_id =
auth.uid() AND check_is_course_member(course_id, auth.uid()))` — which
means any authenticated space member can self-insert an enrollment row,
paid or not. That's fine pre-launch (no real payments) but becomes the
paywall's defeat device the moment you ship a "Pay" button.

Before shipping payments:

1. Implement a payment-completion Edge Function that runs with
   `service_role` (bypasses RLS) and inserts the enrollment row only after
   Stripe/whoever confirms.
2. Replace the current `course_enrollments_insert_v2` policy with one that
   either forbids client-side inserts for paid courses (check the
   `courses.access_type`) or restricts insert to the edge function's role.
3. Add an integration test asserting that a non-payment client insert is
   rejected for paid courses.

## Should do shortly after launch

### 5. Tighten storage upload scoping

Pre-launch we kept three authenticated-INSERT policies very permissive:

* `space_media_authenticated_upload`: any authenticated user can insert
  into `space-media`. Should be gated on space membership.
* `Allow any authenticated user to space-covers` / `upload to space-icons`:
  any authenticated user can upload a cover/icon to any space. Should be
  gated on "is space owner."
* `Allow authenticated users to upload` (`media` bucket): any authenticated
  user. Acceptable if the bucket has no sensitive user data, but worth
  re-evaluating once real user media starts flowing.

Each tightening needs integration tests from #2 first.

### 6. Product decision: canonical URL scope for profiles

Current behavior: `/profile/:slug` is inside `ProtectedRoute`, so signed-out
visitors get bounced to login. Discussion from mid-session confirmed Skool
does the same (profile details are not public, communities are). If you
later decide to expose a public profile shell for SEO / invite links:

1. Move `/profile/:slug` outside the `ProtectedRoute`.
2. Add a `public_profile_view` that exposes only name + avatar + bio (not
   email, activity, etc.), served via a `SECURITY DEFINER` function or a
   narrowed RLS.
3. Update the existing integration tests for profile access to cover the
   anonymous case.

### 7. Space-load client consolidation

Full design in `docs/guides/space-load-consolidation.md`. Week of focused
work. Don't start until #2 is live.

### 8. Re-run advisors monthly until they stay at green

Remaining intentional findings (known, documented):

* `security_definer_view` on `user_conversations_secure` — deliberate for
  chat partner display. Do not "fix" by switching to `security_invoker`;
  that's what caused the Unknown User regression earlier.
* `auth_leaked_password_protection` — closed by #1 above.

Everything else should stay at zero. If something new appears, investigate
before dismissing.

## User-side toggles that this session couldn't automate

The only items that require you (not Claude) in the Supabase Dashboard:

* Upgrade plan (Free → Pro).
* Flip leaked-password-protection toggle (#1).
* Create the integration-test branch (#2), or you can let me create it via
  the MCP during the next working session if you want to keep it in code.

Everything else in this checklist is SQL + code that any future session can
execute.
