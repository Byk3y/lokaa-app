# Users Feature

This module contains all code related to the Users feature in Lokaa Connect.

## Directory Structure

```
users/
├── api/              # API integration for users
├── components/       # UI components specific to users
├── hooks/            # Custom hooks for users functionality
├── store/            # State management for users
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
└── index.ts          # Public API exports
```

## Public API

The `index.ts` file exports the public API for this feature. Only import from this file when using the Users feature from other features.

Example:
```typescript
import { useUsers, UserAvatar, type User } from 'src/features/users';
```

## State Management

User-related state is managed using Zustand. The store is defined in `store/users-store.ts` and exposed via hooks.

## Components

User-specific components should be placed in the `components` directory. Components that might be useful across multiple features should be considered for the `shared/components` directory instead. 