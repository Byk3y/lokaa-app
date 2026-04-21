# RLS integration test plan

## Why this file exists

Every current test in the repo uses `vi.fn()` mocks. The 12 RLS rollbacks in our
migration history (2025-06 through 2025-09) happened because there was no way
to verify a policy change didn't blank a feed, hide a lesson, or re-introduce a
recursion loop. This document is the plan for the first real integration test
harness that drives the database as a client user, not as the service role.

Not yet implemented. Blocks:

* A couple of hours of scaffolding work (Supabase branch, signed-in clients,
  seed routine, vitest integration config).
* Deciding whether the harness lives in `src/__tests__/integration/` or a
  top-level `tests/` folder — pick one when we start.

## What the harness must prove

The goal is not coverage. It is a small set of end-to-end checks that would
have caught every RLS regression we've shipped.

### 1. Posts — private-space visibility

Seed: one private space, owner A, members B and C, and outsider D. Each member
writes one post.

Assertions:

* A can SELECT all four posts (owner).
* B can SELECT A's, B's, and C's posts (member).
* C can SELECT A's, B's, and C's posts (member).
* D cannot SELECT any of them and receives zero rows, not an error.

This test alone would have caught the `posts_select_simple` bug we fixed in
migration `20260421081852` and anything similar in the future.

### 2. Posts — public-space visibility

Same as above but `is_private = false`. Assert: D (non-member) can SELECT all
four posts. B/C can still SELECT all four.

### 3. Space members — no recursion

Seed: 20 members in one space. SELECT all from `space_members` as a member.
Assert: returns in <200ms, not a recursion error. This is the canary for the
RLS recursion cycle that bit us five times in 2025.

### 4. Classroom paywall — open course

Seed: open course with one published module and one published lesson, two
paragraphs in `lesson_content_blocks`. Members B and C of the space.

Assertions:

* B and C can SELECT the module, the lesson, and both content blocks.
* Outsider D (not a space member) sees zero rows.
* Course creator A can SELECT everything including a separate *unpublished*
  lesson that B/C cannot see.

### 5. Classroom paywall — paid course, no enrollment

Seed: same as above but `access_type = 'paid'`. B is enrolled (row in
`course_enrollments`), C is not.

Assertions:

* A (creator) sees all content including unpublished drafts.
* B (enrolled member) sees published module/lesson/content_blocks.
* C (space member, not enrolled) sees **zero** published lesson rows and zero
  content blocks. The courses row itself is visible (discovery) but nothing
  under it.
* D (outsider) sees zero rows everywhere.

This is the test the product depends on most. Ship nothing classroom-related
without it green.

### 6. Space-load RPC path

Drive `get_space_by_subdomain`, `get_user_spaces_with_memberships`, and
`get_public_spaces` as A/B/C/D. Assert each returns the expected shape and
cannot leak private spaces to D.

### 7. Presence write

Call `update_space_presence(user_id, space_id)` as B. Assert:

* `space_members.is_online` flips to true for B in the target space.
* `space_members.is_online` flips to false for B in every other space.
* Calling with someone else's user_id raises `Unauthorized`.

### 8. Paywall enrollment bypass attempt

As D (not a space member), attempt to INSERT into `course_enrollments`
directly. Assert: RLS denies the insert. This closes the "client sends an
INSERT from the browser with their own user_id" attack.

## Harness shape

```
tests/integration/
  setup.ts              # creates 4 test users, signs them in, returns 4 clients
  seed.ts               # space + members + courses + posts fixtures
  rls-posts.test.ts     # #1, #2
  rls-recursion.test.ts # #3
  rls-classroom.test.ts # #4, #5, #8
  rls-space-load.test.ts # #6
  rls-presence.test.ts  # #7
```

### Setup skeleton

```ts
// tests/integration/setup.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_INT_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_INT_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_INT_SERVICE_ROLE_KEY!;

export interface TestUsers {
  owner:   SupabaseClient; // creator of spaces & courses
  member1: SupabaseClient;
  member2: SupabaseClient;
  outsider: SupabaseClient;
  admin:   SupabaseClient; // service-role client for seeding
}

export async function createTestUsers(): Promise<TestUsers> {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  // Create or reuse four auth users via admin.auth.admin.createUser, then
  // sign each in with password to obtain a per-user anon-key client.
  // ...
}
```

The signed-in client uses the anon key, which forces every query through RLS
exactly as a browser session would.

### Where the DB lives

Use the Supabase MCP to create a branch against our project, apply all
migrations, then run tests against the branch. Drop the branch on teardown.
Commands:

```bash
# pseudo-workflow
branch=$(supabase-mcp create_branch --name integration-test-$(date +%s))
SUPABASE_INT_URL=<branch url>  \
SUPABASE_INT_ANON_KEY=<anon key> \
SUPABASE_INT_SERVICE_ROLE_KEY=<service role> \
  vitest run tests/integration
supabase-mcp delete_branch "$branch"
```

A single `vitest` config file with a `integration` project entry keeps these
tests out of `npm run test` by default. Only CI and the pre-ship check run
them.

## Success criteria

* Every test passes on a clean branch.
* Any PR that modifies `supabase/migrations/**` triggers the integration run
  in CI.
* Running the full suite takes under two minutes.
