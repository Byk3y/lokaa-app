# CLAUDE.md

This file provides context and behavior rules for Claude Code (`claude` / `claude.ai/code`).

## Core Development Commands

- `npm run dev` - Start development server (preferred)
- `npm run dev:clean` - Start development server with clean state
- `npm run build` - Build for production
- `npm run lint` - Run ESLint with TypeScript support
- `npm run type-check` - Run TypeScript compilation check
- `npm run test` - Run all Vitest tests (`npm run test:watch` for watch mode)
- `npm run test:security` - Run security-focused tests
- `npm run test:indexeddb` - Run IndexedDB-specific tests
- `npm run test:integration` - Run live Supabase integration/RLS tests

### Integration Tests Guard
**IMPORTANT**: `npm run test:integration` runs against live database tables and requires `SUPABASE_INT_SERVICE_ROLE_KEY`. It creates and destroys real users/rows. **Claude must request explicit user confirmation before running this suite.** Refer to [docs/guides/TESTING_GUIDE.md](file:///Users/francischukwuma/lokaa%20latest/lokaa-app/docs/guides/TESTING_GUIDE.md) and [tests/integration/README.md](file:///Users/francischukwuma/lokaa%20latest/lokaa-app/tests/integration/README.md).

## Code & Architecture Guidelines

- **Architecture**: Feature-first module structure in `src/features/[feature-name]/`. Keep feature folders self-contained (components, hooks, stores). Global stores go in `src/stores/`, contexts in `src/contexts/`, utilities in `src/utils/`.
- **Path Imports**: Always use the `@/` path alias pointing to `src/` (e.g. `import { X } from '@/utils/X'`).
- **State Management**: Use Zustand (`zustand`) for client state; React Query (`@tanstack/react-query`) for server/Supabase query cache.
- **Pre-commit Hooks**: Pre-commit hook only runs `npm run type-check`. Run `npm run ci:security` locally before committing to check the 90% security test coverage threshold.
- **Database Rules**: All database tables require Row Level Security (RLS). Database migrations go in `supabase/migrations/`.
- **Commit Style**: Use conventional commits (rules configured in `commitlint.config.js`).
- **Exposed DevTools**: Development console exposes `window.lokaaTest` for bridge, file validation, and chat/Supabase mock utilities (configured in `src/devtools/exposeForConsole.ts`).
