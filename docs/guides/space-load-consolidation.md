# Space-load client consolidation — design note

Deferred. Not a one-session refactor. This doc captures the current shape,
why it's fragile, and the shape I'd move it to, so future work can start from
a shared understanding.

## Current state

On every navigation to `/:subdomain/space/*`, the client runs through:

1. `TrulyPersistentAppShell` classifies the route.
2. `SpaceShellLayout` owns per-space header + nav + tab switching.
3. `useSpaceSettingsStore.loadActiveSpace({ subdomain }, userId, force)`
   is the single async entry for loading space data.

`loadActiveSpace` alone reads/writes **five** caches:

| Layer | Where | Shape |
|---|---|---|
| In-memory `enhancedSpaceCache` | Module-level `Map` in the store file | `{ data, timestamp }`, 5-min TTL, 15-min "reasonably fresh" window |
| Request dedup `pendingSpaceRequests` | Module-level `Map` | Promises keyed on `subdomain:userId` |
| `localStorage.lastActiveSpace` | Browser storage | Full serialized space + timestamp |
| `localStorage.user_owns_space_<subdomain>` | Browser storage | Boolean-as-string |
| `formData` field on the store | Zustand state | Unsaved-edit buffer for the settings modal |

Plus two parallel sources of truth that also expose space data:

- `src/contexts/SpaceContext.tsx` — holds `{ space, loading, error }` with
  its own localStorage fallback. Still wrapped in
  `OptimizedProviders.tsx:224`; components import via `useSpace()`.
- `src/stores/useSpaceStore.ts` — a separate transition/snapshot store for
  space-to-space navigation (`initiateTransition`, `setTransitionStage`,
  `saveSnapshot`). Three hook consumers.

This means three places know whether you're "in" a space: the settings
store's `space`, the context's `space`, and the transition store's
`currentSpaceId`. They drift. Reconciling them requires reading all three
and applying "most recently updated wins" heuristics.

## Why it's fragile

- New code writes to whichever source the author happens to know about.
  Stale reads appear when the source you read from hasn't caught up.
- `loadActiveSpace` has a "preserve existing space if same subdomain and
  error occurred" branch — good for resilience, surprising for debugging
  ("the data updated on success but not on failure").
- Five caches, no authority gradient. `enhancedSpaceCache` is assumed fresh
  if under 15 min, but `localStorage.lastActiveSpace` could be older, and
  `SpaceContext` has its own cache that doesn't know about either.
- Pathname changes move through `TrulyPersistentAppShell.useEffect` with
  a one-frame lag — we just fixed one bug caused by that (the blank
  profile page). Similar lags exist for space navigation.

## Proposed target

One Zustand store — call it `useSpace` — that owns the full shape:

```
{
  id, subdomain, name, description, …   // the space row
  permissions: { isOwner, isAdmin, isMember, canEdit, canManage, … }
  loading, error
  formData, isDirty                     // settings modal buffer
  transition: { fromId, toId, stage, snapshots }
}
```

Single `loadSpaceBySubdomain(subdomain, userId)` action, single
`clearSpace()`, single `saveSettings(payload)`. Caches collapse to:

- Zustand state (in-memory, lives as long as the tab).
- One localStorage key, only for "last space slug you visited" — enough to
  resolve `/app` redirect without hitting the DB, never used for
  authoritative data.

Deletions this enables:

- `src/contexts/SpaceContext.tsx` (plus provider and all `useSpace` import
  sites across ~20 files).
- `src/stores/useSpaceStore.ts` (transition logic folds into the one store).
- `enhancedSpaceCache` Map, `pendingSpaceRequests` Map, the
  `user_owns_space_*` localStorage flags — redundant once Zustand is the
  single source.
- The "preserve on error" special case — replaced with an explicit error
  state that callers choose to display or ignore.

## Cost estimate

- ~20 files import `useSpace` from context today; each needs a one-line
  swap. Mechanical.
- ~10 files import `useSpaceStore` transition helpers. Need to fold those
  actions into the consolidated store and update call sites.
- `loadActiveSpace` call graph (settings modal, tab render, permission
  checks) is the riskiest surface. A few components pass `force: true`
  deliberately; those flows need to be preserved.
- Integration tests (from `tests/integration/`) should grow a
  space-load-path test before the refactor lands so regressions are
  caught automatically.

Realistic budget: **one focused week** of solo work, with integration
tests landing first. Not safe to attempt in a multi-tasking session.

## When to pick this up

Post-launch or during a dedicated refactor block. Do not start it if:

- Any other space-load change is in flight (merge hell).
- You haven't run the integration suite against a branch recently (you
  need the safety net before touching the hot path).

## Related files (for grep)

- `src/hooks/useSpaceSettingsStore.ts`
- `src/contexts/SpaceContext.tsx`
- `src/stores/useSpaceStore.ts`
- `src/components/layout/SpaceShellLayout.tsx`
- `src/components/layout/TrulyPersistentAppShell.tsx`
- `src/components/app/ApplicationRouter.tsx` (routing shape)
- `docs/guides/integration-test-plan.md` (test-first approach)
