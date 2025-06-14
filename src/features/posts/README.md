# Posts Feature

This module contains all code related to the Posts feature in Lokaa Connect.

## Directory Structure

```
posts/
├── api/              # API integration for posts
├── components/       # UI components specific to posts
├── hooks/            # Custom hooks for posts functionality
├── store/            # State management for posts
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
└── index.ts          # Public API exports
```

## Public API

The `index.ts` file exports the public API for this feature. Only import from this file when using the Posts feature from other features.

Example:
```typescript
import { usePosts, PostCard, type Post } from 'src/features/posts';
```

## State Management

Post-related state is managed using Zustand. The store is defined in `store/posts-store.ts` and exposed via hooks.

## Components

Post-specific components should be placed in the `components` directory. Components that might be useful across multiple features should be considered for the `shared/components` directory instead. 