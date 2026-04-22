# Pre-launch checklist

Things that still need to happen before (or shortly after) putting
Lokaa in front of real users. Ordered roughly by "will bite you
first." Items previously completed in-session have been removed —
consult `git log` for the historical record.

## Must do before opening the doors

### 1. Upgrade Supabase project from Free → Pro, then flip leaked-password protection

The advisor warning `auth_leaked_password_protection` can't be closed
on the Free plan. On Pro or higher:

1. Dashboard → Authentication → Providers → click **Email**.
2. Scroll to **"Prevent the use of leaked passwords."**
3. Toggle on, save.

Docs: <https://supabase.com/docs/guides/auth/password-security>.
Uses the HaveIBeenPwned Pwned Passwords API.

### 2. Stand up the RLS integration test harness against a Supabase branch

Scaffold is at `tests/integration/`. What's left:

1. Create a long-lived test branch via the Supabase MCP
   (`mcp__supabase__create_branch`) or Dashboard → Branches.
2. Grab the branch's URL, anon key, and service-role key.
3. Set them locally as `SUPABASE_INT_URL`, `SUPABASE_INT_ANON_KEY`,
   `SUPABASE_INT_SERVICE_ROLE_KEY`.
4. Run `npm run test:integration`. The existing tests should pass.
5. Wire the command into CI as a required gate for any PR that
   touches `supabase/migrations/**`.
6. Extend with the scenarios from
   `docs/guides/integration-test-plan.md` — one test file at a time.

