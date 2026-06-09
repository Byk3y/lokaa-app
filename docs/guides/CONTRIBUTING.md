# Contributing Guidelines

Thank you for your interest in contributing to Lokaa Connect Spaces! This document provides guidelines and instructions for contributing to this project.

## Code Organization

This project follows a feature-first code organization as documented in [ADR-001](../adr/001-feature-first-organization.md). Please familiarize yourself with this pattern before contributing.

## Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Run tests and linting: `npm run test && npm run lint`
5. Commit your changes with a descriptive message
6. Push to your fork: `git push origin feature/your-feature-name`
7. Submit a pull request

## Pull Request Process

1. Ensure your code follows the project's style guidelines
2. Update documentation as needed
3. Include tests for new functionality
4. Ensure all tests and checks pass
5. Get a code review from a maintainer

## Style Guidelines

- Follow the existing code style
- Use TypeScript for all new code
- Include JSDoc comments for public APIs
- Use meaningful variable and function names
- Keep functions focused on a single responsibility

## Commit Message Format

Follow the conventional commits specification:

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Example:
```
feat(spaces): add member invitation functionality

- Added invitation form component
- Implemented API integration
- Added unit tests

Closes #123
```

## Creating New Features

When adding a new feature:

1. Create the necessary directories in the appropriate feature module
2. Export the public API through the feature's index.ts file
3. Keep implementation details internal to the feature
4. Use shared components where appropriate
5. Add proper types and documentation

## State Management

Follow the Zustand state management pattern as documented in [ADR-002](../adr/002-zustand-for-state-management.md) for any state-related changes.

## Questions and Support

If you have questions or need help, please reach out to the maintainers or open an issue. 
