# Lokaa Documentation

This folder contains current architecture decisions and operating guides. Old
completed implementation plans and refactor logs were removed so the remaining
docs are useful for current work.

Last reviewed: 2026-06-09.

## Current Runbooks

- [CONTRIBUTING.md](./guides/CONTRIBUTING.md) - contribution and PR workflow.
- [launch-checklist.md](./guides/launch-checklist.md) - launch and post-launch
  operational checklist.
- [integration-test-plan.md](./guides/integration-test-plan.md) - planned and
  implemented RLS integration coverage.
- [tests/integration/README.md](../tests/integration/README.md) - how to run the
  live Supabase integration test harness.
- [scripts/README.md](../scripts/README.md) - local scripts that currently exist.

## Architecture

- [ADR index](./adr/index.md)
- [ADR-001: Feature-first organization](./adr/001-feature-first-organization.md)
- [ADR-002: Zustand for state management](./adr/002-zustand-for-state-management.md)
- [ADR-003: Space feed as root path](./adr/003-space-feed-as-root-path.md)

## Feature Notes To Keep

These describe current or planned work that is still relevant:

- [space-load-consolidation.md](./guides/space-load-consolidation.md)

## Removed In Cleanup

Removed during the 2026-06-09 cleanup:

- Empty placeholder docs.
- Completed notification, welcome-email, and performance implementation plans.
- Historical component/refactor logs in `src/`.
- Old SpaceContext and ChatContext migration notes.

[ADMIN-GUIDE.md](./guides/ADMIN-GUIDE.md) remains only as a safety note: do not
paste old RLS policy scripts into Supabase.

## Cleanup Rules

- Keep root setup, commands, env vars, and project structure in
  [../README.md](../README.md).
- Keep coding-agent instructions in [../AGENTS.md](../AGENTS.md). `CLAUDE.md`
  currently mirrors it for compatibility.
- Add new runbooks under `docs/guides/`.
- Add decisions under `docs/adr/`.
- Avoid new docs in `src/` unless they are tightly coupled to a specific module.
