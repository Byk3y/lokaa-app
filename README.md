# Lokaa

Lokaa is a Vite + React community app for spaces, posts, classroom content,
chat, notifications, and member profiles. Supabase provides auth, Postgres,
storage, realtime, and edge functions.

Live app: https://lokaa-app.vercel.app

## Current Stack

- React 18, TypeScript, Vite, React Router
- Tailwind CSS, Radix UI, lucide-react
- Supabase Auth, Postgres, Realtime, Storage, Edge Functions
- Zustand for client state
- TanStack Query for server/cache state
- Vitest and Testing Library
- Sentry and PostHog integrations, enabled by environment variables

## Requirements

- Node.js 20 or newer
- npm. Do not use yarn, pnpm, or bun in this repo.
- A Supabase project for local development against real backend data

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local env file. The browser client currently requires:

   ```bash
   VITE_SUPABASE_URL=<your-supabase-url>
   VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
   ```

   Optional client-side env vars used by the app:

   ```bash
   VITE_APP_DOMAIN=https://lokaa-app.vercel.app
   VITE_APP_URL=https://lokaa-app.vercel.app
   VITE_POSTHOG_KEY=<posthog-project-key>
   VITE_POSTHOG_HOST=https://us.posthog.com
   VITE_SENTRY_DSN=<sentry-dsn>
   VITE_SENTRY_ENABLE_IN_DEV=false
   VITE_SHOW_SPACE_CARDS=false
   ```

   Edge functions use server-side Supabase/Resend env vars such as
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`,
   `RESEND_API_KEY`, and `RESEND_AUDIENCE_ID`.

3. Start the dev server:

   ```bash
   npm run dev
   ```

   Vite is configured for `http://localhost:8080` with `strictPort: true`.

## Common Commands

```bash
npm run dev              # Start Vite
npm run dev:clean        # Clear common dev-state issues, then start Vite
npm run build            # Production build
npm run build:dev        # Development-mode build
npm run preview          # Preview the production build
npm run lint             # ESLint
npm run type-check       # TypeScript check
npm run test             # Vitest unit tests
npm run test:watch       # Vitest watch mode
npm run test:coverage    # Vitest coverage
npm run test:security    # Security-focused Vitest tests
npm run test:integration # Live Supabase integration/RLS tests
npm run create:component # Scaffold feature/component files
```

`npm run test:integration` requires explicit care: it uses Supabase service-role
credentials and creates real auth users. See
[tests/integration/README.md](./tests/integration/README.md) before running it.

## Project Layout

```text
src/
  components/     Legacy and app-level UI components
  features/       Feature-first modules for posts, spaces, chat, users, etc.
  shared/         Cross-feature components, utilities, services, and types
  hooks/          Cross-cutting React hooks
  services/       App service layer
  integrations/   Supabase, Sentry, PostHog clients
  migrations/     Historical SQL files kept in source
supabase/
  functions/      Supabase Edge Functions
docs/
  adr/            Architecture decision records
  guides/         Operational and implementation guides
  features/       Feature-specific notes and plans
tests/
  integration/    Live Supabase integration/RLS tests
scripts/
  *.sh, *.js      Local development helpers
```

## Documentation

Start with [docs/README.md](./docs/README.md). It records which docs are current,
which are historical, and which need follow-up. Important docs:

- [AGENTS.md](./AGENTS.md) - coding-agent operating notes for this repo
- [docs/adr/index.md](./docs/adr/index.md) - architecture decision records
- [docs/guides/CONTRIBUTING.md](./docs/guides/CONTRIBUTING.md) - contribution workflow
- [docs/guides/launch-checklist.md](./docs/guides/launch-checklist.md) - pre-launch operational checklist
- [tests/integration/README.md](./tests/integration/README.md) - live Supabase test harness
- [scripts/README.md](./scripts/README.md) - available local scripts

## Backend Notes

- Runtime Supabase client config lives in
  [src/integrations/supabase/client.ts](./src/integrations/supabase/client.ts).
- Edge functions live in [supabase/functions](./supabase/functions).
- RLS-sensitive changes should be paired with integration tests in
  [tests/integration](./tests/integration).
- Do not run service-role integration tests against production casually. Use a
  branch or throwaway project when possible.

## License

This project is proprietary.
