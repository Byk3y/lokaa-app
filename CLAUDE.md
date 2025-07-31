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