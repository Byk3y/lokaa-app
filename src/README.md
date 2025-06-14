# Lokaa Connect Spaces Source Code

This directory contains the source code for the Lokaa Connect Spaces application. The codebase follows a feature-first organization pattern as documented in [ADR-001](../docs/adr/001-feature-first-organization.md).

## Directory Structure

```
src/
├── core/               # Core application code
│   ├── auth/           # Authentication module
│   ├── config/         # Configuration
│   ├── layouts/        # Layout components
│   └── router/         # Routing configuration
├── features/           # Feature modules
│   ├── spaces/         # Spaces feature
│   ├── posts/          # Posts feature
│   └── users/          # User management feature
└── shared/             # Shared code
    ├── components/     # Shared UI components
    ├── utils/          # Shared utilities
    └── services/       # Shared services
```

## Guidelines

### Core

The `core` directory contains fundamental application infrastructure that is not specific to any feature but required for the application to function.

### Features

Each feature is a self-contained module with its own components, hooks, and utilities. Features should:

1. Export a clear public API via an `index.ts` file
2. Keep implementation details internal to the feature
3. Minimize dependencies on other features
4. Use shared components and utilities when appropriate

### Shared

The `shared` directory contains code that is used across multiple features. This includes:

1. UI components with no feature-specific logic
2. Utility functions and helpers
3. Service interfaces for external APIs

## State Management

State management follows the pattern documented in [ADR-002](../docs/adr/002-zustand-for-state-management.md):

1. Feature-specific state is managed within the feature using Zustand
2. Cross-feature state is managed in dedicated stores
3. Server state is managed with React Query

## Migration

The codebase is currently being migrated to this structure. See the [refactoring log](../docs/refactoring/2025-05-28-feature-first-restructuring.md) for progress updates. 