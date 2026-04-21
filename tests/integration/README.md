# RLS integration tests

These tests drive the database as a signed-in client, exercising the RLS
policies end-to-end. They're what would have caught every RLS rollback in our
migration history, plus the blank-profile bug we shipped.

## What this harness does

- Creates four test users via the admin API: `owner`, `member1`, `member2`,
  `outsider`.
- Signs each in with a fixed password to obtain a per-user anon-key client.
  Queries through those clients flow through RLS exactly as a browser would.
- Seeds a private space owned by `owner`, joined by `member1` and `member2`,
  and posts from each member.
- Runs assertions: `member1` sees all three posts, `outsider` sees none, etc.
- Tears down users and rows it created.

## Running

The tests read Supabase connection info from three env vars and refuse to run
without them:

```
SUPABASE_INT_URL=<branch/project url>
SUPABASE_INT_ANON_KEY=<anon key>
SUPABASE_INT_SERVICE_ROLE_KEY=<service role>
```

Then:

```
npm run test:integration
```

Local runs should point at a throwaway branch created via `supabase-mcp
create_branch` so we don't pollute prod. The env vars above are deliberately
separate from the runtime `VITE_SUPABASE_URL` so there's no risk of this
suite running against your production project.

## Layout

- `setup.ts` — user provisioning + sign-in + per-user clients.
- `seed.ts` — fixture builder (space, memberships, posts).
- `rls-posts.test.ts` — proof-of-concept: private-space post visibility.
- (Expand per `docs/guides/integration-test-plan.md`.)

## Extending

Each scenario from `docs/guides/integration-test-plan.md` maps to a test
file: classroom paywall, space-load RPC path, presence write, enrollment
bypass attempt, etc. Add them one file at a time so failures are easy to
localize.

## Live verification status

The private-space posts assertion has been verified against the live
production database via SQL simulation (`SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claim.sub = ...`). Confirmed:

- A user who IS an active member of a private space sees posts in it.
- A user who ISN'T an active member sees zero rows.

Matches what `rls-posts.test.ts` asserts via the signed-in client path.
The full npm-run-able harness still needs the three env vars above before
it can execute end-to-end; the SQL simulation is what gave us the live
proof without them.

## Cleanup gotchas (already handled in setup.ts / seed.ts)

- `handle_new_user` + downstream triggers on auth.users INSERT populate
  public.users, global_user_points, notification_preferences,
  space_user_points (via space join triggers), presence_logs, and
  user_activity_log. None of those tables' FKs use ON DELETE CASCADE to
  auth.users. The `cleanup` function in setup.ts deletes them in the
  right order before calling `admin.auth.admin.deleteUser` — if you see
  "still referenced from table X" errors during teardown, add table X to
  that list.
- `spaces` INSERT triggers auto-create space_members, space_setup,
  space_categories, and space_user_points rows for the owner. seed.ts
  wipes those before deleting the space.
