# Testing Guide

Last reviewed: 2026-06-09.

## Default Test Commands

```bash
npm run test             # Unit/component tests with Vitest
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm run test:security    # Security-focused tests
npm run test:indexeddb   # IndexedDB-focused tests
npm run test:integration # Live Supabase integration/RLS tests
```

For narrow MVP checks:

```bash
npm run test:mvp
npm run lint:mvp
```

## What To Run

- UI/component change: run the focused test file if one exists, then
  `npm run test`.
- Utility/service change: run that service's test file, then `npm run test`.
- Security-sensitive change: run `npm run test:security`.
- IndexedDB/cache change: run `npm run test:indexeddb`.
- Supabase migration, RLS policy, `SECURITY DEFINER` function, or DB view
  change: run or extend `npm run test:integration`.

## Integration Tests Warning

`npm run test:integration` is not a normal local smoke test. It uses
`SUPABASE_INT_SERVICE_ROLE_KEY`, creates real auth users, seeds real rows, and
then tears them down. Use a Supabase branch or throwaway project when possible.

Required env vars:

```bash
SUPABASE_INT_URL=<branch/project-url>
SUPABASE_INT_ANON_KEY=<anon-key>
SUPABASE_INT_SERVICE_ROLE_KEY=<service-role-key>
```

Read [tests/integration/README.md](../../tests/integration/README.md) before
running the suite.

## Manual Smoke Tests

Use these after broad UI, routing, auth, or Supabase changes:

- Sign up / log in / log out.
- Open `/discover`.
- Open a public space invite route: `/:subdomain`.
- Open a protected space route: `/:subdomain/space`.
- Create a post with text and one attachment.
- Open a post detail route: `/:subdomain/post/:postSlug`.
- Open notifications on desktop and mobile widths.
- Open chat and confirm partner names resolve.
- Open classroom content for open and paid courses if relevant.

## Known Gap

Project-wide `npm run type-check` is still a separate quality track from the
Vite build. The launch checklist tracks the remaining type-cleanliness debt.
