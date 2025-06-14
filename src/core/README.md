# Core Application Components

This directory contains fundamental application infrastructure that is not specific to any feature but required for the application to function. Core modules provide the foundation on which features are built.

## Directory Structure

```
core/
├── auth/             # Authentication and authorization
│   ├── components/   # Auth-related components
│   ├── hooks/        # Auth-related hooks
│   └── index.ts      # Public API
├── config/           # Application configuration
│   ├── constants.ts  # Application constants
│   ├── env.ts        # Environment variables
│   └── index.ts      # Public API
├── layouts/          # Layout components
│   ├── components/   # Layout components
│   └── index.ts      # Public API
└── router/           # Routing configuration
    ├── routes.ts     # Route definitions
    └── index.ts      # Public API
```

## Guidelines

Core modules should:

1. Provide a stable and well-documented API for features to use
2. Have minimal dependencies on external libraries
3. Be thoroughly tested
4. Avoid dependencies on feature modules

## Core Modules

### Auth

The auth module handles user authentication and authorization. It provides:

- Authentication state management
- Login/logout functionality
- Protected route helpers
- User permissions

### Config

The config module provides access to application configuration:

- Environment variables
- Feature flags
- Application constants
- Theme configuration

### Layouts

The layouts module provides the application's layout structure:

- App layout
- Auth layout
- Page layouts
- Navigation components

### Router

The router module handles application routing:

- Route definitions
- Navigation guards
- Route params handling 