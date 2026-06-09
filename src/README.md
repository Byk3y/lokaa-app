# Source Code

`src/` contains the Vite React application. The repo is organized around a
feature-first direction, with some legacy app-level components still under
`src/components`.

## Current Shape

```text
src/
  components/     App-level and legacy UI components
  features/       Feature modules: posts, spaces, chat, users, search, auth
  shared/         Cross-feature components, utilities, services, and types
  hooks/          Shared React hooks
  services/       Application service layer
  integrations/   Supabase, Sentry, PostHog clients
  stores/         Zustand stores
  contexts/       Remaining React context providers
  routes/         Lazy route wrappers and loading fallbacks
  views/          Route-level page components
  utils/          Shared runtime helpers
  schemas/        Zod validation schemas
  types/          Generated and hand-written app types
  migrations/     Historical SQL files kept with source
```

## Import Rules

- Use the `@/` alias for imports from `src`.
- Prefer public feature exports from each feature's `index.ts`.
- Keep shared utilities in `src/shared` when multiple features depend on them.
- Keep feature-only implementation details inside the owning feature folder.

## State And Data

- Client state: Zustand.
- Server/cache state: TanStack Query where appropriate.
- Realtime and backend data: Supabase.
- Legacy contexts remain in `src/contexts`; do not add new context providers
  unless Zustand or a local hook is a poor fit.

## Related Docs

- [ADR-001: Feature-first organization](../docs/adr/001-feature-first-organization.md)
- [ADR-002: Zustand for state management](../docs/adr/002-zustand-for-state-management.md)
- [docs/README.md](../docs/README.md)
