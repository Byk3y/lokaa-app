# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Package Manager:** This project uses **npm** exclusively. Other package managers (pnpm, yarn, bun) are not supported to avoid dependency conflicts.

### Core Commands
- `npm run dev` - Start development server (preferred)
- `npm run dev:clean` - Start development server with clean state
- `npm run build` - Build for production
- `npm run lint` - Run ESLint with TypeScript support
- `npm run preview` - Preview production build

### Testing Commands
- `npm run test` - Run all Vitest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:security` - Run security-focused Jest tests
- `npm run test:indexeddb` - Run IndexedDB-specific tests
- `npm run check:coverage` - Validate test coverage meets requirements

### Specialized Testing
- `npm run test:indexeddb:ui` - Run IndexedDB tests with UI
- `npm run test:security:coverage` - Security tests with coverage
- `npm run ci:security` - Security tests for CI (90% coverage required)

### Integration tests (RLS + edge-function logic against live Supabase)

- `npm run test:integration` - Vitest suite in `tests/integration/`. Exercises
  RLS policies end-to-end by signing four test users in through the anon
  key and asserting what each one can SELECT, INSERT, UPDATE. Also
  verifies the `get_or_create_conversation` RPC, titleless-post trigger,
  recursion canary, classroom paywall, chat partner-name resolution,
  and the `chat_enabled` preference gate.

**When to run them:**
- After any migration in `supabase/migrations/` that touches RLS
  policies, SECURITY DEFINER functions, or views
  (`user_conversations_secure`, etc.). Most regressions in this
  codebase's history have been silent RLS policy breakages — this
  suite is the safety net.
- After changing `get_or_create_conversation`, `check_is_space_member`,
  `check_user_can_*_course`, or any similar helper used by a policy.
- After changing the chat or enrollment edge logic in the client
  service layer — several tests assert the RPC contract the client
  relies on.
- Before tightening any existing RLS policy — run first to confirm
  the suite is green, then re-run to verify the tightening didn't
  break a legitimate access path.

**How it's wired:**
- Config: `vitest.integration.config.ts`. Node environment, 120s timeout.
- Requires three env vars: `SUPABASE_INT_URL`, `SUPABASE_INT_ANON_KEY`,
  `SUPABASE_INT_SERVICE_ROLE_KEY`. Without them, every describe-block
  skips via `describe.skipIf(!hasIntegrationEnv)`.
- One-liner to run locally (reads from `.env`, env inline for the command):
  ```
  export SUPABASE_INT_URL="$(grep -E '^VITE_SUPABASE_URL=' .env | head -1 | cut -d'=' -f2-)"
  export SUPABASE_INT_ANON_KEY="$(grep -E '^VITE_SUPABASE_ANON_KEY=' .env | head -1 | cut -d'=' -f2-)"
  export SUPABASE_INT_SERVICE_ROLE_KEY="$(grep -E '^SUPABASE_SERVICE_ROLE_KEY=' .env | head -1 | cut -d'=' -f2-)"
  npm run test:integration
  ```

**Permissions warning — ALWAYS ask before running:**
- These tests use the Supabase `service_role` key, which bypasses
  RLS. They create ~4 real auth.users rows per test file, seed
  spaces/posts/courses/conversations, then tear everything down.
- They run against whatever project `VITE_SUPABASE_URL` points at —
  typically prod. On Free tier there's no branch option, so prod IS
  the target.
- If teardown fails (has happened when Supabase-JS updates change the
  builder's Promise semantics), test rows can linger. The naming
  prefixes are distinctive (`@integration-test.invalid`,
  `@integration.invalid`, subdomains starting with `rls-`, `chat-pref-`,
  `chat-partner-`, `notif-trigger-`) so you can always clean up via
  SQL, but don't assume teardown always works.
- **Claude must request explicit confirmation before running this
  suite.** One-time "yes, run the integration tests" per session is
  enough; auto mode alone is not sufficient authorization because
  service_role + prod is the combination.

**Known gotcha:** triggers on `spaces` INSERT auto-add the owner to
`space_members`. Don't re-insert the owner row in seed code — batch
insert will fail the whole batch on the unique-constraint violation.

## Architecture Overview

### Organization Pattern
The codebase follows a **feature-first architecture** (migrating from component-based):

```
src/
├── core/               # Core application infrastructure
│   ├── auth/           # Authentication module
│   ├── config/         # App configuration
│   └── router/         # Routing setup
├── features/           # Feature modules (self-contained)
│   ├── spaces/         # Spaces feature
│   ├── posts/          # Posts feature
│   ├── chat/           # Chat feature
│   └── users/          # User management
├── shared/             # Cross-feature shared code
│   ├── components/     # Reusable UI components
│   ├── utils/          # Shared utilities
│   └── services/       # Shared services
└── components/         # Legacy components (being migrated)
```

### State Management
- **Primary**: Zustand for client state management
- **Server State**: React Query (@tanstack/react-query)
- **Real-time**: Supabase real-time subscriptions
- **Persistence**: Built-in Zustand middleware for localStorage

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Radix UI + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Routing**: React Router DOM v6
- **Forms**: React Hook Form + Zod validation
- **Testing**: Vitest + Jest (security) + Testing Library

### Key Architectural Decisions
- **ADR-001**: Feature-first organization for better scalability
- **ADR-002**: Zustand for state management over Context API
- **Space-first routing**: `/space/:subdomain/...` for user-friendly URLs
- **Slug-based posts**: SEO-friendly post URLs with automatic redirection

## Development Workflow

### Path Alias
Use `@/` for all src imports: `import { utils } from '@/lib/utils'`

### TypeScript Configuration
- Strict mode enabled with comprehensive linting rules
- Path mapping configured for `@/*` → `src/*`
- ESLint configured with React hooks and TypeScript rules

### Testing Strategy
- **Unit Tests**: Vitest for component and utility testing
- **Security Tests**: Jest for security validation (90% coverage required)
- **Integration Tests**: IndexedDB and Supabase integration testing
- **E2E Testing**: Manual testing protocols documented in TESTING_GUIDE.md

### Build Process
- **Development**: Vite with HMR and optimized chunking
- **Production**: Advanced bundle optimization with feature-based code splitting
- **PWA**: Service worker with caching strategies for Supabase API calls
- **Security**: CSP headers configured for development and production

## Database & Backend

### Supabase Setup
- Database migrations in `/supabase/migrations/`
- Edge functions in `/supabase/functions/`
- Row Level Security (RLS) enabled for all tables
- Real-time subscriptions for live updates

### Key Features
- **Spaces**: Community-style spaces with member management
- **Posts**: Rich content with slug-based URLs and pinning support
- **Comments**: Threaded commenting with real-time updates
- **Notifications**: Smart batching system with mobile optimization
- **Chat**: Direct messaging with real-time capabilities
- **Security**: Dual-layer session + CSRF protection

### Mobile Optimization
- PWA with offline support and caching
- Mobile-first responsive design
- Specialized mobile navigation patterns
- Performance optimizations for mobile devices

## Security Considerations

### Authentication Flow
- JWT tokens with automatic refresh
- Session management with 440 status code for expiry
- CSRF protection for all non-GET requests
- Secure token storage and rotation

### Security Testing
All security tests must pass with 90% coverage. Run `npm run test:security` before commits.

## Common Development Tasks

### Adding New Features
1. Create feature module in `src/features/[feature-name]/`
2. Export public API via `index.ts`
3. Use shared components from `src/shared/components/`
4. Follow Zustand patterns for state management
5. Add comprehensive tests

### Database Changes
1. Create migration in `/supabase/migrations/`
2. Update TypeScript types if needed
3. Test with local Supabase instance
4. Ensure RLS policies are correct

### Performance Optimization
- Use React.memo() for expensive components
- Implement proper key props for lists
- Leverage Vite's code splitting features
- Monitor bundle size with rollup visualizer

## Troubleshooting

### Common Issues
- **Build failures**: Check TypeScript errors and dependency conflicts
- **Test failures**: Ensure 90% security test coverage is maintained
- **Real-time issues**: Verify Supabase connection and RLS policies
- **Mobile issues**: Test on actual devices, not just browser dev tools

### Debug Tools
Development environment exposes `window.lokaaTest` with utilities for:
- Bridge testing and validation
- File validation testing
- Supabase mock testing
- Test data generation