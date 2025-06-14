# Deprecated Context Files

This directory contains React Context files that have been replaced by Zustand stores as part of the state management migration.

## Files

### `ChatContext.tsx.deprecated`
- **Status:** DEPRECATED ✅ Replaced
- **Replacement:** `@/features/chat/store/chat-store.ts` + `@/features/chat/compat/ChatContextCompat.tsx`
- **Migration Date:** 2025-01-06
- **Migration Reason:** Improved performance, better TypeScript support, DevTools integration

## Migration Documentation

See `docs/refactoring/2025-05-28-zustand-migration.md` for complete migration details.

## Safe Removal

These files can be safely removed after verifying that:
1. All components have been migrated to use Zustand stores
2. Build and tests pass without these files
3. No external packages depend on these contexts

**Current Status:** All migrations complete ✅ - Safe to remove anytime

## Rollback Instructions

If rollback is needed:
1. Move files back to `src/contexts/`
2. Remove `.deprecated` extension
3. Update `src/App.tsx` to use old imports
4. Revert component migrations

**Note:** Rollback not recommended - new architecture provides significant benefits. 