Blocks several items below (don't tighten RLS without the safety net).

### 3. Verify the three hardened surfaces actually work end-to-end

Pre-launch smoke test, manually in the browser:

* **Private-space feed**: flip a space to `is_private = true`, invite
  a second member, confirm both see each other's posts.
* **Classroom paywall**: mark a course `access_type = 'paid'`, add a
  non-enrolled member, confirm they see the course card but no
  lessons or content. Creator/admin still sees drafts.
* **Chat partner names**: confirm names still appear for DM partners
  who don't currently share a space with you.

### 4. Wire up payments before enabling paid courses in the UI

The paywall INSERT gate is already closed at the DB layer (see
`tests/integration/rls-enrollment.test.ts`). What's still missing:

1. A payment-completion Edge Function (Stripe/Paystack webhook) that
   authenticates the payment, verifies the signature, and inserts the
   `course_enrollments` row as `service_role`.
2. A UI "Enroll" / "Pay" button that calls that Edge Function instead
   of writing to the DB directly.
3. An integration test covering the full payment path
   (webhook → enrollment → lesson visibility).

If anyone accidentally writes a client-side `.insert()` into
`course_enrollments` for a paid course, RLS will reject it with 42501.

## Should do shortly after launch

### 5. Tighten storage upload scoping

Three authenticated-INSERT policies are currently permissive:

* `space_media_authenticated_upload`: any authenticated user can
  insert into `space-media`. Should be gated on space membership.
* `Allow any authenticated user to space-covers` / `upload to space-icons`:
  any authenticated user can upload a cover/icon to any space.
  Should be gated on "is space owner."
* `Allow authenticated users to upload` (`media` bucket): any
  authenticated user. Acceptable if no sensitive user data ends up
  here, but re-evaluate once real user media is flowing.

Each tightening needs integration tests from #2 first.

### 6. Product decision: canonical URL scope for profiles

Current behavior: `/profile/:slug` is inside `ProtectedRoute`, so
signed-out visitors bounce to login. Skool does the same. If you
later decide to expose a public profile shell for SEO / invite links:

1. Move `/profile/:slug` outside `ProtectedRoute`.
2. Add a `public_profile_view` that exposes only name + avatar + bio
   (not email or activity), served via `SECURITY DEFINER` or narrowed
   RLS.
3. Update integration tests for profile access to cover the
   anonymous case.

### 7. Space-load client consolidation

Full design in `docs/guides/space-load-consolidation.md`. Week of
focused work. Don't start until #2 is live.

### 8. Real per-page social unfurls

Invite links (`https://lokaa.app/{subdomain}/about`) currently unfurl
with the generic landing-page card because the SPA's `index.html` is
static and client-side meta updates happen too late for crawlers.
Three ways to fix, in rising order of lift:

1. **Build-time prerender** for a fixed set of public routes (landing,
   /discover, /help). Use `react-snap` or `vite-plugin-prerender`.
   Good for marketing pages; no good for dynamic per-space pages
   since space data isn't known at build time.
2. **CDN edge worker** (Cloudflare Worker / Vercel Edge Function)
   that inspects `User-Agent`, fetches the space row from Supabase
   for crawler requests, and injects per-space `<meta og:*>` tags
   into the HTML before returning. Users still get the SPA. ~1 day
   of work once a CDN is picked.
3. **SSR migration** to Next.js or Remix. Solves it universally but
   is a multi-week rewrite. Not worth it unless SEO becomes a real
   growth lever.

Recommendation: #2.

### 9. Re-run advisors monthly until they stay at green

Intentional findings that should stay (don't "fix"):

* `security_definer_view` on `user_conversations_secure` — deliberate
  for chat partner display. Switching to `security_invoker` is what
  caused the Unknown User regression earlier.
* `auth_leaked_password_protection` — closed by #1 above.

Everything else should stay at zero. If something new appears,
investigate before dismissing.

## Known debt (not launch-blocking)

### Project-wide type cleanliness

`npx tsc --noEmit -p tsconfig.app.json` produces **~2990 error lines**
across ~200+ files. Top offenders are test files
(`CourseGrid.test.tsx`: 106, `CourseCard.test.tsx`: 76,
`ClassroomWorkflows.test.tsx`: 48), plus production files with real
`string | null | undefined` vs `string | null` mismatches from
generated Supabase types.

Vite uses esbuild (transpile only), so the prod build ships fine. But
`tsc` can't be used as a correctness gate today and CI can't enforce
it. Post-launch: spend a week on a dedicated pass — fix the top 10
files, add `tsc --noEmit` to CI as required, chip away at the rest.

### Orphaned edge functions (`send-welcome-email` hardening follow-ups)

`send-welcome-email` deployed v10 has full hardening (JWT role check,
payload validation, 5/hour rate limit, generic errors). The only
remaining task is the post-launch tightening of the other two live
functions that already have JWT + CSRF gates — add the rate-limit
wrapper when convenient.

## User-side toggles

Items that require you (not Claude) in a dashboard or env var. One
place to look for everything.

### Supabase Dashboard

1. **Upgrade plan (Free → Pro).** Prerequisite for the
   leaked-password toggle in #1.
2. **Flip leaked-password-protection toggle** (see #1).
3. **Create an integration-test branch** (see #2). Or let a future
   session create it via the MCP.
4. **Delete orphaned Edge Functions** (operational cleanup; all are
   either tombstoned or never-called):
   - `seo-metadata-generator` — orphaned, client no longer calls.
   - `advanced-user-analytics` — tombstoned (v6, 410 Gone). **Had a
     data leak in v5** — deletion closes out the endpoint entirely.
   - `user-offline` — tombstoned (v6, 410 Gone).
   - `global-user-offline` — tombstoned (v6, 410 Gone).
   - `csrf` — library module mistakenly deployed as endpoint (no
     `Deno.serve`; does nothing when called).
   - `withSession` — same; also references an undefined symbol.

   Path: Edge Functions → select → Delete.

### Sentry (pre-launch — error tracking is a no-op until set)

Sentry SDK is wired (`src/integrations/sentry.ts`) and bridged into
the existing `errorTracker` + `AuthContext`. The Vite source-map
upload plugin (`@sentry/vite-plugin`) is also wired in
`vite.config.ts` but inert until its env vars are set.

Minimum to light up error tracking:

1. **Create a Sentry project.** sentry.io → Settings → Projects →
   Create Project → React. Free tier is fine for launch.
2. **Copy the DSN.** Format: `https://xxx@oyyy.ingest.sentry.io/zzz`.
   Public (ships in client JS) but still treat as config.
3. **Set `VITE_SENTRY_DSN=<DSN>` on the prod deploy host.** Vercel /
   Netlify / Cloudflare Pages: project env-vars UI.
4. **(Optional) `VITE_APP_VERSION=<git-sha-or-tag>`** for per-release
   tagging. Most hosts expose `VERCEL_GIT_COMMIT_SHA` etc.

To also get readable stack traces (strongly recommended):

5. **Create a Sentry auth token.** sentry.io → Settings → Auth Tokens →
   Create New Token → scopes needed: `project:releases` and
   `project:write`. Keep this one secret — it's not public like the
   DSN, and anyone with it can upload to your Sentry project.
6. **Set these on the prod deploy host (build-time env vars):**
   - `SENTRY_AUTH_TOKEN=<token>` — the secret from step 5.
   - `SENTRY_ORG=<your-org-slug>` — defaults to `lokaa` if unset.
     Override if your Sentry org slug is different.
   - `SENTRY_PROJECT=<your-project-slug>` — defaults to `lokaa-app`.
7. Next deploy will build with sourcemaps, upload them to Sentry,
   then delete them before shipping to the CDN. Verify in the Sentry
   UI → Releases → look for the new release and its source maps.

Plugin behavior:
- If `SENTRY_AUTH_TOKEN` is unset, the plugin is completely inert —
  no sourcemap generation, no upload attempt, no build-time cost.
  Safe for local dev and CI/PR builds that don't need uploads.
- If set, sourcemaps are generated, uploaded, and then deleted from
  the output so they never reach the CDN (avoids leaking original
  source). Build time increases roughly 30%.
