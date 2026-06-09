# Admin Guide

## Status

This guide was cleaned up on 2026-06-09. The previous version contained an old
manual SQL fix for an RLS recursion incident. That script should not be copied
into Supabase today because the database schema, policies, and integration test
coverage have changed since then.

## Current Rule For Database Fixes

Do not apply broad production RLS policy rewrites from a Markdown file. Fixes
should go through the normal migration path:

1. Create or update a SQL migration under `supabase/migrations` or the current
   migration workflow for the project.
2. Add or update the relevant integration test under `tests/integration`.
3. Run the focused unit tests locally.
4. Run `npm run test:integration` only with explicit approval and against a
   Supabase branch or throwaway project when possible.
5. Deploy the migration through the agreed release process.

## Useful References

- [launch-checklist.md](./launch-checklist.md)
- [integration-test-plan.md](./integration-test-plan.md)
- [tests/integration/README.md](../../tests/integration/README.md)

## When Supabase Reports RLS Recursion

1. Reproduce the failing query and capture the table/policy name from the
   Supabase error.
2. Search existing migrations and tests for the affected table.
3. Add a regression test first if one does not already exist.
4. Make the smallest policy/function change needed to break the recursion.
5. Re-run the integration test that covers the table.

Historical note: recurring recursion bugs were one reason the live Supabase RLS
integration harness was added.
