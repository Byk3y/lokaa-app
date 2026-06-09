# Development Scripts

This directory contains the local scripts currently present in the repo. If a
new script is added to `package.json`, update this file in the same change.

## npm Aliases

```bash
npm run dev:clean        # scripts/dev-stability.sh
npm run dev:stable       # alias for dev:clean
npm run check:coverage   # scripts/checkCoverage.js
npm run landing:feature  # scripts/toggle-landing-page.sh
npm run create:component # scripts/create-component.sh
npm run create:feature   # scripts/create-component.sh
```

## Script Files

### `dev-stability.sh`

Cleans common local-development state and starts Vite. Use this when HMR,
dependency cache, or stale browser state causes a bad dev session.

```bash
npm run dev:clean
```

### `create-component.sh`

Scaffolds feature, shared, page, or simple component files.

```bash
npm run create:component ComponentName feature-name [type]
npm run create:feature ComponentName feature-name
```

Supported `type` values:

- `feature` - full feature module with components, hooks, services, types, and tests
- `component` - feature component only
- `shared` - shared component under `src/shared/components`
- `page` - page component

Example:

```bash
npm run create:component NotificationCenter notifications
npm run create:component Button ui shared
```

### `checkCoverage.js`

Checks generated coverage output against the repo's configured thresholds.
Run after `npm run test:coverage` when validating coverage locally.

```bash
npm run test:coverage
npm run check:coverage
```

### `toggle-landing-page.sh`

Toggles landing-page feature state used by local development.

```bash
npm run landing:feature
```

### `vercel-build.sh`

Build wrapper intended for Vercel deployments.

```bash
./scripts/vercel-build.sh
```

## Removed Documentation

Older versions of this README referenced `ai-migration-assistant.js`,
`debug-utilities.js`, `apply-migration.sh`, and logging migration scripts.
Those files are not present in the repo, so their instructions were removed.
