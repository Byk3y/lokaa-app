# Spaces Feature

This module contains all code related to the Spaces feature in Lokaa Connect.

## Directory Structure

```
spaces/
├── api/              # API integration for spaces
├── components/       # UI components specific to spaces
├── hooks/            # Custom hooks for spaces functionality
├── store/            # State management for spaces
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
└── index.ts          # Public API exports
```

## Public API

The `index.ts` file exports the public API for this feature. Only import from this file when using the Spaces feature from other features.

Example:
```typescript
import { useSpaces, SpaceCard, type Space } from 'src/features/spaces';
```

## State Management

Space-related state is managed using Zustand. The store is defined in `store/spaces-store.ts` and exposed via hooks.

## Components

Space-specific components should be placed in the `components` directory. Components that might be useful across multiple features should be considered for the `shared/components` directory instead. 