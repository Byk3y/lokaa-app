# ADR-001: Feature-First Code Organization

## Status

Proposed

## Context

The current codebase is organized primarily by technical concerns (components, hooks, utils) rather than by domain features. This has led to several issues:

1. **Poor discoverability**: Related code is scattered across multiple directories
2. **Tight coupling**: Code from different domains is mixed together
3. **Difficulty reusing**: Hard to identify and extract reusable modules
4. **Poor scalability**: Folders grow too large as the application expands

As the application grows, these issues are becoming more pronounced, making maintenance and onboarding more difficult.

## Decision

We will reorganize the codebase to follow a feature-first approach:

```
src/
├── core/               # Core application code
│   ├── auth/           # Authentication module
│   ├── config/         # Configuration
│   ├── layouts/        # Layout components
│   └── router/         # Routing configuration
├── features/           # Feature modules
│   ├── spaces/         # Spaces feature
│   │   ├── api/        # API integration
│   │   ├── components/ # UI components
│   │   ├── hooks/      # Feature-specific hooks
│   │   ├── types/      # Feature-specific types
│   │   ├── utils/      # Feature-specific utilities
│   │   └── index.ts    # Public API
│   ├── posts/          # Posts feature
│   └── users/          # User management feature
└── shared/             # Shared code
    ├── components/     # Shared UI components
    ├── utils/          # Shared utilities
    └── services/       # Shared services
```

Each feature module will:
1. Export a public API via its `index.ts` file
2. Encapsulate its internal implementation details
3. Define clear boundaries between features

## Consequences

### Positive
- Improved code organization and discoverability
- Better encapsulation of feature logic
- Easier onboarding for new developers
- More scalable as the application grows
- Clearer boundaries between features

### Negative
- Significant refactoring effort required
- Potential for disruption during transition
- Need to update build processes and tooling

## Alternatives

### Approach 1: Enhanced Component-Based Organization
Continue with the current component-based organization but improve it with better naming and nesting.

Rejected because: Would not solve the fundamental issues of coupling and scalability.

### Approach 2: Monorepo with Multiple Packages
Split the codebase into multiple packages using a monorepo tool like Nx or Turborepo.

Rejected because: Too complex for our current needs and would require significant tooling changes.

## References

- [Feature-Driven Architecture](https://www.youtube.com/watch?v=BWAeYuWFHhs)
- [Feature Sliced Design](https://feature-sliced.design/)
- [React Project Structure](https://react-file-structure.surge.sh/) 